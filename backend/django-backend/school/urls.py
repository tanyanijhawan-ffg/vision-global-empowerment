from django.urls import include, path

from school.views.auth import LoginView, RegionListView
from school.views.user import UserDetailView, UserListCreateView
from .views import (
    AttendanceCreateView,
    AttendanceListView,
    StudentListView,
    StudentRetrieveUpdateDestroyView,
)

urlpatterns = [
    path('v1/', include('school.api_urls')),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('regions/', RegionListView.as_view(), name='region-list'),
    path('users/', UserListCreateView.as_view(), name='user-list-create'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('attendance/', AttendanceListView.as_view(), name='attendance-list'),
    path('attendance/record/', AttendanceCreateView.as_view(), name='attendance-create'),
    path('students/', StudentListView.as_view(), name='student-list'),
    path('students/<int:pk>/', StudentRetrieveUpdateDestroyView.as_view(), name='student-detail'),
]
