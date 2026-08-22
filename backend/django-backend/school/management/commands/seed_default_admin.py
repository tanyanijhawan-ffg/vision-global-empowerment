from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from school.models.center import Program, Region
from school.models.role import Role
from school.models.user_profile import UserProfile

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a default backend admin user and the required role metadata.'

    def handle(self, *args, **options):
        program, _ = Program.objects.get_or_create(program_name='Default Program', defaults={'status': 'active'})
        region, _ = Region.objects.get_or_create(
            region_name='North Region',
            defaults={'program': program, 'state': 'Tamil Nadu', 'status': 'active'},
        )

        role_map = {
            'super_admin': Role.objects.get_or_create(name='super_admin')[0],
            'regional_admin': Role.objects.get_or_create(name='regional_admin')[0],
            'facilitator': Role.objects.get_or_create(name='facilitator')[0],
        }

        user, created = User.objects.get_or_create(
            username='superadmin',
            defaults={
                'email': 'superadmin@visionsglobal.org',
                'first_name': 'Super',
                'last_name': 'Admin',
                'is_active': True,
            },
        )

        if created or not user.has_usable_password():
            user.set_password('TestPass123!')
            user.save(update_fields=['password'])

        profile, profile_created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'role': role_map['super_admin'],
                'region': region,
                'full_name': 'Super Admin',
                'created_by': user,
                'is_active': True,
            },
        )

        if not profile_created:
            profile.role = role_map['super_admin']
            profile.region = region
            profile.full_name = 'Super Admin'
            profile.created_by = user
            profile.is_active = True
            profile.save()

        self.stdout.write(self.style.SUCCESS('Seeded default super admin user: superadmin / TestPass123!'))
