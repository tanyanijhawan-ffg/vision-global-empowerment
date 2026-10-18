from django.db import models
from django.db.models import Subquery, OuterRef
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework.permissions import AllowAny

from school.models.assessment import AcademicYear
from school.models.student import Student, StudentClassRecord
from school.serializers.student import StudentSerializer


def get_latest_class_subquery():
    return Subquery(
        StudentClassRecord.objects.filter(
            student=OuterRef('pk')
        ).order_by('-student_class_record_id').values('class_grade')[:1]
    )


class StudentListView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = Student.objects.select_related('centre').all()
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['centre__centre_id', 'gender', 'school_name']

    def get_queryset(self):
        queryset = super().get_queryset().annotate(latest_class_grade=get_latest_class_subquery())
        centre_id = self.request.query_params.get('centreId') or self.request.query_params.get('center_id')
        gender = self.request.query_params.get('gender')
        class_grade = self.request.query_params.get('classGrade') or self.request.query_params.get('class_grade')
        academic_year_id = self.request.query_params.get('academicYearId') or self.request.query_params.get('academic_year_id')
        academic_year = self.request.query_params.get('academicYear') or self.request.query_params.get('academic_year')

        if centre_id is not None:
            queryset = queryset.filter(centre__centre_id=centre_id)
        if gender is not None:
            queryset = queryset.filter(gender__iexact=gender)

        # Resolve target academic year if provided
        target_ay = None
        has_ay_filter = bool(academic_year_id or academic_year)
        if academic_year_id:
            target_ay = AcademicYear.objects.filter(academic_year_id=academic_year_id).first()
        elif academic_year:
            clean_year = academic_year.strip()
            target_ay = (
                AcademicYear.objects.filter(name__iexact=clean_year).first() or
                AcademicYear.objects.filter(name__icontains=clean_year).first()
            )

        if has_ay_filter:
            # Academic year is present: filter out records from the StudentClassRecord table
            if target_ay:
                scr_qs = StudentClassRecord.objects.filter(academic_year=target_ay, is_active=True)
                if class_grade is not None:
                    clean_grade = class_grade.strip()
                    if clean_grade.isdigit():
                        grade_match = (
                            models.Q(class_grade__iexact=clean_grade) |
                            models.Q(class_grade__iexact=f'Class {clean_grade}') |
                            models.Q(class_grade__iexact=f'Grade {clean_grade}')
                        )
                    else:
                        grade_match = models.Q(class_grade__iexact=clean_grade)
                    scr_qs = scr_qs.filter(grade_match)
                student_ids = scr_qs.values_list('student_id', flat=True)
                queryset = queryset.filter(student_id__in=student_ids).distinct()
            else:
                queryset = queryset.none()
        elif class_grade is not None:
            clean_grade = class_grade.strip()
            if clean_grade.isdigit():
                grade_match = (
                    models.Q(latest_class_grade__iexact=clean_grade) |
                    models.Q(latest_class_grade__iexact=f'Class {clean_grade}') |
                    models.Q(latest_class_grade__iexact=f'Grade {clean_grade}')
                )
                fallback_match = (
                    models.Q(class_grade__iexact=clean_grade) |
                    models.Q(class_grade__iexact=f'Class {clean_grade}') |
                    models.Q(class_grade__iexact=f'Grade {clean_grade}')
                )
            else:
                grade_match = models.Q(latest_class_grade__iexact=clean_grade)
                fallback_match = models.Q(class_grade__iexact=clean_grade)

            queryset = queryset.filter(
                grade_match | (models.Q(latest_class_grade__isnull=True) & fallback_match)
            ).distinct()

        return queryset


class StudentRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = Student.objects.select_related('centre').all()
    serializer_class = StudentSerializer

    def get_queryset(self):
        return super().get_queryset().annotate(latest_class_grade=get_latest_class_subquery())

