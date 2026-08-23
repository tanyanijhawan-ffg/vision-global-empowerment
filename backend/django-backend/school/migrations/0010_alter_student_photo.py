from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('school', '0009_attendance_intelligence_targets'),
    ]

    operations = [
        migrations.AlterField(
            model_name='student',
            name='photo',
            field=models.FileField(blank=True, max_length=255, null=True, upload_to='student_photos/'),
        ),
    ]