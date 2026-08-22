from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from school.models.user_profile import UserProfile
from school.permissions import CanManageUsers, CanManageUsersOrSelf
from school.serializers.user import UserCreateSerializer, UserSerializer

User = get_user_model()


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.select_related('profile__role', 'profile__region').all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, CanManageUsers]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        if profile is None:
            return User.objects.none()

        if getattr(profile.role, 'name', None) == 'super_admin':
            return User.objects.select_related('profile__role', 'profile__region').all()

        if getattr(profile.role, 'name', None) == 'regional_admin':
            return User.objects.select_related('profile__role', 'profile__region').filter(profile__region_id=profile.region_id)

        return User.objects.none()

    def create(self, request, *args, **kwargs):
        serializer = UserCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        created_user = User.objects.select_related('profile__role', 'profile__region').get(id=user.id)
        response_serializer = UserSerializer(created_user)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.select_related('profile__role', 'profile__region').all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, CanManageUsersOrSelf]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        if profile is None:
            return User.objects.none()

        if getattr(profile.role, 'name', None) == 'super_admin':
            return User.objects.select_related('profile__role', 'profile__region').all()

        if getattr(profile.role, 'name', None) == 'regional_admin':
            return User.objects.select_related('profile__role', 'profile__region').filter(profile__region_id=profile.region_id)

        return User.objects.none()
