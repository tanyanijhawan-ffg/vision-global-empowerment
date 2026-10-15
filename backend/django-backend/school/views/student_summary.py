from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from school.models.assessment import AssessmentScore, AssessmentSubject
from school.models.attendance import Attendance
from school.models.student import Student


class StudentSummaryView(APIView):
    """Per-student chart data: monthly attendance and per-subject score percentages."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        student = Student.objects.filter(pk=pk).first()
        if student is None:
            return Response({'detail': 'Student not found.'}, status=404)

        attendance_rows = (
            Attendance.objects.filter(student=student)
            .annotate(month=TruncMonth('attendance_date'))
            .values('month')
            .annotate(total=Count('attendance_id'), present=Count('attendance_id', filter=Q(status__in=['Present', 'Late'])))
            .order_by('month')
        )
        attendance = [
            {
                'month': row['month'].strftime('%b'),
                'percent': round(row['present'] / row['total'] * 100) if row['total'] else 0,
            }
            for row in attendance_rows if row['total']
        ]

        academics = []
        score_rows = AssessmentScore.objects.filter(student=student).select_related('subject', 'assessment')
        by_subject = {}
        for row in score_rows:
            mapping = (
                AssessmentSubject.objects
                .filter(exam_id=row.assessment.assessment_type_id, is_active=True)
                .order_by('-updated_at')
                .first()
            )
            max_marks = float(mapping.max_marks) if mapping else 100.0
            name = row.subject.name if row.subject else 'Unknown'
            by_subject.setdefault(name, []).append(float(row.obtained_marks) / max_marks * 100)
        for name, values in sorted(by_subject.items()):
            academics.append({'subject': name, 'score': round(sum(values) / len(values))})

        overall_attendance = round(
            sum(item['percent'] for item in attendance) / len(attendance)
        ) if attendance else 0
        overall_academic = round(
            sum(item['score'] for item in academics) / len(academics)
        ) if academics else 0

        return Response({
            'attendance': attendance,
            'academics': academics,
            'attendance_percent': overall_attendance,
            'academic_score': overall_academic,
        })
