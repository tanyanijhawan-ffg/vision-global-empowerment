from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from school.models.center import Region
from school.models.role import Role
from school.models.user_profile import UserProfile

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    region_id = serializers.IntegerField(source='region.region_id', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['full_name', 'role', 'region_id', 'is_active', 'created_at']

    def get_role(self, obj):
        return obj.role.name if obj.role else None


class UserCreateSerializer(serializers.ModelSerializer):
    role = serializers.CharField(required=True)
    region = serializers.PrimaryKeyRelatedField(queryset=Region.objects.all(), required=False, allow_null=True)
    full_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'full_name', 'role', 'region']

    def validate(self, attrs):
        role_name = attrs.get('role')
        if role_name not in {'super_admin', 'regional_admin', 'facilitator'}:
            raise serializers.ValidationError({'role': 'Invalid role selected.'})

        requester = self.context['request'].user
        requester_profile = getattr(requester, 'profile', None)
        if not requester_profile:
            raise serializers.ValidationError('Your account is missing a user profile.')

        requester_role = getattr(requester_profile.role, 'name', None)
        if requester_role == 'facilitator':
            raise PermissionDenied('Facilitators cannot create users.')

        if requester_role == 'regional_admin':
            if role_name != 'facilitator':
                raise PermissionDenied('Regional admins can only create facilitators.')
            region = attrs.get('region')
            if region is None or requester_profile.region_id != region.region_id:
                raise PermissionDenied('Regional admins can only create facilitators in their own region.')

        return attrs

    def create(self, validated_data):
        role_name = validated_data.pop('role')
        region = validated_data.pop('region', None)
        full_name = validated_data.pop('full_name') or ''
        password = validated_data.pop('password')
        requester = self.context['request'].user

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password,
        )

        if full_name:
            user.first_name = full_name.split()[0]
            user.last_name = ' '.join(full_name.split()[1:])
            user.save(update_fields=['first_name', 'last_name'])

        role, _ = Role.objects.get_or_create(name=role_name)
        UserProfile.objects.create(
            user=user,
            full_name=full_name,
            role=role,
            region=region,
            created_by=requester,
            is_active=True,
        )

        return user


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    region_id = serializers.SerializerMethodField()
    region_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role', 'region_id', 'region_name']

    def update(self, instance, validated_data):
        profile = getattr(instance, 'profile', None)
        full_name = validated_data.pop('full_name', None)
        role_name = validated_data.pop('role', None)
        region_id = validated_data.pop('region_id', None)

        instance = super().update(instance, validated_data)
        if profile is not None:
            if full_name is not None:
                profile.full_name = full_name
                name_parts = full_name.split()
                instance.first_name = name_parts[0] if name_parts else ''
                instance.last_name = ' '.join(name_parts[1:])
                instance.save(update_fields=['first_name', 'last_name'])
            if role_name is not None:
                if role_name not in {'super_admin', 'regional_admin', 'facilitator'}:
                    raise serializers.ValidationError({'role': 'Invalid role selected.'})
                profile.role, _ = Role.objects.get_or_create(name=role_name)
            if region_id is not None:
                try:
                    profile.region = Region.objects.get(pk=region_id)
                except Region.DoesNotExist as error:
                    raise serializers.ValidationError({'region_id': 'Selected region does not exist.'}) from error
            elif 'region_id' in self.initial_data:
                profile.region = None
            profile.save()
        return instance

    def to_internal_value(self, data):
        editable_profile_fields = {
            field: data[field]
            for field in ('full_name', 'role', 'region_id')
            if field in data
        }
        user_data = {field: value for field, value in data.items() if field not in editable_profile_fields}
        validated_data = super().to_internal_value(user_data)
        validated_data.update(editable_profile_fields)
        return validated_data

    def get_role(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.role.name if profile and profile.role else None

    def get_region_id(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.region_id if profile else None

    def get_region_name(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.region.region_name if profile and profile.region else None

    def get_full_name(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.full_name if profile else ''
