from django.apps import AppConfig


class SchoolConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'school'

    def ready(self):
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("""
                    DROP TABLE IF EXISTS assessment_assessment_types CASCADE;
                    ALTER TABLE assessment DROP COLUMN IF EXISTS assessment_type_ids;
                    ALTER TABLE assessment DROP COLUMN IF EXISTS class_ids;
                    ALTER TABLE assessment_subject DROP COLUMN IF EXISTS class_ids;
                    ALTER TABLE assessment_subject DROP COLUMN IF EXISTS exam_ids;
                    DELETE FROM assessment_subject
                    WHERE (subject_ids = '[]'::jsonb OR subject_ids IS NULL)
                    AND EXISTS (
                        SELECT 1 FROM assessment_subject s2
                        WHERE s2.class_id = assessment_subject.class_id
                        AND s2.exam_id = assessment_subject.exam_id
                        AND s2.subject_ids != '[]'::jsonb
                    );
                """)
        except Exception:
            pass
