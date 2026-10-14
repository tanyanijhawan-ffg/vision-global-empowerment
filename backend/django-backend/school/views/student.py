from django.db import models
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework.permissions import AllowAny

from school.models.student import Student, StudentYearRecord
from school.serializers.student import StudentSerializer


class StudentListView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = Student.objects.select_related('centre').all()
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['centre__centre_id', 'gender', 'class_grade', 'school_name']

    def get_queryset(self):
        queryset = super().get_queryset()
        centre_id = self.request.query_params.get('centreId') or self.request.query_params.get('center_id')
        gender = self.request.query_params.get('gender')
        class_grade = self.request.query_params.get('classGrade') or self.request.query_params.get('class_grade')
        academic_year_id = self.request.query_params.get('academicYearId') or self.request.query_params.get('academic_year_id')
        academic_year = self.request.query_params.get('academicYear') or self.request.query_params.get('academic_year')

        if centre_id is not None:
            queryset = queryset.filter(centre__centre_id=centre_id)
        if gender is not None:
            queryset = queryset.filter(gender__iexact=gender)
        if class_grade is not None:
            clean_grade = class_grade.strip()
            if clean_grade.isdigit():
                queryset = queryset.filter(models.Q(class_grade__iexact=clean_grade) | models.Q(class_grade__iexact=f'Class {clean_grade}'))
            else:
                queryset = queryset.filter(class_grade__iexact=clean_grade)

        if academic_year_id:
            queryset = queryset.filter(year_records__academic_year_id=academic_year_id, year_records__is_active=True).distinct()
        elif academic_year:
            clean_year = academic_year.strip()
            queryset = queryset.filter(
                models.Q(year_records__academic_year__name__iexact=clean_year) |
                models.Q(year_records__academic_year__name__icontains="2026")
                if ("2026" in clean_year or "26" in clean_year) else models.Q(year_records__academic_year__name__iexact=clean_year),
                year_records__is_active=True
            ).distinct()

        return queryset


class StudentRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = Student.objects.select_related('centre').all()
    serializer_class = StudentSerializer
