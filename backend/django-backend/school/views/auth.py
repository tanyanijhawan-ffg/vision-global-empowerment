from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from school.models.user_profile import UserProfile
from school.models.center import Region


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'detail': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        profile = UserProfile.objects.select_related('role', 'region').filter(user=user).first()
        if profile is None:
            return Response({'detail': 'User profile not found.'}, status=status.HTTP_403_FORBIDDEN)

        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': profile.full_name or user.get_full_name() or user.username,
                'role': profile.role.name,
                'region_id': profile.region_id,
                'region_name': profile.region.region_name if profile.region else None,
            }
        }, status=status.HTTP_200_OK)


class RegionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response([
            {'id': region.region_id, 'name': region.region_name}
            for region in Region.objects.order_by('region_name')
        ])
