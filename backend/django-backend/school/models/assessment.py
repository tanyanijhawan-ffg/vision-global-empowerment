from django.db import models

from .student import Student


class AssessmentType(models.Model):
    assessment_type_id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    duration_months = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'assessment_type'

    def __str__(self):
        return self.name


class Subject(models.Model):
    subject_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, blank=True, null=True)
    class_id = models.IntegerField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'subject'

    def __str__(self):
        return self.name


class Assessment(models.Model):
    STATUS_DRAFT = 'DRAFT'
    STATUS_SUBMITTED = 'SUBMITTED'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_SUBMITTED, 'Submitted'),
    ]

    assessment_id = models.AutoField(primary_key=True)
    academic_year_id = models.IntegerField()
    class_id = models.IntegerField()
    section_id = models.IntegerField(default=1)
    assessment_type = models.ForeignKey(AssessmentType, on_delete=models.CASCADE, related_name='assessments')
    term = models.CharField(max_length=20)
    assessment_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assessment'

    def __str__(self):
        return f'{self.assessment_type.name} {self.term}'


class AssessmentScore(models.Model):
    score_id = models.AutoField(primary_key=True)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='scores')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='assessment_scores')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='assessment_scores')
    obtained_marks = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    max_marks = models.DecimalField(max_digits=6, decimal_places=2, default=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assessment_score'


class DiagnosticOption(models.Model):
    CATEGORY_UNDERSTANDING = 'understanding_level'
    CATEGORY_APPLICATION = 'application_ability'
    CATEGORY_INTEREST = 'interest_level'
    CATEGORY_CHOICES = [
        (CATEGORY_UNDERSTANDING, 'Understanding Level'),
        (CATEGORY_APPLICATION, 'Application Ability'),
        (CATEGORY_INTEREST, 'Interest Level'),
    ]

    diagnostic_option_id = models.AutoField(primary_key=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'diagnostic_option'
        unique_together = ('category', 'code')


class AssessmentDiagnostic(models.Model):
    diagnostic_id = models.AutoField(primary_key=True)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='diagnostics')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='assessment_diagnostics')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='assessment_diagnostics')
    understanding_level = models.CharField(max_length=50, blank=True, null=True)
    application_ability = models.CharField(max_length=50, blank=True, null=True)
    interest_level = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assessment_diagnostic'


class LearningBehaviourOption(models.Model):
    behaviour_option_id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'learning_behaviour_option'


class StudentLearningBehaviour(models.Model):
    behaviour_id = models.AutoField(primary_key=True)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='student_behaviours')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='student_behaviours')
    behaviour_option = models.ForeignKey(LearningBehaviourOption, on_delete=models.CASCADE, related_name='students')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_learning_behaviour'


class StudentObservation(models.Model):
    observation_id = models.AutoField(primary_key=True)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='observations')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='observations')
    key_improvements = models.TextField(blank=True, null=True)
    subjects_needing_support = models.TextField(blank=True, null=True)
    intervention_plan = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_observation'


class AssessmentSubmission(models.Model):
    submission_id = models.AutoField(primary_key=True)
    assessment = models.OneToOneField(Assessment, on_delete=models.CASCADE, related_name='submission')
    submitted_at = models.DateTimeField(auto_now_add=True)
    submitted_by = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'assessment_submission'
