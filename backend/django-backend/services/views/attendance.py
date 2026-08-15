from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend

from services.models.attendance import Attendance
from services.serializers.attendance import AttendanceSerializer
from services.permissions import IsAdminOrReadOnly


class AttendanceCreateView(generics.CreateAPIView):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer


class AttendanceListView(generics.ListAPIView):
    permission_classes = [IsAdminOrReadOnly]
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
