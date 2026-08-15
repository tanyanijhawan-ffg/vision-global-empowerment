from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import AllowAny

from school.models.attendance import Attendance
from school.serializers.attendance import AttendanceSerializer


class AttendanceCreateView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer


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
