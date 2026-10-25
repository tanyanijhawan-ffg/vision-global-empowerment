import os
import sys
from pathlib import Path
import django

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vision_global_empowerment.settings')
django.setup()

from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')
if '127.0.0.1' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('127.0.0.1')

from datetime import date
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from school.models.assessment import (
    AcademicYear,
    Assessment,
    AssessmentScore,
    AssessmentSubject,
    AssessmentSubmission,
    AssessmentType,
    SchoolClass,
    StudentObservation,
    Subject,
)
from school.models.center import Center, District, Program, Region
from school.models.student import Student, StudentClassRecord

User = get_user_model()

def run_e2e_tests():
    print("=" * 80)
    print("STARTING COMPREHENSIVE END-TO-END TEST ACROSS ALL 6 MODULE POINTS")
    print("=" * 80)

    client = APIClient()

    # Create / Fetch Super Admin User for authenticated promotion API
    admin_user, _ = User.objects.get_or_create(
        username='e2e_superadmin',
        defaults={'email': 'e2e_admin@test.com', 'is_staff': True, 'is_superuser': True}
    )
    admin_user.is_superuser = True
    admin_user.is_staff = True
    admin_user.save()
    client.force_authenticate(user=admin_user)

    # -------------------------------------------------------------------------
    # STEP 0: Set up completely isolated test data
    # -------------------------------------------------------------------------
    print("\n[STEP 0] Setting up isolated test master records...")
    prog, _ = Program.objects.get_or_create(program_name='E2E Program')
    reg, _ = Region.objects.get_or_create(program=prog, region_name='E2E Test Region', defaults={'state': 'TN'})
    dist, _ = District.objects.get_or_create(region=reg, district_name='E2E Test District')
    centre, _ = Center.objects.get_or_create(district=dist, region=reg, centre_name='E2E Test Centre')

    # Two distinct academic years for testing multi-year mapping & promotion
    ay_curr, _ = AcademicYear.objects.get_or_create(
        name='2028 - 2029',
        defaults={'start_date': date(2028, 6, 1), 'end_date': date(2029, 5, 31), 'is_current': False, 'is_active': True}
    )
    ay_next, _ = AcademicYear.objects.get_or_create(
        name='2029 - 2030',
        defaults={'start_date': date(2029, 6, 1), 'end_date': date(2030, 5, 31), 'is_current': False, 'is_active': True}
    )

    exam_type, _ = AssessmentType.objects.get_or_create(
        code='E2E_Q1',
        defaults={'name': 'E2E Quarter 1', 'academic_year': ay_curr, 'is_active': True}
    )

    sub_math, _ = Subject.objects.get_or_create(name='E2E Mathematics', defaults={'code': 'E2E_MATH'})
    sub_sci, _ = Subject.objects.get_or_create(name='E2E Science', defaults={'code': 'E2E_SCI'})
    sub_eng, _ = Subject.objects.get_or_create(name='E2E English', defaults={'code': 'E2E_ENG'})

    # Two test students
    student1, _ = Student.objects.get_or_create(
        full_name='E2E Student Alpha',
        defaults={'centre': centre, 'class_grade': 'Class 5'}
    )
    student1.centre = centre
    student1.class_grade = 'Class 5'
    student1.save()

    student2, _ = Student.objects.get_or_create(
        full_name='E2E Student Beta',
        defaults={'centre': centre, 'class_grade': 'Class 5'}
    )
    student2.centre = centre
    student2.class_grade = 'Class 5'
    student2.save()

    # -------------------------------------------------------------------------
    # TEST POINT 1: Student Class Records & Multi-Year Student Management
    # -------------------------------------------------------------------------
    print("\n--- TEST POINT 1: Student Class Records & Academic Year Isolation ---")
    StudentClassRecord.objects.filter(student__in=[student1, student2]).delete()
    StudentClassRecord.objects.create(
        student=student1,
        academic_year=ay_curr,
        class_grade='Class 5',
        is_active=True
    )
    StudentClassRecord.objects.create(
        student=student2,
        academic_year=ay_curr,
        class_grade='Class 5',
        is_active=True
    )
    print(f"Created StudentClassRecord: Student 1 & 2 enrolled in Class 5 for AY {ay_curr.name}")

    # Verify query for AY 2028-2029 returns students
    curr_records = StudentClassRecord.objects.filter(academic_year=ay_curr, class_grade__icontains='5')
    assert curr_records.filter(student=student1).exists(), "Student Alpha must be in 2028-2029"
    assert curr_records.filter(student=student2).exists(), "Student Beta must be in 2028-2029"

    # Verify query for AY 2029-2030 has NO students enrolled yet
    next_records = StudentClassRecord.objects.filter(academic_year=ay_next, class_grade__icontains='5')
    assert not next_records.filter(student=student1).exists(), "Student Alpha must NOT be in 2029-2030 yet"
    print("PASS: Students correctly isolated by Academic Year via StudentClassRecord.")

    # -------------------------------------------------------------------------
    # TEST POINT 2: Dynamic Class Loading (Replaced Hardcoding)
    # -------------------------------------------------------------------------
    print("\n--- TEST POINT 2: Dynamic Class Loading via /api/v1/classes/ ---")
    res_classes = client.get('/api/v1/classes/')
    assert res_classes.status_code == 200, f"Classes endpoint failed: {res_classes.status_code}"
    classes_data = res_classes.json()
    db_classes_count = SchoolClass.objects.filter(is_active=True).count()
    print(f"Total active classes from DB endpoint: {len(classes_data)} (DB count: {db_classes_count})")
    assert len(classes_data) >= 12, "Should return all configured classes (12 classes), not capped at 10."
    print("PASS: All classes loaded dynamically from database.")

    # -------------------------------------------------------------------------
    # TEST POINT 3: Assessment Creation, Decoupled centre_id & Duplicate Validation
    # -------------------------------------------------------------------------
    print("\n--- TEST POINT 3: Assessment Creation & Duplicate Validation ---")
    # Clean previous test assessments for this combo if any
    Assessment.objects.filter(
        class_id=5,
        assessment_type=exam_type,
        academic_year_id=ay_curr.academic_year_id
    ).delete()
    AssessmentSubject.objects.filter(
        class_id=5,
        exam_id=exam_type.assessment_type_id,
        academic_year_id=ay_curr.academic_year_id
    ).delete()

    create_payload = {
        'academicYearId': ay_curr.academic_year_id,
        'classIds': [5],
        'assessmentTypeIds': [exam_type.assessment_type_id],
        'assessmentDate': '2028-10-15',
        'subjectIds': [sub_math.subject_id, sub_sci.subject_id],
        'subjectMarks': {
            str(sub_math.subject_id): 100,
            str(sub_sci.subject_id): 50,
        },
        'maxMarks': 150,
        'centreId': centre.centre_id,
    }

    res_create = client.post('/api/v1/assessments/', data=create_payload, format='json')
    assert res_create.status_code in (200, 201), f"Assessment creation failed: {res_create.data}"
    created_id = res_create.json().get('id') or res_create.json().get('created_assessments', [{}])[0].get('id')
    print(f"Created assessment ID: {created_id} with Math (100) and Science (50)")

    # Verify AssessmentSubject has NO centre_id column (Decoupled)
    as_entries = AssessmentSubject.objects.filter(
        class_id=5,
        exam_id=exam_type.assessment_type_id,
        academic_year_id=ay_curr.academic_year_id
    )
    assert as_entries.exists(), "AssessmentSubject records must exist"
    assert not hasattr(as_entries.first(), 'centre_id'), "AssessmentSubject must NOT have centre_id column"
    print("PASS: AssessmentSubject decoupled from centre_id.")

    # Verify duplicate creation rejection
    res_dup = client.post('/api/v1/assessments/', data=create_payload, format='json')
    assert res_dup.status_code == 400, "Duplicate assessment combination MUST return 400"
    assert 'same exam and class combination already exists' in res_dup.json().get('error', ''), "Must state duplicate combination"
    print("PASS: Duplicate exam/class combination correctly rejected with HTTP 400.")

    # -------------------------------------------------------------------------
    # TEST POINT 4: Entering Scores & Submitting Assessment
    # -------------------------------------------------------------------------
    print("\n--- TEST POINT 4: Marks Entry & Publishing/Submission ---")
    assessment = Assessment.objects.get(
        class_id=5,
        assessment_type=exam_type,
        academic_year_id=ay_curr.academic_year_id
    )
    # Student 1: Math 90/100, Sci 45/50 (Total 135/150 = 90% -> PASS)
    # Student 2: Math 20/100, Sci 10/50 (Total 30/150 = 20% -> FAIL)
    scores_payload = [
        {
            'studentId': student1.student_id,
            'scores': [
                {'subjectId': sub_math.subject_id, 'obtainedMarks': 90},
                {'subjectId': sub_sci.subject_id, 'obtainedMarks': 45},
            ]
        },
        {
            'studentId': student2.student_id,
            'scores': [
                {'subjectId': sub_math.subject_id, 'obtainedMarks': 20},
                {'subjectId': sub_sci.subject_id, 'obtainedMarks': 10},
            ]
        }
    ]
    res_scores = client.put(f'/api/v1/assessments/{assessment.assessment_id}/scores/bulk', data={'students': scores_payload}, format='json')
    assert res_scores.status_code == 200, f"Scores entry failed: {res_scores.data}"

    # Add mandatory narrative observations
    StudentObservation.objects.update_or_create(
        assessment=assessment, student=student1,
        defaults={'key_improvements': 'Excellent mastery of concepts', 'intervention_plan': 'Advanced projects'}
    )
    StudentObservation.objects.update_or_create(
        assessment=assessment, student=student2,
        defaults={'key_improvements': 'Needs remedial practice in basics', 'intervention_plan': 'Weekly tutoring'}
    )

    # Submit assessment
    res_submit = client.post(f'/api/v1/assessments/{assessment.assessment_id}/submit')
    assert res_submit.status_code == 200, f"Submission failed: {res_submit.data}"
    assessment.refresh_from_db()
    assert assessment.status == Assessment.STATUS_SUBMITTED, "Assessment status must be SUBMITTED"
    print(f"PASS: Assessment {assessment.assessment_id} submitted with scores for Math and Science.")

    # -------------------------------------------------------------------------
    # TEST POINT 5: Demote Submitted Assessment to Draft on Adding New Subject
    # -------------------------------------------------------------------------
    print("\n--- TEST POINT 5: Adding New Subject Demotes SUBMITTED to DRAFT ---")
    add_sub_payload = {
        'subjectIds': [sub_math.subject_id, sub_sci.subject_id, sub_eng.subject_id],
        'subjectMarks': {
            str(sub_math.subject_id): 100,
            str(sub_sci.subject_id): 50,
            str(sub_eng.subject_id): 75,
        },
        'deleteScores': False,
    }
    res_add_sub = client.patch(f'/api/v1/assessments/{assessment.assessment_id}/', data=add_sub_payload, format='json')
    assert res_add_sub.status_code == 200, f"Adding subject failed: {res_add_sub.data}"
    assessment.refresh_from_db()
    assert assessment.status == Assessment.STATUS_DRAFT, "Assessment MUST be demoted to DRAFT when new subjects added"
    print("PASS: Adding new subject successfully demoted assessment from SUBMITTED to DRAFT.")

    # -------------------------------------------------------------------------
    # TEST POINT 6: Subject Deletion Alert & Selective Score Deletion
    # -------------------------------------------------------------------------
    print("\n--- TEST POINT 6: Subject Deletion Alert & Selective Score Deletion ---")
    # Verify current scores: Math and Science have scores
    math_scores_before = AssessmentScore.objects.filter(assessment=assessment, subject=sub_math).count()
    sci_scores_before = AssessmentScore.objects.filter(assessment=assessment, subject=sub_sci).count()
    assert math_scores_before > 0 and sci_scores_before > 0, "Both Math and Science must have scores"

    # Attempt to remove sub_sci without deleteScores=True -> MUST REJECT
    del_unconfirmed_payload = {
        'subjectIds': [sub_math.subject_id, sub_eng.subject_id],
        'subjectMarks': {
            str(sub_math.subject_id): 100,
            str(sub_eng.subject_id): 75,
        },
        'deleteScores': False,
    }
    res_del_unconfirmed = client.patch(f'/api/v1/assessments/{assessment.assessment_id}/', data=del_unconfirmed_payload, format='json')
    assert res_del_unconfirmed.status_code == 400, "Removing subject with scores without confirmation must fail with 400"
    assert 'Marks are already submitted for that subject, do you want to delete them?' in res_del_unconfirmed.json().get('error', '')
    print("PASS: Subject removal without confirmation was successfully blocked with required alert message.")

    # Remove sub_sci WITH deleteScores=True -> ONLY sub_sci scores deleted!
    del_confirmed_payload = {
        'subjectIds': [sub_math.subject_id, sub_eng.subject_id],
        'subjectMarks': {
            str(sub_math.subject_id): 100,
            str(sub_eng.subject_id): 75,
        },
        'deleteScores': True,
    }
    res_del_confirmed = client.patch(f'/api/v1/assessments/{assessment.assessment_id}/', data=del_confirmed_payload, format='json')
    assert res_del_confirmed.status_code == 200, f"Confirmed deletion failed: {res_del_confirmed.data}"

    # Verify Science scores are deleted, Math scores are COMPLETELY PRESERVED!
    sci_scores_after = AssessmentScore.objects.filter(assessment=assessment, subject=sub_sci).count()
    math_scores_after = AssessmentScore.objects.filter(assessment=assessment, subject=sub_math).count()
    assert sci_scores_after == 0, "Science scores MUST be deleted"
    assert math_scores_after == math_scores_before, "Math scores MUST remain intact!"
    print(f"PASS: Selective score deletion verified! Science scores ({sci_scores_before} -> 0), Math scores ({math_scores_before} -> {math_scores_after}) untouched.")

    # Test editing marks for sub_math (from 100 to 80):
    # Student scores for sub_math will be deleted because its marks changed, but no other subject is affected
    edit_marks_payload = {
        'subjectIds': [sub_math.subject_id, sub_eng.subject_id],
        'subjectMarks': {
            str(sub_math.subject_id): 80,
            str(sub_eng.subject_id): 75,
        },
        'deleteScores': True,
    }
    res_edit_marks = client.patch(f'/api/v1/assessments/{assessment.assessment_id}/', data=edit_marks_payload, format='json')
    assert res_edit_marks.status_code == 200, f"Edit marks failed: {res_edit_marks.data}"
    math_scores_after_edit = AssessmentScore.objects.filter(assessment=assessment, subject=sub_math).count()
    assert math_scores_after_edit == 0, "Math scores should be deleted when its marks changed"
    print("PASS: Modifying subject max marks selectively deleted scores for that subject.")

    # Re-enter marks for all configured subjects (sub_math and sub_eng) and re-submit to test Promotion
    re_scores_payload = [
        {
            'studentId': student1.student_id,
            'scores': [
                {'subjectId': sub_math.subject_id, 'obtainedMarks': 72}, # 72/80 = 90%
                {'subjectId': sub_eng.subject_id, 'obtainedMarks': 67.5}, # 67.5/75 = 90% (Pass)
            ]
        },
        {
            'studentId': student2.student_id,
            'scores': [
                {'subjectId': sub_math.subject_id, 'obtainedMarks': 16}, # 16/80 = 20%
                {'subjectId': sub_eng.subject_id, 'obtainedMarks': 15}, # 15/75 = 20% (Fail)
            ]
        }
    ]
    res_re_scores = client.put(f'/api/v1/assessments/{assessment.assessment_id}/scores/bulk', data={'students': re_scores_payload}, format='json')
    assert res_re_scores.status_code == 200, f"Re-entering scores failed: {res_re_scores.data}"

    res_re_submit = client.post(f'/api/v1/assessments/{assessment.assessment_id}/submit')
    assert res_re_submit.status_code == 200, f"Re-submitting failed: {res_re_submit.data}"
    assessment.refresh_from_db()
    assert assessment.status == Assessment.STATUS_SUBMITTED, "Assessment must be SUBMITTED for promotion evaluation"
    print(f"Re-submitted assessment {assessment.assessment_id} with Student 1 (90%) and Student 2 (20%).")

    # -------------------------------------------------------------------------
    # TEST POINT 7: Student Promotion Flow (33% Rule & StudentClassRecord)
    # -------------------------------------------------------------------------
    print("\n--- TEST POINT 7: Student Promotion API & Next Year Enrollment ---")
    promotion_payload = {
        'academicYearId': ay_curr.academic_year_id,
        'centreId': centre.centre_id,
        'classId': 5,
        'userRole': 'SUPER_ADMIN',
    }
    res_promo = client.post('/api/v1/academics/promote-class/', data=promotion_payload, format='json')
    assert res_promo.status_code == 200, f"Promotion API failed: {res_promo.data}"
    promo_data = res_promo.json()
    print(f"Promotion API response: {promo_data}")

    # Check Student Alpha (Passed >= 33%) was promoted to Class 6 in next academic year
    scr_alpha_promoted = StudentClassRecord.objects.filter(
        student=student1,
        class_grade__icontains='6',
        promoted=True
    ).exists()
    assert scr_alpha_promoted, "Student Alpha (90%) must be promoted to Class 6!"

    # Check Student Beta (Failed < 33%) was retained in Class 5 (promoted=False)
    scr_beta_retained = StudentClassRecord.objects.filter(
        student=student2,
        class_grade__icontains='5',
        promoted=False
    ).exists()
    assert scr_beta_retained, "Student Beta (20%) must be retained in Class 5 (promoted=False)!"

    print("PASS: Promotion evaluation correctly applied 33% threshold and updated StudentClassRecord.")

    # -------------------------------------------------------------------------
    # TEST POINT 8: Dashboard & Comparative Statistics
    # -------------------------------------------------------------------------
    print("\n--- TEST POINT 8: Dashboard & Comparative Statistics ---")
    res_stats = client.get(f'/api/v1/assessments/{assessment.assessment_id}/statistics')
    assert res_stats.status_code == 200, f"Statistics failed: {res_stats.status_code}"
    stats_data = res_stats.json()
    print(f"Assessment statistics: studentCount={stats_data.get('studentCount')}, averagePercentage={stats_data.get('averagePercentage')}%, passPercentage={stats_data.get('passPercentage')}%")
    assert stats_data.get('studentCount') == 2, "Statistics studentCount must be 2"
    assert stats_data.get('highestPercentage') == 90.0, "Highest percentage must be 90.0%"
    assert stats_data.get('lowestPercentage') == 20.0, "Lowest percentage must be 20.0%"
    assert stats_data.get('passPercentage') == 50.0, "Pass percentage must be 50.0%"
    print("PASS: Dashboard statistics computed correctly.")

    print("\n" + "=" * 80)
    print("ALL END-TO-END TESTS COMPLETED SUCCESSFULLY!")
    print("Every single point is working as expected in the database and API.")
    print("=" * 80)

if __name__ == '__main__':
    run_e2e_tests()
