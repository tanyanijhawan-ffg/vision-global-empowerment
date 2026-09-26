from rest_framework import serializers

from school.models.assessment import (
    AcademicYear,
    Assessment,
    AssessmentDiagnostic,
    AssessmentScore,
    AssessmentSubject,
    AssessmentType,
    DiagnosticOption,
    LearningBehaviourOption,
    SchoolClass,
    StudentLearningBehaviour,
    StudentObservation,
    Subject,
)


class AcademicYearSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='academic_year_id', read_only=True)
    startDate = serializers.DateField(source='start_date', read_only=True)
    endDate = serializers.DateField(source='end_date', read_only=True)
    isCurrent = serializers.BooleanField(source='is_current', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)

    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'startDate', 'endDate', 'isCurrent', 'isActive']


class AssessmentTypeSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='assessment_type_id', read_only=True)
    durationMonths = serializers.IntegerField(source='duration_months', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)

    class Meta:
        model = AssessmentType
        fields = ['id', 'code', 'name', 'durationMonths', 'isActive']


class AssessmentSubjectSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='assessment_subject_id', read_only=True)
    academicYearId = serializers.IntegerField(source='academic_year_id')
    classId = serializers.IntegerField(source='class_id')
    assessmentTypeId = serializers.IntegerField(source='assessment_type_id')
    subjectId = serializers.IntegerField(source='subject_id')
    maxMarks = serializers.DecimalField(source='max_marks', max_digits=6, decimal_places=2)
    isActive = serializers.BooleanField(source='is_active')
    subjectName = serializers.SerializerMethodField()
    assessmentTypeName = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentSubject
        fields = ['id', 'academicYearId', 'classId', 'assessmentTypeId', 'subjectId', 'subjectName', 'assessmentTypeName', 'maxMarks', 'isActive']

    def get_subjectName(self, obj):
        subject = Subject.objects.filter(subject_id=obj.subject_id).first()
        return subject.name if subject else None

    def get_assessmentTypeName(self, obj):
        assessment_type = AssessmentType.objects.filter(assessment_type_id=obj.assessment_type_id).first()
        return assessment_type.name if assessment_type else None


class SchoolClassSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='class_id', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)

    class Meta:
        model = SchoolClass
        fields = ['id', 'name', 'code', 'isActive']


class SubjectSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='subject_id', read_only=True)
    classId = serializers.IntegerField(source='class_id', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)

    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'classId', 'isActive']


class AssessmentSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='assessment_id', read_only=True)
    academicYear = serializers.SerializerMethodField()
    assessmentType = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = ['id', 'status', 'academicYear', 'class_name', 'assessmentType', 'term']

    def get_academicYear(self, obj):
        return f'{obj.academic_year_id}-{str(obj.academic_year_id + 1)[-2:]}'

    def get_assessmentType(self, obj):
        return obj.assessment_type.name

    def get_class_name(self, obj):
        return f'Grade {obj.class_id}'


class AssessmentScoreSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='score_id', read_only=True)
    assessmentId = serializers.IntegerField(source='assessment_id', read_only=True)
    studentId = serializers.IntegerField(source='student_id', read_only=True)
    subjectId = serializers.IntegerField(source='subject_id', read_only=True)
    maxMarks = serializers.SerializerMethodField()
    obtainedMarks = serializers.DecimalField(source='obtained_marks', max_digits=6, decimal_places=2)

    class Meta:
        model = AssessmentScore
        fields = ['id', 'assessmentId', 'studentId', 'subjectId', 'maxMarks', 'obtainedMarks']

    def get_maxMarks(self, obj):
        assessment = obj.assessment
        config = AssessmentSubject.objects.filter(
            academic_year_id=assessment.academic_year_id,
            class_id=assessment.class_id,
            assessment_type_id=assessment.assessment_type_id,
            subject_id=obj.subject_id,
            is_active=True,
        ).order_by('-assessment_subject_id').first()
        if config and config.max_marks is not None:
            return float(config.max_marks)
        return 100.0


class AssessmentDiagnosticSerializer(serializers.ModelSerializer):
    studentId = serializers.IntegerField(source='student.student_id', read_only=True)
    subjectId = serializers.IntegerField(source='subject.subject_id', read_only=True)
    subject = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = AssessmentDiagnostic
        fields = ['studentId', 'subjectId', 'subject', 'understanding_level', 'application_ability', 'interest_level']


class DiagnosticOptionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='diagnostic_option_id', read_only=True)
    sortOrder = serializers.IntegerField(source='sort_order')
    isActive = serializers.BooleanField(source='is_active')

    class Meta:
        model = DiagnosticOption
        fields = ['id', 'category', 'code', 'name', 'sortOrder', 'isActive']


class LearningBehaviourOptionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='behaviour_option_id', read_only=True)
    isActive = serializers.BooleanField(source='is_active')

    class Meta:
        model = LearningBehaviourOption
        fields = ['id', 'code', 'name', 'isActive']


class StudentLearningBehaviourSerializer(serializers.ModelSerializer):
    studentId = serializers.IntegerField(source='student.student_id', read_only=True)
    behaviour = serializers.CharField(source='behaviour_option.name', read_only=True)

    class Meta:
        model = StudentLearningBehaviour
        fields = ['studentId', 'behaviour']


class StudentObservationSerializer(serializers.ModelSerializer):
    studentId = serializers.IntegerField(source='student.student_id', read_only=True)

    class Meta:
        model = StudentObservation
        fields = ['studentId', 'key_improvements', 'subjects_needing_support', 'intervention_plan']
