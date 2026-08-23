import json

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from school.models.center import Center, District, Program, Region
from school.models.student import Student
from school.serializers.student import StudentSerializer


class StudentSerializerTests(TestCase):
    def test_student_creation_persists_identification_and_education(self):
        program = Program.objects.create(program_name='Program A', status='active')
        region = Region.objects.create(program=program, region_name='Region A', state='State A', status='active')
        district = District.objects.create(region=region, district_name='District A')
        centre = Center.objects.create(district=district, region=region, centre_name='Centre A')

        response = APIClient().post('/api/students/', {
            'full_name': 'New Student',
            'nick_name': 'New',
            'gender': 'Female',
            'dob': '2012-08-24',
            'photo': SimpleUploadedFile('student.jpg', b'photo-bytes', content_type='image/jpeg'),
            'school_name': 'Green Valley School',
            'school_type': 'Government',
            'class_grade': 'Class 7',
            'medium_of_instruction': 'English Medium',
            'attendance_pattern': '75%',
            'centre_id': centre.pk,
            'family_data': json.dumps({'father_name': 'Father Example', 'family_members': 5}),
            'socio_economic_data': json.dumps({'caste_category': 'BC', 'electricity': True, 'study_space': False}),
            'vulnerabilities_data': json.dumps([{'name': 'Migrant family'}, {'name': 'Other', 'remarks': 'Needs support'}]),
            'motivation_data': json.dumps([
                {'category': 'Narrative', 'reason': reason, 'narrative': 'Recorded for testing.'}
                for reason in [
                    'Child’s life situation before joining', 'Family challenges', 'Academic challenges',
                    'Behavioral challenges', 'Expectations from program',
                ]
            ]),
            'aspirations_data': json.dumps({
                'career_goal': 'Teacher',
                'interests': 'Reading',
                'strengths': 'Curious learner',
            }),
        }, format='multipart')

        self.assertEqual(response.status_code, 201)
        student = Student.objects.get(pk=response.data['id'])
        self.assertEqual(student.full_name, 'New Student')
        self.assertEqual(student.school_name, 'Green Valley School')
        self.assertEqual(student.age, 13)
        self.assertTrue(student.photo.name.startswith('student_photos/'))
        self.assertEqual(student.family.father_name, 'Father Example')
        self.assertEqual(student.socio_economics.get().caste_category, 'BC')
        self.assertEqual(student.student_vulnerabilities.count(), 2)
        self.assertEqual(student.aspirations.get().career_goal, 'Teacher')

    def test_student_creation_requires_photo(self):
        centre = Center.objects.create(centre_name='Centre A')
        response = APIClient().post('/api/students/', {
            'full_name': 'No Photo Student',
            'dob': '2012-08-23',
            'gender': 'Female',
            'centre_id': centre.pk,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('photo', response.data)

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
