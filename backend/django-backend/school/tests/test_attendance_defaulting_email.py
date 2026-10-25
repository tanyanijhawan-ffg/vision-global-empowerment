from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase
from rest_framework.test import APIClient

from school.models.attendance import Attendance
from school.models.assessment import SchoolClass
from school.models.center import Center, District, Program, Region
from school.models.role import Role
from school.models.student import Student
from school.models.user_profile import UserProfile

User = get_user_model()


class AttendanceDefaultingEmailTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        program = Program.objects.create(program_name='Program A', status='active')
        cls.region = Region.objects.create(program=program, region_name='South Zone', state='State A', status='active')
        cls.district = District.objects.create(region=cls.region, district_name='River City')
        cls.centre = Center.objects.create(
            district=cls.district,
            region=cls.region,
            centre_name='Green Centre',
            centre_type='Community',
            block='Block A',
            village='Village A',
            facilitator_name='Community Educator One',
            status='active',
        )
        admin_role = Role.objects.create(name='regional_admin')
        educator_role = Role.objects.create(name='facilitator')
        cls.admin = User.objects.create_user(username='admin', email='admin@example.org', password='test-password')
        UserProfile.objects.create(user=cls.admin, role=admin_role, region=cls.region, full_name='Admin One')
        cls.educator = User.objects.create_user(username='educator', email='educator@example.org', password='test-password')
        UserProfile.objects.create(user=cls.educator, role=educator_role, region=cls.region, full_name='Community Educator One')
        cls.student = Student.objects.create(centre=cls.centre, full_name='Student One', school_class=SchoolClass.objects.create(name='5', code='CLASS_5'))

        today = date(2026, 10, 13)
        for day_offset, status in enumerate(['Present', 'Absent', 'Absent', 'Absent']):
            Attendance.objects.create(
                student=cls.student,
                attendance_date=today - timedelta(days=day_offset),
                status=status,
            )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_recipients_are_loaded_from_database_for_center(self):
        response = self.client.get('/api/v1/attendance/alert-recipients/', {'centre_id': self.centre.pk})

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['community_educators'], [{
            'id': self.educator.pk,
            'name': 'Community Educator One',
            'email': 'educator@example.org',
        }])
        self.assertEqual(response.data['admin']['email'], 'admin@example.org')

    def test_admin_can_email_center_defaulting_attendance_report(self):
        response = self.client.post('/api/v1/attendance/defaulting-email/', {
            'centre_id': self.centre.pk,
            'attendance_date': '2026-10-13',
            'educator_id': self.educator.pk,
            'class_grade': '5',
            'student_ids': [self.student.pk],
        }, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['recipient'], 'educator@example.org')
        self.assertEqual(response.data['student_count'], 1)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ['educator@example.org'])
        self.assertEqual(message.cc, ['admin@example.org'])
        self.assertEqual(message.subject, 'Default Attendance Student South_Zone_River_City_Green_Centre_5')
        self.assertIn('Student One | 5 | 1/4 days | 25%', message.body)
        self.assertIn('25%', message.alternatives[0][0])

    def test_non_admin_cannot_fetch_recipients(self):
        self.client.force_authenticate(user=self.educator)

        response = self.client.get('/api/v1/attendance/alert-recipients/', {'centre_id': self.centre.pk})

        self.assertEqual(response.status_code, 403)
