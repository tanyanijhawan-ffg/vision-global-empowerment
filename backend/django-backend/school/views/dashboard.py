from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncMonth, TruncWeek
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from school.models.assessment import AssessmentScore, AssessmentSubject
from school.models.attendance import Attendance
from school.models.center import Center, District, Region
from school.models.student import Student


def pct(numerator, denominator):
    return round(numerator / denominator * 100) if denominator else 0


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        today = timezone.localdate()
        last_30_days = today - timedelta(days=30)
        eight_weeks_ago = today - timedelta(weeks=8)
        month_start = today.replace(day=1)

        students = Student.objects.select_related('centre__region').all()
        total_students = students.count()
        new_registrations = students.filter(created_at__date__gte=month_start).count()

        # Attendance today
        todays = Attendance.objects.filter(attendance_date=today)
        attendance_today = pct(todays.filter(status='Present').count(), todays.count())

        # Attendance last 30 days, for at-risk and overall
        recent_attendance = Attendance.objects.filter(attendance_date__gte=last_30_days)
        overall_attendance = pct(recent_attendance.filter(status='Present').count(), recent_attendance.count())

        # High risk: students whose 30-day attendance rate is below 75%
        at_risk = (
            recent_attendance.values('student')
            .annotate(total=Count('attendance_id'), present=Count('attendance_id', filter=Q(status='Present')))
            .filter(total__gt=0)
        )
        high_risk = sum(1 for row in at_risk if row['present'] / row['total'] < 0.75)

        # Academics: average percentage across all scored assessments
        score_rows = AssessmentScore.objects.select_related('subject', 'assessment__assessment_type').all()
        avg_academic = self._average_score(score_rows)

        data = {
            'stats': {
                'total_students': total_students,
                'active_centres': Center.objects.filter(status__iexact='active').count() or Center.objects.count(),
                'regions': Region.objects.count(),
                'districts': District.objects.count(),
                'attendance_today': attendance_today,
                'avg_academic_score': avg_academic,
                'high_risk_students': high_risk,
                'new_registrations': new_registrations,
            },
            'student_growth': self._student_growth(students),
            'attendance_trend': self._attendance_trend(eight_weeks_ago),
            'academics_by_subject': self._academics_by_subject(score_rows),
            'students_by_region': self._students_by_region(students),
            'activities': self._activities(today),
        }
        return Response(data)

    def _student_growth(self, students):
        rows = (
            students.exclude(created_at__isnull=True)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('student_id'))
            .order_by('month')
        )
        cumulative = 0
        result = []
        for row in rows:
            cumulative += row['count']
            result.append({'month': row['month'].strftime('%b'), 'students': cumulative})
        return result

    def _attendance_trend(self, since):
        rows = (
            Attendance.objects.filter(attendance_date__gte=since)
            .annotate(week=TruncWeek('attendance_date'))
            .values('week')
            .annotate(total=Count('attendance_id'), present=Count('attendance_id', filter=Q(status='Present')))
            .order_by('week')
        )
        return [
            {'week': row['week'].strftime('W%W'), 'percent': pct(row['present'], row['total'])}
            for row in rows if row['total']
        ]

    def _max_marks_for(self, score):
        mapping = (
            AssessmentSubject.objects
            .filter(exam_id=score.assessment.assessment_type_id, is_active=True)
            .order_by('-updated_at')
            .first()
        )
        return float(mapping.max_marks) if mapping else 100.0

    def _average_score(self, score_rows):
        percentages = [
            float(row.obtained_marks) / self._max_marks_for(row) * 100
            for row in score_rows
        ]
        return round(sum(percentages) / len(percentages)) if percentages else 0

    def _academics_by_subject(self, score_rows):
        by_subject = {}
        for row in score_rows:
            name = row.subject.name if row.subject else 'Unknown'
            by_subject.setdefault(name, []).append(float(row.obtained_marks) / self._max_marks_for(row) * 100)
        return [
            {'name': name, 'score': round(sum(values) / len(values))}
            for name, values in sorted(by_subject.items())
        ]

    def _students_by_region(self, students):
        rows = (
            students.values('centre__region__region_name')
            .annotate(count=Count('student_id'))
            .order_by('-count')
        )
        return [
            {'name': row['centre__region__region_name'] or 'Unassigned', 'students': row['count']}
            for row in rows if row['centre__region__region_name']
        ]

    def _activities(self, today):
        activities = []

        for student in Student.objects.select_related('centre').order_by('-created_at')[:5]:
            if student.created_at:
                activities.append({
                    'id': f'student-{student.student_id}',
                    'icon': 'student',
                    'text': f'New student {student.full_name} registered at {student.centre.centre_name}',
                    'timestamp': student.created_at.isoformat(),
                })

        recent_attendance = (
            Attendance.objects.select_related('student__centre')
            .order_by('-attendance_date')[:5]
        )
        for record in recent_attendance:
            activities.append({
                'id': f'attendance-{record.attendance_id}',
                'icon': 'attendance',
                'text': f'Attendance recorded for {record.student.full_name} ({record.student.centre.centre_name})',
                'timestamp': timezone.datetime.combine(record.attendance_date, timezone.datetime.min.time(), tzinfo=timezone.get_current_timezone()).isoformat(),
            })

        for assessment in AssessmentScore.objects.select_related('assessment__assessment_type', 'assessment__centre').order_by('-created_at')[:5]:
            centre_name = assessment.assessment.centre.centre_name if assessment.assessment.centre else 'organisation'
            activities.append({
                'id': f'assessment-{assessment.score_id}',
                'icon': 'assessment',
                'text': f'{assessment.assessment.assessment_type.name} scores updated for {centre_name}',
                'timestamp': assessment.created_at.isoformat(),
            })

        activities.sort(key=lambda item: item['timestamp'], reverse=True)
        return activities[:10]
