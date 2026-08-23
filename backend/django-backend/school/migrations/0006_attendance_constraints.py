from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('school', '0005_alter_role_name_userprofile'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendance', name='what_was_different', field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='attendance', name='any_concern', field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='attendance', name='any_positive_change', field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='attendance',
            name='status',
            field=models.CharField(blank=True, choices=[('Present', 'Present'), ('Absent', 'Absent'), ('Late', 'Late')], max_length=20, null=True),
        ),
        migrations.AlterField(
            model_name='attendance',
            name='participation_level',
            field=models.CharField(blank=True, choices=[('1', '1'), ('2', '2'), ('3', '3'), ('4', '4'), ('5', '5')], max_length=1, null=True),
        ),
        migrations.AlterField(
            model_name='attendance',
            name='attention_level',
            field=models.CharField(blank=True, choices=[('Focused', 'Focused'), ('Distracted', 'Distracted'), ('Needs reminders', 'Needs reminders')], max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='attendance',
            name='behaviour',
            field=models.CharField(blank=True, choices=[('Cooperative', 'Cooperative'), ('Disruptive', 'Disruptive'), ('Silent', 'Silent'), ('Leadership behavior', 'Leadership behavior')], max_length=100, null=True),
        ),
        migrations.AddConstraint(
            model_name='attendance',
            constraint=models.UniqueConstraint(fields=('student', 'attendance_date'), name='unique_student_attendance_date'),
        ),
    ]