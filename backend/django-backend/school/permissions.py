from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        profile = getattr(request.user, 'profile', None)
        role_name = getattr(profile, 'role', None)
        role_value = getattr(role_name, 'name', None) if role_name else None
        return role_value == 'super_admin'


class IsRegionalAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        profile = getattr(request.user, 'profile', None)
        role_name = getattr(profile, 'role', None)
        role_value = getattr(role_name, 'name', None) if role_name else None
        return role_value == 'regional_admin'


class CanManageUsers(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        profile = getattr(request.user, 'profile', None)
        if profile is None:
            return False

        role_name = getattr(profile.role, 'name', None) if profile.role else None
        return role_name in {'super_admin', 'regional_admin'}


class CanManageUsersOrSelf(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if str(getattr(view, 'kwargs', {}).get('pk')) == str(request.user.pk):
            return True
        if request.method in SAFE_METHODS:
            return CanManageUsers().has_permission(request, view)
        return CanManageUsers().has_permission(request, view)
