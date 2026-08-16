from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Avg, Max, Min, Q, Sum
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from school.models.assessment import (
    Assessment,
    AssessmentDiagnostic,
    AssessmentScore,
    AssessmentSubmission,
    AssessmentType,
    DiagnosticOption,
    LearningBehaviourOption,
    StudentLearningBehaviour,
    StudentObservation,
    Subject,
)
from school.models.student import Student
from school.serializers.assessment import (
    AssessmentSerializer,
    AssessmentTypeSerializer,
    DiagnosticOptionSerializer,
    LearningBehaviourOptionSerializer,
    SubjectSerializer,
)


def _format_year(value):
    return f'{value}-{str(value + 1)[-2:]}'


def _section_label(section_id):
    if not section_id:
        return 'A'
    return chr(64 + int(section_id)) if int(section_id) <= 26 else str(section_id)


def _percentage(total, maximum):
    if not maximum:
        return Decimal('0')
    return (Decimal(total) / Decimal(maximum) * Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _get_assessment_or_404(assessment_id):
    return Assessment.objects.select_related('assessment_type').get(assessment_id=assessment_id)


class AssessmentTypeListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = AssessmentType.objects.filter(is_active=True).order_by('assessment_type_id')
        serializer = AssessmentTypeSerializer(queryset, many=True)
        return Response(serializer.data)


class SubjectListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        class_id = request.query_params.get('classId')
        queryset = Subject.objects.filter(is_active=True)
        if class_id is not None:
            queryset = queryset.filter(class_id=class_id)
        serializer = SubjectSerializer(queryset.order_by('subject_id'), many=True)
        return Response(serializer.data)


class AssessmentCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        assessment_type_id = request.data.get('assessmentTypeId')
        academic_year_id = request.data.get('academicYearId')
        class_id = request.data.get('classId')
        section_id = request.data.get('sectionId', 1)
        term = request.data.get('term')
        assessment_date = request.data.get('assessmentDate')

        if not all([assessment_type_id, academic_year_id, class_id, term, assessment_date]):
            return Response({'error': 'required fields are missing'}, status=status.HTTP_400_BAD_REQUEST)

        assessment_type = AssessmentType.objects.filter(assessment_type_id=assessment_type_id).first()
        if not assessment_type:
            return Response({'error': 'assessmentTypeId not found'}, status=status.HTTP_400_BAD_REQUEST)

        assessment = Assessment.objects.create(
            academic_year_id=int(academic_year_id),
            class_id=int(class_id),
            section_id=int(section_id),
            assessment_type=assessment_type,
            term=term,
            assessment_date=assessment_date,
            status=Assessment.STATUS_DRAFT,
        )

        response = AssessmentSerializer(assessment).data
        return Response({
            'id': assessment.assessment_id,
            'status': assessment.status,
            'academicYear': response['academicYear'],
            'class': response['class_name'],
            'section': response['section'],
            'assessmentType': response['assessmentType'],
            'term': assessment.term,
        })


class AssessmentDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        student_count = Student.objects.filter(assessment_scores__assessment=assessment).distinct().count()
        if not student_count:
            student_count = 0
        return Response({
            'id': assessment.assessment_id,
            'status': assessment.status,
            'assessmentType': assessment.assessment_type.name,
            'term': assessment.term,
            'academicYear': _format_year(assessment.academic_year_id),
            'class': f'Grade {assessment.class_id}',
            'section': _section_label(assessment.section_id),
            'totalStudents': student_count,
        })


class AssessmentScoreBulkView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        by_student = {}
        for score in AssessmentScore.objects.filter(assessment=assessment).select_related('student', 'subject'):
            by_student.setdefault(score.student_id, {'studentId': score.student_id, 'admissionNumber': score.student.student_id, 'studentName': score.student.full_name if hasattr(score.student, 'full_name') else str(score.student_id), 'scores': []})
            by_student[score.student_id]['scores'].append({
                'subjectId': score.subject.subject_id,
                'subject': score.subject.name,
                'maxMarks': float(score.max_marks),
                'obtainedMarks': float(score.obtained_marks),
            })

        students = []
        for data in by_student.values():
            scores = data['scores']
            total = sum(item['obtainedMarks'] for item in scores)
            max_total = sum(item['maxMarks'] for item in scores)
            percentage = _percentage(total, max_total)
            students.append({
                'studentId': data['studentId'],
                'admissionNumber': data['admissionNumber'],
                'studentName': data['studentName'],
                'scores': scores,
                'total': total,
                'percentage': float(percentage),
            })
        return Response({'assessmentId': assessment.assessment_id, 'students': students})

    def put(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        students_payload = request.data.get('students', [])
        saved_students = 0
        saved_scores = 0

        for student_payload in students_payload:
            student_id = student_payload.get('studentId')
            student = Student.objects.filter(student_id=student_id).first()
            if not student:
                continue
            saved_students += 1
            for score_payload in student_payload.get('scores', []):
                subject_id = score_payload.get('subjectId')
                subject = Subject.objects.filter(subject_id=subject_id).first()
                if not subject:
                    continue
                score, _ = AssessmentScore.objects.update_or_create(
                    assessment=assessment,
                    student=student,
                    subject=subject,
                    defaults={'obtained_marks': Decimal(str(score_payload.get('obtainedMarks', 0))), 'max_marks': Decimal(str(score_payload.get('maxMarks', 100)))},
                )
                saved_scores += 1

        results = []
        for student_payload in students_payload:
            student_id = student_payload.get('studentId')
            student = Student.objects.filter(student_id=student_id).first()
            if not student:
                continue
            scores = AssessmentScore.objects.filter(assessment=assessment, student=student).select_related('subject')
            score_items = [{
                'subjectId': item.subject.subject_id,
                'obtainedMarks': float(item.obtained_marks),
            } for item in scores]
            total_marks = sum(float(item.obtained_marks) for item in scores)
            max_marks = sum(float(item.max_marks) for item in scores) or Decimal('100')
            percentage = _percentage(total_marks, max_marks)
            results.append({
                'studentId': student.student_id,
                'scores': score_items,
                'totalMarks': float(total_marks),
                'maxMarks': float(max_marks),
                'percentage': float(percentage),
            })

        return Response({
            'assessmentId': assessment.assessment_id,
            'students': results,
            'savedStudents': saved_students,
            'savedScores': saved_scores,
            'status': 'SUCCESS',
        })


class AssessmentDiagnosticListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        diagnostics = AssessmentDiagnostic.objects.filter(assessment=assessment).select_related('student', 'subject')
        data = []
        for item in diagnostics:
            data.append({
                'studentId': item.student.student_id,
                'studentName': item.student.full_name,
                'subjectId': item.subject.subject_id,
                'subject': item.subject.name,
                'understandingLevel': item.understanding_level,
                'applicationAbility': item.application_ability,
                'interestLevel': item.interest_level,
            })
        return Response({'assessmentId': assessment.assessment_id, 'diagnostics': data})


class AssessmentDiagnosticBulkView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        saved = 0
        for item in request.data.get('students', []):
            student = Student.objects.filter(student_id=item.get('studentId')).first()
            subject = Subject.objects.filter(subject_id=item.get('subjectId')).first()
            if not student or not subject:
                continue
            AssessmentDiagnostic.objects.update_or_create(
                assessment=assessment,
                student=student,
                subject=subject,
                defaults={
                    'understanding_level': item.get('understandingLevel'),
                    'application_ability': item.get('applicationAbility'),
                    'interest_level': item.get('interestLevel'),
                },
            )
            saved += 1
        return Response({'assessmentId': assessment.assessment_id, 'saved': saved, 'status': 'SUCCESS'})


class DiagnosticOptionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        understanding = DiagnosticOption.objects.filter(category=DiagnosticOption.CATEGORY_UNDERSTANDING).order_by('sort_order')
        application = DiagnosticOption.objects.filter(category=DiagnosticOption.CATEGORY_APPLICATION).order_by('sort_order')
        interest = DiagnosticOption.objects.filter(category=DiagnosticOption.CATEGORY_INTEREST).order_by('sort_order')
        return Response({
            'understandingLevels': [{'code': item.code, 'name': item.name} for item in understanding],
            'applicationAbilities': [{'code': item.code, 'name': item.name} for item in application],
            'interestLevels': [{'code': item.code, 'name': item.name} for item in interest],
        })


class LearningBehaviourOptionListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        options = LearningBehaviourOption.objects.filter(is_active=True).order_by('behaviour_option_id')
        return Response([{'code': item.code, 'name': item.name} for item in options])


class AssessmentBehaviourView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        items = StudentLearningBehaviour.objects.filter(assessment=assessment).select_related('student', 'behaviour_option')
        return Response({'assessmentId': assessment.assessment_id, 'students': [{
            'studentId': item.student.student_id,
            'studentName': item.student.full_name,
            'behaviour': item.behaviour_option.name,
        } for item in items]})

    def put(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        saved = 0
        for item in request.data.get('students', []):
            student = Student.objects.filter(student_id=item.get('studentId')).first()
            behaviour = LearningBehaviourOption.objects.filter(code=item.get('behaviour')).first()
            if not student or not behaviour:
                continue
            StudentLearningBehaviour.objects.update_or_create(
                assessment=assessment,
                student=student,
                defaults={'behaviour_option': behaviour},
            )
            saved += 1
        return Response({'assessmentId': assessment.assessment_id, 'saved': saved, 'status': 'SUCCESS'})


class AssessmentObservationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        rows = StudentObservation.objects.filter(assessment=assessment).select_related('student')
        return Response({'assessmentId': assessment.assessment_id, 'students': [{
            'studentId': row.student.student_id,
            'studentName': row.student.full_name,
            'keyImprovements': row.key_improvements,
            'subjectsNeedingSupport': row.subjects_needing_support,
            'interventionPlan': row.intervention_plan,
        } for row in rows]})


class StudentObservationView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, assessment_id, student_id):
        assessment = _get_assessment_or_404(assessment_id)
        student = Student.objects.filter(student_id=student_id).first()
        if not student:
            return Response({'error': 'student not found'}, status=status.HTTP_404_NOT_FOUND)
        observation = StudentObservation.objects.filter(assessment=assessment, student=student).first()
        if not observation:
            return Response({'studentId': student.student_id, 'keyImprovements': '', 'subjectsNeedingSupport': '', 'interventionPlan': ''})
        return Response({
            'studentId': student.student_id,
            'keyImprovements': observation.key_improvements,
            'subjectsNeedingSupport': observation.subjects_needing_support,
            'interventionPlan': observation.intervention_plan,
        })

    def put(self, request, assessment_id, student_id):
        assessment = _get_assessment_or_404(assessment_id)
        student = Student.objects.filter(student_id=student_id).first()
        if not student:
            return Response({'error': 'student not found'}, status=status.HTTP_404_NOT_FOUND)

        required_fields = ['keyImprovements', 'subjectsNeedingSupport', 'interventionPlan']
        for field in required_fields:
            if not request.data.get(field):
                return Response({'error': f'{field} is required'}, status=status.HTTP_400_BAD_REQUEST)

        observation, _ = StudentObservation.objects.update_or_create(
            assessment=assessment,
            student=student,
            defaults={
                'key_improvements': request.data.get('keyImprovements'),
                'subjects_needing_support': request.data.get('subjectsNeedingSupport'),
                'intervention_plan': request.data.get('interventionPlan'),
            },
        )
        return Response({
            'studentId': student.student_id,
            'keyImprovements': observation.key_improvements,
            'subjectsNeedingSupport': observation.subjects_needing_support,
            'interventionPlan': observation.intervention_plan,
        })


class AssessmentSubmitView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        student_ids = set(Student.objects.filter(assessment_scores__assessment=assessment).values_list('student_id', flat=True).distinct())
        subject_ids = set(Subject.objects.filter(is_active=True).values_list('subject_id', flat=True))
        scores = AssessmentScore.objects.filter(assessment=assessment)
        diagnostics = AssessmentDiagnostic.objects.filter(assessment=assessment)
        behaviours = StudentLearningBehaviour.objects.filter(assessment=assessment)
        observations = StudentObservation.objects.filter(assessment=assessment)

        has_scores = bool(scores.exists()) and bool(student_ids)
        has_all_subjects = bool(scores.values_list('subject_id', flat=True).distinct().count() == len(subject_ids)) if subject_ids else False
        has_diagnostics = bool(diagnostics.exists())
        has_behaviour = bool(behaviours.exists())
        has_observations = bool(observations.exists())

        if not (has_scores and has_all_subjects and has_diagnostics and has_behaviour and has_observations):
            return Response({'error': 'Assessment is incomplete and cannot be submitted'}, status=status.HTTP_400_BAD_REQUEST)

        assessment.status = Assessment.STATUS_SUBMITTED
        assessment.save(update_fields=['status', 'updated_at'])
        AssessmentSubmission.objects.update_or_create(assessment=assessment, defaults={'submitted_by': request.user.username if hasattr(request, 'user') else 'system'})

        return Response({
            'assessmentId': assessment.assessment_id,
            'status': 'SUBMITTED',
            'submittedAt': assessment.updated_at.isoformat(),
        })


class ComparisonView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        previous_assessment = Assessment.objects.filter(
            assessment_type__assessment_type_id__lt=assessment.assessment_type.assessment_type_id,
            class_id=assessment.class_id,
            assessment_date__lt=assessment.assessment_date,
        ).order_by('-assessment_date').first()
        if previous_assessment is None:
            previous_assessment = Assessment.objects.filter(class_id=assessment.class_id, assessment_date__lt=assessment.assessment_date).order_by('-assessment_date').first()
        current_percentage = self._average_percentage(assessment)
        previous_percentage = self._average_percentage(previous_assessment) if previous_assessment else Decimal('0')
        change = current_percentage - previous_percentage
        trend = 'UP' if change > 0 else 'DOWN' if change < 0 else 'STABLE'

        return Response({
            'current': {'assessment': f'{assessment.assessment_type.name} {assessment.term}', 'percentage': float(current_percentage)},
            'previous': {'assessment': previous_assessment.assessment_type.name if previous_assessment else 'N/A', 'percentage': float(previous_percentage)},
            'change': {'percentagePoints': float(change), 'trend': trend},
        })

    def _average_percentage(self, assessment):
        if assessment is None:
            return Decimal('0')
        scores = AssessmentScore.objects.filter(assessment=assessment)
        if not scores.exists():
            return Decimal('0')
        total_marks = scores.aggregate(Sum('obtained_marks'))['obtained_marks__sum'] or Decimal('0')
        max_marks = scores.aggregate(Sum('max_marks'))['max_marks__sum'] or Decimal('0')
        return _percentage(total_marks, max_marks) if max_marks else Decimal('0')


class SubjectComparisonView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        previous_assessment = Assessment.objects.filter(class_id=assessment.class_id, assessment_date__lt=assessment.assessment_date).order_by('-assessment_date').first()
        subject_list = []
        all_subjects = Subject.objects.filter(is_active=True)
        for subject in all_subjects:
            current = AssessmentScore.objects.filter(assessment=assessment, subject=subject)
            previous = AssessmentScore.objects.filter(assessment=previous_assessment, subject=subject) if previous_assessment else None
            current_total = sum(float(item.obtained_marks) for item in current)
            current_max = sum(float(item.max_marks) for item in current) or Decimal('100')
            current_percentage = _percentage(current_total, current_max)
            previous_total = sum(float(item.obtained_marks) for item in previous) if previous else 0
            previous_max = sum(float(item.max_marks) for item in previous) if previous else Decimal('100')
            previous_percentage = _percentage(previous_total, previous_max) if previous else Decimal('0')
            change = current_percentage - previous_percentage
            trend = 'UP' if change > 0 else 'DOWN' if change < 0 else 'STABLE'
            subject_list.append({
                'subject': subject.name,
                'previousPercentage': float(previous_percentage),
                'currentPercentage': float(current_percentage),
                'change': float(change),
                'trend': trend,
            })
        return Response(subject_list)


class StudentComparisonView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        previous_assessment = Assessment.objects.filter(class_id=assessment.class_id, assessment_date__lt=assessment.assessment_date).order_by('-assessment_date').first()
        rows = []
        for student in Student.objects.filter(assessment_scores__assessment=assessment).distinct():
            current = AssessmentScore.objects.filter(assessment=assessment, student=student)
            current_total = sum(float(item.obtained_marks) for item in current)
            current_max = sum(float(item.max_marks) for item in current) or Decimal('100')
            current_percentage = _percentage(current_total, current_max)
            previous_total = sum(float(item.obtained_marks) for item in AssessmentScore.objects.filter(assessment=previous_assessment, student=student)) if previous_assessment else 0
            previous_max = sum(float(item.max_marks) for item in AssessmentScore.objects.filter(assessment=previous_assessment, student=student)) if previous_assessment else Decimal('100')
            previous_percentage = _percentage(previous_total, previous_max) if previous_assessment else Decimal('0')
            change = current_percentage - previous_percentage
            trend = 'UP' if change > 0 else 'DOWN' if change < 0 else 'STABLE'
            rows.append({
                'studentId': student.student_id,
                'studentName': student.full_name,
                'previousPercentage': float(previous_percentage),
                'currentPercentage': float(current_percentage),
                'change': float(change),
                'trend': trend,
            })
        return Response(rows)


class StudentPerformanceTrendView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, student_id):
        subject_id = request.query_params.get('subjectId')
        subject = Subject.objects.filter(subject_id=subject_id).first() if subject_id else None
        queryset = AssessmentScore.objects.filter(student_id=student_id)
        if subject:
            queryset = queryset.filter(subject=subject)
        rows = []
        for score in queryset.select_related('assessment', 'assessment__assessment_type').order_by('assessment__assessment_date'):
            total = float(score.obtained_marks)
            max_value = float(score.max_marks or 100)
            rows.append({
                'assessment': f'{score.assessment.assessment_type.name} {score.assessment.term}',
                'percentage': float(_percentage(total, max_value)),
            })
        return Response(rows)


class AssessmentStatisticsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        scorerows = AssessmentScore.objects.filter(assessment=assessment)
        student_count = scorerows.values_list('student_id', flat=True).distinct().count()
        if not scorerows.exists():
            return Response({'studentCount': 0, 'averagePercentage': 0, 'previousAverage': 0, 'improvement': 0, 'highestPercentage': 0, 'lowestPercentage': 0, 'passPercentage': 0})
        totals = []
        for student_id in scorerows.values_list('student_id', flat=True).distinct():
            rows = scorerows.filter(student_id=student_id)
            total_marks = sum(float(item.obtained_marks) for item in rows)
            max_marks = sum(float(item.max_marks) for item in rows) or Decimal('100')
            totals.append(float(_percentage(total_marks, max_marks)))
        previous_assessment = Assessment.objects.filter(class_id=assessment.class_id, assessment_date__lt=assessment.assessment_date).order_by('-assessment_date').first()
        previous_average = self._average_percentage(previous_assessment) if previous_assessment else Decimal('0')
        average = sum(totals) / len(totals) if totals else 0
        improvement = average - float(previous_average)
        return Response({
            'studentCount': student_count,
            'averagePercentage': float(average),
            'previousAverage': float(previous_average),
            'improvement': float(improvement),
            'highestPercentage': max(totals) if totals else 0,
            'lowestPercentage': min(totals) if totals else 0,
            'passPercentage': round((sum(1 for value in totals if value >= 40) / len(totals)) * 100, 2) if totals else 0,
        })

    def _average_percentage(self, assessment):
        if assessment is None:
            return Decimal('0')
        rows = AssessmentScore.objects.filter(assessment=assessment)
        if not rows.exists():
            return Decimal('0')
        total_marks = sum(float(item.obtained_marks) for item in rows)
        max_marks = sum(float(item.max_marks) for item in rows) or Decimal('100')
        return _percentage(total_marks, max_marks)


class StudentDashboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, student_id):
        student = Student.objects.filter(student_id=student_id).first()
        if not student:
            return Response({'error': 'student not found'}, status=status.HTTP_404_NOT_FOUND)

        latest_assessment = Assessment.objects.filter(assessment__scores__student=student).first() if False else None
        current_assessment = Assessment.objects.filter(scores__student=student).order_by('-assessment_date').first()
        previous_assessment = Assessment.objects.filter(scores__student=student, assessment_date__lt=current_assessment.assessment_date).order_by('-assessment_date').first() if current_assessment else None
        current_total = sum(float(item.obtained_marks) for item in AssessmentScore.objects.filter(assessment=current_assessment, student=student)) if current_assessment else 0
        current_max = sum(float(item.max_marks) for item in AssessmentScore.objects.filter(assessment=current_assessment, student=student)) or Decimal('100') if current_assessment else Decimal('100')
        current_percentage = _percentage(current_total, current_max) if current_assessment else Decimal('0')
        previous_total = sum(float(item.obtained_marks) for item in AssessmentScore.objects.filter(assessment=previous_assessment, student=student)) if previous_assessment else 0
        previous_max = sum(float(item.max_marks) for item in AssessmentScore.objects.filter(assessment=previous_assessment, student=student)) or Decimal('100') if previous_assessment else Decimal('100')
        previous_percentage = _percentage(previous_total, previous_max) if previous_assessment else Decimal('0')
        change = current_percentage - previous_percentage
        behaviour = StudentLearningBehaviour.objects.filter(student=student, assessment=current_assessment).select_related('behaviour').first() if current_assessment else None

        return Response({
            'student': {'id': student.student_id, 'name': student.full_name, 'class': f'Grade {current_assessment.class_id if current_assessment else 0}', 'section': _section_label(current_assessment.section_id if current_assessment else 1)},
            'currentPerformance': {'percentage': float(current_percentage)},
            'previousPerformance': {'percentage': float(previous_percentage)},
            'improvement': {'percentage': float(change), 'trend': 'UP' if change > 0 else 'DOWN' if change < 0 else 'STABLE'},
            'subjectPerformance': [],
            'subjectTrends': [],
            'diagnostic': [],
            'learningBehaviour': behaviour.behaviour.name if behaviour else 'N/A',
            'areasNeedingSupport': [],
            'observation': {'keyImprovements': '', 'subjectsNeedingSupport': '', 'interventionPlan': ''},
        })


class AssessmentDetailsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        return Response({
            'assessment': AssessmentSerializer(assessment).data,
            'students': [],
            'scores': [],
            'diagnostics': [],
            'behaviours': [],
            'observations': [],
            'comparison': {},
            'subjectComparison': [],
            'classStatistics': {},
        })
