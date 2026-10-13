import re
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Avg, Max, Min, Q, Sum
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from school.models.assessment import (
    AcademicYear,
    Assessment,
    AssessmentDiagnostic,
    AssessmentScore,
    AssessmentSubmission,
    AssessmentSubject,
    AssessmentType,
    DiagnosticOption,
    LearningBehaviourOption,
    SchoolClass,
    StudentLearningBehaviour,
    StudentObservation,
    Subject,
)
from school.models.center import Center
from school.models.student import Student
from school.serializers.assessment import (
    AcademicYearSerializer,
    AssessmentSerializer,
    AssessmentTypeSerializer,
    DiagnosticOptionSerializer,
    LearningBehaviourOptionSerializer,
    SchoolClassSerializer,
    SubjectSerializer,
)


def _format_year(value):
    return f'{value}-{str(value + 1)[-2:]}'


def _percentage(total, maximum):
    if not maximum:
        return Decimal('0')
    return (Decimal(total) / Decimal(maximum) * Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _get_assessment_or_404(assessment_id):
    return Assessment.objects.select_related('assessment_type').get(assessment_id=assessment_id)


def _subject_max_marks(assessment, subject_id):
    if assessment is None or subject_id is None:
        return Decimal('100')
    configs = AssessmentSubject.objects.filter(
        class_id=assessment.class_id,
        exam_id=assessment.assessment_type_id,
        is_active=True,
    )
    if assessment.centre_id:
        c_config = configs.filter(centre_id=assessment.centre_id).order_by('-assessment_subject_id').first()
        if c_config and c_config.max_marks is not None and subject_id in (c_config.subject_ids or []):
            return Decimal(str(c_config.max_marks))
    config = configs.order_by('-assessment_subject_id').first()
    if config and config.max_marks is not None and subject_id in (config.subject_ids or []):
        return Decimal(str(config.max_marks))
    return Decimal('100')


def _score_max_total(assessment, score_rows):
    if not assessment or not score_rows:
        return Decimal('0')
    total = Decimal('0')
    for row in score_rows:
        total += _subject_max_marks(assessment, row.subject_id)
    return total if total > 0 else Decimal('100')


class AssessmentAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []


class AssessmentTypeListView(AssessmentAPIView):
    def get(self, request):
        queryset = AssessmentType.objects.filter(is_active=True)
        academic_year_id = request.query_params.get('academicYearId') or request.query_params.get('academic_year_id')
        academic_year = request.query_params.get('academicYear') or request.query_params.get('academic_year')
        class_id = request.query_params.get('classId') or request.query_params.get('class_id')
        only_created = request.query_params.get('onlyCreated') or request.query_params.get('configuredOnly')

        if academic_year_id:
            # Include exams explicitly linked to this year OR exams with no year (legacy/global)
            queryset = queryset.filter(Q(academic_year_id=academic_year_id) | Q(academic_year__isnull=True))
        elif academic_year:
            queryset = queryset.filter(
                Q(academic_year__name__iexact=academic_year.strip()) | Q(academic_year__isnull=True)
            )
        else:
            current_ay = AcademicYear.objects.filter(is_current=True).first()
            if current_ay:
                queryset = queryset.filter(
                    Q(academic_year=current_ay) | Q(academic_year__isnull=True)
                )

        # Whenever class_id is passed OR only_created is true:
        # Only show exams for which an AssessmentSubject entry exists for the selected class
        if class_id or only_created:
            as_qs = AssessmentSubject.objects.filter(is_active=True)

            if class_id:
                try:
                    cid = int(class_id)
                    as_qs = as_qs.filter(class_id=cid)
                except ValueError:
                    pass

            if academic_year_id:
                try:
                    ayid = int(academic_year_id)
                    as_qs = as_qs.filter(academic_year_id=ayid)
                except ValueError:
                    pass
            elif academic_year:
                ay_obj = AcademicYear.objects.filter(name__iexact=academic_year.strip()).first()
                if ay_obj:
                    as_qs = as_qs.filter(academic_year_id=ay_obj.academic_year_id)

            configured_exam_ids = set(as_qs.values_list('exam_id', flat=True))

            # Also check if an Assessment record exists for this class
            a_qs = Assessment.objects.all()
            if class_id:
                try:
                    cid = int(class_id)
                    a_qs = a_qs.filter(class_id=cid)
                except ValueError:
                    pass
            created_exam_ids = set(a_qs.values_list('assessment_type_id', flat=True))

            valid_exam_ids = configured_exam_ids.union(created_exam_ids)
            queryset = queryset.filter(assessment_type_id__in=valid_exam_ids)

        queryset = list(queryset.order_by('assessment_type_id'))
        serializer = AssessmentTypeSerializer(queryset, many=True)
        return Response(serializer.data)


class AcademicYearListView(AssessmentAPIView):
    def get(self, request):
        queryset = AcademicYear.objects.filter(is_active=True).order_by('academic_year_id')
        serializer = AcademicYearSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        from school.views.metadata import AcademicYearMetadataListCreateView
        return AcademicYearMetadataListCreateView().post(request)


class SchoolClassListView(AssessmentAPIView):
    def get(self, request):
        queryset = SchoolClass.objects.filter(is_active=True).order_by('class_id')
        serializer = SchoolClassSerializer(queryset, many=True)
        return Response(serializer.data)


class SubjectListView(AssessmentAPIView):
    def get(self, request):
        class_id = request.query_params.get('classId') or request.query_params.get('class_id')
        exam_id = request.query_params.get('examId') or request.query_params.get('exam_id') or request.query_params.get('assessmentTypeId') or request.query_params.get('assessment_type_id')
        centre_id = request.query_params.get('centreId') or request.query_params.get('centre_id')
        academic_year_id = request.query_params.get('academicYearId') or request.query_params.get('academic_year_id')

        as_qs = AssessmentSubject.objects.filter(is_active=True)
        if class_id:
            try:
                as_qs = as_qs.filter(class_id=int(class_id))
            except ValueError:
                pass
        if exam_id:
            try:
                as_qs = as_qs.filter(exam_id=int(exam_id))
            except ValueError:
                pass
        if academic_year_id:
            try:
                as_qs = as_qs.filter(academic_year_id=int(academic_year_id))
            except ValueError:
                pass
        if centre_id:
            try:
                cid = int(centre_id)
                as_qs = as_qs.filter(Q(centre_id=cid) | Q(centre_id__isnull=True))
            except ValueError:
                pass

        as_entries = list(as_qs)

        allowed_subject_ids = set()
        subject_max_marks_map = {}

        for entry in as_entries:
            s_ids = entry.subject_ids
            if isinstance(s_ids, list):
                for sid in s_ids:
                    try:
                        sid_int = int(sid)
                        allowed_subject_ids.add(sid_int)
                        if sid_int not in subject_max_marks_map or entry.centre_id is not None:
                            subject_max_marks_map[sid_int] = float(entry.max_marks)
                    except (ValueError, TypeError):
                        pass

        if allowed_subject_ids:
            queryset = Subject.objects.filter(subject_id__in=allowed_subject_ids)
        else:
            queryset = Subject.objects.all()

        subjects = list(queryset.order_by('subject_id'))
        serializer = SubjectSerializer(subjects, many=True)
        data = serializer.data

        for subj in data:
            subj_id = subj.get('id')
            if subj_id in subject_max_marks_map:
                subj['maxMarks'] = subject_max_marks_map[subj_id]
            else:
                subj['maxMarks'] = 100.0

        return Response(data)


class AssessmentCreateView(AssessmentAPIView):

    def get(self, request):
        class_id = request.query_params.get('classId')
        centre_id = request.query_params.get('centreId') or request.query_params.get('centre_id')
        assessment_type_id = request.query_params.get('assessmentTypeId')
        academic_year_id = request.query_params.get('academicYearId')
        status_param = request.query_params.get('status')

        ay_map = {y.academic_year_id: y.name for y in AcademicYear.objects.all()}
        exam_map = {e.assessment_type_id: e for e in AssessmentType.objects.all()}

        seen_keys = set()
        seen_ids = set()
        results = []

        def get_dedup_key(ay, cid, eid, centre):
            if centre_id:
                return (ay, cid, eid)
            return (ay, cid, eid, centre)

        # 1. Process AssessmentSubject master configs
        as_qs = AssessmentSubject.objects.filter(is_active=True).order_by('-assessment_subject_id')
        if class_id:
            as_qs = as_qs.filter(class_id=class_id)
        if assessment_type_id:
            as_qs = as_qs.filter(exam_id=assessment_type_id)
        if academic_year_id:
            as_qs = as_qs.filter(academic_year_id=academic_year_id)

        for as_entry in as_qs:
            exam_obj = exam_map.get(as_entry.exam_id)
            if not exam_obj:
                continue

            ay_id = as_entry.academic_year_id or (exam_obj.academic_year_id if exam_obj else None)

            a_filter = {
                'class_id': as_entry.class_id,
                'assessment_type_id': as_entry.exam_id,
            }
            if ay_id:
                a_filter['academic_year_id'] = ay_id
            if centre_id:
                a_filter['centre_id'] = centre_id

            a_obj = Assessment.objects.filter(**a_filter).order_by('-assessment_id').first()

            if status_param and a_obj and a_obj.status.lower() != status_param.lower():
                continue
            if status_param and not a_obj:
                continue

            resolved_ay_id = (a_obj.academic_year_id if a_obj else None) or ay_id
            resolved_centre_id = a_obj.centre_id if a_obj else as_entry.centre_id
            year_name = ay_map.get(resolved_ay_id) or _format_year(resolved_ay_id)

            key = get_dedup_key(resolved_ay_id, as_entry.class_id, as_entry.exam_id, resolved_centre_id)
            if key in seen_keys:
                continue
            seen_keys.add(key)

            if a_obj:
                seen_ids.add(a_obj.assessment_id)

            results.append({
                'id': a_obj.assessment_id if a_obj else as_entry.assessment_subject_id,
                'status': a_obj.status if a_obj else 'DRAFT',
                'academicYear': year_name,
                'academicYearId': resolved_ay_id,
                'class': f'Grade {as_entry.class_id}',
                'classId': as_entry.class_id,
                'assessmentType': exam_obj.name,
                'assessmentTypeId': as_entry.exam_id,
                'assessmentDate': str(a_obj.assessment_date) if (a_obj and a_obj.assessment_date) else '',
                'centreId': resolved_centre_id,
                'centreName': a_obj.centre.centre_name if (a_obj and a_obj.centre) else '',
                'maxMarks': float(as_entry.max_marks) if as_entry.max_marks is not None else 100.0,
                'subjectIds': as_entry.subject_ids or [],
            })

        # 2. Include any standalone Assessment batch records
        a_qs = Assessment.objects.select_related('assessment_type', 'centre').all().order_by('-assessment_id')
        if class_id:
            a_qs = a_qs.filter(class_id=class_id)
        if centre_id:
            a_qs = a_qs.filter(centre_id=centre_id)
        if assessment_type_id:
            a_qs = a_qs.filter(assessment_type_id=assessment_type_id)
        if academic_year_id:
            a_qs = a_qs.filter(academic_year_id=academic_year_id)
        if status_param:
            a_qs = a_qs.filter(status__iexact=status_param)

        for a in a_qs:
            if a.assessment_id in seen_ids:
                continue

            key = get_dedup_key(a.academic_year_id, a.class_id, a.assessment_type_id, a.centre_id)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            seen_ids.add(a.assessment_id)

            year_name = ay_map.get(a.academic_year_id) or _format_year(a.academic_year_id)
            results.append({
                'id': a.assessment_id,
                'status': a.status,
                'academicYear': year_name,
                'academicYearId': a.academic_year_id,
                'class': f'Grade {a.class_id}',
                'classId': a.class_id,
                'assessmentType': a.assessment_type.name if a.assessment_type else '',
                'assessmentTypeId': a.assessment_type_id,
                'assessmentDate': str(a.assessment_date) if a.assessment_date else '',
                'centreId': a.centre_id,
                'centreName': a.centre.centre_name if a.centre else '',
                'maxMarks': 100.0,
                'subjectIds': [],
            })

        return Response(results)

    def post(self, request):
        academic_year_id = request.data.get('academicYearId')
        assessment_date = request.data.get('assessmentDate')
        centre_id = request.data.get('centreId') or request.data.get('centre_id')
        subject_ids = request.data.get('subjectIds') or []
        max_marks = request.data.get('maxMarks')
        parsed_max_marks = Decimal(str(max_marks)) if max_marks is not None else Decimal('100.00')

        # Multi-select support from frontend
        raw_class_ids = request.data.get('classIds')
        if raw_class_ids is None and request.data.get('classId') is not None:
            raw_class_ids = [request.data.get('classId')]
        elif not isinstance(raw_class_ids, list) and raw_class_ids is not None:
            raw_class_ids = [raw_class_ids]

        raw_exam_ids = request.data.get('assessmentTypeIds') or request.data.get('examIds')
        if raw_exam_ids is None and request.data.get('assessmentTypeId') is not None:
            raw_exam_ids = [request.data.get('assessmentTypeId')]
        elif raw_exam_ids is None and request.data.get('examId') is not None:
            raw_exam_ids = [request.data.get('examId')]
        elif not isinstance(raw_exam_ids, list) and raw_exam_ids is not None:
            raw_exam_ids = [raw_exam_ids]

        class_ids = []
        for c in (raw_class_ids or []):
            try:
                class_ids.append(int(c))
            except (ValueError, TypeError):
                pass
        class_ids = sorted(list(set(class_ids)))

        exam_ids = []
        for e in (raw_exam_ids or []):
            try:
                exam_ids.append(int(e))
            except (ValueError, TypeError):
                pass
        exam_ids = sorted(list(set(exam_ids)))

        if not class_ids or not exam_ids or not academic_year_id or not assessment_date:
            return Response({'error': 'Classes, Exams, Academic Year, and Assessment Date are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve valid AcademicYear ID
        ay_id = int(academic_year_id)
        if not AcademicYear.objects.filter(academic_year_id=ay_id).exists():
            curr_ay = AcademicYear.objects.filter(is_current=True).first() or AcademicYear.objects.first()
            if curr_ay:
                ay_id = curr_ay.academic_year_id

        target_centre_id = int(centre_id) if centre_id else None

        created_assessments = []

        # Create separate database entry for each (class_id, assessment_type) combination
        for cid in class_ids:
            for eid in exam_ids:
                exam_obj = AssessmentType.objects.filter(assessment_type_id=eid).first()
                if not exam_obj:
                    continue

                filter_kwargs = {
                    'academic_year_id': ay_id,
                    'class_id': cid,
                    'assessment_type': exam_obj,
                }
                if target_centre_id:
                    filter_kwargs['centre_id'] = target_centre_id

                assessment = Assessment.objects.filter(**filter_kwargs).first()
                if not assessment:
                    assessment = Assessment.objects.create(
                        academic_year_id=ay_id,
                        class_id=cid,
                        centre_id=target_centre_id,
                        assessment_type=exam_obj,
                        assessment_date=assessment_date,
                        status=Assessment.STATUS_DRAFT,
                    )
                else:
                    assessment.assessment_date = assessment_date
                    assessment.save()

                created_assessments.append(assessment)

                # Ensure AssessmentSubject entry exists for this (class_id, exam_id, academic_year_id)
                as_filter = {
                    'class_id': cid,
                    'exam_id': eid,
                }
                if ay_id:
                    as_filter['academic_year_id'] = ay_id
                if target_centre_id:
                    as_filter['centre_id'] = target_centre_id

                as_entry = AssessmentSubject.objects.filter(**as_filter).first()
                if not as_entry:
                    AssessmentSubject.objects.create(
                        class_id=cid,
                        exam_id=eid,
                        academic_year_id=ay_id,
                        centre_id=target_centre_id,
                        max_marks=parsed_max_marks,
                        is_active=True,
                        subject_ids=subject_ids if subject_ids else [],
                    )
                else:
                    if subject_ids:
                        as_entry.subject_ids = subject_ids
                    if max_marks is not None:
                        as_entry.max_marks = parsed_max_marks
                    as_entry.is_active = True
                    as_entry.save()

        first_resp = AssessmentSerializer(created_assessments[0]).data if created_assessments else {}
        return Response({
            'message': f'{len(created_assessments)} assessment(s) created successfully',
            'count': len(created_assessments),
            'id': created_assessments[0].assessment_id if created_assessments else None,
            'status': created_assessments[0].status if created_assessments else 'DRAFT',
            'academicYear': first_resp.get('academicYear'),
            'class': first_resp.get('class_name'),
            'assessmentType': first_resp.get('assessmentType'),
            'centreId': created_assessments[0].centre_id if created_assessments else None,
            'createdIds': [a.assessment_id for a in created_assessments],
        }, status=status.HTTP_201_CREATED)


class AssessmentDetailView(AssessmentAPIView):
    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        student_count = Student.objects.filter(assessment_scores__assessment=assessment).distinct().count()
        if not student_count:
            student_count = 0
        as_qs = AssessmentSubject.objects.filter(
            class_id=assessment.class_id,
            exam_id=assessment.assessment_type_id,
            is_active=True,
        )
        if assessment.academic_year_id:
            as_qs = as_qs.filter(Q(academic_year_id=assessment.academic_year_id) | Q(academic_year_id__isnull=True))
        if assessment.centre_id:
            as_qs = as_qs.filter(Q(centre_id=assessment.centre_id) | Q(centre_id__isnull=True))

        as_entry = as_qs.exclude(subject_ids=[]).order_by('-assessment_subject_id').first() or as_qs.order_by('-assessment_subject_id').first()
        subject_ids = as_entry.subject_ids if (as_entry and as_entry.subject_ids) else []
        max_marks = float(as_entry.max_marks) if (as_entry and as_entry.max_marks is not None) else 100.0
        return Response({
            'id': assessment.assessment_id,
            'status': assessment.status,
            'assessmentType': assessment.assessment_type.name if assessment.assessment_type else '',
            'assessmentTypeId': assessment.assessment_type_id,
            'academicYear': _format_year(assessment.academic_year_id),
            'academicYearId': assessment.academic_year_id,
            'class': f'Grade {assessment.class_id}',
            'classId': assessment.class_id,
            'assessmentDate': str(assessment.assessment_date) if assessment.assessment_date else '',
            'centreId': assessment.centre_id,
            'centreName': assessment.centre.centre_name if assessment.centre else '',
            'subjectIds': subject_ids,
            'maxMarks': max_marks,
            'totalStudents': student_count,
        })

    def patch(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        data = request.data
        if 'assessmentTypeId' in data and data['assessmentTypeId']:
            assessment.assessment_type_id = int(data['assessmentTypeId'])
        if 'academicYearId' in data and data['academicYearId']:
            assessment.academic_year_id = int(data['academicYearId'])
        if 'classId' in data and data['classId']:
            assessment.class_id = int(data['classId'])
        if 'assessmentDate' in data and data['assessmentDate']:
            assessment.assessment_date = data['assessmentDate']
        if 'centreId' in data:
            cid = data['centreId']
            assessment.centre_id = int(cid) if cid else None
        if 'status' in data and data['status']:
            assessment.status = data['status']
        assessment.save()

        max_m = Decimal(str(data['maxMarks'])) if ('maxMarks' in data and data['maxMarks'] is not None) else None

        if ('subjectIds' in data and isinstance(data['subjectIds'], list)) or max_m is not None:
            as_entry = AssessmentSubject.objects.filter(
                class_id=assessment.class_id,
                exam_id=assessment.assessment_type_id,
            ).order_by('-assessment_subject_id').first()
            if as_entry:
                if 'subjectIds' in data and isinstance(data['subjectIds'], list):
                    as_entry.subject_ids = data['subjectIds']
                if max_m is not None:
                    as_entry.max_marks = max_m
                as_entry.save()
            else:
                AssessmentSubject.objects.create(
                    class_id=assessment.class_id,
                    exam_id=assessment.assessment_type_id,
                    academic_year_id=assessment.academic_year_id,
                    centre_id=assessment.centre_id,
                    subject_ids=data.get('subjectIds', []),
                    max_marks=max_m if max_m is not None else Decimal('100'),
                    is_active=True,
                )

        return Response({
            'id': assessment.assessment_id,
            'status': assessment.status,
            'assessmentType': assessment.assessment_type.name if assessment.assessment_type else '',
            'assessmentTypeId': assessment.assessment_type_id,
            'academicYear': _format_year(assessment.academic_year_id),
            'academicYearId': assessment.academic_year_id,
            'class': f'Grade {assessment.class_id}',
            'classId': assessment.class_id,
            'assessmentDate': str(assessment.assessment_date) if assessment.assessment_date else '',
            'centreId': assessment.centre_id,
            'message': 'Assessment updated successfully',
        })

    def delete(self, request, assessment_id):
        a_obj = Assessment.objects.filter(assessment_id=assessment_id).first()
        if a_obj:
            class_id = a_obj.class_id
            exam_id = a_obj.assessment_type_id
            ay_id = a_obj.academic_year_id
            a_obj.delete()
            AssessmentSubject.objects.filter(class_id=class_id, exam_id=exam_id, academic_year_id=ay_id).delete()
            return Response({'message': 'Assessment deleted successfully'}, status=status.HTTP_200_OK)

        as_obj = AssessmentSubject.objects.filter(assessment_subject_id=assessment_id).first()
        if as_obj:
            class_id = as_obj.class_id
            exam_id = as_obj.exam_id
            ay_id = as_obj.academic_year_id
            as_obj.delete()
            Assessment.objects.filter(class_id=class_id, assessment_type_id=exam_id, academic_year_id=ay_id).delete()
            return Response({'message': 'Assessment deleted successfully'}, status=status.HTTP_200_OK)

        return Response({'error': 'Assessment not found'}, status=status.HTTP_404_NOT_FOUND)


class AssessmentScoreBulkView(AssessmentAPIView):
    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        by_student = {}
        for score in AssessmentScore.objects.filter(assessment=assessment).select_related('student', 'subject'):
            max_marks = _subject_max_marks(assessment, score.subject_id)
            by_student.setdefault(score.student_id, {'studentId': score.student_id, 'admissionNumber': score.student.student_id, 'studentName': score.student.full_name if hasattr(score.student, 'full_name') else str(score.student_id), 'scores': []})
            by_student[score.student_id]['scores'].append({
                'subjectId': score.subject.subject_id,
                'subject': score.subject.name,
                'maxMarks': float(max_marks),
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
                    defaults={'obtained_marks': Decimal(str(score_payload.get('obtainedMarks', 0)))},
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
                'maxMarks': float(_subject_max_marks(assessment, item.subject_id)),
            } for item in scores]
            total_marks = sum(float(item.obtained_marks) for item in scores)
            max_marks = _score_max_total(assessment, scores) or Decimal('100')
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


class AssessmentDiagnosticListView(AssessmentAPIView):
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


class AssessmentDiagnosticBulkView(AssessmentAPIView):
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


class DiagnosticOptionsView(AssessmentAPIView):
    def get(self, request):
        understanding = DiagnosticOption.objects.filter(category=DiagnosticOption.CATEGORY_UNDERSTANDING).order_by('sort_order')
        application = DiagnosticOption.objects.filter(category=DiagnosticOption.CATEGORY_APPLICATION).order_by('sort_order')
        interest = DiagnosticOption.objects.filter(category=DiagnosticOption.CATEGORY_INTEREST).order_by('sort_order')
        return Response({
            'understandingLevels': [{'code': item.code, 'name': item.name} for item in understanding],
            'applicationAbilities': [{'code': item.code, 'name': item.name} for item in application],
            'interestLevels': [{'code': item.code, 'name': item.name} for item in interest],
        })


class LearningBehaviourOptionListView(AssessmentAPIView):
    def get(self, request):
        options = LearningBehaviourOption.objects.filter(is_active=True).order_by('behaviour_option_id')
        return Response([{'code': item.code, 'name': item.name} for item in options])


class AssessmentBehaviourView(AssessmentAPIView):
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


class AssessmentObservationListView(AssessmentAPIView):
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

    def put(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        saved = 0
        for item in request.data.get('students', []):
            student = Student.objects.filter(student_id=item.get('studentId')).first()
            if not student:
                continue
            key_improvements = item.get('keyImprovements') or item.get('comments') or ''
            subjects_needing_support = item.get('subjectsNeedingSupport') or ''
            intervention_plan = item.get('interventionPlan') or ''

            StudentObservation.objects.update_or_create(
                assessment=assessment,
                student=student,
                defaults={
                    'key_improvements': key_improvements,
                    'subjects_needing_support': subjects_needing_support,
                    'intervention_plan': intervention_plan,
                },
            )
            saved += 1
        return Response({'assessmentId': assessment.assessment_id, 'saved': saved, 'status': 'SUCCESS'})


class StudentObservationView(AssessmentAPIView):
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

        key_improvements = request.data.get('keyImprovements') or request.data.get('comments') or ''
        subjects_needing_support = request.data.get('subjectsNeedingSupport') or ''
        intervention_plan = request.data.get('interventionPlan') or ''

        observation, _ = StudentObservation.objects.update_or_create(
            assessment=assessment,
            student=student,
            defaults={
                'key_improvements': key_improvements,
                'subjects_needing_support': subjects_needing_support,
                'intervention_plan': intervention_plan,
            },
        )
        return Response({
            'studentId': student.student_id,
            'keyImprovements': observation.key_improvements,
            'subjectsNeedingSupport': observation.subjects_needing_support,
            'interventionPlan': observation.intervention_plan,
        })


class AssessmentSubmitView(AssessmentAPIView):
    def post(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        student_ids = set(Student.objects.filter(assessment_scores__assessment=assessment).values_list('student_id', flat=True).distinct())
        
        as_qs = AssessmentSubject.objects.filter(
            class_id=assessment.class_id,
            exam_id=assessment.assessment_type_id,
            is_active=True,
        )
        if assessment.academic_year_id:
            as_qs = as_qs.filter(Q(academic_year_id=assessment.academic_year_id) | Q(academic_year_id__isnull=True))
        if assessment.centre_id:
            as_qs = as_qs.filter(Q(centre_id=assessment.centre_id) | Q(centre_id__isnull=True))

        as_entry = as_qs.exclude(subject_ids=[]).order_by('-assessment_subject_id').first()
        if not as_entry:
            as_entry = as_qs.order_by('-assessment_subject_id').first()

        if as_entry and as_entry.subject_ids:
            class_subjects = Subject.objects.filter(subject_id__in=as_entry.subject_ids)
        else:
            # Fall back only to subjects that have actual scores recorded for this assessment
            scores_subject_ids = set(AssessmentScore.objects.filter(assessment=assessment).values_list('subject_id', flat=True).distinct())
            if scores_subject_ids:
                class_subjects = Subject.objects.filter(subject_id__in=scores_subject_ids)
            else:
                class_subjects = Subject.objects.none()
        
        scores = AssessmentScore.objects.filter(assessment=assessment)
        diagnostics = AssessmentDiagnostic.objects.filter(assessment=assessment)
        behaviours = StudentLearningBehaviour.objects.filter(assessment=assessment)
        observations = StudentObservation.objects.filter(assessment=assessment)

        # Check if all required subjects for this class have scores in this assessment
        assessed_subject_ids = set(scores.values_list('subject_id', flat=True).distinct())
        missing_subjects = [sub.name for sub in class_subjects if sub.subject_id not in assessed_subject_ids]

        if missing_subjects:
            type_name = assessment.assessment_type.name if assessment.assessment_type else 'Quarterly'
            missing_str = ', '.join(missing_subjects)
            return Response({
                'error': f"Not all subjects for Class {assessment.class_id} (Type: {type_name}) have been completed (Missing: {missing_str}). Please save progress as draft instead."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Auto-create defaults for missing secondary components if students have scores
        if not diagnostics.exists() and scores.exists():
            for score in scores:
                AssessmentDiagnostic.objects.get_or_create(
                    assessment=assessment,
                    student=score.student,
                    subject=score.subject,
                    defaults={
                        'understanding_level': 'GOOD',
                        'application_ability': 'GOOD',
                        'interest_level': 'HIGH',
                    }
                )
            diagnostics = AssessmentDiagnostic.objects.filter(assessment=assessment)

        if not behaviours.exists() and student_ids:
            default_behaviour = LearningBehaviourOption.objects.filter(code='INDEPENDENT').first() or LearningBehaviourOption.objects.first()
            if default_behaviour:
                for sid in student_ids:
                    st = Student.objects.filter(student_id=sid).first()
                    if st:
                        StudentLearningBehaviour.objects.get_or_create(
                            assessment=assessment,
                            student=st,
                            defaults={'behaviour_option': default_behaviour}
                        )
                behaviours = StudentLearningBehaviour.objects.filter(assessment=assessment)

        if not observations.exists() and student_ids:
            for sid in student_ids:
                st = Student.objects.filter(student_id=sid).first()
                if st:
                    StudentObservation.objects.get_or_create(
                        assessment=assessment,
                        student=st,
                        defaults={
                            'key_improvements': 'General observation recorded.',
                            'subjects_needing_support': '',
                            'intervention_plan': '',
                        }
                    )
            observations = StudentObservation.objects.filter(assessment=assessment)

        missing = []
        if not scores.exists() or not student_ids:
            missing.append('student scores')
        if not diagnostics.exists():
            missing.append('diagnostics')
        if not behaviours.exists():
            missing.append('learning behaviour')
        if not observations.exists():
            missing.append('narrative observations')

        if missing:
            return Response({
                'error': f"The assessment cannot be submitted because required components are missing: {', '.join(missing)}. Please save progress as draft instead."
            }, status=status.HTTP_400_BAD_REQUEST)

        assessment.status = Assessment.STATUS_SUBMITTED
        assessment.save(update_fields=['status', 'updated_at'])
        AssessmentSubmission.objects.update_or_create(assessment=assessment, defaults={'submitted_by': request.user.username if hasattr(request, 'user') else 'system'})

        # Delete any other leftover draft assessments for the same class and assessment type
        other_drafts = Assessment.objects.filter(
            class_id=assessment.class_id,
            assessment_type_id=assessment.assessment_type_id,
            status=Assessment.STATUS_DRAFT,
        ).exclude(assessment_id=assessment.assessment_id)
        other_drafts.delete()

        return Response({
            'assessmentId': assessment.assessment_id,
            'status': 'SUBMITTED',
            'submittedAt': assessment.updated_at.isoformat(),
        })


class AssessmentReopenView(AssessmentAPIView):
    """Reopen a submitted assessment so marks can be edited."""

    def post(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        if assessment.status != Assessment.STATUS_SUBMITTED:
            return Response(
                {'error': 'Only submitted assessments can be reopened for editing.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assessment.status = Assessment.STATUS_DRAFT
        assessment.save(update_fields=['status', 'updated_at'])

        # Remove the submission record so it can be re-submitted later
        AssessmentSubmission.objects.filter(assessment=assessment).delete()

        return Response({
            'assessmentId': assessment.assessment_id,
            'status': 'DRAFT',
            'message': 'Assessment reopened for editing. You can now update marks and re-submit.',
        })


def _get_previous_assessment(assessment):
    """
    Find the preceding assessment for the same class and centre that has scores recorded.
    Matches in order of:
    1. Earlier assessment date
    2. Same assessment date with lower assessment_type_id or lower assessment_id
    3. Any assessment in the same academic year with lower assessment_type_id or lower assessment_id
    4. Any earlier assessment with lower assessment_id
    """
    if not assessment:
        return None

    base_qs = Assessment.objects.filter(
        class_id=assessment.class_id,
    ).exclude(assessment_id=assessment.assessment_id)

    # Scoped to the same centre if set
    if assessment.centre_id:
        centre_scored = base_qs.filter(centre_id=assessment.centre_id, scores__isnull=False).distinct()
        if centre_scored.exists():
            base_qs = centre_scored
        else:
            base_qs = base_qs.filter(Q(centre_id=assessment.centre_id) | Q(centre_id__isnull=True))

    # Prefer the same academic year if it has prior assessments with scores
    if assessment.academic_year_id:
        ay_qs = base_qs.filter(academic_year_id=assessment.academic_year_id)
        if ay_qs.filter(scores__isnull=False).distinct().exists():
            base_qs = ay_qs

    scored_candidates = base_qs.filter(scores__isnull=False).distinct()
    candidates = scored_candidates if scored_candidates.exists() else base_qs

    # 1. Strictly earlier assessment date
    prev = candidates.filter(
        assessment_date__lt=assessment.assessment_date
    ).order_by('-assessment_date', '-assessment_id').first()
    if prev:
        return prev

    # 2. Same assessment date, but lower exam type or created earlier
    prev = candidates.filter(
        assessment_date=assessment.assessment_date,
        assessment_type_id__lt=assessment.assessment_type_id
    ).order_by('-assessment_type_id', '-assessment_id').first()
    if prev:
        return prev

    prev = candidates.filter(
        assessment_date=assessment.assessment_date,
        assessment_id__lt=assessment.assessment_id
    ).order_by('-assessment_id').first()
    if prev:
        return prev

    # 3. Earlier exam type regardless of date
    prev = candidates.filter(
        assessment_type_id__lt=assessment.assessment_type_id
    ).order_by('-assessment_type_id', '-assessment_id').first()
    if prev:
        return prev

    # 4. Strictly earlier assessment_id
    prev = candidates.filter(
        assessment_id__lt=assessment.assessment_id
    ).order_by('-assessment_id').first()
    if prev:
        return prev

    return None


class ComparisonView(AssessmentAPIView):
    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        previous_assessment = _get_previous_assessment(assessment)
        current_percentage = self._average_percentage(assessment)
        previous_percentage = self._average_percentage(previous_assessment) if previous_assessment else None
        if previous_percentage is not None:
            change = current_percentage - previous_percentage
            trend = 'UP' if change > 0 else 'DOWN' if change < 0 else 'STABLE'
        else:
            change = Decimal('0')
            trend = 'STABLE'

        return Response({
            'current': {'assessment': f'{assessment.assessment_type.name}', 'percentage': float(current_percentage)},
            'previous': {'assessment': previous_assessment.assessment_type.name if previous_assessment else None, 'percentage': float(previous_percentage) if previous_percentage is not None else None},
            'change': {'percentagePoints': float(change), 'trend': trend},
        })

    def _average_percentage(self, assessment):
        if assessment is None:
            return Decimal('0')
        scores = AssessmentScore.objects.filter(assessment=assessment)
        if not scores.exists():
            return Decimal('0')
        total_marks = scores.aggregate(Sum('obtained_marks'))['obtained_marks__sum'] or Decimal('0')
        max_marks = _score_max_total(assessment, scores)
        return _percentage(total_marks, max_marks) if max_marks else Decimal('0')


class SubjectComparisonView(AssessmentAPIView):
    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        previous_assessment = _get_previous_assessment(assessment)
        subject_list = []
        as_qs = AssessmentSubject.objects.filter(
            class_id=assessment.class_id,
            exam_id=assessment.assessment_type_id,
            is_active=True,
        )
        if assessment.academic_year_id:
            as_qs = as_qs.filter(Q(academic_year_id=assessment.academic_year_id) | Q(academic_year_id__isnull=True))
        if assessment.centre_id:
            as_qs = as_qs.filter(Q(centre_id=assessment.centre_id) | Q(centre_id__isnull=True))

        as_entry = as_qs.exclude(subject_ids=[]).order_by('-assessment_subject_id').first() or as_qs.order_by('-assessment_subject_id').first()
        if as_entry and as_entry.subject_ids:
            subjects = Subject.objects.filter(subject_id__in=as_entry.subject_ids)
        else:
            scores_subject_ids = set(AssessmentScore.objects.filter(assessment=assessment).values_list('subject_id', flat=True).distinct())
            subjects = Subject.objects.filter(subject_id__in=scores_subject_ids) if scores_subject_ids else Subject.objects.all()

        for subject in subjects:
            current = AssessmentScore.objects.filter(assessment=assessment, subject=subject)
            if not current.exists():
                continue
            current_total = sum(float(item.obtained_marks) for item in current)
            current_max = _score_max_total(assessment, current)
            current_percentage = _percentage(current_total, current_max) if current_max else Decimal('0')

            previous = AssessmentScore.objects.filter(assessment=previous_assessment, subject=subject) if previous_assessment else None
            if previous and previous.exists():
                previous_total = sum(float(item.obtained_marks) for item in previous)
                previous_max = _score_max_total(previous_assessment, previous)
                previous_percentage = _percentage(previous_total, previous_max) if previous_max else Decimal('0')
                change = current_percentage - previous_percentage
                trend = 'UP' if change > 0 else 'DOWN' if change < 0 else 'STABLE'
                prev_pct_val = float(previous_percentage)
                change_val = float(change)
            else:
                prev_pct_val = None
                change_val = 0.0
                trend = 'STABLE'

            subject_list.append({
                'subject': subject.name,
                'previousPercentage': prev_pct_val,
                'currentPercentage': float(current_percentage),
                'change': change_val,
                'trend': trend,
                'previousAssessment': previous_assessment.assessment_type.name if previous_assessment else None,
            })
        return Response(subject_list)


class StudentComparisonView(AssessmentAPIView):
    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        previous_assessment = _get_previous_assessment(assessment)
        rows = []
        for student in Student.objects.filter(assessment_scores__assessment=assessment).distinct():
            current = AssessmentScore.objects.filter(assessment=assessment, student=student)
            current_total = sum(float(item.obtained_marks) for item in current)
            current_max = _score_max_total(assessment, current) or Decimal('100')
            current_percentage = _percentage(current_total, current_max)
            previous_rows = AssessmentScore.objects.filter(assessment=previous_assessment, student=student) if previous_assessment else AssessmentScore.objects.none()
            if previous_rows.exists():
                previous_total = sum(float(item.obtained_marks) for item in previous_rows)
                previous_max = _score_max_total(previous_assessment, previous_rows) if previous_assessment else Decimal('100')
                previous_percentage = _percentage(previous_total, previous_max)
                change = current_percentage - previous_percentage
                trend = 'UP' if change > 0 else 'DOWN' if change < 0 else 'STABLE'
                prev_val = float(previous_percentage)
                change_val = float(change)
            else:
                prev_val = None
                change_val = 0.0
                trend = 'STABLE'

            rows.append({
                'studentId': student.student_id,
                'studentName': student.full_name,
                'previousPercentage': prev_val,
                'currentPercentage': float(current_percentage),
                'change': change_val,
                'trend': trend,
            })
        return Response(rows)


class StudentPerformanceTrendView(AssessmentAPIView):
    def get(self, request, student_id):
        subject_id = request.query_params.get('subjectId')
        subject = Subject.objects.filter(subject_id=subject_id).first() if subject_id else None
        queryset = AssessmentScore.objects.filter(student_id=student_id)
        if subject:
            queryset = queryset.filter(subject=subject)
        rows = []
        for score in queryset.select_related('assessment', 'assessment__assessment_type').order_by('assessment__assessment_date'):
            total = float(score.obtained_marks)
            max_value = float(_subject_max_marks(score.assessment, score.subject_id))
            rows.append({
                'assessment': f'{score.assessment.assessment_type.name}',
                'percentage': float(_percentage(total, max_value)),
            })
        return Response(rows)


class AssessmentStatisticsView(AssessmentAPIView):
    def get(self, request, assessment_id):
        assessment = _get_assessment_or_404(assessment_id)
        scorerows = AssessmentScore.objects.filter(assessment=assessment)
        student_count = scorerows.values_list('student_id', flat=True).distinct().count()
        if not scorerows.exists():
            return Response({'studentCount': 0, 'averagePercentage': 0, 'previousAverage': None, 'improvement': 0, 'highestPercentage': 0, 'lowestPercentage': 0, 'passPercentage': 0})
        totals = []
        for student_id in scorerows.values_list('student_id', flat=True).distinct():
            rows = scorerows.filter(student_id=student_id)
            total_marks = sum(float(item.obtained_marks) for item in rows)
            max_marks = _score_max_total(assessment, rows) or Decimal('100')
            totals.append(float(_percentage(total_marks, max_marks)))

        previous_assessment = _get_previous_assessment(assessment)
        previous_average = self._average_percentage(previous_assessment) if previous_assessment else None
        average = sum(totals) / len(totals) if totals else 0
        improvement = (average - float(previous_average)) if previous_average is not None else 0.0
        return Response({
            'studentCount': student_count,
            'averagePercentage': float(average),
            'previousAverage': float(previous_average) if previous_average is not None else None,
            'improvement': float(improvement),
            'highestPercentage': max(totals) if totals else 0,
            'lowestPercentage': min(totals) if totals else 0,
            'passPercentage': round((sum(1 for value in totals if value >= 40) / len(totals)) * 100, 2) if totals else 0,
        })

    def _average_percentage(self, assessment):
        if assessment is None:
            return Decimal('0')
        scorerows = AssessmentScore.objects.filter(assessment=assessment)
        if not scorerows.exists():
            return Decimal('0')
        student_ids = scorerows.values_list('student_id', flat=True).distinct()
        if not student_ids:
            return Decimal('0')
        totals = []
        for student_id in student_ids:
            rows = scorerows.filter(student_id=student_id)
            total_marks = sum(float(item.obtained_marks) for item in rows)
            max_marks = _score_max_total(assessment, rows) or Decimal('100')
            totals.append(float(_percentage(total_marks, max_marks)))
        return Decimal(str(round(sum(totals) / len(totals), 2))) if totals else Decimal('0')


class StudentDashboardView(AssessmentAPIView):
    def get(self, request, student_id):
        student = Student.objects.filter(student_id=student_id).first()
        if not student:
            return Response({'error': 'student not found'}, status=status.HTTP_404_NOT_FOUND)

        latest_assessment = Assessment.objects.filter(assessment__scores__student=student).first() if False else None
        current_assessment = Assessment.objects.filter(scores__student=student).order_by('-assessment_date').first()
        previous_assessment = Assessment.objects.filter(scores__student=student, assessment_date__lt=current_assessment.assessment_date).order_by('-assessment_date').first() if current_assessment else None
        current_rows = AssessmentScore.objects.filter(assessment=current_assessment, student=student) if current_assessment else AssessmentScore.objects.none()
        current_total = sum(float(item.obtained_marks) for item in current_rows) if current_assessment else 0
        current_max = _score_max_total(current_assessment, current_rows) or Decimal('100') if current_assessment else Decimal('100')
        current_percentage = _percentage(current_total, current_max) if current_assessment else Decimal('0')
        previous_rows = AssessmentScore.objects.filter(assessment=previous_assessment, student=student) if previous_assessment else AssessmentScore.objects.none()
        previous_total = sum(float(item.obtained_marks) for item in previous_rows) if previous_assessment else 0
        previous_max = _score_max_total(previous_assessment, previous_rows) or Decimal('100') if previous_assessment else Decimal('100')
        previous_percentage = _percentage(previous_total, previous_max) if previous_assessment else Decimal('0')
        change = current_percentage - previous_percentage
        behaviour = StudentLearningBehaviour.objects.filter(student=student, assessment=current_assessment).select_related('behaviour').first() if current_assessment else None

        return Response({
            'student': {'id': student.student_id, 'name': student.full_name, 'class': f'Grade {current_assessment.class_id if current_assessment else 0}'},
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


class AssessmentDetailsView(AssessmentAPIView):
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


class AssessmentCentrePerformanceView(AssessmentAPIView):
    def get(self, request, assessment_id=None):
        class_id = request.query_params.get('classId')
        assessment_type_id = request.query_params.get('assessmentTypeId')
        academic_year_id = request.query_params.get('academicYearId')
        status_param = request.query_params.get('status')

        if assessment_id:
            try:
                base_assessment = _get_assessment_or_404(assessment_id)
                class_id = class_id or base_assessment.class_id
                assessment_type_id = assessment_type_id or base_assessment.assessment_type_id
                academic_year_id = academic_year_id or base_assessment.academic_year_id
            except Assessment.DoesNotExist:
                return Response({'error': 'Assessment not found'}, status=status.HTTP_404_NOT_FOUND)
            except Exception:
                pass

        if not class_id:
            return Response({'error': 'classId or assessment_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        class_id_int = None
        try:
            match = re.search(r'\d+', str(class_id))
            if match:
                class_id_int = int(match.group())
        except (ValueError, TypeError):
            pass

        if not class_id_int:
            return Response({'error': 'Invalid classId'}, status=status.HTTP_400_BAD_REQUEST)

        exam_id_int = None
        if assessment_type_id:
            try:
                exam_id_int = int(assessment_type_id)
            except (ValueError, TypeError):
                exam_obj = AssessmentType.objects.filter(
                    Q(name__iexact=str(assessment_type_id).strip()) |
                    Q(code__iexact=str(assessment_type_id).strip())
                ).first()
                if exam_obj:
                    exam_id_int = exam_obj.assessment_type_id

        ay_id_int = None
        if academic_year_id:
            try:
                ay_id_int = int(academic_year_id)
            except (ValueError, TypeError):
                ay_obj = AcademicYear.objects.filter(name__iexact=str(academic_year_id).strip()).first()
                if ay_obj:
                    ay_id_int = ay_obj.academic_year_id

        # Build assessment filter
        assessment_filter = {'class_id': class_id_int}
        if exam_id_int:
            assessment_filter['assessment_type_id'] = exam_id_int
        if ay_id_int:
            assessment_filter['academic_year_id'] = ay_id_int

        assessments_qs = Assessment.objects.filter(**assessment_filter)
        if status_param:
            assessments_qs = assessments_qs.filter(status__iexact=status_param)

        target_assessments = assessments_qs.filter(scores__isnull=False).distinct()
        if not target_assessments.exists():
            target_assessments = assessments_qs

        # Fetch all centres
        all_centres = Center.objects.select_related('region', 'district').all().order_by('centre_name')

        # Fetch all scores for target assessments
        scores_qs = AssessmentScore.objects.filter(
            assessment__in=target_assessments
        ).select_related('student', 'student__centre', 'subject', 'assessment')

        # Map centre_id -> list of score rows
        centre_scores_map = {}
        for score in scores_qs:
            cid = None
            if score.student_id and score.student and score.student.centre_id:
                cid = score.student.centre_id
            elif score.assessment_id and score.assessment and score.assessment.centre_id:
                cid = score.assessment.centre_id
            if cid:
                centre_scores_map.setdefault(cid, []).append(score)

        # Build class filter for student counts
        class_str = str(class_id_int)
        class_q = (
            Q(class_grade__iexact=class_str) |
            Q(class_grade__iexact=f'Class {class_str}') |
            Q(class_grade__iexact=f'Grade {class_str}') |
            Q(class_grade__iexact=f'Class {class_id_int:02d}') |
            Q(class_grade__iexact=f'Grade {class_id_int:02d}') |
            Q(class_grade__iexact=f'{class_id_int:02d}')
        )

        centre_report_items = []
        for c in all_centres:
            c_scores = centre_scores_map.get(c.centre_id, [])

            # Count students enrolled in this class at this centre
            student_qs = Student.objects.filter(centre=c).filter(class_q)
            if ay_id_int:
                student_year_qs = student_qs.filter(year_records__academic_year_id=ay_id_int, year_records__is_active=True).distinct()
                if student_year_qs.exists():
                    student_count_in_centre = student_year_qs.count()
                else:
                    student_count_in_centre = student_qs.count()
            else:
                student_count_in_centre = student_qs.count()

            # Group scores by student
            students_scores = {}
            for s in c_scores:
                students_scores.setdefault(s.student_id, []).append(s)

            student_percentages = []
            subject_totals = {}

            for s_id, s_rows in students_scores.items():
                total_obtained = sum(float(row.obtained_marks) for row in s_rows)
                total_max = float(_score_max_total(s_rows[0].assessment, s_rows) or Decimal('100'))
                if total_max > 0:
                    pct = (total_obtained / total_max) * 100.0
                else:
                    pct = 0.0
                student_percentages.append(pct)

                for row in s_rows:
                    subj_name = row.subject.name if row.subject else 'Subject'
                    max_m = float(_subject_max_marks(row.assessment, row.subject_id))
                    sub_info = subject_totals.setdefault(subj_name, {'obtained': 0.0, 'max': 0.0})
                    sub_info['obtained'] += float(row.obtained_marks)
                    sub_info['max'] += max_m if max_m > 0 else 100.0

            has_data = len(student_percentages) > 0
            students_count = max(student_count_in_centre, len(students_scores))

            if has_data:
                avg_score = round(sum(student_percentages) / len(student_percentages), 1)
                pass_count = sum(1 for p in student_percentages if p >= 50.0)
                pass_rate = round((pass_count / len(student_percentages)) * 100.0, 1)

                top_subject = 'N/A'
                best_avg = -1.0
                for subj_name, sub_data in subject_totals.items():
                    if sub_data['max'] > 0:
                        subj_avg = (sub_data['obtained'] / sub_data['max']) * 100.0
                        if subj_avg > best_avg:
                            best_avg = subj_avg
                            top_subject = subj_name

                if avg_score >= 75.0:
                    status_str = 'High Performing'
                elif avg_score >= 60.0:
                    status_str = 'Average'
                else:
                    status_str = 'Needs Support'
            else:
                avg_score = None
                pass_rate = None
                top_subject = 'N/A'
                status_str = 'No Data'

            region_name = c.region.region_name if (c.region and hasattr(c.region, 'region_name')) else (str(c.region) if c.region else 'Region')
            district_name = c.district.district_name if (c.district and hasattr(c.district, 'district_name')) else (str(c.district) if c.district else 'District')

            centre_report_items.append({
                'id': c.centre_id,
                'name': c.centre_name,
                'region': region_name,
                'district': district_name,
                'studentsCount': students_count,
                'avgScore': avg_score,
                'passRate': pass_rate,
                'topSubject': top_subject,
                'status': status_str,
                'hasData': has_data,
            })

        # Rank centres: hasData first (by avgScore desc), then noData (by name asc)
        centre_report_items.sort(
            key=lambda x: (
                0 if x['hasData'] else 1,
                -(x['avgScore'] if x['avgScore'] is not None else 0),
                x['name']
            )
        )
        for idx, item in enumerate(centre_report_items):
            item['rank'] = idx + 1

        # Region comparison aggregation
        region_groups = {}
        for item in centre_report_items:
            region_groups.setdefault(item['region'], []).append(item)

        region_report_items = []
        for reg_name, items in region_groups.items():
            centres_count = len(items)
            students_count = sum(it['studentsCount'] for it in items)
            scored_items = [it for it in items if it['hasData'] and it['avgScore'] is not None]
            has_reg_data = len(scored_items) > 0
            if has_reg_data:
                avg_score = round(sum(it['avgScore'] for it in scored_items) / len(scored_items), 1)
                pass_items = [it for it in scored_items if it['passRate'] is not None]
                pass_rate = round(sum(it['passRate'] for it in pass_items) / len(pass_items), 1) if pass_items else None
                low_count = sum(1 for it in scored_items if it['avgScore'] < 60.0)
                level_str = 'Exceptional' if avg_score >= 75.0 else ('On Track' if avg_score >= 60.0 else 'Needs Intervention')
            else:
                avg_score = None
                pass_rate = None
                low_count = 0
                level_str = 'No Data'

            region_report_items.append({
                'name': reg_name,
                'centresCount': centres_count,
                'studentsCount': students_count,
                'avgScore': avg_score,
                'passRate': pass_rate,
                'lowCount': low_count,
                'hasData': has_reg_data,
                'level': level_str,
            })

        region_report_items.sort(
            key=lambda x: (
                0 if x['hasData'] else 1,
                -(x['avgScore'] if x['avgScore'] is not None else 0),
                x['name']
            )
        )

        return Response({
            'assessmentId': assessment_id if assessment_id else None,
            'classId': class_id_int,
            'assessmentTypeId': exam_id_int,
            'academicYearId': ay_id_int,
            'centres': centre_report_items,
            'regions': region_report_items,
        })
