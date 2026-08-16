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
