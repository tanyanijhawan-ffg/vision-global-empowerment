from django.urls import include, path

from school.views.auth import LoginView, PasswordResetConfirmView, PasswordResetRequestView, RegionListView
from school.views.master import MasterBulkUploadView, MasterCentreListCreateView, MasterExportView, MasterRegionListCreateView
from school.views.student_bulk import StudentBulkUploadView, StudentWorkbookExportView
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
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('masters/regions/', MasterRegionListCreateView.as_view(), name='master-regions'),
    path('masters/regions/<int:pk>/', MasterRegionListCreateView.as_view(), name='master-region-detail'),
    path('masters/centres/', MasterCentreListCreateView.as_view(), name='master-centres'),
    path('masters/centres/<int:pk>/', MasterCentreListCreateView.as_view(), name='master-centre-detail'),
    path('masters/<str:resource>/export/', MasterExportView.as_view(), name='master-export'),
    path('masters/<str:resource>/bulk-upload/', MasterBulkUploadView.as_view(), name='master-bulk-upload'),
    path('students/export/', StudentWorkbookExportView.as_view(), name='student-export'),
    path('students/bulk-upload/', StudentBulkUploadView.as_view(), name='student-bulk-upload'),
    path('regions/', RegionListView.as_view(), name='region-list'),
    path('users/', UserListCreateView.as_view(), name='user-list-create'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('attendance/', AttendanceListView.as_view(), name='attendance-list'),
    path('attendance/record/', AttendanceCreateView.as_view(), name='attendance-create'),
    path('students/', StudentListView.as_view(), name='student-list'),
    path('students/<int:pk>/', StudentRetrieveUpdateDestroyView.as_view(), name='student-detail'),
]
