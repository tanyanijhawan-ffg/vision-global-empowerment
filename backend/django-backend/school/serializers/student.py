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

    @transaction.atomic
    def create(self, validated_data):
        family_data = validated_data.pop('family_data', None)
        socio_data = validated_data.pop('socio_economic_data', None)
        vulnerabilities_data = validated_data.pop('vulnerabilities_data', [])
        motivation_data = validated_data.pop('motivation_data', [])
        aspirations_data = validated_data.pop('aspirations_data', None)
        student = super().create(validated_data)

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
        family_data = validated_data.pop('family_data', None)
        socio_data = validated_data.pop('socio_economic_data', None)
        vulnerabilities_data = validated_data.pop('vulnerabilities_data', None)
        motivation_data = validated_data.pop('motivation_data', None)
        aspirations_data = validated_data.pop('aspirations_data', None)
        student = super().update(instance, validated_data)
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
