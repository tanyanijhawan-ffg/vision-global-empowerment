from django.core.management.base import BaseCommand

from school.models.assessment import (
    AssessmentType,
    DiagnosticOption,
    LearningBehaviourOption,
    Subject,
)


class Command(BaseCommand):
    help = 'Seed assessment metadata and default subject catalog for the assessment APIs.'

    def handle(self, *args, **options):
        assessment_types = [
            {'code': 'QUARTERLY', 'name': 'Quarterly', 'duration_months': 3},
            {'code': 'HALF_YEARLY', 'name': 'Half-Yearly', 'duration_months': 6},
            {'code': 'ANNUAL', 'name': 'Annual', 'duration_months': 12},
        ]

        for item in assessment_types:
            AssessmentType.objects.update_or_create(
                code=item['code'],
                defaults={'name': item['name'], 'duration_months': item['duration_months'], 'is_active': True},
            )

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
                defaults={'name': name, 'sort_order': order},
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

        subject_map = {
            5: [
                {'name': 'Tamil', 'code': 'TAMIL'},
                {'name': 'English', 'code': 'ENGLISH'},
                {'name': 'Mathematics', 'code': 'MATHEMATICS'},
                {'name': 'Science', 'code': 'SCIENCE'},
                {'name': 'Social Science', 'code': 'SOCIAL_SCIENCE'},
            ],
            6: [
                {'name': 'Tamil', 'code': 'TAMIL'},
                {'name': 'English', 'code': 'ENGLISH'},
                {'name': 'Mathematics', 'code': 'MATHEMATICS'},
                {'name': 'Science', 'code': 'SCIENCE'},
                {'name': 'Social Science', 'code': 'SOCIAL_SCIENCE'},
            ],
        }

        for class_id, subjects in subject_map.items():
            for item in subjects:
                Subject.objects.update_or_create(
                    class_id=class_id,
                    name=item['name'],
                    defaults={'code': item['code'], 'is_active': True},
                )

        self.stdout.write(self.style.SUCCESS('Assessment metadata seeded successfully.'))
