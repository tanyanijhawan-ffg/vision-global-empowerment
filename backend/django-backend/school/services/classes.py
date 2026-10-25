"""Resolve a free-text class/grade value to the SchoolClass master row.

Class is a reference to the SchoolClass master everywhere. This helper turns a
user-entered grade string ('8', 'Class 8', 'Grade 8', 'class 8') into the single
SchoolClass row so we never store free-text grades or create duplicates.
"""

import re

from school.models.assessment import SchoolClass


def _grade_number(value):
    """Extract the numeric grade from a string like '8', 'Class 8', 'Grade 8'."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    match = re.search(r"\d+", text)
    return int(match.group()) if match else None


def resolve_school_class(value, create=True):
    """Return the SchoolClass matching a grade string, or None if not found.

    Matches by exact name first, then by extracted grade number against the
    class's own number (so 'Class 8', '8', 'Grade 8' all map to the 'Class 8' row).
    With create=True (default), a numeric grade with no master row gets a
    'Class N' row so a legitimately new class is registered once, not duplicated.
    """
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None

    # Already a SchoolClass instance or an id
    if isinstance(value, SchoolClass):
        return value
    if isinstance(value, int) or text.isdigit():
        try:
            cid = int(value)
        except (TypeError, ValueError):
            cid = None
        if cid is not None:
            by_id = SchoolClass.objects.filter(class_id=cid).first()
            if by_id:
                return by_id

    # Exact name match (case-insensitive)
    by_name = SchoolClass.objects.filter(name__iexact=text).first()
    if by_name:
        return by_name

    # Match by extracted grade number against each class's number
    number = _grade_number(text)
    if number is not None:
        for klass in SchoolClass.objects.all():
            if _grade_number(klass.name) == number:
                return klass

    if not create or number is None:
        return None

    # Register the new class once, under a canonical 'Class N' name
    return SchoolClass.objects.get_or_create(
        name=f'Class {number}',
        defaults={'code': f'CLASS_{number}', 'is_active': True},
    )[0]


def next_school_class(current, promoted):
    """Return the SchoolClass a student should move to next year.

    current: a SchoolClass (the student's present class).
    promoted: True -> the next grade (e.g. Class 8 -> Class 9); False -> same class.
    Resolves by grade number against the master list (never assumes class_id+1),
    creating the next class row if it does not exist yet.
    """
    if current is None:
        return None
    if not promoted:
        return current
    number = _grade_number(current.name)
    if number is None:
        return current
    return resolve_school_class(f'Class {number + 1}', create=True)
