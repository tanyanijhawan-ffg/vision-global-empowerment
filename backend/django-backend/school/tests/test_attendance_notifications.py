from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from school.models.attendance import Attendance, AttendanceIntelligenceSetting
from school.models.center import Center, Program, Region
from school.models.role import Role
from school.models.student import Student
from school.models.user_profile import UserProfile

User = get_user_model()


class AbsenceAlertAPITests(TestCase):
    def setUp(self):
        program = Program.objects.create(program_name='Alert Test Program')
        self.region = Region.objects.create(program=program, region_name='North')
        self.centre = Center.objects.create(centre_name='North Centre', region=self.region)
        self.student = Student.objects.create(centre=self.centre, full_name='Test Student')
        role = Role.objects.create(name='super_admin')
        user = User.objects.create_user(username='alert-admin', password='TestPass123!')
        UserProfile.objects.create(user=user, role=role, region=self.region, created_by=user)
        self.client = APIClient()
        self.client.force_authenticate(user=user)
        AttendanceIntelligenceSetting.objects.create(setting_id=1, absence_alert_days=3)

    def record_statuses(self, statuses):
        today = timezone.localdate()
        for days_ago, status in enumerate(reversed(statuses)):
            Attendance.objects.create(
                student=self.student,
                attendance_date=today - timedelta(days=days_ago),
                status=status,
                absence_reason='Test reason' if status == 'Absent' else None,
            )

    def test_alert_is_returned_only_after_more_than_three_absent_sessions(self):
        self.record_statuses(['Absent', 'Absent', 'Absent'])
        response = self.client.get('/api/attendance/alerts/absence/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['alerts'], [])

        Attendance.objects.all().delete()
        self.record_statuses(['Absent', 'Absent', 'Absent', 'Absent'])
        response = self.client.get('/api/attendance/alerts/absence/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['alerts']), 1)
        self.assertEqual(response.data['alerts'][0]['student_name'], 'Test Student')
        self.assertEqual(response.data['alerts'][0]['consecutive_absent_days'], 4)

    def test_present_attendance_resets_absence_streak(self):
        self.record_statuses(['Absent', 'Absent', 'Absent', 'Absent', 'Present'])

        response = self.client.get('/api/attendance/alerts/absence/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['alerts'], [])

    def test_disabled_absence_alerts_return_no_notifications(self):
        setting = AttendanceIntelligenceSetting.objects.get(setting_id=1)
        setting.absence_alert_enabled = False
        setting.save(update_fields=['absence_alert_enabled'])
        self.record_statuses(['Absent', 'Absent', 'Absent', 'Absent'])

        response = self.client.get('/api/attendance/alerts/absence/')

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['enabled'])
        self.assertEqual(response.data['alerts'], [])