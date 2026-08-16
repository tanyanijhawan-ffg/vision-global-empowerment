# Assessment APIs

This document describes the assessment metadata, score capture, diagnostics, behaviour tracking, comparison, and student dashboard APIs for the school platform.

## Base URL

- Production: `https://<host>/api/v1`
- Local: `http://localhost:8000/api/v1`

## 1. Assessment Types Metadata

### GET /api/v1/assessment-types

Returns the assessment type catalog used by the UI.

Request:

```http
GET /api/v1/assessment-types
```

Response:

```json
[
  {
    "id": 1,
    "code": "QUARTERLY",
    "name": "Quarterly",
    "durationMonths": 3
  },
  {
    "id": 2,
    "code": "HALF_YEARLY",
    "name": "Half-Yearly",
    "durationMonths": 6
  },
  {
    "id": 3,
    "code": "ANNUAL",
    "name": "Annual",
    "durationMonths": 12
  }
]
```

Usage:

- Use this to populate the assessment type dropdown in the assessment creation form.
- The response is sourced from the `assessment_type` table in PostgreSQL.

## 2. Subject Catalog

### GET /api/v1/subjects?classId=5

Returns subjects for a selected class.

Request:

```http
GET /api/v1/subjects?classId=5
```

Response:

```json
[
  { "id": 1, "name": "Tamil" },
  { "id": 2, "name": "English" },
  { "id": 3, "name": "Mathematics" },
  { "id": 4, "name": "Science" },
  { "id": 5, "name": "Social Science" }
]
```

Notes:

- `classId` is optional; if omitted, all active subjects are returned.
- Records are stored in the `subject` table and are seeded using the metadata command.

## 3. Create Assessment

### POST /api/v1/assessments

Request body:

```json
{
  "academicYearId": 2026,
  "classId": 5,
  "sectionId": 1,
  "assessmentTypeId": 1,
  "term": "Q1",
  "assessmentDate": "2026-07-15"
}
```

Response:

```json
{
  "id": 501,
  "status": "DRAFT",
  "academicYear": "2026-27",
  "class": "Grade 5",
  "section": "A",
  "assessmentType": "Quarterly",
  "term": "Q1"
}
```

## 4. Get Assessment Details

### GET /api/v1/assessments/501

Response:

```json
{
  "id": 501,
  "status": "DRAFT",
  "assessmentType": "Quarterly",
  "term": "Q1",
  "academicYear": "2026-27",
  "class": "Grade 5",
  "section": "A",
  "totalStudents": 28
}
```

## 5. Scores API

### GET /api/v1/assessments/501/scores

Response:

```json
{
  "assessmentId": 501,
  "students": [
    {
      "studentId": 101,
      "admissionNumber": "STU-001",
      "studentName": "Rahul Kumar",
      "scores": [
        {
          "subjectId": 1,
          "subject": "Tamil",
          "maxMarks": 100,
          "obtainedMarks": 82
        },
        {
          "subjectId": 2,
          "subject": "English",
          "maxMarks": 100,
          "obtainedMarks": 76
        },
        {
          "subjectId": 3,
          "subject": "Mathematics",
          "maxMarks": 100,
          "obtainedMarks": 91
        }
      ],
      "total": 412,
      "percentage": 82.4
    }
  ]
}
```

### PUT /api/v1/assessments/501/scores/bulk

Request body:

```json
{
  "students": [
    {
      "studentId": 101,
      "scores": [
        { "subjectId": 1, "obtainedMarks": 82 },
        { "subjectId": 2, "obtainedMarks": 76 },
        { "subjectId": 3, "obtainedMarks": 91 },
        { "subjectId": 4, "obtainedMarks": 85 },
        { "subjectId": 5, "obtainedMarks": 78 }
      ]
    },
    {
      "studentId": 102,
      "scores": [
        { "subjectId": 1, "obtainedMarks": 78 }
      ]
    }
  ]
}
```

Response:

```json
{
  "assessmentId": 501,
  "students": [
    {
      "studentId": 101,
      "scores": [
        { "subjectId": 1, "obtainedMarks": 82 },
        { "subjectId": 2, "obtainedMarks": 76 },
        { "subjectId": 3, "obtainedMarks": 91 },
        { "subjectId": 4, "obtainedMarks": 85 },
        { "subjectId": 5, "obtainedMarks": 78 }
      ],
      "totalMarks": 412,
      "maxMarks": 500,
      "percentage": 82.4
    },
    {
      "studentId": 102,
      "scores": [
        { "subjectId": 1, "obtainedMarks": 78 }
      ],
      "totalMarks": 78,
      "maxMarks": 100,
      "percentage": 78.0
    }
  ],
  "savedStudents": 2,
  "savedScores": 6,
  "status": "SUCCESS"
}
```

## 6. Diagnostic Options and Assessment Diagnostics

### GET /api/v1/diagnostic-options

Response:

```json
{
  "understandingLevels": [
    { "code": "CLEAR", "name": "Understands clearly" },
    { "code": "REPETITION", "name": "Needs repetition" },
    { "code": "NOT_UNDERSTAND", "name": "Does not understand" }
  ],
  "applicationAbilities": [
    { "code": "APPLIES", "name": "Applies concepts" },
    { "code": "MEMORISES", "name": "Memorises only" },
    { "code": "CANNOT_APPLY", "name": "Cannot apply" }
  ],
  "interestLevels": [
    { "code": "INTERESTED", "name": "Interested" },
    { "code": "NEUTRAL", "name": "Neutral" },
    { "code": "DISINTERESTED", "name": "Disinterested" }
  ]
}
```

### PUT /api/v1/assessments/501/diagnostics/bulk

Request body:

```json
{
  "students": [
    {
      "studentId": 101,
      "subjectId": 3,
      "understandingLevel": "CLEAR",
      "applicationAbility": "APPLIES",
      "interestLevel": "INTERESTED"
    },
    {
      "studentId": 102,
      "subjectId": 3,
      "understandingLevel": "REPETITION",
      "applicationAbility": "MEMORISES",
      "interestLevel": "NEUTRAL"
    }
  ]
}
```

## 7. Learning Behaviour APIs

### GET /api/v1/learning-behaviours

Returns the behaviour catalog.

```json
[
  { "code": "INDEPENDENT", "name": "Independent" },
  { "code": "SUPERVISION", "name": "Needs supervision" },
  { "code": "MOTIVATED", "name": "Motivated" }
]
```

### PUT /api/v1/assessments/501/behaviours/bulk

Request body:

```json
{
  "students": [
    { "studentId": 101, "behaviour": "INDEPENDENT" },
    { "studentId": 102, "behaviour": "SUPERVISION" },
    { "studentId": 103, "behaviour": "MOTIVATED" }
  ]
}
```

## 8. Narrative Observation APIs

### PUT /api/v1/assessments/501/students/101/observation

Request body:

```json
{
  "keyImprovements": "Good improvement in Mathematics and Tamil.",
  "subjectsNeedingSupport": "Science and Social Science.",
  "interventionPlan": "Weekly revision and additional worksheets."
}
```

Validation behavior:

```json
{
  "error": "subjectsNeedingSupport is required"
}
```

## 9. Submit Assessment

### POST /api/v1/assessments/501/submit

Response:

```json
{
  "assessmentId": 501,
  "status": "SUBMITTED",
  "submittedAt": "2026-08-16T13:20:00"
}
```

The backend checks the following conditions before allowing submission:

- all students have scores
- all subjects have scores
- diagnostic data exists
- learning behaviour data exists
- narrative observation exists
- required fields are populated

## 10. Comparison and Statistics APIs

### GET /api/v1/assessments/501/comparison

```json
{
  "current": { "assessment": "Quarterly Q1", "percentage": 82.46 },
  "previous": { "assessment": "Half-Yearly", "percentage": 79.38 },
  "change": { "percentagePoints": 3.08, "trend": "UP" }
}
```

### GET /api/v1/assessments/501/comparison/subjects

```json
[
  {
    "subject": "Tamil",
    "previousPercentage": 80.0,
    "currentPercentage": 87.86,
    "change": 7.86,
    "trend": "UP"
  }
]
```

### GET /api/v1/assessments/501/comparison/students

```json
[
  {
    "studentId": 101,
    "studentName": "Rahul Kumar",
    "previousPercentage": 78.2,
    "currentPercentage": 84.6,
    "change": 6.4,
    "trend": "UP"
  }
]
```

### GET /api/v1/students/101/performance/trends?subjectId=3

```json
[
  {
    "assessment": "Quarterly Q4",
    "percentage": 72.6
  },
  {
    "assessment": "Half-Yearly",
    "percentage": 85.71
  },
  {
    "assessment": "Quarterly Q1",
    "percentage": 92.29
  }
]
```

### GET /api/v1/assessments/501/statistics

```json
{
  "studentCount": 28,
  "averagePercentage": 82.46,
  "previousAverage": 79.38,
  "improvement": 3.08,
  "highestPercentage": 96.2,
  "lowestPercentage": 54.4,
  "passPercentage": 89.3
}
```

### GET /api/v1/students/101/dashboard

```json
{
  "student": {
    "id": 101,
    "name": "Rahul Kumar",
    "class": "Grade 5",
    "section": "A"
  },
  "currentPerformance": { "percentage": 84.6 },
  "previousPerformance": { "percentage": 78.2 },
  "improvement": { "percentage": 6.4, "trend": "UP" },
  "learningBehaviour": "INDEPENDENT",
  "areasNeedingSupport": ["Science"],
  "observation": {
    "keyImprovements": "...",
    "subjectsNeedingSupport": "...",
    "interventionPlan": "..."
  }
}
```

## 11. Complete Assessment View

### GET /api/v1/assessments/501/details

Response shape:

```json
{
  "assessment": {},
  "students": [],
  "scores": [],
  "diagnostics": [],
  "behaviours": [],
  "observations": [],
  "comparison": {},
  "subjectComparison": [],
  "classStatistics": {}
}
```

## 12. Metadata Tables and Data Sources

These records are returned from database tables:

- `assessment_type`
- `subject`
- `diagnostic_option`
- `learning_behaviour_option`

Seed the data with:

```bash
cd backend/django-backend
python manage.py seed_assessment_metadata
```

## 13. Useful Notes

- All assessment endpoints are under the `school` Django app.
- The routes are mounted under `api/v1` via the main project URL configuration.
- The data contract uses camelCase for the public API names (`assessmentTypeId`, `classId`, `subjectId`, `maxMarks`, etc.).
