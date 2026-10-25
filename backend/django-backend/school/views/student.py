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
        ).order_by('-student_class_record_id').values('school_class_id')[:1]
    )


class StudentListView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = Student.objects.select_related('centre').all()
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['centre__centre_id', 'gender', 'school_name']

    def get_queryset(self):
        from school.services.classes import resolve_school_class

        queryset = super().get_queryset().annotate(latest_class_id=get_latest_class_subquery())
        centre_id = self.request.query_params.get('centreId') or self.request.query_params.get('center_id')
        gender = self.request.query_params.get('gender')
        class_grade = self.request.query_params.get('classGrade') or self.request.query_params.get('class_grade')
        academic_year_id = self.request.query_params.get('academicYearId') or self.request.query_params.get('academic_year_id')
        academic_year = self.request.query_params.get('academicYear') or self.request.query_params.get('academic_year')

        if centre_id is not None:
            queryset = queryset.filter(centre__centre_id=centre_id)
        if gender is not None:
            queryset = queryset.filter(gender__iexact=gender)

        # Resolve the requested class (string or id) to the SchoolClass master row.
        target_class = resolve_school_class(class_grade, create=False) if class_grade else None

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
            # Academic year is present: filter by the student's class record for that year
            if target_ay:
                scr_qs = StudentClassRecord.objects.filter(academic_year=target_ay, is_active=True)
                if target_class is not None:
                    scr_qs = scr_qs.filter(school_class=target_class)
                student_ids = scr_qs.values_list('student_id', flat=True)
                queryset = queryset.filter(student_id__in=student_ids).distinct()
            else:
                queryset = queryset.none()
        elif target_class is not None:
            # Match students whose latest class record is this class, or whose own
            # school_class FK is this class when they have no class records yet.
            queryset = queryset.filter(
                models.Q(latest_class_id=target_class.class_id) |
                (models.Q(latest_class_id__isnull=True) & models.Q(school_class=target_class))
            ).distinct()

        return queryset


class StudentRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = Student.objects.select_related('centre').all()
    serializer_class = StudentSerializer

    def get_queryset(self):
        return super().get_queryset().annotate(latest_class_grade=get_latest_class_subquery())

