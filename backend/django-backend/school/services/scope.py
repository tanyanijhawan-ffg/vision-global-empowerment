from django.db.models import Q


def _scope_for_user(user):
    if not user or not user.is_authenticated:
        return 'none', None
    if getattr(user, 'is_superuser', False):
        return 'all', None

    profile = getattr(user, 'profile', None)
    role_name = getattr(getattr(profile, 'role', None), 'name', None)
    if role_name == 'facilitator':
        role_name = 'community_educator'
    if role_name == 'super_admin':
        return 'all', None
    if role_name == 'regional_admin':
        return 'region', getattr(profile, 'region_id', None)
    if role_name == 'community_educator':
        return 'centre', getattr(profile, 'centre_id', None)
    return 'none', None


def scope_centres(queryset, user):
    scope, scope_id = _scope_for_user(user)
    if scope == 'all':
        return queryset
    if scope == 'region' and scope_id is not None:
        return queryset.filter(Q(region_id=scope_id) | Q(district__region_id=scope_id)).distinct()
    if scope == 'centre' and scope_id is not None:
        return queryset.filter(pk=scope_id)
    return queryset.none()


def scope_students(queryset, user):
    return _scope_related(queryset, user, 'centre__')


def scope_attendance(queryset, user):
    return _scope_related(queryset, user, 'student__centre__')


def _scope_related(queryset, user, centre_lookup):
    scope, scope_id = _scope_for_user(user)
    if scope == 'all':
        return queryset
    if scope == 'region' and scope_id is not None:
        region_lookup = centre_lookup + 'region_id'
        district_lookup = centre_lookup + 'district__region_id'
        return queryset.filter(Q(**{region_lookup: scope_id}) | Q(**{district_lookup: scope_id})).distinct()
    if scope == 'centre' and scope_id is not None:
        return queryset.filter(**{centre_lookup + 'pk': scope_id})
    return queryset.none()