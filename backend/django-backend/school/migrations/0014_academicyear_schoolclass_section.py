from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('school', '0013_assessmentsubject'),
    ]

    operations = [
        migrations.CreateModel(
            name='AcademicYear',
            fields=[
                ('academic_year_id', models.AutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=20, unique=True)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('is_current', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'academic_year',
            },
        ),
        migrations.CreateModel(
            name='SchoolClass',
            fields=[
                ('class_id', models.AutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('code', models.CharField(blank=True, max_length=50, null=True, unique=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'class',
            },
        ),
        migrations.CreateModel(
            name='Section',
            fields=[
                ('section_id', models.AutoField(primary_key=True, serialize=False)),
                ('class_id', models.IntegerField()),
                ('name', models.CharField(max_length=100)),
                ('code', models.CharField(blank=True, max_length=50, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'section',
                'unique_together': {('class_id', 'name')},
            },
        ),
    ]
