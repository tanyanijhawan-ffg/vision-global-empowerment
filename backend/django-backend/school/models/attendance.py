from django.db import models

from .student import Student


class Attendance(models.Model):
    STATUS_CHOICES = [('Present', 'Present'), ('Absent', 'Absent'), ('Late', 'Late')]
    PARTICIPATION_LEVEL_CHOICES = [(str(level), str(level)) for level in range(1, 6)]
    ATTENTION_LEVEL_CHOICES = [('Focused', 'Focused'), ('Distracted', 'Distracted'), ('Needs reminders', 'Needs reminders')]
    BEHAVIOUR_CHOICES = [('Cooperative', 'Cooperative'), ('Disruptive', 'Disruptive'), ('Silent', 'Silent'), ('Leadership behavior', 'Leadership behavior')]

    attendance_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendances')
    attendance_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, blank=True, null=True)
    time_in = models.TimeField(blank=True, null=True)
    time_out = models.TimeField(blank=True, null=True)
    absence_reason = models.TextField(blank=True, null=True)
    late_reason = models.TextField(blank=True, null=True)
    participation_level = models.CharField(max_length=1, choices=PARTICIPATION_LEVEL_CHOICES, blank=True, null=True)
    attention_level = models.CharField(max_length=100, choices=ATTENTION_LEVEL_CHOICES, blank=True, null=True)
    behaviour = models.CharField(max_length=100, choices=BEHAVIOUR_CHOICES, blank=True, null=True)
    tutor_observation = models.TextField(blank=True, null=True)
    what_was_different = models.TextField(blank=True, null=True)
    any_concern = models.TextField(blank=True, null=True)
    any_positive_change = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'attendance'
        constraints = [
            models.UniqueConstraint(fields=['student', 'attendance_date'], name='unique_student_attendance_date'),
        ]

    def __str__(self):
        return f'{self.student} - {self.attendance_date}'


class AttendanceIntelligenceSetting(models.Model):
    NOTIFICATION_MODES = [('combined', 'Combined notification'), ('separate', 'Separate notifications')]
    CHANNELS = ['email', 'sms', 'whatsapp']
    RECIPIENTS = ['facilitator', 'admin']

    setting_id = models.AutoField(primary_key=True)
    notification_mode = models.CharField(max_length=20, choices=NOTIFICATION_MODES, default='separate')
    notification_channels = models.JSONField(default=list)
    alert_student_mode = models.CharField(max_length=20, choices=[('individual', 'Individual Student'), ('combined', 'Combined Students')], default='individual')
    alert_student_ids = models.JSONField(default=list)
    absence_alert_enabled = models.BooleanField(default=True)
    absence_alert_days = models.PositiveSmallIntegerField(default=3)
    absence_alert_recipients = models.JSONField(default=list)
    engagement_alert_enabled = models.BooleanField(default=True)
    engagement_alert_level = models.PositiveSmallIntegerField(default=3)
    engagement_alert_recipients = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attendance_intelligence_setting'


class LearningBehaviour(models.Model):
    behaviour_id = models.AutoField(primary_key=True)
    attendance = models.ForeignKey(Attendance, on_delete=models.CASCADE, related_name='learning_behaviours')
    homework_completed = models.BooleanField(default=False)
    classwork_completed = models.BooleanField(default=False)
    asked_questions = models.BooleanField(default=False)
    helped_others = models.BooleanField(default=False)

    class Meta:
        db_table = 'learning_behaviour'


class AcademicAssessment(models.Model):
    assessment_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='academic_assessments')
    assessment_type = models.CharField(max_length=100, blank=True, null=True)
    assessment_date = models.DateField(blank=True, null=True)
    total = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    learning_behaviour = models.CharField(max_length=100, blank=True, null=True)
    narrative = models.TextField(blank=True, null=True)
    intervention_plan = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'academic_assessment'


class SubjectScore(models.Model):
    subject_score_id = models.AutoField(primary_key=True)
    assessment = models.ForeignKey(AcademicAssessment, on_delete=models.CASCADE, related_name='subject_scores')
    subject_name = models.CharField(max_length=100, blank=True, null=True)
    marks = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    understanding_level = models.CharField(max_length=100, blank=True, null=True)
    application_ability = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'subject_score'
