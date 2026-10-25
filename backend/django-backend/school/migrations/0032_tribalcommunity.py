from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('school', '0031_delete_studentyearrecord'),
    ]

    operations = [
        migrations.CreateModel(
            name='TribalCommunity',
            fields=[
                ('tribal_community_id', models.AutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=150, unique=True)),
            ],
            options={
                'db_table': 'tribal_community',
                'ordering': ['name'],
            },
        ),
    ]
