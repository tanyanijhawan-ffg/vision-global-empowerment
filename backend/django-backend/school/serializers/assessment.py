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
    startDate = serializers.DateField(source='start_date', required=False)
    endDate = serializers.DateField(source='end_date', required=False)
    isCurrent = serializers.BooleanField(source='is_current', required=False, default=False)
    isActive = serializers.BooleanField(source='is_active', required=False, default=True)

    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'startDate', 'endDate', 'isCurrent', 'isActive']


class AssessmentTypeSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='assessment_type_id', read_only=True)
    academicYearId = serializers.IntegerField(source='academic_year_id', required=False, allow_null=True)
    academicYearName = serializers.SerializerMethodField()
    isActive = serializers.BooleanField(source='is_active', read_only=True)

    class Meta:
        model = AssessmentType
        fields = ['id', 'code', 'name', 'academicYearId', 'academicYearName', 'isActive']

    def get_academicYearName(self, obj):
        return obj.academic_year.name if obj.academic_year else None


class AssessmentSubjectSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='assessment_subject_id', read_only=True)
    academicYearId = serializers.IntegerField(source='academic_year_id', required=False, allow_null=True)
    centreId = serializers.IntegerField(source='centre_id', required=False, allow_null=True)
    classId = serializers.IntegerField(source='class_id', required=False, allow_null=True)
    examId = serializers.IntegerField(source='exam_id', required=False, allow_null=True)
    assessmentTypeId = serializers.IntegerField(source='exam_id', required=False, allow_null=True)
    subjectIds = serializers.JSONField(source='subject_ids', required=False)
    maxMarks = serializers.DecimalField(source='max_marks', max_digits=6, decimal_places=2, required=False)
    isActive = serializers.BooleanField(source='is_active', required=False)
    assessmentTypeName = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentSubject
        fields = ['id', 'academicYearId', 'centreId', 'classId', 'examId', 'assessmentTypeId', 'subjectIds', 'assessmentTypeName', 'maxMarks', 'isActive']

    def get_assessmentTypeName(self, obj):
        if not obj.exam_id:
            return None
        assessment_type = AssessmentType.objects.filter(assessment_type_id=obj.exam_id).first()
        return assessment_type.name if assessment_type else None


class SchoolClassSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='class_id', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)

    class Meta:
        model = SchoolClass
        fields = ['id', 'name', 'code', 'isActive']


class SubjectSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='subject_id', read_only=True)

    class Meta:
        model = Subject
        fields = ['id', 'name', 'code']


class AssessmentSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='assessment_id', read_only=True)
    academicYear = serializers.SerializerMethodField()
    assessmentType = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = ['id', 'status', 'academicYear', 'class_name', 'assessmentType']

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
        if not assessment:
            return 100.0
        configs = AssessmentSubject.objects.filter(
            class_id=assessment.class_id,
            exam_id=assessment.assessment_type_id,
            is_active=True,
        )
        if assessment.centre_id:
            c_cfg = configs.filter(centre_id=assessment.centre_id).order_by('-assessment_subject_id').first()
            if c_cfg and obj.subject_id in (c_cfg.subject_ids or []):
                return float(c_cfg.max_marks)
        cfg = configs.order_by('-assessment_subject_id').first()
        if cfg and cfg.max_marks is not None and obj.subject_id in (cfg.subject_ids or []):
            return float(cfg.max_marks)
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
