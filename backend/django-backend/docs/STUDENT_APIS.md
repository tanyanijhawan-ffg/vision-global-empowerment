# Student APIs

This document describes the student CRUD and retrieval APIs available in the Django backend. These endpoints are used to list students, create new student records, update student details, and fetch a single student profile.

## Base URL

- Local: `http://localhost:8000/api`
- App route prefix: `/api`

## 1. List Students

### GET /api/students/

Returns a list of all students.

Request:

```http
GET /api/students/
```

Optional query parameters:

- `centre_id` or `center_id`
- `gender`
- `class_grade`

Example:

```http
GET /api/students/?centre_id=1
GET /api/students/?gender=Female
GET /api/students/?class_grade=Grade 5
```

Response example:

```json
[
  {
    "id": 1,
    "full_name": "Rahul Kumar",
    "nick_name": "Rahul",
    "gender": "Male",
    "dob": "2014-05-12",
    "age": 12,
    "photo": null,
    "school_name": "Green Valley School",
    "school_type": "Government",
    "class_grade": "Grade 5",
    "medium_of_instruction": "English",
    "attendance_pattern": "Regular",
    "previous_academic_performance": "Good",
    "centre": {
      "id": 3,
      "name": "Center A",
      "district": "Bangalore",
      "region": "South",
      "location": "MG Road"
    },
    "centre_id": 3
  }
]
```

Usage:

- Used by the student management list screen.
- Supports filtering by center, gender, and class.

## 2. Create Student

### POST /api/students/

Creates a new student record.

Request body example:

```json
{
  "full_name": "Anitha R",
  "nick_name": "Anitha",
  "gender": "Female",
  "dob": "2015-02-09",
  "age": 11,
  "school_name": "Little Stars School",
  "school_type": "Private",
  "class_grade": "Grade 5",
  "medium_of_instruction": "English",
  "attendance_pattern": "Regular",
  "previous_academic_performance": "Very Good",
  "centre_id": 3
}
```

Response example:

```json
{
  "id": 2,
  "full_name": "Anitha R",
  "nick_name": "Anitha",
  "gender": "Female",
  "dob": "2015-02-09",
  "age": 11,
  "photo": null,
  "school_name": "Little Stars School",
  "school_type": "Private",
  "class_grade": "Grade 5",
  "medium_of_instruction": "English",
  "attendance_pattern": "Regular",
  "previous_academic_performance": "Very Good",
  "centre": {
    "id": 3,
    "name": "Center A",
    "district": "Bangalore",
    "region": "South",
    "location": "MG Road"
  },
  "centre_id": 3
}
```

Usage:

- Used when registering a new student under a centre.
- `centre_id` is required for the relation to the center table.

## 3. Get Single Student

### GET /api/students/{id}/

Returns one student record.

Request:

```http
GET /api/students/1/
```

Response example:

```json
{
  "id": 1,
  "full_name": "Rahul Kumar",
  "nick_name": "Rahul",
  "gender": "Male",
  "dob": "2014-05-12",
  "age": 12,
  "photo": null,
  "school_name": "Green Valley School",
  "school_type": "Government",
  "class_grade": "Grade 5",
  "medium_of_instruction": "English",
  "attendance_pattern": "Regular",
  "previous_academic_performance": "Good",
  "centre": {
    "id": 3,
    "name": "Center A",
    "district": "Bangalore",
    "region": "South",
    "location": "MG Road"
  },
  "centre_id": 3
}
```

Usage:

- Used for student profile detail pages.
- Useful for pre-filling edit forms and student dashboards.

## 4. Update Student

### PUT /api/students/{id}/

Updates one student record.

Request body example:

```json
{
  "full_name": "Rahul Kumar",
  "nick_name": "Rahul",
  "gender": "Male",
  "dob": "2014-05-12",
  "age": 12,
  "school_name": "Green Valley School",
  "school_type": "Government",
  "class_grade": "Grade 6",
  "medium_of_instruction": "English",
  "attendance_pattern": "Regular",
  "previous_academic_performance": "Very Good",
  "centre_id": 3
}
```

Response example:

```json
{
  "id": 1,
  "full_name": "Rahul Kumar",
  "nick_name": "Rahul",
  "gender": "Male",
  "dob": "2014-05-12",
  "age": 12,
  "photo": null,
  "school_name": "Green Valley School",
  "school_type": "Government",
  "class_grade": "Grade 6",
  "medium_of_instruction": "English",
  "attendance_pattern": "Regular",
  "previous_academic_performance": "Very Good",
  "centre": {
    "id": 3,
    "name": "Center A",
    "district": "Bangalore",
    "region": "South",
    "location": "MG Road"
  },
  "centre_id": 3
}
```

Usage:

- Used in student edit screens.
- Commonly updates grade level, school name, attendance status, or center assignment.

## 5. Delete Student

### DELETE /api/students/{id}/

Deletes a student record.

Request:

```http
DELETE /api/students/1/
```

Response:

- HTTP 204 No Content

Usage:

- Use when removing inactive or duplicate student records.

## 6. Underlying Model and Relationship

The `student` table is linked to the `centre` table through:

```python
centre = models.ForeignKey(Center, on_delete=models.CASCADE, related_name='students')
```

That means each student belongs to a centre and the API exposes the nested center object. The app uses the `school` model layer in [backend/django-backend/school/models/student.py](backend/django-backend/school/models/student.py).

## 7. Related Student API Notes

Student records are also used by attendance and assessment APIs. For example:

- Attendance records link to students via `student_id`
- Assessment scores and diagnostics are keyed by `student_id`
- Dashboard and comparison APIs rely on the student identity and class metadata

## 8. Example Usage in Frontend

```javascript
fetch('/api/students/')
  .then((res) => res.json())
  .then((data) => console.log(data));
```

```javascript
const payload = {
  full_name: 'Anitha R',
  school_name: 'Little Stars School',
  class_grade: 'Grade 5',
  centre_id: 3,
};

fetch('/api/students/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

## 9. Current Implementation File References

- Student model: [backend/django-backend/school/models/student.py](backend/django-backend/school/models/student.py)
- Student serializer: [backend/django-backend/school/serializers/student.py](backend/django-backend/school/serializers/student.py)
- Student views: [backend/django-backend/school/views/student.py](backend/django-backend/school/views/student.py)
- Student URLs: [backend/django-backend/school/urls.py](backend/django-backend/school/urls.py)
