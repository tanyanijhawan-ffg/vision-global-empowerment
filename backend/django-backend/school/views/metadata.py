from decimal import Decimal

from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from school.models.assessment import (
    AcademicYear,
    Assessment,
    AssessmentScore,
    AssessmentSubject,
    AssessmentSubmission,
    AssessmentType,
    DiagnosticOption,
    LearningBehaviourOption,
    SchoolClass,
    Subject,
)
from school.serializers.assessment import (
    AcademicYearSerializer,
    AssessmentScoreSerializer,
    AssessmentSubjectSerializer,
    AssessmentTypeSerializer,
    DiagnosticOptionSerializer,
    LearningBehaviourOptionSerializer,
    SchoolClassSerializer,
    SubjectSerializer,
)


class AcademicYearMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = AcademicYear.objects.filter(is_active=True).order_by('academic_year_id')
    serializer_class = AcademicYearSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        name = str(payload.get('name', '')).strip()
        if not name:
            return Response({'error': 'Academic year name is required'}, status=status.HTTP_400_BAD_REQUEST)

        existing = AcademicYear.objects.filter(name__iexact=name).first()
        if existing:
            if not existing.is_active:
                existing.is_active = True
                existing.save()
            return Response(self.get_serializer(existing).data, status=status.HTTP_200_OK)

        start_date = payload.get('startDate') or payload.get('start_date')
        end_date = payload.get('endDate') or payload.get('end_date')

        if not start_date or not end_date:
            import re
            from datetime import date
            years = re.findall(r'\d{4}', name)
            if len(years) >= 2:
                y1, y2 = int(years[0]), int(years[1])
                start_date = start_date or f"{y1}-06-01"
                end_date = end_date or f"{y2}-05-31"
            elif len(years) == 1:
                y1 = int(years[0])
                start_date = start_date or f"{y1}-06-01"
                end_date = end_date or f"{y1+1}-05-31"
            else:
                today = date.today()
                start_date = start_date or f"{today.year}-06-01"
                end_date = end_date or f"{today.year+1}-05-31"

        payload['startDate'] = start_date
        payload['endDate'] = end_date

        is_curr = payload.get('isCurrent') in (True, 'true', 'True', 1) or payload.get('is_current') in (True, 'true', 'True', 1)
        payload['isCurrent'] = is_curr
        payload['isActive'] = True

        if is_curr:
            AcademicYear.objects.filter(is_current=True).update(is_current=False)

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AcademicYearMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = AcademicYear.objects.all().order_by('academic_year_id')
    serializer_class = AcademicYearSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'startDate' in payload:
            payload['start_date'] = payload.pop('startDate')
        if 'endDate' in payload:
            payload['end_date'] = payload.pop('endDate')
        if 'isCurrent' in payload:
            payload['is_current'] = payload.pop('isCurrent')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class SchoolClassMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = SchoolClass.objects.filter(is_active=True).order_by('class_id')
    serializer_class = SchoolClassSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SchoolClassMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = SchoolClass.objects.all().order_by('class_id')
    serializer_class = SchoolClassSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AssessmentTypeMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentType.objects.filter(is_active=True).order_by('assessment_type_id')
    serializer_class = AssessmentTypeSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()

        # Resolve academic year ID — keep field name as 'academicYearId' for serializer
        if 'academicYearId' not in payload and 'academicYear' in payload:
            ay_val = payload.pop('academicYear')
            ay_obj = AcademicYear.objects.filter(name__iexact=str(ay_val).strip()).first()
            if ay_obj:
                payload['academicYearId'] = ay_obj.academic_year_id
        # Auto-assign current academic year if still not set
        if not payload.get('academicYearId'):
            current_ay = AcademicYear.objects.filter(is_current=True).first()
            if current_ay:
                payload['academicYearId'] = current_ay.academic_year_id

        if 'maxMarks' in payload:
            payload.pop('maxMarks')
        if 'isActive' in payload:
            payload['isActive'] = payload.pop('isActive')

        code = str(payload.get('code', '')).strip().upper()
        name = str(payload.get('name', '')).strip()
        payload['code'] = code
        payload['name'] = name
        ay_id = payload.get('academicYearId')

        if code:
            # Dedupe globally by code+name regardless of academic year, so we never
            # create two exam types with the same name (the duplicate 'Annual' bug).
            existing = AssessmentType.objects.filter(code__iexact=code, is_active=True).first()
            if not existing:
                existing = AssessmentType.objects.filter(name__iexact=name, is_active=True).first()
            if existing:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)



class AssessmentSubjectMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentSubject.objects.filter(is_active=True).order_by('assessment_subject_id')
    serializer_class = AssessmentSubjectSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()

        # Normalise aliases — keep all keys as camelCase so the serializer
        # can use its source= mapping (camelCase → snake_case).
        if 'assessmentTypeId' in payload and 'examId' not in payload:
            payload['examId'] = payload.pop('assessmentTypeId')

        if 'subjectId' in payload and 'subjectIds' not in payload:
            sid = payload.pop('subjectId')
            payload['subjectIds'] = [sid] if not isinstance(sid, list) else sid

        # Resolve classIds and examIds
        raw_class_ids = payload.get('classIds')
        if raw_class_ids is None and payload.get('classId') is not None:
            raw_class_ids = [payload.get('classId')]
        elif not isinstance(raw_class_ids, list) and raw_class_ids is not None:
            raw_class_ids = [raw_class_ids]

        raw_exam_ids = payload.get('examIds') or payload.get('assessmentTypeIds')
        if raw_exam_ids is None and payload.get('examId') is not None:
            raw_exam_ids = [payload.get('examId')]
        elif not isinstance(raw_exam_ids, list) and raw_exam_ids is not None:
            raw_exam_ids = [raw_exam_ids]

        cids = [int(c) for c in (raw_class_ids or []) if str(c).isdigit()]
        eids = [int(e) for e in (raw_exam_ids or []) if str(e).isdigit()]

        ay_id = payload.get('academicYearId')
        sids = payload.get('subjectIds') or []
        max_m = payload.get('maxMarks') or payload.get('max_marks')
        parsed_max = Decimal(str(max_m)) if max_m is not None else Decimal('100.00')

        subject_marks = payload.get('subjectMarks') or {}
        if isinstance(subject_marks, dict) and subject_marks and cids and eids:
            groups = {}
            for sid_str, m_val in subject_marks.items():
                try:
                    s_id = int(sid_str)
                    m_dec = Decimal(str(m_val))
                    groups.setdefault(m_dec, []).append(s_id)
                except (ValueError, TypeError):
                    continue

            if groups:
                last_obj = None
                for cid in cids:
                    for eid in eids:
                        filter_kwargs = {'class_id': cid, 'exam_id': eid}
                        if ay_id is not None:
                            filter_kwargs['academic_year_id'] = ay_id

                        # Track existing subjects before deleting
                        prev_as = AssessmentSubject.objects.filter(**filter_kwargs)
                        prev_sids = set()
                        for p in prev_as:
                            for sid in (p.subject_ids or []):
                                try:
                                    prev_sids.add(int(sid))
                                except (ValueError, TypeError):
                                    pass

                        new_sids = set()
                        for sub_ids in groups.values():
                            for sid in sub_ids:
                                try:
                                    new_sids.add(int(sid))
                                except (ValueError, TypeError):
                                    pass

                        if new_sids - prev_sids:
                            demote_filter = {
                                'class_id': cid,
                                'assessment_type_id': eid,
                                'status': Assessment.STATUS_SUBMITTED,
                            }
                            if ay_id is not None:
                                demote_filter['academic_year_id'] = ay_id
                            for sa in Assessment.objects.filter(**demote_filter):
                                sa.status = Assessment.STATUS_DRAFT
                                sa.save()
                                AssessmentSubmission.objects.filter(assessment=sa).delete()

                        AssessmentSubject.objects.filter(**filter_kwargs).delete()
                        for m_dec, sub_ids in groups.items():
                            last_obj = AssessmentSubject.objects.create(
                                class_id=cid,
                                exam_id=eid,
                                academic_year_id=ay_id,
                                max_marks=m_dec,
                                subject_ids=sub_ids,
                                is_active=True,
                            )
                if last_obj:
                    serializer = self.get_serializer(last_obj)
                    return Response(serializer.data, status=status.HTTP_200_OK)

        if cids and eids:
            last_obj = None
            for cid in cids:
                for eid in eids:
                    filter_kwargs = {'class_id': cid, 'exam_id': eid}
                    if ay_id is not None:
                        filter_kwargs['academic_year_id'] = ay_id
                    existing = AssessmentSubject.objects.filter(**filter_kwargs).first()
                    prev_sids = set()
                    if existing:
                        for sid in (existing.subject_ids or []):
                            try:
                                prev_sids.add(int(sid))
                            except (ValueError, TypeError):
                                pass

                    new_sids = set(int(s) for s in sids if str(s).isdigit())
                    if new_sids - prev_sids:
                        demote_filter = {
                            'class_id': cid,
                            'assessment_type_id': eid,
                            'status': Assessment.STATUS_SUBMITTED,
                        }
                        if ay_id is not None:
                            demote_filter['academic_year_id'] = ay_id
                        for sa in Assessment.objects.filter(**demote_filter):
                            sa.status = Assessment.STATUS_DRAFT
                            sa.save()
                            AssessmentSubmission.objects.filter(assessment=sa).delete()

                    if existing:
                        if max_m is not None:
                            existing.max_marks = parsed_max
                        if sids:
                            existing.subject_ids = sids
                        existing.is_active = True
                        existing.save()
                        last_obj = existing
                    else:
                        last_obj = AssessmentSubject.objects.create(
                            class_id=cid,
                            exam_id=eid,
                            academic_year_id=ay_id,
                            max_marks=parsed_max,
                            subject_ids=sids,
                            is_active=True,
                        )
            if last_obj:
                serializer = self.get_serializer(last_obj)
                return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)



class AssessmentSubjectMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentSubject.objects.all().order_by('assessment_subject_id')
    serializer_class = AssessmentSubjectSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()

        # Keep camelCase keys — the serializer fields use source= to map to snake_case.
        # Only normalise aliases that don't have a direct camelCase field.
        if 'assessmentTypeId' in payload and 'examId' not in payload:
            payload['examId'] = payload.pop('assessmentTypeId')

        if 'subjectId' in payload and 'subjectIds' not in payload:
            sid = payload.pop('subjectId')
            payload['subjectIds'] = [sid] if not isinstance(sid, list) else sid

        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AssessmentTypeMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentType.objects.all().order_by('assessment_type_id')
    serializer_class = AssessmentTypeSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'durationMonths' in payload:
            payload['duration_months'] = payload.pop('durationMonths')
        if 'isActive' in payload:
            payload['is_active'] = payload.pop('isActive')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        AssessmentSubject.objects.filter(exam_id=instance.pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubjectMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = Subject.objects.all().order_by('subject_id')
    serializer_class = SubjectSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'classId' in payload:
            payload.pop('classId')
        if 'class_id' in payload:
            payload.pop('class_id')
        if 'isActive' in payload:
            payload.pop('isActive')
        if 'is_active' in payload:
            payload.pop('is_active')

        code = str(payload.get('code', '')).strip().upper()
        name = str(payload.get('name', '')).strip()
        payload['code'] = code
        payload['name'] = name

        if code:
            existing = Subject.objects.filter(code__iexact=code).first()
            if existing:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SubjectMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = Subject.objects.all().order_by('subject_id')
    serializer_class = SubjectSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'classId' in payload:
            payload.pop('classId')
        if 'class_id' in payload:
            payload.pop('class_id')
        if 'isActive' in payload:
            payload.pop('isActive')
        if 'is_active' in payload:
            payload.pop('is_active')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AssessmentScoreListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentScore.objects.all().order_by('score_id')
    serializer_class = AssessmentScoreSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        assessment_id = self.request.query_params.get('assessmentId')
        student_id = self.request.query_params.get('studentId')
        subject_id = self.request.query_params.get('subjectId')
        if assessment_id is not None:
            queryset = queryset.filter(assessment_id=assessment_id)
        if student_id is not None:
            queryset = queryset.filter(student_id=student_id)
        if subject_id is not None:
            queryset = queryset.filter(subject_id=subject_id)
        return queryset

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'assessmentId' in payload:
            payload['assessment_id'] = payload.pop('assessmentId')
        if 'studentId' in payload:
            payload['student_id'] = payload.pop('studentId')
        if 'subjectId' in payload:
            payload['subject_id'] = payload.pop('subjectId')
        if 'obtainedMarks' in payload:
            payload['obtained_marks'] = payload.pop('obtainedMarks')
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AssessmentScoreDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = AssessmentScore.objects.all().order_by('score_id')
    serializer_class = AssessmentScoreSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'assessmentId' in payload:
            payload['assessment_id'] = payload.pop('assessmentId')
        if 'studentId' in payload:
            payload['student_id'] = payload.pop('studentId')
        if 'subjectId' in payload:
            payload['subject_id'] = payload.pop('subjectId')
        if 'obtainedMarks' in payload:
            payload['obtained_marks'] = payload.pop('obtainedMarks')
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class DiagnosticOptionMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = DiagnosticOption.objects.filter(is_active=True).order_by('diagnostic_option_id')
    serializer_class = DiagnosticOptionSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'sort_order' in payload and 'sortOrder' not in payload:
            payload['sortOrder'] = payload['sort_order']
        if 'is_active' in payload and 'isActive' not in payload:
            payload['isActive'] = payload['is_active']
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DiagnosticOptionMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = DiagnosticOption.objects.all().order_by('diagnostic_option_id')
    serializer_class = DiagnosticOptionSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'sort_order' in payload and 'sortOrder' not in payload:
            payload['sortOrder'] = payload['sort_order']
        if 'is_active' in payload and 'isActive' not in payload:
            payload['isActive'] = payload['is_active']
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class LearningBehaviourOptionMetadataListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    queryset = LearningBehaviourOption.objects.filter(is_active=True).order_by('behaviour_option_id')
    serializer_class = LearningBehaviourOptionSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'is_active' in payload and 'isActive' not in payload:
            payload['isActive'] = payload['is_active']
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LearningBehaviourOptionMetadataDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AllowAny]
    queryset = LearningBehaviourOption.objects.all().order_by('behaviour_option_id')
    serializer_class = LearningBehaviourOptionSerializer

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if 'is_active' in payload and 'isActive' not in payload:
            payload['isActive'] = payload['is_active']
        serializer = self.get_serializer(self.get_object(), data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)
