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
    class_grade = models.CharField(max_length=30, blank=True, null=True)
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
    def current_class_grade(self):
        if hasattr(self, 'latest_class_grade') and self.latest_class_grade is not None:
            return self.latest_class_grade
        rec = self.class_records.filter(is_active=True).order_by('-student_class_record_id').first()
        if not rec:
            rec = self.class_records.order_by('-student_class_record_id').first()
        if rec:
            return rec.class_grade
        return self.class_grade

    def __str__(self):
        return self.full_name or f'Student {self.student_id}'


class StudentClassRecord(models.Model):
    student_class_record_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='class_records')
    academic_year = models.ForeignKey('school.AcademicYear', on_delete=models.CASCADE, related_name='student_class_records')
    class_grade = models.CharField(max_length=30)
    is_active = models.BooleanField(default=True)
    promoted = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_class_record'
        unique_together = ('student', 'academic_year')

    def __str__(self):
        return f"{self.student.full_name} - {self.academic_year.name} ({self.class_grade})"

