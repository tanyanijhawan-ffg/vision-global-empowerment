from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('school', '0007_attendance_late_reason'),
    ]

    operations = [
        migrations.CreateModel(
            name='AttendanceIntelligenceSetting',
            fields=[
                ('setting_id', models.AutoField(primary_key=True, serialize=False)),
                ('notification_mode', models.CharField(choices=[('combined', 'Combined notification'), ('separate', 'Separate notifications')], default='separate', max_length=20)),
                ('notification_channels', models.JSONField(default=list)),
                ('absence_alert_enabled', models.BooleanField(default=True)),
                ('absence_alert_days', models.PositiveSmallIntegerField(default=3)),
                ('absence_alert_recipients', models.JSONField(default=list)),
                ('engagement_alert_enabled', models.BooleanField(default=True)),
                ('engagement_alert_level', models.PositiveSmallIntegerField(default=3)),
                ('engagement_alert_recipients', models.JSONField(default=list)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'db_table': 'attendance_intelligence_setting'},
        ),
    ]