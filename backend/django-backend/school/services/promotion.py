import re
from datetime import date
from decimal import Decimal
from django.db import transaction
from django.db.models import Q

from school.models.assessment import (
    AcademicYear,
    Assessment,
    AssessmentScore,
    AssessmentSubject,
    AssessmentType,
)
from school.models.student import Student, StudentClassRecord


def _subject_max_marks(assessment, subject_id):
    if assessment is None or subject_id is None:
        return Decimal('100')
    configs = AssessmentSubject.objects.filter(
        class_id=assessment.class_id,
        exam_id=assessment.assessment_type_id,
        is_active=True,
    )
    if assessment.centre_id:
        c_config = configs.filter(centre_id=assessment.centre_id).order_by('-assessment_subject_id').first()
        if c_config and c_config.max_marks is not None and subject_id in (c_config.subject_ids or []):
            return Decimal(str(c_config.max_marks))
    config = configs.order_by('-assessment_subject_id').first()
    if config and config.max_marks is not None and subject_id in (config.subject_ids or []):
        return Decimal(str(config.max_marks))
    return Decimal('100')


def get_or_create_next_academic_year(current_ay):
    """
    Finds or creates the next academic year record following current_ay.
    """
    # 1. Check if a newer active academic year already exists by start_date
    next_ay = AcademicYear.objects.filter(
        start_date__gt=current_ay.start_date,
        is_active=True
    ).order_by('start_date').first()

    if not next_ay:
        # Check by ID if start_date is not strictly greater
        next_ay = AcademicYear.objects.filter(
            academic_year_id__gt=current_ay.academic_year_id,
            is_active=True
        ).order_by('academic_year_id').first()

    if not next_ay:
        # Create the new AcademicYear entry
        years = [int(y) for y in re.findall(r'\d{4}', current_ay.name)]
        if len(years) >= 2:
            start_year = years[1]
            end_year = start_year + 1
        elif len(years) == 1:
            start_year = years[0] + 1
            end_year = start_year + 1
        else:
            start_year = (current_ay.start_date.year if current_ay.start_date else 2026) + 1
            end_year = start_year + 1

        if ' - ' in current_ay.name:
            next_name = f"{start_year} - {end_year}"
        elif '-' in current_ay.name:
            next_name = f"{start_year}-{end_year}"
        else:
            next_name = f"{start_year} - {end_year}"

        s_month = current_ay.start_date.month if current_ay.start_date else 6
        s_day = current_ay.start_date.day if current_ay.start_date else 1
        e_month = current_ay.end_date.month if current_ay.end_date else 5
        e_day = current_ay.end_date.day if current_ay.end_date else 31

        next_start_date = date(start_year, s_month, s_day)
        next_end_date = date(end_year, e_month, e_day)

        next_ay = AcademicYear.objects.create(
            name=next_name,
            start_date=next_start_date,
            end_date=next_end_date,
            is_current=False,
            is_active=True,
        )

        # Clone active assessment types for the new academic year
        for at in AssessmentType.objects.filter(Q(academic_year=current_ay) | Q(academic_year__isnull=True), is_active=True):
            AssessmentType.objects.get_or_create(
                code=at.code,
                name=at.name,
                academic_year=next_ay,
                defaults={'is_active': True}
            )

    return next_ay


def calculate_next_class_grade(current_grade_str, promoted):
    """
    Determines next class string based on promotion outcome.
    If promoted, increments class number (e.g. 'Class 6' -> 'Class 7', '6' -> '7').
    If retained, preserves current class grade string.
    """
    if not current_grade_str:
        return 'Class 1' if promoted else 'Class 1'

    match = re.search(r'\d+', current_grade_str)
    if not match:
        return current_grade_str

    curr_num = int(match.group())
    if not promoted:
        return current_grade_str

    next_num = curr_num + 1
    if current_grade_str.lower().startswith('class '):
        return f"Class {next_num}"
    elif current_grade_str.lower().startswith('grade '):
        return f"Grade {next_num}"
    elif current_grade_str.isdigit():
        return str(next_num)
    else:
        return f"Class {next_num}"


@transaction.atomic
def process_class_promotion_and_rollover(assessment):
    """
    Called when an assessment is submitted.
    Evaluates whether all assessments for the class & centre in the current academic year have been submitted.
    If so:
      1. Finds or creates the next academic year.
      2. Computes each student's subject-wise average across all exams.
      3. If all subject averages > 33%, promotes the student to Class N+1 in the next academic year.
         Otherwise, retains the student in Class N.
      4. Saves/updates records in StudentClassRecord for next_academic_year.
      5. Checks if all classes across all centres have completed all assessments; if so, activates the new academic year.
    """
    class_id = assessment.class_id
    centre_id = assessment.centre_id

    current_ay = None
    if assessment.academic_year_id:
        current_ay = AcademicYear.objects.filter(academic_year_id=assessment.academic_year_id).first()
    if not current_ay:
        current_ay = AcademicYear.objects.filter(is_current=True).first()
    if not current_ay:
        return {'status': 'no_current_academic_year'}

    # 1. Determine required active exam types for the academic year
    active_types = AssessmentType.objects.filter(is_active=True)
    ay_types = active_types.filter(academic_year=current_ay)
    exam_types = ay_types if ay_types.exists() else active_types
    required_exam_type_ids = set(exam_types.values_list('assessment_type_id', flat=True))

    if not required_exam_type_ids:
        return {'status': 'no_active_exam_types'}

    # 2. Check draft assessments for this class and centre in the current academic year
    draft_query = Assessment.objects.filter(
        class_id=class_id,
        academic_year_id=current_ay.academic_year_id,
        status=Assessment.STATUS_DRAFT
    )
    if centre_id:
        draft_query = draft_query.filter(centre_id=centre_id)
    if draft_query.exists():
        return {'status': 'drafts_pending'}

    # 3. Check submitted assessments for this class and centre in the current academic year
    submitted_query = Assessment.objects.filter(
        class_id=class_id,
        academic_year_id=current_ay.academic_year_id,
        status=Assessment.STATUS_SUBMITTED
    )
    if centre_id:
        submitted_query = submitted_query.filter(centre_id=centre_id)

    submitted_assessments = list(submitted_query)
    submitted_exam_type_ids = {a.assessment_type_id for a in submitted_assessments}

    if not required_exam_type_ids.issubset(submitted_exam_type_ids):
        return {
            'status': 'exams_pending',
            'missing_exam_type_ids': list(required_exam_type_ids - submitted_exam_type_ids)
        }

    # 4. All exams for this class & centre are submitted! Ensure next academic year exists
    next_ay = get_or_create_next_academic_year(current_ay)

    # 5. Fetch class records for this class & centre in the current academic year.
    # We query StudentClassRecord directly so that new students (whose Student.class_grade
    # is null) are included alongside legacy students.
    class_str = str(class_id)
    cr_grade_q = (
        Q(class_grade__iexact=class_str) |
        Q(class_grade__iexact=f'Class {class_str}') |
        Q(class_grade__iexact=f'Grade {class_str}')
    )
    cr_filter = Q(academic_year=current_ay, is_active=True) & cr_grade_q
    if centre_id:
        cr_filter = cr_filter & Q(student__centre_id=centre_id)
    class_records = list(StudentClassRecord.objects.filter(cr_filter).select_related('student'))

    # Safety-net: also pick up legacy students whose grade is still only on Student.class_grade
    # (e.g. students that pre-date the migration and have no StudentClassRecord yet).
    legacy_grade_q = (
        Q(class_grade__iexact=class_str) |
        Q(class_grade__iexact=f'Class {class_str}') |
        Q(class_grade__iexact=f'Grade {class_str}')
    )
    legacy_student_filter = legacy_grade_q
    if centre_id:
        legacy_student_filter = legacy_student_filter & Q(centre_id=centre_id)
    already_have_record_ids = {r.student_id for r in class_records}
    legacy_students = Student.objects.filter(legacy_student_filter).exclude(student_id__in=already_have_record_ids)
    for st in legacy_students:
        rec, _ = StudentClassRecord.objects.get_or_create(
            student=st,
            academic_year=current_ay,
            defaults={'class_grade': st.class_grade or f"Class {class_id}", 'is_active': True}
        )
        class_records.append(rec)

    # 6. Promotion evaluation for each student
    promoted_count = 0
    retained_count = 0

    for rec in class_records:
        student = rec.student
        scores = AssessmentScore.objects.filter(
            student=student,
            assessment__in=submitted_assessments
        ).select_related('assessment', 'subject')

        scores_by_subject = {}
        for s in scores:
            scores_by_subject.setdefault(s.subject_id, []).append(s)

        if not scores_by_subject:
            # No scores entered: retain
            is_promoted = False
        else:
            is_promoted = True
            for subj_id, subj_scores in scores_by_subject.items():
                pcts = []
                for s in subj_scores:
                    max_m = _subject_max_marks(s.assessment, s.subject_id)
                    if max_m and max_m > 0:
                        pct = (float(s.obtained_marks) / float(max_m)) * 100.0
                        pcts.append(pct)
                if pcts:
                    subj_avg = sum(pcts) / len(pcts)
                else:
                    subj_avg = 0.0

                # Must strictly exceed 33% in each subject
                if subj_avg <= 33.0:
                    is_promoted = False
                    break

        if is_promoted:
            promoted_count += 1
        else:
            retained_count += 1

        next_grade_str = calculate_next_class_grade(rec.class_grade, is_promoted)

        # Store in StudentClassRecord for next_ay
        StudentClassRecord.objects.update_or_create(
            student=student,
            academic_year=next_ay,
            defaults={
                'class_grade': next_grade_str,
                'is_active': True,
                'promoted': is_promoted,
            }
        )

    # 7. Check if all classes across all centres have finished to roll over current_ay
    rollover_done = False
    drafts_exist = Assessment.objects.filter(
        academic_year_id=current_ay.academic_year_id,
        status=Assessment.STATUS_DRAFT
    ).exists()

    if not drafts_exist:
        curr_students = set(
            StudentClassRecord.objects.filter(academic_year=current_ay, is_active=True).values_list('student_id', flat=True)
        )
        next_students = set(
            StudentClassRecord.objects.filter(academic_year=next_ay, is_active=True).values_list('student_id', flat=True)
        )
        if curr_students and curr_students.issubset(next_students):
            current_ay.is_current = False
            current_ay.save(update_fields=['is_current'])
            next_ay.is_current = True
            next_ay.save(update_fields=['is_current'])
            rollover_done = True

    return {
        'status': 'promotion_evaluated',
        'centre_id': centre_id,
        'class_id': class_id,
        'current_academic_year': current_ay.name,
        'next_academic_year': next_ay.name,
        'promoted_count': promoted_count,
        'retained_count': retained_count,
        'academic_year_rolled_over': rollover_done,
    }
