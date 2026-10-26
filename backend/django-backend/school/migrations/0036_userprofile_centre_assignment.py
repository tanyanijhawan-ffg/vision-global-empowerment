from django.db import migrations, models
import django.db.models.deletion
from django.db.models import Q


def backfill_centre_assignments(apps, schema_editor):
    UserProfile = apps.get_model('school', 'UserProfile')
    Center = apps.get_model('school', 'Center')
    database = schema_editor.connection.alias

    profiles = UserProfile.objects.using(database).filter(
        role__name__in=('facilitator', 'community_educator'),
        centre__isnull=True,
    ).exclude(full_name__isnull=True).exclude(full_name='')
    for profile in profiles.iterator():
        candidates = Center.objects.using(database).filter(facilitator_name__iexact=profile.full_name.strip())
        if profile.region_id:
            candidates = candidates.filter(Q(region_id=profile.region_id) | Q(district__region_id=profile.region_id))
        candidate_ids = list(candidates.values_list('pk', flat=True)[:2])
        if len(candidate_ids) == 1:
            UserProfile.objects.using(database).filter(pk=profile.pk).update(centre_id=candidate_ids[0])


class Migration(migrations.Migration):
    dependencies = [
        ('school', '0035_remove_center_centre_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='centre',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='educator_profiles',
                to='school.center',
            ),
        ),
        migrations.RunPython(backfill_centre_assignments, migrations.RunPython.noop),
    ]