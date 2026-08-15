from rest_framework import serializers

from services.models.attendance import Attendance
from services.models.student import Student
from services.serializers.student import StudentSerializer


class AttendanceSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.all(), write_only=True, source='student'
    )

    class Meta:
        model = Attendance
        fields = [
            'attendance_id',
            'student',
            'student_id',
            'attendance_date',
            'status',
            'time_in',
            'time_out',
            'absence_reason',
            'participation_level',
            'attention_level',
            'behaviour',
            'tutor_observation',
        ]
