from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from school.models.assessment import (
    AcademicYear,
    AssessmentScore,
    AssessmentSubject,
    AssessmentType,
    DiagnosticOption,
    LearningBehaviourOption,
    SchoolClass,
    Section,
    Subject,
)
from school.serializers.assessment import (
    AcademicYearSerializer,
    AssessmentScoreSerializer,
    AssessmentSubjectSerializer,
    AssessmentTypeSerializer,
    DiagnosticOptionSerializer,
    LearningBehaviourOptionSerializer,
    SchoolClassSerializer,
    SectionSerializer,
    SubjectSerializer,
)


class AcademicYearMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = AcademicYear.objects.filter(is_active=True).order_by('academic_year_id')
    serializer_class = AcademicYearSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'startDate' in payload:
            payload['start_date'] = payload.pop('startDate')
        if 'endDate' in payload:
            payload['end_date'] = payload.pop('endDate')
        if 'isCurrent' in payload:
            payload['is_current'] = payload.pop('isCurrent')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AcademicYearMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = AcademicYear.objects.all().order_by('academic_year_id')
    serializer_class = AcademicYearSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'startDate' in payload:
            payload['start_date'] = payload.pop('startDate')
        if 'endDate' in payload:
            payload['end_date'] = payload.pop('endDate')
        if 'isCurrent' in payload:
            payload['is_current'] = payload.pop('isCurrent')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class SchoolClassMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = SchoolClass.objects.filter(is_active=True).order_by('class_id')
    serializer_class = SchoolClassSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SchoolClassMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = SchoolClass.objects.all().order_by('class_id')
    serializer_class = SchoolClassSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class SectionMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = Section.objects.filter(is_active=True).order_by('section_id')
    serializer_class = SectionSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'classId' in payload:
            payload['class_id'] = payload.pop('classId')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SectionMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = Section.objects.all().order_by('section_id')
    serializer_class = SectionSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'classId' in payload:
            payload['class_id'] = payload.pop('classId')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AssessmentTypeMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentType.objects.filter(is_active=True).order_by('assessment_type_id')
    serializer_class = AssessmentTypeSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'durationMonths' in payload:
            payload['duration_months'] = payload.pop('durationMonths')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AssessmentSubjectMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentSubject.objects.filter(is_active=True).order_by('assessment_subject_id')
    serializer_class = AssessmentSubjectSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'academicYearId' in payload:
            payload['academic_year_id'] = payload.pop('academicYearId')
        if 'classId' in payload:
            payload['class_id'] = payload.pop('classId')
        if 'assessmentTypeId' in payload:
            payload['assessment_type_id'] = payload.pop('assessmentTypeId')
        if 'subjectId' in payload:
            payload['subject_id'] = payload.pop('subjectId')
        if 'maxMarks' in payload:
            payload['max_marks'] = payload.pop('maxMarks')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AssessmentSubjectMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentSubject.objects.all().order_by('assessment_subject_id')
    serializer_class = AssessmentSubjectSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'academicYearId' in payload:
            payload['academic_year_id'] = payload.pop('academicYearId')
        if 'classId' in payload:
            payload['class_id'] = payload.pop('classId')
        if 'assessmentTypeId' in payload:
            payload['assessment_type_id'] = payload.pop('assessmentTypeId')
        if 'subjectId' in payload:
            payload['subject_id'] = payload.pop('subjectId')
        if 'maxMarks' in payload:
            payload['max_marks'] = payload.pop('maxMarks')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AssessmentTypeMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentType.objects.all().order_by('assessment_type_id')
    serializer_class = AssessmentTypeSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'durationMonths' in payload:
            payload['duration_months'] = payload.pop('durationMonths')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubjectMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = Subject.objects.filter(is_active=True).order_by('subject_id')
    serializer_class = SubjectSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'classId' in payload:
            payload['class_id'] = payload.pop('classId')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SubjectMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = Subject.objects.all().order_by('subject_id')
    serializer_class = SubjectSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'classId' in payload:
            payload['class_id'] = payload.pop('classId')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AssessmentScoreListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentScore.objects.all().order_by('score_id')
    serializer_class = AssessmentScoreSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        assessment_id = self.request.query_params.get('assessmentId')
        student_id = self.request.query_params.get('studentId')
        subject_id = self.request.query_params.get('subjectId')
        if assessment_id is not None:
            queryset = queryset.filter(assessment_id=assessment_id)
        if student_id is not None:
            queryset = queryset.filter(student_id=student_id)
        if subject_id is not None:
            queryset = queryset.filter(subject_id=subject_id)
        return queryset

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'assessmentId' in payload:
            payload['assessment_id'] = payload.pop('assessmentId')
        if 'studentId' in payload:
            payload['student_id'] = payload.pop('studentId')
        if 'subjectId' in payload:
            payload['subject_id'] = payload.pop('subjectId')
        if 'obtainedMarks' in payload:
            payload['obtained_marks'] = payload.pop('obtainedMarks')
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AssessmentScoreDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentScore.objects.all().order_by('score_id')
    serializer_class = AssessmentScoreSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'assessmentId' in payload:
            payload['assessment_id'] = payload.pop('assessmentId')
        if 'studentId' in payload:
            payload['student_id'] = payload.pop('studentId')
        if 'subjectId' in payload:
            payload['subject_id'] = payload.pop('subjectId')
        if 'obtainedMarks' in payload:
            payload['obtained_marks'] = payload.pop('obtainedMarks')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class DiagnosticOptionMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = DiagnosticOption.objects.filter(is_active=True).order_by('diagnostic_option_id')
    serializer_class = DiagnosticOptionSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'sortOrder' in payload:
            payload['sort_order'] = payload.pop('sortOrder')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DiagnosticOptionMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = DiagnosticOption.objects.all().order_by('diagnostic_option_id')
    serializer_class = DiagnosticOptionSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'sortOrder' in payload:
            payload['sort_order'] = payload.pop('sortOrder')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class LearningBehaviourOptionMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = LearningBehaviourOption.objects.filter(is_active=True).order_by('behaviour_option_id')
    serializer_class = LearningBehaviourOptionSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LearningBehaviourOptionMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = LearningBehaviourOption.objects.all().order_by('behaviour_option_id')
    serializer_class = LearningBehaviourOptionSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)
