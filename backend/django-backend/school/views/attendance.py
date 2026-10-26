import re

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.db.models import Q
from django.utils.html import escape
from rest_framework import generics, serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from school.models.attendance import Attendance, AttendanceIntelligenceSetting
from school.models.center import Center
from school.models.student import Student
from school.models.user_profile import UserProfile
from school.serializers.center import CenterSerializer
from school.serializers.attendance import AttendanceIntelligenceSettingSerializer, AttendanceSerializer
from school.services.scope import scope_attendance, scope_centres, scope_students

User = get_user_model()


def _requester_profile(request):
    profile = getattr(request.user, 'profile', None)
    role = getattr(getattr(profile, 'role', None), 'name', None)
    if role not in {'super_admin', 'regional_admin'}:
        raise PermissionDenied('Only admins can access attendance defaulting notifications.')
    return profile, role


def _accessible_centre(request, centre_id, profile, role):
    centre = Center.objects.select_related('region', 'district__region').filter(pk=centre_id).first()
    if centre is None:
        raise serializers.ValidationError({'centre_id': 'Centre not found.'})
    region = centre.region or (centre.district.region if centre.district else None)
    if role == 'regional_admin' and (region is None or profile.region_id != region.pk):
        raise PermissionDenied('You can only access centres in your own region.')
    return centre, region


def _community_educators_for_centre(centre, region):
    if region is None:
        return []
    educators = list(UserProfile.objects.select_related('user', 'role').filter(
        role__name__in=('facilitator', 'community_educator'),
        centre_id=centre.pk,
        region_id=region.pk,
        is_active=True,
        user__is_active=True,
    ).exclude(user__email='').order_by('full_name', 'user__email'))
    return [{
        'id': educator.user_id,
        'name': educator.full_name or educator.user.get_full_name() or educator.user.username,
        'email': educator.user.email,
    } for educator in educators]


class AttendanceDefaultingRecipientsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        profile, role = _requester_profile(request)
        centre_id = request.query_params.get('centre_id')
        if not centre_id:
            raise serializers.ValidationError({'centre_id': 'This query parameter is required.'})
        centre, region = _accessible_centre(request, centre_id, profile, role)
        return Response({
            'community_educators': _community_educators_for_centre(centre, region),
            'admin': {
                'name': profile.full_name or request.user.get_full_name() or request.user.username,
                'email': request.user.email,
            },
        })


class AttendanceDefaultingEmailSerializer(serializers.Serializer):
    centre_id = serializers.IntegerField()
    attendance_date = serializers.DateField()
    educator_id = serializers.IntegerField()
    student_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False, max_length=500)
    class_grade = serializers.CharField(required=False, allow_blank=True, default='')


class AttendanceDefaultingEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        profile, role = _requester_profile(request)
        serializer = AttendanceDefaultingEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        centre, region = _accessible_centre(request, values['centre_id'], profile, role)

        educator = next((item for item in _community_educators_for_centre(centre, region) if item['id'] == values['educator_id']), None)
        if educator is None:
            raise serializers.ValidationError({'educator_id': 'Select a Community Educator assigned to this centre.'})
        if not request.user.email:
            raise serializers.ValidationError({'admin_email': 'Your admin account needs an email address before sending.'})

        requested_ids = set(values['student_ids'])
        students = list(Student.objects.filter(student_id__in=requested_ids, centre=centre).order_by('school_class__name', 'full_name'))
        if len(students) != len(requested_ids):
            raise serializers.ValidationError({'student_ids': 'One or more students do not belong to this centre.'})
        class_grade = values['class_grade'].strip()
        if class_grade and any(student.current_class_grade != class_grade for student in students):
            raise serializers.ValidationError({'student_ids': 'Students do not match the selected class.'})

        records = Attendance.objects.filter(
            student_id__in=requested_ids,
            attendance_date__lte=values['attendance_date'],
            status__in=['Present', 'Absent', 'Late'],
        ).values_list('student_id', 'status')
        totals = {}
        attended = {}
        for student_id, attendance_status in records:
            totals[student_id] = totals.get(student_id, 0) + 1
            if attendance_status in {'Present', 'Late'}:
                attended[student_id] = attended.get(student_id, 0) + 1

        rows = []
        for student in students:
            total = totals.get(student.student_id, 0)
            if not total:
                raise serializers.ValidationError({'student_ids': f'{student.full_name} has no attendance records.'})
            attended_count = attended.get(student.student_id, 0)
            percentage = round(attended_count / total * 100)
            if percentage >= 75:
                raise serializers.ValidationError({'student_ids': f'{student.full_name} is no longer below the 75% attendance threshold.'})
            rows.append({
                'name': student.full_name,
                'class_grade': student.current_class_grade or '—',
                'attended': attended_count,
                'total': total,
                'percentage': percentage,
            })

        subject_parts = [region.region_name if region else 'Unknown_Region']
        subject_parts.append(centre.district.district_name if centre.district else 'Unknown_District')
        subject_parts.append(centre.centre_name)
        subject_parts.append(class_grade or 'All_Classes')
        subject = 'Default Attendance Student ' + '_'.join(
            re.sub(r'[^A-Za-z0-9]+', '_', part).strip('_') or 'Unknown'
            for part in subject_parts
        )

        body = [
            'Hello,',
            '',
            'please find the below students in your centre are defaulting their attendance. Please check and confirm this at the earliest.',
            '',
            'Student | Class | Attendance | Attendance %',
            '--- | --- | --- | ---',
        ]
        body.extend(f"{row['name']} | {row['class_grade']} | {row['attended']}/{row['total']} days | {row['percentage']}%" for row in rows)
        body.extend(['', 'Thank you,', 'Admin'])
        table_rows = ''.join(
            '<tr>'
            f"<td>{escape(row['name'])}</td><td>{escape(row['class_grade'])}</td>"
            f"<td>{row['attended']}/{row['total']} days</td><td>{row['percentage']}%</td>"
            '</tr>'
            for row in rows
        )
        html_body = (
            '<p>Hello,</p>'
            '<p>please find the below students in your centre are defaulting their attendance. '
            'Please check and confirm this at the earliest.</p>'
            '<table border="1" cellpadding="6" cellspacing="0">'
            '<thead><tr><th>Student</th><th>Class</th><th>Attendance</th><th>Attendance %</th></tr></thead>'
            f'<tbody>{table_rows}</tbody></table>'
            '<p>Thank you,<br>Admin</p>'
        )
        email = EmailMultiAlternatives(
            subject=subject,
            body='\n'.join(body),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[educator['email']],
            cc=[request.user.email],
        )
        email.attach_alternative(html_body, 'text/html')
        try:
            sent_count = email.send(fail_silently=False)
        except Exception:
            return Response({'detail': 'Email delivery failed. Check the configured email service.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if sent_count != 1:
            return Response({'detail': 'Email service did not accept the message.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({'sent': True, 'recipient': educator['email'], 'student_count': len(rows), 'subject': subject})


class AttendanceBulkSerializer(serializers.Serializer):
    date = serializers.DateField()
    centre = serializers.PrimaryKeyRelatedField(queryset=Center.objects.all())
    attendance = serializers.ListField(child=serializers.DictField(), allow_empty=False)

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if request is not None:
            fields['centre'].queryset = scope_centres(Center.objects.all(), request.user)
        return fields

    def validate_attendance(self, entries):
        required = {'student', 'status'}
        for entry in entries:
            missing = required - entry.keys()
            if missing:
                raise serializers.ValidationError(f'Missing fields: {", ".join(sorted(missing))}.')
        return entries


class AttendanceBulkView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AttendanceBulkSerializer

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        centre = serializer.validated_data['centre']
        date = serializer.validated_data['date']
        records = []

        for entry in serializer.validated_data['attendance']:
            student = scope_students(Student.objects.filter(centre=centre), request.user).filter(student_id=entry['student']).first()
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
    permission_classes = [IsAuthenticated]
    queryset = Center.objects.order_by('centre_name')
    serializer_class = CenterSerializer

    def get_queryset(self):
        return scope_centres(super().get_queryset(), self.request.user)


class AttendanceIntelligenceSettingView(generics.RetrieveUpdateAPIView):
    permission_classes = [AllowAny]
    serializer_class = AttendanceIntelligenceSettingSerializer

    def get_object(self):
        setting, _ = AttendanceIntelligenceSetting.objects.get_or_create(setting_id=1)
        return setting


class AttendanceCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer

    def create(self, request, *args, **kwargs):
        student_id = request.data.get('student_id')
        attendance_date = request.data.get('attendance_date')
        scoped_students = scope_students(Student.objects.all(), request.user)
        if not scoped_students.filter(pk=student_id).exists():
            raise serializers.ValidationError({'student_id': 'Student is outside your assigned scope.'})
        instance = scope_attendance(
            Attendance.objects.filter(student_id=student_id, attendance_date=attendance_date),
            request.user,
        ).first()
        serializer = self.get_serializer(instance=instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_200_OK if instance else status.HTTP_201_CREATED, headers=headers)


class AttendanceListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Attendance.objects.select_related('student', 'student__centre').all()
    serializer_class = AttendanceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['attendance_date', 'status', 'student__centre__centre_id']

    def get_queryset(self):
        queryset = scope_attendance(super().get_queryset(), self.request.user)
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

        queryset = scope_attendance(
            Attendance.objects.select_related('student', 'student__centre'),
            request.user,
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
            if streak['consecutive_absent_days'] >= setting.absence_alert_days
        ]
        alerts.sort(key=lambda alert: (-alert['consecutive_absent_days'], alert['student_name']))
        return Response({
            'enabled': True,
            'threshold_days': setting.absence_alert_days,
            'alerts': alerts,
        })
