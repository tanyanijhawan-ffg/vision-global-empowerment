from rest_framework import serializers

from school.models.assessment import (
    Assessment,
    AssessmentDiagnostic,
    AssessmentScore,
    AssessmentType,
    DiagnosticOption,
    LearningBehaviourOption,
    StudentLearningBehaviour,
    StudentObservation,
    Subject,
)


class AssessmentTypeSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='assessment_type_id', read_only=True)
    durationMonths = serializers.IntegerField(source='duration_months', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)

    class Meta:
        model = AssessmentType
        fields = ['id', 'code', 'name', 'durationMonths', 'isActive']


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
    section = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = ['id', 'status', 'academicYear', 'class_name', 'section', 'assessmentType', 'term']

    def get_academicYear(self, obj):
        return f'{obj.academic_year_id}-{str(obj.academic_year_id + 1)[-2:]}'

    def get_assessmentType(self, obj):
        return obj.assessment_type.name

    def get_class_name(self, obj):
        return f'Grade {obj.class_id}'

    def get_section(self, obj):
        return chr(64 + obj.section_id) if obj.section_id else 'A'


class AssessmentScoreSerializer(serializers.ModelSerializer):
    subjectId = serializers.IntegerField(source='subject.subject_id', read_only=True)
    subject = serializers.CharField(source='subject.name', read_only=True)
    maxMarks = serializers.DecimalField(source='max_marks', max_digits=6, decimal_places=2, read_only=True)
    obtainedMarks = serializers.DecimalField(source='obtained_marks', max_digits=6, decimal_places=2, read_only=True)

    class Meta:
        model = AssessmentScore
        fields = ['subjectId', 'subject', 'maxMarks', 'obtainedMarks']


class AssessmentDiagnosticSerializer(serializers.ModelSerializer):
    studentId = serializers.IntegerField(source='student.student_id', read_only=True)
    subjectId = serializers.IntegerField(source='subject.subject_id', read_only=True)
    subject = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = AssessmentDiagnostic
        fields = ['studentId', 'subjectId', 'subject', 'understanding_level', 'application_ability', 'interest_level']


class DiagnosticOptionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='diagnostic_option_id', read_only=True)
    sortOrder = serializers.IntegerField(source='sort_order', read_only=True)

    class Meta:
        model = DiagnosticOption
        fields = ['id', 'category', 'code', 'name', 'sortOrder']


class LearningBehaviourOptionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='behaviour_option_id', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)

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
