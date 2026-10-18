from django.db import models
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework.permissions import AllowAny

from school.models.student import Student
from school.views.student import get_latest_class_subquery
from services.serializers.student_profile import StudentProfileSerializer


class StudentProfileListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = Student.objects.select_related('centre').all()
    serializer_class = StudentProfileSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['centre__centre_id', 'gender']

    def get_queryset(self):
        queryset = super().get_queryset().annotate(latest_class_grade=get_latest_class_subquery())
        centre_id = self.request.query_params.get('centre_id') or self.request.query_params.get('center_id')
        gender = self.request.query_params.get('gender')
        class_grade = self.request.query_params.get('class_grade')

        if centre_id is not None:
            queryset = queryset.filter(centre__centre_id=centre_id)
        if gender is not None:
            queryset = queryset.filter(gender__iexact=gender)
        if class_grade is not None:
            clean_grade = class_grade.strip()
            queryset = queryset.filter(
                models.Q(latest_class_grade__iexact=clean_grade) |
                (models.Q(latest_class_grade__isnull=True) & models.Q(class_grade__iexact=clean_grade))
            ).distinct()
        return queryset



class StudentProfileRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = Student.objects.select_related('centre').all()
    serializer_class = StudentProfileSerializer
    lookup_field = 'student_id'

    def get_queryset(self):
        return super().get_queryset().annotate(latest_class_grade=get_latest_class_subquery())
