from django.db import migrations


def retain_email_channel(apps, schema_editor):
    Setting = apps.get_model('school', 'AttendanceIntelligenceSetting')
    for setting in Setting.objects.all().iterator():
        setting.notification_channels = ['email'] if 'email' in (setting.notification_channels or []) else []
        setting.save(update_fields=['notification_channels'])


class Migration(migrations.Migration):
    dependencies = [
        ('school', '0009_attendance_intelligence_targets'),
    ]

    operations = [
        migrations.RunPython(retain_email_channel, migrations.RunPython.noop),
    ]
