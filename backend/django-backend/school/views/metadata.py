from decimal import Decimal

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


class AssessmentTypeMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentType.objects.filter(is_active=True).order_by('assessment_type_id')
    serializer_class = AssessmentTypeSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()

        # Resolve academic year ID — keep field name as 'academicYearId' for serializer
        if 'academicYearId' not in payload and 'academicYear' in payload:
            ay_val = payload.pop('academicYear')
            ay_obj = AcademicYear.objects.filter(name__iexact=str(ay_val).strip()).first()
            if ay_obj:
                payload['academicYearId'] = ay_obj.academic_year_id
        # Auto-assign current academic year if still not set
        if not payload.get('academicYearId'):
            current_ay = AcademicYear.objects.filter(is_current=True).first()
            if current_ay:
                payload['academicYearId'] = current_ay.academic_year_id

        if 'maxMarks' in payload:
            payload.pop('maxMarks')
        if 'isActive' in payload:
            payload['isActive'] = payload.pop('isActive')

        code = str(payload.get('code', '')).strip().upper()
        name = str(payload.get('name', '')).strip()
        payload['code'] = code
        payload['name'] = name
        ay_id = payload.get('academicYearId')

        if code:
            existing_query = AssessmentType.objects.filter(code__iexact=code, is_active=True)
            if ay_id:
                existing_query = existing_query.filter(academic_year_id=ay_id)
            existing = existing_query.first()
            if existing:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

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

        # Normalise aliases — keep all keys as camelCase so the serializer
        # can use its source= mapping (camelCase → snake_case).
        if 'assessmentTypeId' in payload and 'examId' not in payload:
            payload['examId'] = payload.pop('assessmentTypeId')

        if 'subjectId' in payload and 'subjectIds' not in payload:
            sid = payload.pop('subjectId')
            payload['subjectIds'] = [sid] if not isinstance(sid, list) else sid

        # Resolve duplicate check using the camelCase keys directly
        class_id = payload.get('classId')
        exam_id = payload.get('examId')
        centre_id = payload.get('centreId')

        if class_id and exam_id:
            filter_kwargs = {'class_id': class_id, 'exam_id': exam_id}
            if centre_id is not None:
                filter_kwargs['centre_id'] = centre_id
            existing = AssessmentSubject.objects.filter(**filter_kwargs).first()
            if existing:
                if 'maxMarks' in payload or 'max_marks' in payload:
                    val = payload.get('maxMarks') or payload.get('max_marks')
                    if val is not None:
                        existing.max_marks = Decimal(str(val))
                if 'subjectIds' in payload or 'subject_ids' in payload:
                    sids = payload.get('subjectIds') or payload.get('subject_ids')
                    if sids is not None:
                        existing.subject_ids = sids
                existing.save()
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

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

        # Keep camelCase keys — the serializer fields use source= to map to snake_case.
        # Only normalise aliases that don't have a direct camelCase field.
        if 'assessmentTypeId' in payload and 'examId' not in payload:
            payload['examId'] = payload.pop('assessmentTypeId')

        if 'subjectId' in payload and 'subjectIds' not in payload:
            sid = payload.pop('subjectId')
            payload['subjectIds'] = [sid] if not isinstance(sid, list) else sid

        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=payload, partial=partial)
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
        AssessmentSubject.objects.filter(exam_id=instance.pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubjectMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = Subject.objects.all().order_by('subject_id')
    serializer_class = SubjectSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'classId' in payload:
            payload.pop('classId')
        if 'class_id' in payload:
            payload.pop('class_id')
        if 'isActive' in payload:
            payload.pop('isActive')
        if 'is_active' in payload:
            payload.pop('is_active')

        code = str(payload.get('code', '')).strip().upper()
        name = str(payload.get('name', '')).strip()
        payload['code'] = code
        payload['name'] = name

        if code:
            existing = Subject.objects.filter(code__iexact=code).first()
            if existing:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

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
            payload.pop('classId')
        if 'class_id' in payload:
            payload.pop('class_id')
        if 'isActive' in payload:
            payload.pop('isActive')
        if 'is_active' in payload:
            payload.pop('is_active')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
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
