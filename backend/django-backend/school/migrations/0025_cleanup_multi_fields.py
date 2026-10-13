from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('school', '0024_alter_assessmentsubject_unique_together_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DROP TABLE IF EXISTS assessment_assessment_types CASCADE;
            ALTER TABLE assessment DROP COLUMN IF EXISTS assessment_type_ids;
            ALTER TABLE assessment DROP COLUMN IF EXISTS class_ids;
            ALTER TABLE assessment_subject DROP COLUMN IF EXISTS class_ids;
            ALTER TABLE assessment_subject DROP COLUMN IF EXISTS exam_ids;
            """,
            reverse_sql="",
        ),
    ]
