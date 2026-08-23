from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('school', '0006_attendance_constraints'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendance',
            name='late_reason',
            field=models.TextField(blank=True, null=True),
        ),
    ]