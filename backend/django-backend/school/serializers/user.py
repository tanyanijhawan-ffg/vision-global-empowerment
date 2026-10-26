from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password as validate_django_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from school.models.center import Center, Region
from school.models.role import Role
from school.models.user_profile import UserProfile

User = get_user_model()

ALLOWED_ROLE_NAMES = {'super_admin', 'regional_admin', 'community_educator'}


def normalize_role_name(role_name):
    if role_name == 'facilitator':
        return 'community_educator'
    return role_name


def validate_mobile_number(value):
    cleaned = str(value or '').strip()
    if not cleaned:
        raise serializers.ValidationError('Mobile number is required.')

    digits_only = ''.join(ch for ch in cleaned if ch.isdigit())
    if len(digits_only) == 12 and digits_only.startswith('91'):
        digits_only = digits_only[2:]
    if len(digits_only) != 10:
        raise serializers.ValidationError('Mobile number must be a valid 10-digit number.')
    return digits_only


class UserProfileSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    region_id = serializers.IntegerField(source='region.region_id', read_only=True)
    centre_id = serializers.IntegerField(source='centre.centre_id', read_only=True)
    centre_name = serializers.CharField(source='centre.centre_name', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['full_name', 'mobile_number', 'role', 'region_id', 'centre_id', 'centre_name', 'is_active', 'created_at']

    def get_role(self, obj):
        return obj.role.name if obj.role else None


class UserCreateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, allow_blank=False, trim_whitespace=True)
    role = serializers.CharField(required=True)
    region = serializers.PrimaryKeyRelatedField(queryset=Region.objects.all(), required=True, allow_null=False)
    centre_id = serializers.PrimaryKeyRelatedField(queryset=Center.objects.all(), source='centre', required=False, allow_null=True)
    full_name = serializers.CharField(required=True, allow_blank=False, allow_null=False)
    password = serializers.CharField(write_only=True, required=True, allow_blank=False)
    mobile_number = serializers.CharField(required=True, allow_blank=False, trim_whitespace=True)

    def validate_password(self, value):
        try:
            validate_django_password(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(list(error.messages)) from error
        return value

    def validate_email(self, value):
        email = value.strip()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('A user with this email address already exists.')
        return email

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'full_name', 'role', 'region', 'centre_id', 'mobile_number']

    def validate_mobile_number(self, value):
        return validate_mobile_number(value)

    def validate(self, attrs):
        role_name = normalize_role_name(attrs.get('role'))
        if role_name not in ALLOWED_ROLE_NAMES:
            raise serializers.ValidationError({'role': 'Invalid role selected.'})
        attrs['role'] = role_name

        if attrs.get('region') is None:
            raise serializers.ValidationError({'region': 'Region is required.'})

        centre = attrs.get('centre')
        if role_name == 'community_educator':
            if centre is None:
                raise serializers.ValidationError({'centre_id': 'Select the educator\'s assigned centre.'})
            centre_region = centre.region or (centre.district.region if centre.district_id else None)
            if centre_region is None or centre_region.pk != attrs['region'].pk:
                raise serializers.ValidationError({'centre_id': 'The assigned centre must belong to the selected region.'})
        elif centre is not None:
            raise serializers.ValidationError({'centre_id': 'Only community educators can be assigned a centre.'})

        if not attrs.get('full_name', '').strip():
            raise serializers.ValidationError({'full_name': 'Full name is required.'})

        mobile_number = attrs.get('mobile_number')
        if mobile_number is None:
            raise serializers.ValidationError({'mobile_number': 'Mobile number is required.'})
        attrs['mobile_number'] = validate_mobile_number(mobile_number)

        requester = self.context['request'].user
        requester_profile = getattr(requester, 'profile', None)
        if not requester_profile:
            raise serializers.ValidationError('Your account is missing a user profile.')

        requester_role = normalize_role_name(getattr(requester_profile.role, 'name', None))
        if requester_role == 'community_educator':
            raise PermissionDenied('Community educators cannot create users.')

        if requester_role == 'regional_admin':
            if role_name != 'community_educator':
                raise PermissionDenied('Regional admins can only create community educators.')
            region = attrs.get('region')
            if region is None or requester_profile.region_id != region.region_id:
                raise PermissionDenied('Regional admins can only create community educators in their own region.')

        return attrs

    def create(self, validated_data):
        role_name = normalize_role_name(validated_data.pop('role'))
        region = validated_data.pop('region', None)
        centre = validated_data.pop('centre', None)
        full_name = validated_data.pop('full_name', '').strip()
        mobile_number = validated_data.pop('mobile_number', '').strip()
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
            mobile_number=mobile_number,
            role=role,
            region=region,
            centre=centre,
            created_by=requester,
            is_active=True,
        )

        return user


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    region_id = serializers.SerializerMethodField()
    region_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    mobile_number = serializers.SerializerMethodField()
    centre_id = serializers.SerializerMethodField()
    centre_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'mobile_number', 'role', 'region_id', 'region_name', 'centre_id', 'centre_name']

    def update(self, instance, validated_data):
        profile = getattr(instance, 'profile', None)
        full_name = validated_data.pop('full_name', None)
        mobile_number = validated_data.pop('mobile_number', None)
        role_name = normalize_role_name(validated_data.pop('role', None))
        region_id = validated_data.pop('region_id', None)
        centre_id = validated_data.pop('centre_id', None)

        role_or_region_requested = any(field in self.initial_data for field in ('role', 'region_id', 'centre_id'))
        if role_or_region_requested:
            request = self.context.get('request')
            requester = getattr(request, 'user', None)
            requester_profile = getattr(requester, 'profile', None)
            requester_role = normalize_role_name(getattr(getattr(requester_profile, 'role', None), 'name', None))

            if requester is None or requester.pk == instance.pk:
                raise PermissionDenied('You cannot change your own role or region.')
            if requester_role != 'super_admin':
                raise PermissionDenied('Only super admins can change user roles or regions.')

        if role_name is not None and role_name not in ALLOWED_ROLE_NAMES:
            raise serializers.ValidationError({'role': 'Invalid role selected.'})

        selected_region = None
        if region_id is not None:
            try:
                selected_region = Region.objects.get(pk=region_id)
            except Region.DoesNotExist as error:
                raise serializers.ValidationError({'region_id': 'Selected region does not exist.'}) from error

        selected_centre = None
        if centre_id is not None:
            try:
                selected_centre = Center.objects.select_related('region', 'district__region').get(pk=centre_id)
            except Center.DoesNotExist as error:
                raise serializers.ValidationError({'centre_id': 'Selected centre does not exist.'}) from error

        target_role = role_name or normalize_role_name(getattr(getattr(profile, 'role', None), 'name', None))
        target_region_id = selected_region.pk if selected_region is not None else (
            None if 'region_id' in self.initial_data else getattr(profile, 'region_id', None)
        )
        if target_role == 'community_educator':
            if 'centre_id' in self.initial_data:
                if selected_centre is None:
                    raise serializers.ValidationError({'centre_id': 'Select the educator\'s assigned centre.'})
            elif profile is not None:
                selected_centre = profile.centre
            if selected_centre is None:
                raise serializers.ValidationError({'centre_id': 'Select the educator\'s assigned centre.'})
            centre_region = selected_centre.region or (selected_centre.district.region if selected_centre.district_id else None)
            if centre_region is None or centre_region.pk != target_region_id:
                raise serializers.ValidationError({'centre_id': 'The assigned centre must belong to the selected region.'})
        elif selected_centre is not None:
            raise serializers.ValidationError({'centre_id': 'Only community educators can be assigned a centre.'})

        if mobile_number is not None:
            mobile_number = validate_mobile_number(mobile_number)

        instance = super().update(instance, validated_data)
        if profile is not None:
            if full_name is not None:
                profile.full_name = full_name
                name_parts = full_name.split()
                instance.first_name = name_parts[0] if name_parts else ''
                instance.last_name = ' '.join(name_parts[1:])
                instance.save(update_fields=['first_name', 'last_name'])
            if mobile_number is not None:
                profile.mobile_number = mobile_number.strip()
            if role_name is not None:
                profile.role, _ = Role.objects.get_or_create(name=role_name)
            if selected_region is not None:
                profile.region = selected_region
            elif 'region_id' in self.initial_data:
                profile.region = None
            if target_role == 'community_educator':
                profile.centre = selected_centre
            else:
                profile.centre = None
            profile.save()
        return instance

    def to_internal_value(self, data):
        editable_profile_fields = {
            field: data[field]
            for field in ('full_name', 'mobile_number', 'role', 'region_id', 'centre_id')
            if field in data
        }
        user_data = {field: value for field, value in data.items() if field not in editable_profile_fields}
        validated_data = super().to_internal_value(user_data)
        validated_data.update(editable_profile_fields)
        return validated_data

    def get_role(self, obj):
        profile = getattr(obj, 'profile', None)
        if not profile or not profile.role:
            return None
        return normalize_role_name(profile.role.name)

    def get_region_id(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.region_id if profile else None

    def get_region_name(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.region.region_name if profile and profile.region else None

    def get_full_name(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.full_name if profile else ''

    def get_mobile_number(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.mobile_number if profile else ''

    def get_centre_id(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.centre_id if profile else None

    def get_centre_name(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.centre.centre_name if profile and profile.centre else None
