from django.db import models
from django.utils import timezone

from .center import Center


class Student(models.Model):
    student_id = models.AutoField(primary_key=True)
    centre = models.ForeignKey(Center, on_delete=models.CASCADE, related_name='students')
    full_name = models.CharField(max_length=150)
    nick_name = models.CharField(max_length=100, blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    age = models.IntegerField(blank=True, null=True)
    photo = models.FileField(upload_to='student_photos/', max_length=255, blank=True, null=True)
    school_name = models.CharField(max_length=150, blank=True, null=True)
    school_type = models.CharField(max_length=50, blank=True, null=True)
    # Class is a reference to the SchoolClass master (school.models.assessment.SchoolClass),
    # so a student's class, their class record, and assessments all point at the same row.
    school_class = models.ForeignKey(
        'school.SchoolClass',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students',
    )
    medium_of_instruction = models.CharField(max_length=50, blank=True, null=True)
    attendance_pattern = models.CharField(max_length=100, blank=True, null=True)
    previous_academic_performance = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        db_table = 'student'

    def save(self, *args, **kwargs):
        if self.dob:
            if isinstance(self.dob, str):
                from datetime import date
                self.dob = date.fromisoformat(self.dob)
            today = timezone.localdate()
            self.age = today.year - self.dob.year - ((today.month, today.day) < (self.dob.month, self.dob.day))
        super().save(*args, **kwargs)

    @property
    def current_class(self):
        """The student's current SchoolClass (from the latest class record, else the student's own FK)."""
        rec = self.class_records.filter(is_active=True).order_by('-student_class_record_id').first()
        if not rec:
            rec = self.class_records.order_by('-student_class_record_id').first()
        if rec and rec.school_class_id:
            return rec.school_class
        return self.school_class

    @property
    def current_class_grade(self):
        """Display string for the current class (e.g. 'Class 8')."""
        current = self.current_class
        return current.name if current else None

    @property
    def class_grade(self):
        """Backwards-compatible read access to the current class name.

        The old class_grade column is gone; class now lives in the school_class FK.
        This property lets existing code read student.class_grade and get the name.
        """
        return self.current_class_grade

    def __str__(self):
        return self.full_name or f'Student {self.student_id}'


class StudentClassRecord(models.Model):
    student_class_record_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='class_records')
    academic_year = models.ForeignKey('school.AcademicYear', on_delete=models.CASCADE, related_name='student_class_records')
    # Reference to the SchoolClass master instead of a free-text grade string.
    # Nullable so existing/legacy rows (and students with no class yet) are valid.
    school_class = models.ForeignKey(
        'school.SchoolClass',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='student_class_records',
    )
    is_active = models.BooleanField(default=True)
    promoted = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_class_record'
        unique_together = ('student', 'academic_year')

    @property
    def class_grade(self):
        """Backwards-compatible display string for the class (e.g. 'Class 8')."""
        return self.school_class.name if self.school_class else ''

    def __str__(self):
        return f"{self.student.full_name} - {self.academic_year.name} ({self.class_grade})"

