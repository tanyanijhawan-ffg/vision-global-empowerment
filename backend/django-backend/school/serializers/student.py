from django.db import transaction
from rest_framework import serializers

from school.models.aspiration import Aspiration
from school.models.center import Center
from school.models.family import Family
from school.models.motivation import Motivation
from school.models.socio_economic import SocioEconomic
from school.models.student import Student
from school.models.vulnerability import StudentVulnerability, VulnerabilityMaster
from school.serializers.center import CenterSerializer
from school.services.classes import resolve_school_class
from school.services.scope import scope_centres


class StudentSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='student_id', read_only=True)
    photo = serializers.FileField(required=True, allow_null=False)
    centre = CenterSerializer(read_only=True)
    centre_id = serializers.PrimaryKeyRelatedField(
        queryset=Center.objects.all(), write_only=True, source='centre'
    )
    family = serializers.SerializerMethodField()
    socio_economic = serializers.SerializerMethodField()
    vulnerabilities = serializers.SerializerMethodField()
    family_data = serializers.JSONField(required=False, write_only=True)
    socio_economic_data = serializers.JSONField(required=False, write_only=True)
    vulnerabilities_data = serializers.JSONField(required=False, write_only=True)
    motivation_data = serializers.JSONField(required=False, write_only=True)
    motivations = serializers.SerializerMethodField()
    aspirations_data = serializers.JSONField(required=False, write_only=True)
    aspirations = serializers.SerializerMethodField()
    # Class arrives as a grade string (e.g. 'Class 8'); it is resolved to the
    # SchoolClass master and stored via the school_class FK. Reads come from the
    # Student.class_grade property (current class name). Not a model column anymore.
    class_grade = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Student
        fields = [
            'id',
            'full_name',
            'nick_name',
            'gender',
            'dob',
            'age',
            'photo',
            'school_name',
            'school_type',
            'class_grade',
            'medium_of_instruction',
            'attendance_pattern',
            'previous_academic_performance',
            'centre',
            'centre_id',
            'family',
            'socio_economic',
            'vulnerabilities',
            'family_data',
            'socio_economic_data',
            'vulnerabilities_data',
            'motivation_data',
            'motivations',
            'aspirations_data',
            'aspirations',
        ]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if request is not None and 'centre_id' in fields:
            fields['centre_id'].queryset = scope_centres(Center.objects.all(), request.user)
        return fields

    def get_family(self, instance):
        try:
            family = instance.family
        except Family.DoesNotExist:
            family = None
        if not family:
            return None
        return {
            'father_name': family.father_name,
            'mother_name': family.mother_name,
            'guardian': family.guardian,
            'parent_phone': family.parent_phone,
            'father_occupation': family.father_occupation,
            'mother_occupation': family.mother_occupation,
            'father_education': family.father_education,
            'mother_education': family.mother_education,
            'family_members': family.family_members,
            'school_going_children': family.school_going_children,
            'birth_order': family.birth_order,
        }

    def get_socio_economic(self, instance):
        socio = instance.socio_economics.order_by('socio_id').first()
        if not socio:
            return None
        return {
            'caste_category': socio.caste_category,
            'tribe_name': socio.tribe_name,
            'religion': socio.religion,
            'income_range': socio.income_range,
            'house_type': socio.house_type,
            'ownership': socio.ownership,
            'drinking_water': socio.drinking_water,
            'toilet': socio.toilet,
            'electricity': socio.electricity,
            'study_space': socio.study_space,
        }

    def get_vulnerabilities(self, instance):
        return [
            {'name': item.vulnerability.vulnerability_name, 'remarks': item.remarks}
            for item in instance.student_vulnerabilities.select_related('vulnerability').all()
        ]

    def validate_motivation_data(self, value):
        narrative_reasons = {
            item.get('reason') for item in value
            if item.get('category') == 'Narrative' and item.get('narrative', '').strip()
        }
        required_narratives = {
            'Child’s life situation before joining',
            'Family challenges',
            'Academic challenges',
            'Behavioral challenges',
            'Expectations from program',
        }
        if value and narrative_reasons != required_narratives:
            raise serializers.ValidationError('All five facilitator narratives are required.')
        return value

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        target_ay = None
        if request:
            from school.models.assessment import AcademicYear
            ay_id = request.query_params.get('academicYearId') or request.query_params.get('academic_year_id')
            ay_name = request.query_params.get('academicYear') or request.query_params.get('academic_year')
            if ay_id:
                target_ay = AcademicYear.objects.filter(academic_year_id=ay_id).first()
            elif ay_name:
                clean = ay_name.strip()
                target_ay = (
                    AcademicYear.objects.filter(name__iexact=clean).first() or
                    AcademicYear.objects.filter(name__icontains=clean).first()
                )

        if target_ay:
            rec = instance.class_records.filter(academic_year=target_ay, is_active=True).first()
            if rec:
                ret['class_grade'] = rec.class_grade
                return ret

        ret['class_grade'] = instance.current_class_grade

        # Attendance %: present days / total marked days (all time)
        from school.models.attendance import Attendance
        att_rows = Attendance.objects.filter(student=instance).values_list('status', flat=True)
        total_days = len(att_rows)
        if total_days:
            present_days = sum(1 for s in att_rows if str(s).lower() in ('present', 'late'))
            ret['attendance_percent'] = round((present_days / total_days) * 100, 1)
        else:
            ret['attendance_percent'] = None

        # Avg score: mean percentage across all scored assessments.
        # Per assessment: obtained / (sum of per-subject max marks for the subjects scored).
        from school.models.assessment import AssessmentScore, AssessmentSubject
        from django.db.models import Sum, Q
        score_rows = (
            AssessmentScore.objects.filter(student=instance)
            .values('assessment_id')
            .annotate(obtained=Sum('obtained_marks'))
        )
        if score_rows:
            pcts = []
            for row in score_rows:
                scores = AssessmentScore.objects.filter(assessment_id=row['assessment_id'], student=instance)
                if not scores:
                    continue
                a = scores.first().assessment
                as_qs = AssessmentSubject.objects.filter(
                    class_id=a.class_id, exam_id=a.assessment_type_id, is_active=True
                )
                if a.academic_year_id:
                    as_qs = as_qs.filter(Q(academic_year_id=a.academic_year_id) | Q(academic_year_id__isnull=True))
                # Per-subject max: the AS row whose subject_ids contains that subject
                max_total = 0.0
                for sc in scores:
                    for entry in as_qs:
                        if sc.subject_id in (entry.subject_ids or []):
                            max_total += float(entry.max_marks)
                            break
                    else:
                        max_total += 100.0
                if max_total > 0:
                    pcts.append((float(row['obtained']) / max_total) * 100.0)
            ret['academic_score'] = round(sum(pcts) / len(pcts), 1) if pcts else None
        else:
            ret['academic_score'] = None

        return ret

    @transaction.atomic
    def create(self, validated_data):
        class_grade = validated_data.pop('class_grade', None)
        family_data = validated_data.pop('family_data', None)
        socio_data = validated_data.pop('socio_economic_data', None)
        vulnerabilities_data = validated_data.pop('vulnerabilities_data', [])
        motivation_data = validated_data.pop('motivation_data', [])
        aspirations_data = validated_data.pop('aspirations_data', None)
        student = super().create(validated_data)

        if class_grade:
            from school.models.assessment import AcademicYear
            from school.models.student import StudentClassRecord
            klass = resolve_school_class(class_grade)
            if klass:
                student.school_class = klass
                student.save(update_fields=['school_class'])
            current_ay = AcademicYear.objects.filter(is_current=True).first()
            if not current_ay:
                current_ay = AcademicYear.objects.order_by('-start_date').first()
            if current_ay and klass:
                StudentClassRecord.objects.create(
                    student=student,
                    academic_year=current_ay,
                    school_class=klass,
                    is_active=True,
                )

        if family_data:
            Family.objects.create(student=student, **family_data)
        if socio_data:
            SocioEconomic.objects.create(student=student, **socio_data)
        for item in vulnerabilities_data:
            if isinstance(item, str):
                name, remarks = item, None
            else:
                name, remarks = item.get('name'), item.get('remarks')
            if name:
                vulnerability, _ = VulnerabilityMaster.objects.get_or_create(vulnerability_name=name)
                StudentVulnerability.objects.create(student=student, vulnerability=vulnerability, remarks=remarks)
        for item in motivation_data:
            if item.get('reason') and item.get('category'):
                Motivation.objects.create(
                    student=student,
                    category=item['category'],
                    reason=item['reason'],
                    narrative=item.get('narrative') or None,
                )
        if aspirations_data:
            Aspiration.objects.create(student=student, **aspirations_data)
        return student

    @transaction.atomic
    def update(self, instance, validated_data):
        class_grade = validated_data.pop('class_grade', None)
        family_data = validated_data.pop('family_data', None)
        socio_data = validated_data.pop('socio_economic_data', None)
        vulnerabilities_data = validated_data.pop('vulnerabilities_data', None)
        motivation_data = validated_data.pop('motivation_data', None)
        aspirations_data = validated_data.pop('aspirations_data', None)
        student = super().update(instance, validated_data)

        if class_grade is not None:
            from school.models.assessment import AcademicYear
            from school.models.student import StudentClassRecord
            klass = resolve_school_class(class_grade)
            student.school_class = klass
            student.save(update_fields=['school_class'])
            current_ay = AcademicYear.objects.filter(is_current=True).first()
            if not current_ay:
                current_ay = AcademicYear.objects.order_by('-start_date').first()
            if current_ay:
                StudentClassRecord.objects.update_or_create(
                    student=student,
                    academic_year=current_ay,
                    defaults={
                        'school_class': klass,
                        'is_active': True,
                    }
                )

        if family_data is not None:
            Family.objects.update_or_create(student=student, defaults=family_data)
        if socio_data is not None:
            SocioEconomic.objects.filter(student=student).delete()
            if socio_data:
                SocioEconomic.objects.create(student=student, **socio_data)
        if vulnerabilities_data is not None:
            StudentVulnerability.objects.filter(student=student).delete()
            for item in vulnerabilities_data:
                name = item if isinstance(item, str) else item.get('name')
                remarks = None if isinstance(item, str) else item.get('remarks')
                if name:
                    vulnerability, _ = VulnerabilityMaster.objects.get_or_create(vulnerability_name=name)
                    StudentVulnerability.objects.create(student=student, vulnerability=vulnerability, remarks=remarks)
        if motivation_data is not None:
            Motivation.objects.filter(student=student).delete()
            for item in motivation_data:
                if item.get('category') and item.get('reason'):
                    Motivation.objects.create(student=student, category=item['category'], reason=item['reason'], narrative=item.get('narrative') or None)
        if aspirations_data is not None:
            Aspiration.objects.filter(student=student).delete()
            if aspirations_data:
                Aspiration.objects.create(student=student, **aspirations_data)
        return student

    def get_motivations(self, instance):
        return [
            {'category': item.category, 'reason': item.reason, 'narrative': item.narrative}
            for item in instance.motivations.all()
        ]

    def get_aspirations(self, instance):
        return [
            {'career_goal': item.career_goal, 'interests': item.interests, 'strengths': item.strengths}
            for item in instance.aspirations.all()
        ]
