from django.db import transaction
from rest_framework import generics, serializers, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import AllowAny

from school.models.attendance import Attendance, AttendanceIntelligenceSetting
from school.models.center import Center
from school.models.student import Student
from school.serializers.center import CenterSerializer
from school.serializers.attendance import AttendanceIntelligenceSettingSerializer, AttendanceSerializer


class AttendanceBulkSerializer(serializers.Serializer):
    date = serializers.DateField()
    centre = serializers.PrimaryKeyRelatedField(queryset=Center.objects.all())
    attendance = serializers.ListField(child=serializers.DictField(), allow_empty=False)

    def validate_attendance(self, entries):
        required = {'student', 'status'}
        for entry in entries:
            missing = required - entry.keys()
            if missing:
                raise serializers.ValidationError(f'Missing fields: {", ".join(sorted(missing))}.')
        return entries


class AttendanceBulkView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = AttendanceBulkSerializer

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        centre = serializer.validated_data['centre']
        date = serializer.validated_data['date']
        records = []

        for entry in serializer.validated_data['attendance']:
            student = Student.objects.filter(student_id=entry['student'], centre=centre).first()
            if student is None:
                raise serializers.ValidationError({'attendance': f'Student {entry["student"]} does not belong to centre {centre.pk}.'})
            payload = {
                **entry,
                'student_id': student.pk,
                'attendance_date': date,
                'absence_reason': entry.get('absence_reason', entry.get('reason')),
            }
            existing = Attendance.objects.filter(student=student, attendance_date=date).first()
            record_serializer = AttendanceSerializer(instance=existing, data=payload)
            record_serializer.is_valid(raise_exception=True)
            records.append(record_serializer.save())

        return Response(AttendanceSerializer(records, many=True).data, status=status.HTTP_200_OK)


class AttendanceCentreListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    queryset = Center.objects.order_by('centre_name')
    serializer_class = CenterSerializer


class AttendanceIntelligenceSettingView(generics.RetrieveUpdateAPIView):
    permission_classes = [AllowAny]
    serializer_class = AttendanceIntelligenceSettingSerializer

    def get_object(self):
        setting, _ = AttendanceIntelligenceSetting.objects.get_or_create(setting_id=1)
        return setting


class AttendanceCreateView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer

    def create(self, request, *args, **kwargs):
        student_id = request.data.get('student_id')
        attendance_date = request.data.get('attendance_date')
        instance = Attendance.objects.filter(student_id=student_id, attendance_date=attendance_date).first()
        serializer = self.get_serializer(instance=instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_200_OK if instance else status.HTTP_201_CREATED, headers=headers)


class AttendanceListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    queryset = Attendance.objects.select_related('student', 'student__centre').all()
    serializer_class = AttendanceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['attendance_date', 'status', 'student__centre__centre_id']

    def get_queryset(self):
        queryset = super().get_queryset()
        center_id = self.request.query_params.get('center_id') or self.request.query_params.get('centre_id')
        if center_id is not None:
            queryset = queryset.filter(student__centre__centre_id=center_id)
        return queryset
