# Class becomes a reference to the SchoolClass master.
# 1. Add school_class FK columns (nullable).
# 2. Data-map existing class_grade strings onto school_class via the resolver.
# 3. Drop the old free-text class_grade columns.

import re

from django.db import migrations, models
import django.db.models.deletion


def _grade_number(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    match = re.search(r"\d+", text)
    return int(match.group()) if match else None


def _resolve(SchoolClass, value):
    """Resolve a grade string to a SchoolClass row (no duplicates)."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    by_name = SchoolClass.objects.filter(name__iexact=text).first()
    if by_name:
        return by_name
    number = _grade_number(text)
    if number is None:
        return None
    for klass in SchoolClass.objects.all():
        if _grade_number(klass.name) == number:
            return klass
    # Register the class once under a canonical name so a new grade isn't duplicated.
    obj, _ = SchoolClass.objects.get_or_create(
        name=f"Class {number}",
        defaults={"code": f"CLASS_{number}", "is_active": True},
    )
    return obj


def map_grades_to_school_class(apps, schema_editor):
    Student = apps.get_model("school", "Student")
    StudentClassRecord = apps.get_model("school", "StudentClassRecord")
    SchoolClass = apps.get_model("school", "SchoolClass")

    for student in Student.objects.all():
        klass = _resolve(SchoolClass, student.class_grade)
        if klass:
            student.school_class = klass
            student.save(update_fields=["school_class"])

    for record in StudentClassRecord.objects.all():
        klass = _resolve(SchoolClass, record.class_grade)
        if klass:
            record.school_class = klass
            record.save(update_fields=["school_class"])


class Migration(migrations.Migration):

    dependencies = [
        ('school', '0033_merge_20261025_0855'),
    ]

    operations = [
        # 1. Add the FK columns first (nullable) so existing rows stay valid.
        migrations.AddField(
            model_name='student',
            name='school_class',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='students', to='school.schoolclass'),
        ),
        migrations.AddField(
            model_name='studentclassrecord',
            name='school_class',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='student_class_records', to='school.schoolclass'),
        ),
        # 2. Copy existing grade strings onto the FK.
        migrations.RunPython(map_grades_to_school_class, reverse_code=migrations.RunPython.noop),
        # 3. Drop the old free-text columns.
        migrations.RemoveField(model_name='student', name='class_grade'),
        migrations.RemoveField(model_name='studentclassrecord', name='class_grade'),
    ]
