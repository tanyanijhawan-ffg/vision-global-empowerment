from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from school.models.assessment import (
    AssessmentType,
    DiagnosticOption,
    LearningBehaviourOption,
    Subject,
)
from school.serializers.assessment import (
    AssessmentTypeSerializer,
    DiagnosticOptionSerializer,
    LearningBehaviourOptionSerializer,
    SubjectSerializer,
)


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


class DiagnosticOptionMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = DiagnosticOption.objects.all().order_by('diagnostic_option_id')
    serializer_class = DiagnosticOptionSerializer


class DiagnosticOptionMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = DiagnosticOption.objects.all().order_by('diagnostic_option_id')
    serializer_class = DiagnosticOptionSerializer


class LearningBehaviourOptionMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = LearningBehaviourOption.objects.filter(is_active=True).order_by('behaviour_option_id')
    serializer_class = LearningBehaviourOptionSerializer


class LearningBehaviourOptionMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = LearningBehaviourOption.objects.all().order_by('behaviour_option_id')
    serializer_class = LearningBehaviourOptionSerializer

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)
