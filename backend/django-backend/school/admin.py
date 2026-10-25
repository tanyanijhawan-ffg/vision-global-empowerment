from django.contrib import admin
from .models import (
    AcademicAssessment,
    AcademicYear,
    Aspiration,
    Assessment,
    AssessmentDiagnostic,
    AssessmentScore,
    AssessmentSubmission,
    AssessmentSubject,
    AssessmentType,
    Attendance,
    Center,
    DiagnosticOption,
    District,
    Family,
    LearningBehaviour,
    LearningBehaviourOption,
    Motivation,
    Program,
    Region,
    Role,
    SchoolClass,
    SocioEconomic,
    Student,
    StudentLearningBehaviour,
    StudentObservation,
    StudentVulnerability,
    StudentClassRecord,
    Subject,
    SubjectScore,
    UserProfile,
    VulnerabilityMaster,
)


@admin.register(Center)
class CenterAdmin(admin.ModelAdmin):
    list_display = ('centre_id', 'centre_name', 'block', 'village', 'status')
    search_fields = ('centre_name', 'block', 'village')
    list_filter = ('status', 'region', 'district')


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'full_name', 'role', 'region', 'is_active')
    list_filter = ('role', 'is_active', 'region')
    search_fields = ('user__username', 'full_name')


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'full_name', 'gender', 'age', 'school_class', 'centre')
    list_filter = ('gender', 'school_class', 'centre')
    search_fields = ('full_name', 'nick_name', 'school_name')


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('attendance_id', 'student', 'attendance_date', 'status')
    list_filter = ('status', 'attendance_date', 'student__centre')
    search_fields = ('student__full_name',)


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('academic_year_id', 'name', 'start_date', 'end_date', 'is_current', 'is_active')
    list_filter = ('is_current', 'is_active')
    search_fields = ('name',)


@admin.register(AssessmentType)
class AssessmentTypeAdmin(admin.ModelAdmin):
    list_display = ('assessment_type_id', 'code', 'name', 'academic_year', 'is_active')
    list_filter = ('academic_year', 'is_active')
    search_fields = ('code', 'name')


@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ('class_id', 'name', 'code', 'is_active')
    search_fields = ('name', 'code')
    list_filter = ('is_active',)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('subject_id', 'code', 'name')
    search_fields = ('code', 'name')


@admin.register(AssessmentSubject)
class AssessmentSubjectAdmin(admin.ModelAdmin):
    list_display = ('assessment_subject_id', 'academic_year_id', 'class_id', 'exam_id', 'subject_ids', 'max_marks', 'is_active')
    list_filter = ('academic_year_id', 'class_id', 'exam_id', 'is_active')


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ('assessment_id', 'assessment_type', 'academic_year_id', 'class_id', 'assessment_date', 'status')
    list_filter = ('status', 'assessment_type', 'class_id')
    search_fields = ('assessment_type__name',)


@admin.register(AssessmentScore)
class AssessmentScoreAdmin(admin.ModelAdmin):
    list_display = ('score_id', 'assessment', 'student', 'subject', 'obtained_marks')
    list_filter = ('subject', 'assessment')
    search_fields = ('student__full_name',)


@admin.register(DiagnosticOption)
class DiagnosticOptionAdmin(admin.ModelAdmin):
    list_display = ('diagnostic_option_id', 'category', 'code', 'name', 'sort_order')
    list_filter = ('category',)
    search_fields = ('name', 'code')


@admin.register(AssessmentDiagnostic)
class AssessmentDiagnosticAdmin(admin.ModelAdmin):
    list_display = ('diagnostic_id', 'assessment', 'student', 'subject', 'understanding_level', 'application_ability', 'interest_level')
    search_fields = ('student__full_name',)


@admin.register(LearningBehaviourOption)
class LearningBehaviourOptionAdmin(admin.ModelAdmin):
    list_display = ('behaviour_option_id', 'code', 'name', 'is_active')
    search_fields = ('name', 'code')


@admin.register(StudentLearningBehaviour)
class StudentLearningBehaviourAdmin(admin.ModelAdmin):
    list_display = ('behaviour_id', 'assessment', 'student', 'behaviour_option')
    search_fields = ('student__full_name',)


@admin.register(StudentObservation)
class StudentObservationAdmin(admin.ModelAdmin):
    list_display = ('observation_id', 'assessment', 'student')
    search_fields = ('student__full_name',)


@admin.register(AssessmentSubmission)
class AssessmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ('submission_id', 'assessment', 'submitted_at', 'submitted_by')
    search_fields = ('submitted_by',)



@admin.register(StudentClassRecord)
class StudentClassRecordAdmin(admin.ModelAdmin):
    list_display = ('student_class_record_id', 'student', 'academic_year', 'school_class', 'is_active', 'promoted')
    list_filter = ('academic_year', 'school_class', 'is_active', 'promoted')
    search_fields = ('student__full_name', 'school_class__name')


admin.site.register(Program)
admin.site.register(Region)
admin.site.register(District)
admin.site.register(Family)
admin.site.register(SocioEconomic)
admin.site.register(VulnerabilityMaster)
admin.site.register(StudentVulnerability)
admin.site.register(Motivation)
admin.site.register(Aspiration)
admin.site.register(LearningBehaviour)
admin.site.register(AcademicAssessment)
admin.site.register(SubjectScore)
