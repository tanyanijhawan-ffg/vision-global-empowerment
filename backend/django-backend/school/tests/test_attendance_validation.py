from datetime import date

from django.test import TestCase

from school.models.center import Center, District, Program, Region
from school.models.student import Student
from school.serializers.attendance import AttendanceIntelligenceSettingSerializer, AttendanceSerializer


class AttendanceValidationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        program = Program.objects.create(program_name='Program A', status='active')
        region = Region.objects.create(program=program, region_name='Region A', state='State A', status='active')
        district = District.objects.create(region=region, district_name='District A')
        centre = Center.objects.create(
            district=district,
            region=region,
            centre_name='Centre A',
            centre_type='Community',
            block='Block A',
            village='Village A',
            status='active',
        )
        cls.student = Student.objects.create(centre=centre, full_name='Alice Example')

    def test_absent_attendance_does_not_require_a_reason(self):
        serializer = AttendanceSerializer(data={
            'student_id': self.student.student_id,
            'attendance_date': date.today(),
            'status': 'Absent',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_late_attendance_does_not_require_a_reason(self):
        serializer = AttendanceSerializer(data={
            'student_id': self.student.student_id,
            'attendance_date': date.today(),
            'status': 'Late',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_only_email_notification_channel_is_accepted(self):
        email_serializer = AttendanceIntelligenceSettingSerializer(data={'notification_channels': ['email']})
        sms_serializer = AttendanceIntelligenceSettingSerializer(data={'notification_channels': ['sms']})
        whatsapp_serializer = AttendanceIntelligenceSettingSerializer(data={'notification_channels': ['whatsapp']})

        self.assertTrue(email_serializer.is_valid(), email_serializer.errors)
        self.assertFalse(sms_serializer.is_valid())
        self.assertFalse(whatsapp_serializer.is_valid())
