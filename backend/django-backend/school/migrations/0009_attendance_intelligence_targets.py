from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('school', '0008_attendance_intelligence_setting'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendanceintelligencesetting',
            name='alert_student_mode',
            field=models.CharField(choices=[('individual', 'Individual Student'), ('combined', 'Combined Students')], default='individual', max_length=20),
        ),
        migrations.AddField(
            model_name='attendanceintelligencesetting',
            name='alert_student_ids',
            field=models.JSONField(default=list),
        ),
    ]