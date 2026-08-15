from rest_framework import serializers

from school.models.student import Student
from school.serializers.center import CenterSerializer
from school.models.center import Center


class StudentProfileSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='student_id', read_only=True)
    centre = CenterSerializer(read_only=True)
    centre_id = serializers.PrimaryKeyRelatedField(
        queryset=Center.objects.all(), write_only=True, source='centre'
    )

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
        ]
