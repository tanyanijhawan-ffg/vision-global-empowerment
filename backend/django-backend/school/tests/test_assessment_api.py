from django.test import TestCase
from rest_framework.test import APIClient


class AssessmentMetadataApiTests(TestCase):
    def test_assessment_type_metadata_endpoint_returns_data(self):
        client = APIClient()
        response = client.get('/api/v1/assessment-types/')
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)

    def test_subjects_endpoint_filters_by_class(self):
        client = APIClient()
        response = client.get('/api/v1/subjects/', {'classId': 5})
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)

    def test_assessment_type_metadata_crud_flow(self):
        client = APIClient()
        create_response = client.post('/api/v1/metadata/assessment-types/', {
            'code': 'MID_YEAR',
            'name': 'Mid-Year',
            'durationMonths': 6,
            'isActive': True,
        }, format='json')
        self.assertEqual(create_response.status_code, 201)
        payload = create_response.json()
        self.assertEqual(payload['code'], 'MID_YEAR')

        list_response = client.get('/api/v1/metadata/assessment-types/')
        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(len(list_response.json()), 1)

        detail_response = client.get(f"/api/v1/metadata/assessment-types/{payload['id']}/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()['name'], 'Mid-Year')

        update_response = client.put(f"/api/v1/metadata/assessment-types/{payload['id']}/", {
            'code': 'MID_YEAR',
            'name': 'Mid-Year Review',
            'durationMonths': 6,
            'isActive': True,
        }, format='json')
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()['name'], 'Mid-Year Review')

        delete_response = client.delete(f"/api/v1/metadata/assessment-types/{payload['id']}/")
        self.assertEqual(delete_response.status_code, 204)

    def test_subject_metadata_crud_flow(self):
        client = APIClient()
        response = client.post('/api/v1/metadata/subjects/', {
            'name': 'Computer Science',
            'code': 'CS',
            'classId': 7,
            'isActive': True,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload['name'], 'Computer Science')

        retrieve = client.get(f"/api/v1/metadata/subjects/{payload['id']}/")
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['code'], 'CS')

        deleted = client.delete(f"/api/v1/metadata/subjects/{payload['id']}/")
        self.assertEqual(deleted.status_code, 204)

    def test_diagnostic_option_metadata_crud_flow(self):
        client = APIClient()
        response = client.post('/api/v1/metadata/diagnostic-options/', {
            'category': 'understanding_level',
            'code': 'STILL_LEARNING',
            'name': 'Still learning',
            'sortOrder': 4,
            'isActive': True,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload['code'], 'STILL_LEARNING')
        self.assertEqual(payload['sortOrder'], 4)

        retrieve = client.get(f"/api/v1/metadata/diagnostic-options/{payload['id']}/")
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['category'], 'understanding_level')

        update = client.put(f"/api/v1/metadata/diagnostic-options/{payload['id']}/", {
            'category': 'understanding_level',
            'code': 'STILL_LEARNING',
            'name': 'Needs more practice',
            'sortOrder': 5,
            'isActive': True,
        }, format='json')
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.json()['name'], 'Needs more practice')

        delete = client.delete(f"/api/v1/metadata/diagnostic-options/{payload['id']}/")
        self.assertEqual(delete.status_code, 204)

    def test_learning_behaviour_metadata_crud_flow(self):
        client = APIClient()
        response = client.post('/api/v1/metadata/learning-behaviours/', {
            'code': 'HIGHLY_MOTIVATED',
            'name': 'Highly motivated',
            'isActive': True,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload['name'], 'Highly motivated')

        retrieve = client.get(f"/api/v1/metadata/learning-behaviours/{payload['id']}/")
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['code'], 'HIGHLY_MOTIVATED')

        update = client.put(f"/api/v1/metadata/learning-behaviours/{payload['id']}/", {
            'code': 'HIGHLY_MOTIVATED',
            'name': 'Very motivated',
            'isActive': True,
        }, format='json')
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.json()['name'], 'Very motivated')

        delete = client.delete(f"/api/v1/metadata/learning-behaviours/{payload['id']}/")
        self.assertEqual(delete.status_code, 204)


class AssessmentSubmissionMandatoryNarrativeTests(TestCase):
    def setUp(self):
        from datetime import date
        from decimal import Decimal
        from school.models.assessment import AcademicYear, AssessmentType, Assessment, AssessmentScore, AssessmentSubject, Subject, StudentObservation, AssessmentDiagnostic, StudentLearningBehaviour, LearningBehaviourOption
        from school.models.center import Center, District, Program, Region
        from school.models.student import Student

        self.program = Program.objects.create(program_name='P1')
        self.region = Region.objects.create(program=self.program, region_name='R1', state='TN')
        self.district = District.objects.create(region=self.region, district_name='D1')
        self.centre = Center.objects.create(district=self.district, region=self.region, centre_name='C1')

        self.ay = AcademicYear.objects.create(name='2025 - 2026', start_date=date(2025, 6, 1), end_date=date(2026, 5, 31), is_current=True)
        self.exam_type = AssessmentType.objects.create(code='Q1', name='Quarterly 1')
        self.sub = Subject.objects.create(name='Math', code='MATH_5')

        self.assessment = Assessment.objects.create(
            centre=self.centre,
            academic_year_id=self.ay.academic_year_id,
            class_id=5,
            assessment_type=self.exam_type,
            assessment_date=date(2025, 9, 15),
            status=Assessment.STATUS_DRAFT,
        )

        AssessmentSubject.objects.create(
            class_id=5,
            exam_id=self.exam_type.assessment_type_id,
            academic_year_id=self.ay.academic_year_id,
            subject_ids=[self.sub.subject_id],
            max_marks=Decimal('100.00'),
            is_active=True,
        )

        self.student = Student.objects.create(full_name='Ravi Kumar', centre=self.centre, class_grade='5')
        AssessmentScore.objects.create(assessment=self.assessment, student=self.student, subject=self.sub, obtained_marks=Decimal('85.00'))

        self.behaviour_opt = LearningBehaviourOption.objects.create(code='INDEPENDENT', name='Independent')
        StudentLearningBehaviour.objects.create(assessment=self.assessment, student=self.student, behaviour_option=self.behaviour_opt)

        self.client = APIClient()

    def test_submission_fails_without_narrative_observation(self):
        # Attempt to publish/submit without narrative observation
        response = self.client.post(f'/api/v1/assessments/{self.assessment.assessment_id}/submit')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Narrative observation is mandatory', response.json().get('error', ''))

    def test_submission_fails_with_whitespace_narrative_observation(self):
        from school.models.assessment import StudentObservation
        StudentObservation.objects.create(
            assessment=self.assessment,
            student=self.student,
            key_improvements='   ',
            intervention_plan='',
        )
        response = self.client.post(f'/api/v1/assessments/{self.assessment.assessment_id}/submit')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Narrative observation is mandatory', response.json().get('error', ''))

    def test_submission_succeeds_with_valid_narrative_observation(self):
        from school.models.assessment import StudentObservation
        StudentObservation.objects.create(
            assessment=self.assessment,
            student=self.student,
            key_improvements='Shows good progress in arithmetic and problem solving.',
            intervention_plan='Encourage advanced worksheets.',
        )
        response = self.client.post(f'/api/v1/assessments/{self.assessment.assessment_id}/submit')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get('status'), 'SUBMITTED')

    def test_create_assessment_duplicate_combination_rejected(self):
        # self.assessment already exists for Class 5 and self.exam_type in self.ay
        payload = {
            'academicYearId': self.ay.academic_year_id,
            'classIds': [5],
            'assessmentTypeIds': [self.exam_type.assessment_type_id],
            'assessmentDate': '2025-10-15',
            'subjectIds': [self.sub.subject_id],
            'maxMarks': 100,
        }
        response = self.client.post('/api/v1/assessments/', data=payload, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('same exam and class combination already exists', response.json().get('error', ''))

    def test_edit_assessment_adding_new_subject_demotes_submitted_to_draft(self):
        from school.models.assessment import Assessment, Subject
        sub2 = Subject.objects.create(name='Science', code='SCI_TEST')

        # Set assessment as submitted
        self.assessment.status = Assessment.STATUS_SUBMITTED
        self.assessment.save()

        # Edit assessment by adding a new subject (sub2)
        payload = {
            'subjectIds': [self.sub.subject_id, sub2.subject_id],
            'subjectMarks': {
                str(self.sub.subject_id): 100,
                str(sub2.subject_id): 100,
            },
        }
        response = self.client.patch(
            f'/api/v1/assessments/{self.assessment.assessment_id}/',
            data=payload,
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

        # Refresh from database and verify status was demoted to DRAFT
        self.assessment.refresh_from_db()
        self.assertEqual(self.assessment.status, Assessment.STATUS_DRAFT)

    def test_delete_subject_with_submitted_marks_without_confirmation_fails(self):
        # self.sub already has an AssessmentScore entry
        payload = {
            'subjectIds': [],
            'subjectMarks': {},
            'deleteScores': False,
        }
        response = self.client.patch(
            f'/api/v1/assessments/{self.assessment.assessment_id}/',
            data=payload,
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('Marks are already submitted for that subject, do you want to delete them?', response.json().get('error', ''))

    def test_delete_subject_with_submitted_marks_with_confirmation_deletes_scores(self):
        from school.models.assessment import AssessmentScore
        # self.sub already has an AssessmentScore entry
        self.assertTrue(AssessmentScore.objects.filter(assessment=self.assessment, subject=self.sub).exists())

        payload = {
            'subjectIds': [],
            'subjectMarks': {},
            'deleteScores': True,
        }
        response = self.client.patch(
            f'/api/v1/assessments/{self.assessment.assessment_id}/',
            data=payload,
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        # Verify AssessmentScore for self.sub was deleted
        self.assertFalse(AssessmentScore.objects.filter(assessment=self.assessment, subject=self.sub).exists())

    def test_editing_marks_only_deletes_scores_for_changed_subject(self):
        from decimal import Decimal
        from school.models.assessment import AssessmentScore, AssessmentSubject, Subject
        sub2 = Subject.objects.create(name='Social Science', code='SOC_TEST')
        AssessmentSubject.objects.create(
            class_id=5,
            exam_id=self.exam_type.assessment_type_id,
            academic_year_id=self.ay.academic_year_id,
            subject_ids=[sub2.subject_id],
            max_marks=Decimal('100.00'),
            is_active=True,
        )
        AssessmentScore.objects.create(
            assessment=self.assessment,
            student=self.student,
            subject=sub2,
            obtained_marks=Decimal('90.00'),
        )

        # Both sub (Math) and sub2 (Social) have scores
        self.assertTrue(AssessmentScore.objects.filter(assessment=self.assessment, subject=self.sub).exists())
        self.assertTrue(AssessmentScore.objects.filter(assessment=self.assessment, subject=sub2).exists())

        # Change max_marks for sub2 only (from 100 to 50), keep sub at 100
        payload = {
            'subjectIds': [self.sub.subject_id, sub2.subject_id],
            'subjectMarks': {
                str(self.sub.subject_id): 100,
                str(sub2.subject_id): 50,
            },
            'deleteScores': True,
        }
        response = self.client.patch(
            f'/api/v1/assessments/{self.assessment.assessment_id}/',
            data=payload,
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

        # Only sub2 scores should be deleted; self.sub scores must remain intact!
        self.assertTrue(AssessmentScore.objects.filter(assessment=self.assessment, subject=self.sub).exists())
        self.assertFalse(AssessmentScore.objects.filter(assessment=self.assessment, subject=sub2).exists())

    def test_removing_subject_only_deletes_scores_for_removed_subject(self):
        from decimal import Decimal
        from school.models.assessment import AssessmentScore, AssessmentSubject, Subject
        sub2 = Subject.objects.create(name='English', code='ENG_TEST')
        AssessmentSubject.objects.create(
            class_id=5,
            exam_id=self.exam_type.assessment_type_id,
            academic_year_id=self.ay.academic_year_id,
            subject_ids=[sub2.subject_id],
            max_marks=Decimal('100.00'),
            is_active=True,
        )
        AssessmentScore.objects.create(
            assessment=self.assessment,
            student=self.student,
            subject=sub2,
            obtained_marks=Decimal('78.00'),
        )

        # Both sub and sub2 have scores
        self.assertTrue(AssessmentScore.objects.filter(assessment=self.assessment, subject=self.sub).exists())
        self.assertTrue(AssessmentScore.objects.filter(assessment=self.assessment, subject=sub2).exists())

        # Remove sub2, keep self.sub
        payload = {
            'subjectIds': [self.sub.subject_id],
            'subjectMarks': {
                str(self.sub.subject_id): 100,
            },
            'deleteScores': True,
        }
        response = self.client.patch(
            f'/api/v1/assessments/{self.assessment.assessment_id}/',
            data=payload,
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

        # Only sub2 scores should be deleted; self.sub scores must remain intact!
        self.assertTrue(AssessmentScore.objects.filter(assessment=self.assessment, subject=self.sub).exists())
        self.assertFalse(AssessmentScore.objects.filter(assessment=self.assessment, subject=sub2).exists())





