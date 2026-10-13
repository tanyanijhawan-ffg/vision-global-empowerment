from django.db import transaction
from django.db.models import Q
from rest_framework import generics, serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
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


class AbsenceAlertListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        setting, _ = AttendanceIntelligenceSetting.objects.get_or_create(setting_id=1)
        if not setting.absence_alert_enabled:
            return Response({
                'enabled': False,
                'threshold_days': setting.absence_alert_days,
                'alerts': [],
            })

        profile = getattr(request.user, 'profile', None)
        if profile is None:
            return Response({
                'enabled': True,
                'threshold_days': setting.absence_alert_days,
                'alerts': [],
            })

        queryset = Attendance.objects.select_related('student', 'student__centre')
        role_name = getattr(getattr(profile, 'role', None), 'name', None)
        if role_name != 'super_admin':
            if profile.region_id is None:
                return Response({
                    'enabled': True,
                    'threshold_days': setting.absence_alert_days,
                    'alerts': [],
                })
            queryset = queryset.filter(
                Q(student__centre__region_id=profile.region_id)
                | Q(student__centre__district__region_id=profile.region_id)
            )

        rows = queryset.order_by('student_id', '-attendance_date').values(
            'student_id',
            'student__full_name',
            'student__centre__centre_name',
            'attendance_date',
            'status',
        )
        streaks = {}
        for row in rows:
            student_id = row['student_id']
            streak = streaks.setdefault(student_id, {
                'student_id': student_id,
                'student_name': row['student__full_name'],
                'centre_name': row['student__centre__centre_name'],
                'consecutive_absent_days': 0,
                'last_absent_date': None,
                'streak_ended': False,
            })
            if streak['streak_ended']:
                continue
            if row['status'] != 'Absent':
                streak['streak_ended'] = True
                continue
            streak['consecutive_absent_days'] += 1
            if streak['last_absent_date'] is None:
                streak['last_absent_date'] = row['attendance_date'].isoformat()

        alerts = [
            {key: value for key, value in streak.items() if key != 'streak_ended'}
            for streak in streaks.values()
            if streak['consecutive_absent_days'] > setting.absence_alert_days
        ]
        alerts.sort(key=lambda alert: (-alert['consecutive_absent_days'], alert['student_name']))
        return Response({
            'enabled': True,
            'threshold_days': setting.absence_alert_days,
            'alerts': alerts,
        })
