from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from school.models.center import Program, Region
from school.models.role import Role
from school.models.user_profile import UserProfile

User = get_user_model()


class UserRBACAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.program = Program.objects.create(program_name='Test Program')
        cls.region_north = Region.objects.create(program=cls.program, region_name='North Region')
        cls.region_south = Region.objects.create(program=cls.program, region_name='South Region')

        cls.role_super_admin = Role.objects.create(name='super_admin')
        cls.role_regional_admin = Role.objects.create(name='regional_admin')
        cls.role_facilitator = Role.objects.create(name='facilitator')

        cls.super_user = User.objects.create_user(username='superadmin', email='super@vision.org', password='TestPass123!')
        cls.super_profile = UserProfile.objects.create(
            user=cls.super_user,
            role=cls.role_super_admin,
            region=cls.region_north,
            created_by=cls.super_user,
        )

        cls.regional_user = User.objects.create_user(username='regionaladmin', email='regional@vision.org', password='TestPass123!')
        cls.regional_profile = UserProfile.objects.create(
            user=cls.regional_user,
            role=cls.role_regional_admin,
            region=cls.region_north,
            created_by=cls.super_user,
        )

        cls.facilitator_user = User.objects.create_user(username='facilitator', email='facilitator@vision.org', password='TestPass123!')
        UserProfile.objects.create(
            user=cls.facilitator_user,
            role=cls.role_facilitator,
            region=cls.region_north,
            created_by=cls.regional_user,
        )

    def test_super_admin_can_create_regional_admin_for_any_region(self):
        client = APIClient()
        client.force_authenticate(user=self.super_user)

        response = client.post('/api/users/', {
            'username': 'regional_two',
            'email': 'regional2@vision.org',
            'password': 'TestPass123!',
            'role': 'regional_admin',
            'region': self.region_south.region_id,
            'full_name': 'Regional Two',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['role'], 'regional_admin')
        self.assertEqual(response.data['region_id'], self.region_south.region_id)

    def test_regional_admin_can_only_create_facilitators_in_same_region(self):
        client = APIClient()
        client.force_authenticate(user=self.regional_user)

        same_region_response = client.post('/api/users/', {
            'username': 'fac_same_region',
            'email': 'facsame@vision.org',
            'password': 'TestPass123!',
            'role': 'facilitator',
            'region': self.region_north.region_id,
            'full_name': 'Facilitator Same',
        }, format='json')

        self.assertEqual(same_region_response.status_code, 201, same_region_response.data)

        other_region_response = client.post('/api/users/', {
            'username': 'fac_other_region',
            'email': 'facother@vision.org',
            'password': 'TestPass123!',
            'role': 'facilitator',
            'region': self.region_south.region_id,
            'full_name': 'Facilitator Other',
        }, format='json')

        self.assertEqual(other_region_response.status_code, 403)

    def test_regional_admin_cannot_create_another_regional_admin(self):
        client = APIClient()
        client.force_authenticate(user=self.regional_user)

        response = client.post('/api/users/', {
            'username': 'regional_two2',
            'email': 'regional22@vision.org',
            'password': 'TestPass123!',
            'role': 'regional_admin',
            'region': self.region_north.region_id,
            'full_name': 'Regional Try',
        }, format='json')

        self.assertEqual(response.status_code, 403)

    def test_facilitator_cannot_create_users(self):
        client = APIClient()
        client.force_authenticate(user=self.facilitator_user)

        response = client.post('/api/users/', {
            'username': 'fac_attempt',
            'email': 'facattempt@vision.org',
            'password': 'TestPass123!',
            'role': 'facilitator',
            'region': self.region_north.region_id,
            'full_name': 'Facilitator Attempt',
        }, format='json')

        self.assertEqual(response.status_code, 403)

    def test_login_returns_role_and_region_from_db(self):
        client = APIClient()

        response = client.post('/api/auth/login/', {
            'username': 'regionaladmin',
            'password': 'TestPass123!',
        }, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['user']['role'], 'regional_admin')
        self.assertEqual(response.data['user']['region_id'], self.region_north.region_id)
