from datetime import date
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient

from school.models.assessment import (
    AcademicYear,
    Assessment,
    AssessmentScore,
    AssessmentSubject,
    AssessmentType,
    Subject,
)
from school.models.center import Center, District, Program, Region
from school.models.student import Student, StudentClassRecord
from school.serializers.student import StudentSerializer
from school.services.promotion import (
    get_or_create_next_academic_year,
    calculate_next_class_grade,
    process_class_promotion_and_rollover,
)


class StudentClassRecordAndPromotionTests(TestCase):
    def setUp(self):
        self.program = Program.objects.create(program_name='Test Program')
        self.region = Region.objects.create(program=self.program, region_name='Test Region', state='TN')
        self.district = District.objects.create(region=self.region, district_name='Test District')
        self.centre = Center.objects.create(district=self.district, region=self.region, centre_name='Coimbatore Center')

        self.ay_current = AcademicYear.objects.create(
            name='2025 - 2026',
            start_date=date(2025, 6, 1),
            end_date=date(2026, 5, 31),
            is_current=True,
            is_active=True,
        )

        self.exam_q1 = AssessmentType.objects.create(name='QUARTER 1', code='Q1', academic_year=self.ay_current, is_active=True)
        self.exam_hy = AssessmentType.objects.create(name='HALF-YEARLY', code='HY', academic_year=self.ay_current, is_active=True)
        self.exam_q2 = AssessmentType.objects.create(name='QUARTER 2', code='Q2', academic_year=self.ay_current, is_active=True)
        self.exam_y = AssessmentType.objects.create(name='YEARLY', code='Y', academic_year=self.ay_current, is_active=True)

        self.sub_tamil = Subject.objects.create(name='Tamil', code='TAM')
        self.sub_math = Subject.objects.create(name='Mathematics', code='MAT')

    def test_student_creation_stores_class_in_student_class_record_not_student(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        photo = SimpleUploadedFile('test.jpg', b'file_content', content_type='image/jpeg')
        serializer = StudentSerializer(data={
            'full_name': 'Ravi Kumar',
            'gender': 'Male',
            'centre_id': self.centre.pk,
            'class_grade': 'Class 6',
            'photo': photo,
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        student = serializer.save()

        # Student model's class_grade should NOT be set (or null)
        self.assertIsNone(student.class_grade)

        # StudentClassRecord should be created with the current academic year and Class 6
        record = StudentClassRecord.objects.filter(student=student, academic_year=self.ay_current).first()
        self.assertIsNotNone(record)
        self.assertEqual(record.class_grade, 'Class 6')
        self.assertTrue(record.is_active)

        # Serializer representation should return the class from StudentClassRecord
        repr_data = StudentSerializer(student).data
        self.assertEqual(repr_data['class_grade'], 'Class 6')

    def test_student_update_updates_student_class_record(self):
        student = Student.objects.create(
            centre=self.centre,
            full_name='Anita M',
            gender='Female',
        )
        StudentClassRecord.objects.create(
            student=student,
            academic_year=self.ay_current,
            class_grade='Class 6',
            is_active=True,
        )

        serializer = StudentSerializer(student, data={'class_grade': 'Class 7'}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        record = StudentClassRecord.objects.get(student=student, academic_year=self.ay_current)
        self.assertEqual(record.class_grade, 'Class 7')
        self.assertEqual(student.current_class_grade, 'Class 7')

    def test_student_list_filtration_from_student_class_record(self):
        client = APIClient()

        s1 = Student.objects.create(centre=self.centre, full_name='Student In Class 6')
        StudentClassRecord.objects.create(student=s1, academic_year=self.ay_current, class_grade='Class 6', is_active=True)

        s2 = Student.objects.create(centre=self.centre, full_name='Student In Class 7')
        StudentClassRecord.objects.create(student=s2, academic_year=self.ay_current, class_grade='Class 7', is_active=True)

        # Filter by class_grade=6
        resp = client.get('/api/students/?class_grade=6')
        self.assertEqual(resp.status_code, 200)
        results = resp.data if isinstance(resp.data, list) else resp.data.get('results', [])
        ids = [item['id'] for item in results]
        self.assertIn(s1.student_id, ids)
        self.assertNotIn(s2.student_id, ids)

        # Filter by class_grade=7
        resp2 = client.get('/api/students/?class_grade=7')
        self.assertEqual(resp2.status_code, 200)
        results2 = resp2.data if isinstance(resp2.data, list) else resp2.data.get('results', [])
        ids2 = [item['id'] for item in results2]
        self.assertIn(s2.student_id, ids2)
        self.assertNotIn(s1.student_id, ids2)


    def test_get_or_create_next_academic_year(self):
        next_ay = get_or_create_next_academic_year(self.ay_current)
        self.assertIsNotNone(next_ay)
        self.assertEqual(next_ay.name, '2026 - 2027')
        self.assertFalse(next_ay.is_current)
        self.assertTrue(next_ay.is_active)

    def test_promotion_logic_avg_exceeds_33(self):
        # Student 1: passes all subjects (avg > 33%)
        s_pass = Student.objects.create(centre=self.centre, full_name='Passing Student')
        StudentClassRecord.objects.create(student=s_pass, academic_year=self.ay_current, class_grade='Class 6', is_active=True)

        # Student 2: fails Math (avg <= 33%)
        s_fail = Student.objects.create(centre=self.centre, full_name='Failing Student')
        StudentClassRecord.objects.create(student=s_fail, academic_year=self.ay_current, class_grade='Class 6', is_active=True)

        # Create 4 assessments (Q1, HY, Q2, Y)
        assessments = []
        for exam in [self.exam_q1, self.exam_hy, self.exam_q2, self.exam_y]:
            a = Assessment.objects.create(
                centre=self.centre,
                academic_year_id=self.ay_current.academic_year_id,
                class_id=6,
                assessment_type=exam,
                assessment_date=date(2025, 10, 1),
                status=Assessment.STATUS_SUBMITTED,
            )
            AssessmentSubject.objects.create(
                class_id=6,
                exam_id=exam.assessment_type_id,
                academic_year_id=self.ay_current.academic_year_id,
                subject_ids=[self.sub_tamil.subject_id, self.sub_math.subject_id],
                max_marks=Decimal('100.00'),
                is_active=True,
            )
            assessments.append(a)

            # Record scores for s_pass: 70 in Tamil, 60 in Math across all 4 exams
            AssessmentScore.objects.create(assessment=a, student=s_pass, subject=self.sub_tamil, obtained_marks=Decimal('70.00'))
            AssessmentScore.objects.create(assessment=a, student=s_pass, subject=self.sub_math, obtained_marks=Decimal('60.00'))

            # Record scores for s_fail: 50 in Tamil, but 25 in Math across all 4 exams
            AssessmentScore.objects.create(assessment=a, student=s_fail, subject=self.sub_tamil, obtained_marks=Decimal('50.00'))
            AssessmentScore.objects.create(assessment=a, student=s_fail, subject=self.sub_math, obtained_marks=Decimal('25.00'))

        # Run promotion evaluation on submission of the final exam
        result = process_class_promotion_and_rollover(assessments[-1])
        self.assertEqual(result['status'], 'promotion_evaluated')
        self.assertEqual(result['promoted_count'], 1)
        self.assertEqual(result['retained_count'], 1)

        # Check next academic year records
        next_ay = AcademicYear.objects.filter(name='2026 - 2027').first()
        self.assertIsNotNone(next_ay)

        rec_pass = StudentClassRecord.objects.get(student=s_pass, academic_year=next_ay)
        self.assertEqual(rec_pass.class_grade, 'Class 7')
        self.assertTrue(rec_pass.promoted)

        rec_fail = StudentClassRecord.objects.get(student=s_fail, academic_year=next_ay)
        self.assertEqual(rec_fail.class_grade, 'Class 6')
        self.assertFalse(rec_fail.promoted)

    def test_academic_year_rollover_when_all_classes_complete(self):
        # Create student and all 4 assessments for Class 6
        s1 = Student.objects.create(centre=self.centre, full_name='Only Student')
        StudentClassRecord.objects.create(student=s1, academic_year=self.ay_current, class_grade='Class 6', is_active=True)

        assessments = []
        for exam in [self.exam_q1, self.exam_hy, self.exam_q2, self.exam_y]:
            a = Assessment.objects.create(
                centre=self.centre,
                academic_year_id=self.ay_current.academic_year_id,
                class_id=6,
                assessment_type=exam,
                assessment_date=date(2025, 10, 1),
                status=Assessment.STATUS_SUBMITTED,
            )
            AssessmentSubject.objects.create(
                class_id=6,
                exam_id=exam.assessment_type_id,
                academic_year_id=self.ay_current.academic_year_id,
                subject_ids=[self.sub_tamil.subject_id],
                max_marks=Decimal('100.00'),
                is_active=True,
            )
            AssessmentScore.objects.create(assessment=a, student=s1, subject=self.sub_tamil, obtained_marks=Decimal('80.00'))
            assessments.append(a)

        result = process_class_promotion_and_rollover(assessments[-1])
        self.assertTrue(result['academic_year_rolled_over'])

        self.ay_current.refresh_from_db()
        self.assertFalse(self.ay_current.is_current)

        next_ay = AcademicYear.objects.get(name='2026 - 2027')
        self.assertTrue(next_ay.is_current)

    def test_student_list_filters_by_academic_year_and_student_class_record(self):
        ay2025 = self.ay_current
        ay2026 = AcademicYear.objects.create(name='2026 - 2027', start_date=date(2026, 6, 1), end_date=date(2027, 5, 31), is_current=False)

        # Student A is in Class 5 in both 2025-2026 and 2026-2027
        student_a = Student.objects.create(full_name='Student A', centre=self.centre, class_grade='5')
        StudentClassRecord.objects.create(student=student_a, academic_year=ay2025, class_grade='5', is_active=True)
        StudentClassRecord.objects.create(student=student_a, academic_year=ay2026, class_grade='5', is_active=True)

        # Student B is only in 2025-2026 (e.g. test student)
        student_b = Student.objects.create(full_name='Student B', centre=self.centre, class_grade='5')
        StudentClassRecord.objects.create(student=student_b, academic_year=ay2025, class_grade='5', is_active=True)

        # Query for 2025-2026: both should be returned
        res_2025 = self.client.get(f'/api/students/?classGrade=5&centreId={self.centre.centre_id}&academicYear=2025+-+2026')
        self.assertEqual(res_2025.status_code, 200)
        returned_ids_2025 = {s['id'] for s in res_2025.json()}
        self.assertIn(student_a.student_id, returned_ids_2025)
        self.assertIn(student_b.student_id, returned_ids_2025)

        # Query for 2026-2027: only Student A should be returned
        res_2026 = self.client.get(f'/api/students/?classGrade=5&centreId={self.centre.centre_id}&academicYear=2026+-+2027')
        self.assertEqual(res_2026.status_code, 200)
        returned_ids_2026 = {s['id'] for s in res_2026.json()}
        self.assertIn(student_a.student_id, returned_ids_2026)
        self.assertNotIn(student_b.student_id, returned_ids_2026)

    def test_latest_inserted_student_class_record_used_for_class_grade(self):
        ay2025 = self.ay_current
        ay2026 = AcademicYear.objects.create(name='2026 - 2027', start_date=date(2026, 6, 1), end_date=date(2027, 5, 31), is_current=False)

        student_x = Student.objects.create(full_name='Student X', centre=self.centre, class_grade='Class 4')
        rec1 = StudentClassRecord.objects.create(student=student_x, academic_year=ay2025, class_grade='Class 5', is_active=True)
        rec2 = StudentClassRecord.objects.create(student=student_x, academic_year=ay2026, class_grade='Class 6', is_active=True)

        self.assertGreater(rec2.student_class_record_id, rec1.student_class_record_id)

        # 1. Model property check
        self.assertEqual(student_x.current_class_grade, 'Class 6')

        # 2. API list endpoint check
        res = self.client.get(f'/api/students/?centreId={self.centre.centre_id}')
        self.assertEqual(res.status_code, 200)
        matching = [s for s in res.json() if s['id'] == student_x.student_id]
        self.assertEqual(len(matching), 1)
        self.assertEqual(matching[0]['class_grade'], 'Class 6')

        # 3. Filtering by latest class grade without AY filter
        res_filtered = self.client.get(f'/api/students/?classGrade=Class+6&centreId={self.centre.centre_id}')
        self.assertEqual(res_filtered.status_code, 200)
        matching_filtered = [s for s in res_filtered.json() if s['id'] == student_x.student_id]
        self.assertEqual(len(matching_filtered), 1)

        res_old_grade = self.client.get(f'/api/students/?classGrade=Class+5&centreId={self.centre.centre_id}')
        self.assertEqual(res_old_grade.status_code, 200)
        matching_old = [s for s in res_old_grade.json() if s['id'] == student_x.student_id]
        self.assertEqual(len(matching_old), 0)

