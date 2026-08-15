from django.test import TestCase

from school.models.center import Center, District, Program, Region
from school.models.student import Student
from school.serializers.student import StudentSerializer


class StudentSerializerTests(TestCase):
    def test_serializer_matches_student_model_fields(self):
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
        student = Student.objects.create(
            centre=centre,
            full_name='Alice Example',
            nick_name='Ali',
            gender='Female',
            dob='2010-05-12',
            age=15,
            photo='https://example.com/photo.jpg',
            school_name='Green Valley School',
            school_type='Private',
            class_grade='7',
            medium_of_instruction='English',
            attendance_pattern='Regular',
            previous_academic_performance='Good',
        )

        payload = StudentSerializer(student).data

        self.assertEqual(payload['id'], student.student_id)
        self.assertEqual(payload['full_name'], 'Alice Example')
        self.assertEqual(payload['gender'], 'Female')
        self.assertEqual(payload['class_grade'], '7')
        self.assertEqual(payload['centre']['name'], 'Centre A')
        self.assertNotIn('first_name', payload)
        self.assertNotIn('role', payload)
