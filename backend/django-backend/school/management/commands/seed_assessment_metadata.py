from django.core.management.base import BaseCommand

from school.models.assessment import (
    AcademicYear,
    AssessmentType,
    DiagnosticOption,
    LearningBehaviourOption,
    SchoolClass,
    Subject,
)
from school.models.student import Student, StudentClassRecord


class Command(BaseCommand):
    help = 'Seed assessment metadata and default subject catalog for the assessment APIs.'

    def handle(self, *args, **options):
        academic_years = [
            {'name': '2025 - 2026', 'start_date': '2025-06-01', 'end_date': '2026-05-31', 'is_current': True},
            {'name': '2026 - 2027', 'start_date': '2026-06-01', 'end_date': '2027-05-31', 'is_current': False},
        ]
        ay_instances = []
        for year in academic_years:
            ay_obj, _ = AcademicYear.objects.update_or_create(
                name=year['name'],
                defaults={'start_date': year['start_date'], 'end_date': year['end_date'], 'is_current': year['is_current'], 'is_active': True},
            )
            ay_instances.append(ay_obj)

        for grade in range(1, 13):
            SchoolClass.objects.update_or_create(
                name=f'Class {grade}',
                defaults={'code': f'CLASS_{grade}', 'is_active': True},
            )

        # Seed student class records for existing students for current academic year only
        current_ay = next((ay for ay in ay_instances if ay.is_current), None) or ay_instances[0]
        all_students = Student.objects.all()
        for student in all_students:
            if student.class_grade:
                StudentClassRecord.objects.get_or_create(
                    student=student,
                    academic_year=current_ay,
                    defaults={'class_grade': student.class_grade, 'is_active': True},
                )

        assessment_types = [
            {'code': 'FIRST_EXAM', 'name': 'First Exam'},
            {'code': 'MID_TERM', 'name': 'Mid-Term'},
            {'code': 'SECOND_EXAM', 'name': 'Second Exam'},
            {'code': 'QUARTERLY', 'name': 'Quarterly'},
            {'code': 'HALF_YEARLY', 'name': 'Half-Yearly'},
            {'code': 'ANNUAL', 'name': 'Annual'},
        ]

        for ay in ay_instances:
            for item in assessment_types:
                code_val = f"{item['code']}_{ay.academic_year_id}"
                AssessmentType.objects.update_or_create(
                    code=code_val,
                    defaults={
                        'name': item['name'],
                        'academic_year': ay,
                        'is_active': True,
                    },
                )

        # Ensure any legacy assessment types are linked to the current academic year
        current_ay = ay_instances[0] if ay_instances else None
        if current_ay:
            AssessmentType.objects.filter(academic_year__isnull=True).update(academic_year=current_ay)

        diagnostic_options = [
            ('understanding_level', 'CLEAR', 'Understands clearly', 1),
            ('understanding_level', 'REPETITION', 'Needs repetition', 2),
            ('understanding_level', 'NOT_UNDERSTAND', 'Does not understand', 3),
            ('application_ability', 'APPLIES', 'Applies concepts', 1),
            ('application_ability', 'MEMORISES', 'Memorises only', 2),
            ('application_ability', 'CANNOT_APPLY', 'Cannot apply', 3),
            ('interest_level', 'INTERESTED', 'Interested', 1),
            ('interest_level', 'NEUTRAL', 'Neutral', 2),
            ('interest_level', 'DISINTERESTED', 'Disinterested', 3),
        ]

        for category, code, name, order in diagnostic_options:
            DiagnosticOption.objects.update_or_create(
                category=category,
                code=code,
                defaults={'name': name, 'sort_order': order, 'is_active': True},
            )

        behaviour_options = [
            {'code': 'INDEPENDENT', 'name': 'Independent'},
            {'code': 'SUPERVISION', 'name': 'Needs supervision'},
            {'code': 'MOTIVATED', 'name': 'Motivated'},
            {'code': 'NEEDS_SUPPORT', 'name': 'Needs support'},
        ]

        for item in behaviour_options:
            LearningBehaviourOption.objects.update_or_create(
                code=item['code'],
                defaults={'name': item['name'], 'is_active': True},
            )

        subjects = [
            {'name': 'Tamil', 'code': 'TAMIL'},
            {'name': 'English', 'code': 'ENGLISH'},
            {'name': 'Mathematics', 'code': 'MATHEMATICS'},
            {'name': 'Science', 'code': 'SCIENCE'},
            {'name': 'Social Science', 'code': 'SOCIAL_SCIENCE'},
        ]

        for item in subjects:
            Subject.objects.update_or_create(
                name=item['name'],
                defaults={'code': item['code']},
            )

        self.stdout.write(self.style.SUCCESS('Assessment metadata seeded successfully.'))
