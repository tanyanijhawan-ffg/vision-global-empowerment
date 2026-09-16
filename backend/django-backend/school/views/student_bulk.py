from datetime import date
from io import BytesIO

from django.core.files.base import ContentFile
from django.db import transaction
from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from school.models.aspiration import Aspiration
from school.models.center import Center
from school.models.family import Family
from school.models.motivation import Motivation
from school.models.socio_economic import SocioEconomic
from school.models.student import Student
from school.models.vulnerability import StudentVulnerability, VulnerabilityMaster
from school.permissions import IsSuperAdmin
from school.services.xlsx import build_workbook, read_first_sheet, read_first_sheet_images


MOTIVATION_GROUPS = {
    'academic_reasons': ('Academic Reasons', ['Unable to understand school lessons', 'Poor academic performance', 'Weak in reading/writing', 'Weak in specific subjects']),
    'home_environment': ('Home Environment', ['No study support at home', 'Parents are not educated', 'No quiet place to study']),
    'vulnerability_reasons': ('Vulnerability', ['Risk of dropping out', 'Irregular schooling']),
    'personal_motivation': ('Personal Motivation', ['Interested in learning', 'Wants to improve English', 'Wants to read books', 'Curious learner']),
    'social_influence': ('Social Influence', ['Friends attend', 'Parent insisted', 'Teacher recommended']),
    'developmental_needs': ('Developmental Needs', ['Needs discipline', 'Needs confidence building', 'Needs guidance']),
}

STUDENT_COLUMNS = [
    'full_name', 'nick_name', 'gender', 'dob', 'photo_filename', 'class_grade', 'school_name', 'school_type', 'medium_of_instruction', 'attendance_pattern', 'previous_academic_performance',
    'father_name', 'father_occupation', 'father_education', 'mother_name', 'mother_occupation', 'mother_education', 'guardian', 'parent_phone', 'school_going_children', 'family_members', 'birth_order',
    'caste_category', 'tribe_name', 'religion', 'income_range', 'house_type', 'ownership', 'electricity', 'drinking_water', 'study_space', 'toilet',
    'first_generation_learner', 'single_parent', 'orphan_or_semi_orphan', 'migrant_family', 'child_labour_risk', 'disability', 'chronic_illness', 'extreme_poverty', 'other_vulnerability',
    *MOTIVATION_GROUPS.keys(),
    'narrative_life_situation', 'narrative_family_challenges', 'narrative_academic_challenges', 'narrative_behavioral_challenges', 'narrative_program_expectations',
    'career_goal', 'interests', 'strengths', 'region_name', 'district_name', 'centre_name',
]

HEADER_LABELS = {
    'full_name': 'Full Name *', 'nick_name': 'Nickname / Call Name', 'gender': 'Gender * [Female, Male, Other]', 'dob': 'Date of Birth * [YYYY-MM-DD]', 'photo_filename': 'Student Photograph * [insert image in this cell]',
    'class_grade': 'Current Class / Grade *', 'school_name': 'School Name', 'school_type': 'School Type [Government, Private]', 'medium_of_instruction': 'Medium of Instruction [Tamil Medium, English Medium]', 'attendance_pattern': 'School Attendance Pattern [Regular, Irregular]', 'previous_academic_performance': 'Previous Academic Performance',
    'father_name': "Father's Name", 'father_occupation': "Father's Occupation", 'father_education': "Father's Education [Primary, Upper Primary, Graduation, Post graduation]", 'mother_name': "Mother's Name", 'mother_occupation': "Mother's Occupation", 'mother_education': "Mother's Education [Primary, Upper Primary, Graduation, Post graduation]", 'guardian': 'Guardian (if applicable)', 'parent_phone': 'Parent Phone Number', 'school_going_children': 'School-Going Children', 'family_members': 'Number of Family Members', 'birth_order': 'Birth Order',
    'caste_category': 'Caste Category', 'tribe_name': 'Tribe Name', 'religion': 'Religion', 'income_range': 'Monthly Household Income [Below 72000, 72000-300000, Above 300000]', 'house_type': 'Housing Condition [Permanent, Semi-permanent, Temporary]', 'ownership': 'Ownership [Own, Rent]', 'electricity': 'Access to Electricity [Yes, No, Partial]', 'drinking_water': 'Access to Clean Water [Yes, No, Partial]', 'study_space': 'Study Space at Home [Yes, No]', 'toilet': 'Access to Toilet [Yes, No]',
    'first_generation_learner': 'First-generation learner [Yes, No]', 'single_parent': 'Single parent [Yes, No]', 'orphan_or_semi_orphan': 'Orphan / semi-orphan [Yes, No]', 'migrant_family': 'Migrant family [Yes, No]', 'child_labour_risk': 'Child labour risk [Yes, No]', 'disability': 'Disability [Yes, No]', 'chronic_illness': 'Chronic illness [Yes, No]', 'extreme_poverty': 'Extreme poverty [Yes, No]', 'other_vulnerability': 'Other Vulnerability',
    'narrative_life_situation': "Child's life situation before joining *", 'narrative_family_challenges': 'Family challenges *', 'narrative_academic_challenges': 'Academic challenges *', 'narrative_behavioral_challenges': 'Behavioral challenges *', 'narrative_program_expectations': 'Expectations from program *', 'career_goal': 'What do you want to become?', 'interests': 'Interests (sports, arts, reading, etc.)', 'strengths': 'Strengths Observed', 'region_name': 'Region *', 'district_name': 'District *', 'centre_name': 'Centre *',
}
HEADER_LABELS.update({key: f'{label} [{", ".join(options)}]' for key, (label, options) in MOTIVATION_GROUPS.items()})
DISPLAY_HEADERS = [HEADER_LABELS[column] for column in STUDENT_COLUMNS]

NARRATIVES = {
    'narrative_life_situation': 'Child’s life situation before joining', 'narrative_family_challenges': 'Family challenges',
    'narrative_academic_challenges': 'Academic challenges', 'narrative_behavioral_challenges': 'Behavioral challenges',
    'narrative_program_expectations': 'Expectations from program',
}


class StudentWorkbookExportView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, *args, **kwargs):
        rows = [student_row(student) for student in Student.objects.select_related('centre__region', 'centre__district').prefetch_related('motivations', 'student_vulnerabilities__vulnerability', 'socio_economics', 'aspirations').order_by('student_id')]
        response = HttpResponse(build_workbook('Students', DISPLAY_HEADERS, rows), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="students.xlsx"'
        return response


class StudentBulkUploadView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        uploaded_file = request.FILES.get('file')
        if uploaded_file is None or not uploaded_file.name.lower().endswith('.xlsx'):
            return Response({'file': ['Upload an .xlsx file.']}, status=status.HTTP_400_BAD_REQUEST)
        try:
            workbook_bytes = uploaded_file.read()
            headers, records = read_first_sheet(BytesIO(workbook_bytes))
            images = read_first_sheet_images(BytesIO(workbook_bytes))
        except Exception:
            return Response({'file': ['The uploaded file is not a valid Excel workbook.']}, status=status.HTTP_400_BAD_REQUEST)
        header_keys = {label: key for key, label in HEADER_LABELS.items()}
        missing = [HEADER_LABELS[column] for column in STUDENT_COLUMNS if HEADER_LABELS[column] not in headers]
        if missing:
            return Response({'file': [f'Missing required columns: {", ".join(missing)}.']}, status=status.HTTP_400_BAD_REQUEST)
        records = [{header_keys[header]: value for header, value in record.items() if header in header_keys} for record in records]
        photo_column = headers.index(HEADER_LABELS['photo_filename'])
        summary = {'created': 0, 'updated': 0, 'skipped': 0}
        try:
            for index, record in enumerate(records, start=2):
                outcome = upsert_student(record, images.get((index - 1, photo_column)))
                summary[outcome] += 1
        except ValueError as error:
            transaction.set_rollback(True)
            return Response({'file': [str(error)]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(summary)


def upsert_student(record, image):
    required = ('full_name', 'gender', 'dob', 'class_grade', 'region_name', 'district_name', 'centre_name', *NARRATIVES.keys())
    if any(not text(record.get(field)) for field in required):
        raise ValueError(f'Every student row needs: {", ".join(required)}.')
    centre = Center.objects.select_related('region', 'district').filter(
        region__region_name=text(record['region_name']), district__district_name=text(record['district_name']), centre_name=text(record['centre_name']),
    ).first()
    if centre is None:
        raise ValueError(f'Centre not found for {record["full_name"]}: create its Region, District, and Centre first.')
    try:
        dob = date.fromisoformat(text(record['dob']))
    except ValueError as error:
        raise ValueError(f'Invalid date of birth for {record["full_name"]}; use YYYY-MM-DD.') from error
    student, created = Student.objects.get_or_create(centre=centre, full_name=text(record['full_name']), dob=dob, defaults={'gender': text(record['gender'])})
    image_filename = image[0] if image else ''
    expected_photo_name = text(record.get('photo_filename')) or image_filename
    image_matches = not image or (student.photo and student.photo.name.rsplit('/', 1)[-1] == expected_photo_name)
    if not created and student_matches_record(student, record) and image_matches:
        return 'skipped'
    changed = set_student_fields(student, record, dob)
    if image:
        filename, image_bytes = image
        desired_name = expected_photo_name or filename
        if not student.photo or student.photo.name.rsplit('/', 1)[-1] != desired_name:
            student.photo.save(desired_name, ContentFile(image_bytes), save=False)
            changed = True
    elif created:
        raise ValueError(f'Photo is required for new student {record["full_name"]}; insert it in the photo_filename cell.')
    if changed or created:
        student.save()
    update_related(student, record)
    return 'created' if created else 'updated'


def set_student_fields(student, record, dob):
    changed = False
    fields = ('nick_name', 'gender', 'school_name', 'school_type', 'class_grade', 'medium_of_instruction', 'attendance_pattern', 'previous_academic_performance')
    for field in fields:
        value = text(record.get(field)) or None
        if getattr(student, field) != value:
            setattr(student, field, value)
            changed = True
    if student.dob != dob:
        student.dob = dob
        changed = True
    return changed


def update_related(student, record):
    family_fields = ('father_name', 'mother_name', 'guardian', 'parent_phone', 'father_occupation', 'mother_occupation', 'father_education', 'mother_education')
    family_data = {field: text(record.get(field)) or None for field in family_fields}
    family_data.update({field: integer(record.get(field)) for field in ('family_members', 'school_going_children', 'birth_order')})
    Family.objects.update_or_create(student=student, defaults=family_data)
    socio_fields = ('caste_category', 'tribe_name', 'religion', 'income_range', 'house_type', 'ownership')
    socio_data = {field: text(record.get(field)) or None for field in socio_fields}
    socio_data.update({field: boolean(record.get(field)) for field in ('drinking_water', 'toilet', 'electricity', 'study_space')})
    SocioEconomic.objects.update_or_create(student=student, defaults=socio_data)
    StudentVulnerability.objects.filter(student=student).delete()
    vulnerability_map = {
        'first_generation_learner': 'First-generation learner', 'single_parent': 'Single parent', 'orphan_or_semi_orphan': 'Orphan / semi-orphan', 'migrant_family': 'Migrant family', 'child_labour_risk': 'Child labour risk', 'disability': 'Disability', 'chronic_illness': 'Chronic illness', 'extreme_poverty': 'Extreme poverty',
    }
    for key, name in vulnerability_map.items():
        if boolean(record.get(key)):
            vulnerability, _ = VulnerabilityMaster.objects.get_or_create(vulnerability_name=name)
            StudentVulnerability.objects.create(student=student, vulnerability=vulnerability)
    for name in ['Other'] if text(record.get('other_vulnerability')) else []:
        vulnerability, _ = VulnerabilityMaster.objects.get_or_create(vulnerability_name=name)
        StudentVulnerability.objects.create(student=student, vulnerability=vulnerability, remarks=text(record.get('other_vulnerability')) if name == 'Other' else None)
    Motivation.objects.filter(student=student).delete()
    for key, (category, options) in MOTIVATION_GROUPS.items():
        for reason in split_values(record.get(key)):
            if reason not in options:
                raise ValueError(f'Invalid option "{reason}" in {category}.')
            Motivation.objects.create(student=student, category=category, reason=reason)
    for column, reason in NARRATIVES.items():
        narrative = text(record.get(column))
        if narrative:
            Motivation.objects.create(student=student, category='Narrative', reason=reason, narrative=narrative)
    Aspiration.objects.update_or_create(student=student, defaults={field: text(record.get(field)) or None for field in ('career_goal', 'interests', 'strengths')})
    return True


def student_row(student):
    family = getattr(student, 'family', None)
    socio = student.socio_economics.first()
    vulnerabilities = list(student.student_vulnerabilities.all())
    motivations = list(student.motivations.all())
    narrative_map = {item.reason: item.narrative for item in motivations if item.category == 'Narrative'}
    aspirations = student.aspirations.first()
    values = {
        'full_name': student.full_name, 'nick_name': student.nick_name, 'gender': student.gender, 'dob': student.dob.isoformat() if student.dob else '',
        'photo_filename': student.photo.name.rsplit('/', 1)[-1] if student.photo else '', 'school_name': student.school_name, 'school_type': student.school_type, 'class_grade': student.class_grade,
        'medium_of_instruction': student.medium_of_instruction, 'attendance_pattern': student.attendance_pattern, 'previous_academic_performance': student.previous_academic_performance,
        'region_name': student.centre.region.region_name, 'district_name': student.centre.district.district_name, 'centre_name': student.centre.centre_name,
        **{field: getattr(family, field, '') if family else '' for field in ('father_name', 'mother_name', 'guardian', 'parent_phone', 'father_occupation', 'mother_occupation', 'father_education', 'mother_education', 'family_members', 'school_going_children', 'birth_order')},
        **{field: getattr(socio, field, '') if socio else '' for field in ('caste_category', 'tribe_name', 'religion', 'income_range', 'house_type', 'ownership', 'drinking_water', 'toilet', 'electricity', 'study_space')},
        **{key: any(item.vulnerability.vulnerability_name == name for item in vulnerabilities) for key, name in {'first_generation_learner': 'First-generation learner', 'single_parent': 'Single parent', 'orphan_or_semi_orphan': 'Orphan / semi-orphan', 'migrant_family': 'Migrant family', 'child_labour_risk': 'Child labour risk', 'disability': 'Disability', 'chronic_illness': 'Chronic illness', 'extreme_poverty': 'Extreme poverty'}.items()},
        'other_vulnerability': next((item.remarks or '' for item in vulnerabilities if item.vulnerability.vulnerability_name == 'Other'), ''),
        **{key: '; '.join(item.reason for item in motivations if motivation_group_for(item.reason) == key) for key in MOTIVATION_GROUPS},
        **{column: narrative_map.get(reason, '') for column, reason in NARRATIVES.items()},
        'career_goal': aspirations.career_goal if aspirations else '', 'interests': aspirations.interests if aspirations else '', 'strengths': aspirations.strengths if aspirations else '',
    }
    return [values.get(column, '') for column in STUDENT_COLUMNS]


def student_matches_record(student, record):
    current = dict(zip(STUDENT_COLUMNS, student_row(student)))
    boolean_columns = {'drinking_water', 'toilet', 'electricity', 'study_space'}
    integer_columns = {'family_members', 'school_going_children', 'birth_order'}
    for column in STUDENT_COLUMNS:
        actual = current[column]
        expected = record.get(column, '')
        if column in boolean_columns:
            actual = 'yes' if actual is True else 'no' if actual is False else ''
            expected = text(expected).lower()
            expected = {'true': 'yes', '1': 'yes', 'false': 'no', '0': 'no'}.get(expected, expected)
        elif column in integer_columns:
            actual = str(actual) if actual not in (None, '') else ''
            expected = text(expected)
        else:
            actual = text(actual) if actual is not None else ''
            expected = text(expected) if expected is not None else ''
        if actual != expected:
            return False
    return True


def motivation_group_for(reason):
    for key, (_, options) in MOTIVATION_GROUPS.items():
        if reason in options:
            return key
    return None


def text(value): return str(value).strip() if value is not None else ''
def integer(value): return int(value) if text(value) else None
def boolean(value): return text(value).lower() in {'yes', 'true', '1'} if text(value) else None
def split_values(value): return [item.strip() for item in text(value).split(';') if item.strip()]