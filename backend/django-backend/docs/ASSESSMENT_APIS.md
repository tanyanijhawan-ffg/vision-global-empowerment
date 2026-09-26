# Assessment and Metadata API Reference

This document lists the current assessment-related API endpoints exposed by the Django backend, together with sample requests and example responses.

## Base URL

- Local: `http://localhost:8000/api/v1`
- Production: `https://<host>/api/v1`

> Public request payloads use camelCase such as `classId`, `assessmentTypeId`, `sortOrder`, and `isActive`.
> Internal database fields remain snake_case in Django.

---

## 1. Academic Year and Class Master Data

### 1.1 Academic Years

#### GET /api/v1/academic-years/

Returns all active academic-year records.

Request:

```http
GET /api/v1/academic-years/
```

Example response:

```json
[
  {
    "id": 1,
    "name": "2025-26",
    "startDate": "2025-04-01",
    "endDate": "2026-03-31",
    "isCurrent": true,
    "isActive": true
  }
]
```

#### POST /api/v1/metadata/academic-years/

Request body:

```json
{
  "name": "2026-27",
  "startDate": "2026-04-01",
  "endDate": "2027-03-31",
  "isCurrent": true,
  "isActive": true
}
```

Example response:

```json
{
  "id": 2,
  "name": "2026-27",
  "startDate": "2026-04-01",
  "endDate": "2027-03-31",
  "isCurrent": true,
  "isActive": true
}
```

#### PUT /api/v1/metadata/academic-years/{id}/

Request body:

```json
{
  "name": "2026-27",
  "isCurrent": false,
  "isActive": true
}
```

#### DELETE /api/v1/metadata/academic-years/{id}/

Response:

```http
204 No Content
```

---

### 1.2 Classes

#### GET /api/v1/classes/

Request:

```http
GET /api/v1/classes/
```

Example response:

```json
[
  {
    "id": 1,
    "name": "Grade 1",
    "code": "G1",
    "isActive": true
  },
  {
    "id": 2,
    "name": "Grade 5",
    "code": "G5",
    "isActive": true
  }
]
```

#### POST /api/v1/metadata/classes/

Request body:

```json
{
  "name": "Grade 6",
  "code": "G6",
  "isActive": true
}
```

Example response:

```json
{
  "id": 3,
  "name": "Grade 6",
  "code": "G6",
  "isActive": true
}
```

#### PUT /api/v1/metadata/classes/{id}/

Request body:

```json
{
  "name": "Grade 6",
  "code": "GRADE_6",
  "isActive": true
}
```

#### DELETE /api/v1/metadata/classes/{id}/

Response:

```http
204 No Content
```

---

## 1. Metadata APIs

### 1.1 Assessment Types

#### GET /api/v1/assessment-types

Returns the active assessment type catalog.

Request:

```http
GET /api/v1/assessment-types
```

Example response:

```json
[
  {
    "id": 1,
    "code": "QUARTERLY",
    "name": "Quarterly",
    "durationMonths": 3,
    "isActive": true
  },
  {
    "id": 2,
    "code": "HALF_YEARLY",
    "name": "Half-Yearly",
    "durationMonths": 6,
    "isActive": true
  },
  {
    "id": 3,
    "code": "ANNUAL",
    "name": "Annual",
    "durationMonths": 12,
    "isActive": true
  }
]
```

#### POST /api/v1/metadata/assessment-types/

Create an assessment type.

Request body:

```json
{
  "code": "MID_YEAR",
  "name": "Mid-Year",
  "durationMonths": 6,
  "isActive": true
}
```

Example response:

```json
{
  "id": 4,
  "code": "MID_YEAR",
  "name": "Mid-Year",
  "durationMonths": 6,
  "isActive": true
}
```

#### PUT /api/v1/metadata/assessment-types/{id}/

Update an assessment type.

Request body:

```json
{
  "name": "Mid-Year Assessment",
  "durationMonths": 5,
  "isActive": true
}
```

Example response:

```json
{
  "id": 4,
  "code": "MID_YEAR",
  "name": "Mid-Year Assessment",
  "durationMonths": 5,
  "isActive": true
}
```

#### DELETE /api/v1/metadata/assessment-types/{id}/

Soft deletes the record by setting `isActive` to `false`.

Response:

```http
204 No Content
```

---

### 1.2 Assessment Subjects

This table maps a subject to a given academic year, class, and assessment type.

#### GET /api/v1/metadata/assessment-subjects/

Request:

```http
GET /api/v1/metadata/assessment-subjects/
```

Example response:

```json
[
  {
    "id": 1,
    "academicYearId": 1,
    "classId": 5,
    "assessmentTypeId": 1,
    "subjectId": 10,
    "subjectName": "Mathematics",
    "assessmentTypeName": "Quarterly",
    "maxMarks": 100,
    "isActive": true
  }
]
```

#### POST /api/v1/metadata/assessment-subjects/

Request body:

```json
{
  "academicYearId": 1,
  "classId": 5,
  "assessmentTypeId": 1,
  "subjectId": 12,
  "maxMarks": 100,
  "isActive": true
}
```

Example response:

```json
{
  "id": 2,
  "academicYearId": 1,
  "classId": 5,
  "assessmentTypeId": 1,
  "subjectId": 12,
  "subjectName": "Science",
  "assessmentTypeName": "Quarterly",
  "maxMarks": 100,
  "isActive": true
}
```

#### PUT /api/v1/metadata/assessment-subjects/{id}/

Request body:

```json
{
  "maxMarks": 120,
  "isActive": true
}
```

Example response:

```json
{
  "id": 2,
  "academicYearId": 1,
  "classId": 5,
  "assessmentTypeId": 1,
  "subjectId": 12,
  "subjectName": "Science",
  "assessmentTypeName": "Quarterly",
  "maxMarks": 120,
  "isActive": true
}
```

#### DELETE /api/v1/metadata/assessment-subjects/{id}/

Soft deletes the record by setting `isActive` to `false`.

Response:

```http
204 No Content
```

---

### 1.3 Subjects

#### GET /api/v1/subjects?classId=5

Returns active subjects for a class.

Request:

```http
GET /api/v1/subjects?classId=5
```

Example response:

```json
[
  {
    "id": 1,
    "name": "Tamil",
    "code": "TAMIL",
    "classId": 5,
    "isActive": true
  },
  {
    "id": 2,
    "name": "English",
    "code": "ENGLISH",
    "classId": 5,
    "isActive": true
  }
]
```

#### POST /api/v1/metadata/subjects/

Request body:

```json
{
  "name": "Computer Science",
  "code": "CS",
  "classId": 7,
  "isActive": true
}
```

Example response:

```json
{
  "id": 7,
  "name": "Computer Science",
  "code": "CS",
  "classId": 7,
  "isActive": true
}
```

#### PUT /api/v1/metadata/subjects/{id}/

Request body:

```json
{
  "code": "COMP_SCI",
  "isActive": true
}
```

#### DELETE /api/v1/metadata/subjects/{id}/

Response:

```http
204 No Content
```

---

### 1.4 Diagnostic Options

#### GET /api/v1/metadata/diagnostic-options/

Returns active diagnostic metadata records.

Request:

```http
GET /api/v1/metadata/diagnostic-options/
```

Example response:

```json
[
  {
    "id": 1,
    "category": "understanding_level",
    "code": "CLEAR",
    "name": "Understands clearly",
    "sortOrder": 1,
    "isActive": true
  },
  {
    "id": 2,
    "category": "understanding_level",
    "code": "REPETITION",
    "name": "Needs repetition",
    "sortOrder": 2,
    "isActive": true
  }
]
```

#### POST /api/v1/metadata/diagnostic-options/

Request body:

```json
{
  "category": "understanding_level",
  "code": "STILL_LEARNING",
  "name": "Still learning",
  "sortOrder": 4,
  "isActive": true
}
```

Example response:

```json
{
  "id": 10,
  "category": "understanding_level",
  "code": "STILL_LEARNING",
  "name": "Still learning",
  "sortOrder": 4,
  "isActive": true
}
```

#### PUT /api/v1/metadata/diagnostic-options/{id}/

Request body:

```json
{
  "name": "Needs more practice",
  "sortOrder": 5,
  "isActive": true
}
```

#### DELETE /api/v1/metadata/diagnostic-options/{id}/

Response:

```http
204 No Content
```

#### GET /api/v1/diagnostic-options

Returns grouped options for the assessment UI.

Example response:

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

---

### 1.5 Learning Behaviour Options

#### GET /api/v1/metadata/learning-behaviours/

Request:

```http
GET /api/v1/metadata/learning-behaviours/
```

Example response:

```json
[
  {
    "id": 1,
    "code": "INDEPENDENT",
    "name": "Independent",
    "isActive": true
  },
  {
    "id": 2,
    "code": "SUPERVISION",
    "name": "Needs supervision",
    "isActive": true
  }
]
```

#### POST /api/v1/metadata/learning-behaviours/

Request body:

```json
{
  "code": "HIGHLY_MOTIVATED",
  "name": "Highly motivated",
  "isActive": true
}
```

Example response:

```json
{
  "id": 5,
  "code": "HIGHLY_MOTIVATED",
  "name": "Highly motivated",
  "isActive": true
}
```

#### PUT /api/v1/metadata/learning-behaviours/{id}/

Request body:

```json
{
  "name": "Motivated learner",
  "isActive": true
}
```

#### DELETE /api/v1/metadata/learning-behaviours/{id}/

Response:

```http
204 No Content
```

#### GET /api/v1/learning-behaviours

Example response:

```json
[
  { "code": "INDEPENDENT", "name": "Independent" },
  { "code": "SUPERVISION", "name": "Needs supervision" },
  { "code": "MOTIVATED", "name": "Highly motivated" }
]
```

---

## 2. Assessment APIs

### 2.0 Assessment Score Table CRUD

The `assessment_score` table is exposed directly as a CRUD API in addition to the assessment-level bulk score endpoints.

> Important: `max_marks` is not stored in `assessment_score`. The API resolves the maximum for each subject from `assessment_subject` using the assessment's academic year, class, assessment type, and subject. The response still includes `maxMarks`, but clients should not send it in create/update requests.

#### GET /api/v1/assessment-scores/?assessmentId=501&studentId=101

Example response:

```json
[
  {
    "id": 1,
    "assessmentId": 501,
    "studentId": 101,
    "subjectId": 1,
    "maxMarks": 100,
    "obtainedMarks": 82
  },
  {
    "id": 2,
    "assessmentId": 501,
    "studentId": 101,
    "subjectId": 2,
    "maxMarks": 100,
    "obtainedMarks": 76
  }
]
```

#### POST /api/v1/assessment-scores/

Request body:

```json
{
  "assessmentId": 501,
  "studentId": 101,
  "subjectId": 3,
  "obtainedMarks": 88
}
```

Example response:

```json
{
  "id": 12,
  "assessmentId": 501,
  "studentId": 101,
  "subjectId": 3,
  "maxMarks": 100,
  "obtainedMarks": 88
}
```

#### GET /api/v1/assessment-scores/{id}/

Example response:

```json
{
  "id": 12,
  "assessmentId": 501,
  "studentId": 101,
  "subjectId": 3,
  "maxMarks": 100,
  "obtainedMarks": 88
}
```

#### PUT /api/v1/assessment-scores/{id}/

Request body:

```json
{
  "assessmentId": 501,
  "studentId": 101,
  "subjectId": 3,
  "obtainedMarks": 90
}
```

Example response:

```json
{
  "id": 12,
  "assessmentId": 501,
  "studentId": 101,
  "subjectId": 3,
  "maxMarks": 100,
  "obtainedMarks": 90
}
```

#### DELETE /api/v1/assessment-scores/{id}/

Response:

```http
204 No Content
```

---

### 2.1 Create Assessment

#### POST /api/v1/assessments/

Request body:

```json
{
  "academicYearId": 1,
  "classId": 5,
  "assessmentTypeId": 1,
  "term": "Q1",
  "assessmentDate": "2026-07-15"
}
```

Example response:

```json
{
  "id": 501,
  "status": "DRAFT",
  "academicYear": "2026-27",
  "class_name": "Grade 5",
  "assessmentType": "Quarterly",
  "term": "Q1"
}
```

### 2.2 Get Assessment Details

#### GET /api/v1/assessments/{assessment_id}/

Example response:

```json
{
  "id": 501,
  "status": "DRAFT",
  "academicYear": "2026-27",
  "class_name": "Grade 5",
  "assessmentType": "Quarterly",
  "term": "Q1"
}
```

---

### 2.3 Scores

#### GET /api/v1/assessments/{assessment_id}/scores/

Example response:

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
        }
      ],
      "total": 158,
      "percentage": 79
    }
  ]
}
```

#### PUT /api/v1/assessments/{assessment_id}/scores/bulk

Request body:

```json
{
  "students": [
    {
      "studentId": 101,
      "scores": [
        { "subjectId": 1, "obtainedMarks": 82 },
        { "subjectId": 2, "obtainedMarks": 76 }
      ]
    }
  ]
}
```

Example response:

```json
{
  "assessmentId": 501,
  "students": [
    {
      "studentId": 101,
      "scores": [
        { "subjectId": 1, "obtainedMarks": 82 },
        { "subjectId": 2, "obtainedMarks": 76 }
      ],
      "totalMarks": 158,
      "maxMarks": 200,
      "percentage": 79
    }
  ],
  "savedStudents": 1,
  "savedScores": 2,
  "status": "SUCCESS"
}
```

---

### 2.4 Diagnostic Data

#### GET /api/v1/assessments/{assessment_id}/diagnostics/

Example response:

```json
{
  "assessmentId": 501,
  "diagnostics": [
    {
      "studentId": 101,
      "subjectId": 3,
      "subject": "Mathematics",
      "understanding_level": "CLEAR",
      "application_ability": "APPLIES",
      "interest_level": "INTERESTED"
    }
  ]
}
```

#### PUT /api/v1/assessments/{assessment_id}/diagnostics/bulk

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
    }
  ]
}
```

Example response:

```json
{
  "assessmentId": 501,
  "saved": 1,
  "status": "SUCCESS"
}
```

---

### 2.5 Learning Behaviour

#### GET /api/v1/assessments/{assessment_id}/behaviours/

Example response:

```json
{
  "assessmentId": 501,
  "students": [
    {
      "studentId": 101,
      "behaviour": "INDEPENDENT"
    }
  ]
}
```

#### PUT /api/v1/assessments/{assessment_id}/behaviours/bulk

Request body:

```json
{
  "students": [
    { "studentId": 101, "behaviour": "INDEPENDENT" },
    { "studentId": 102, "behaviour": "SUPERVISION" }
  ]
}
```

Example response:

```json
{
  "assessmentId": 501,
  "saved": 2,
  "status": "SUCCESS"
}
```

---

### 2.6 Observation Notes

#### GET /api/v1/assessments/{assessment_id}/observations/

Example response:

```json
{
  "assessmentId": 501,
  "students": [
    {
      "studentId": 101,
      "keyImprovements": "Improved in Mathematics and reading.",
      "subjectsNeedingSupport": "Science",
      "interventionPlan": "Weekly revision"
    }
  ]
}
```

#### GET /api/v1/assessments/{assessment_id}/students/{student_id}/observation

Example response:

```json
{
  "studentId": 101,
  "keyImprovements": "Improved in Mathematics and reading.",
  "subjectsNeedingSupport": "Science",
  "interventionPlan": "Weekly revision"
}
```

#### PUT /api/v1/assessments/{assessment_id}/students/{student_id}/observation

Request body:

```json
{
  "keyImprovements": "Good improvement in Mathematics and Tamil.",
  "subjectsNeedingSupport": "Science and Social Science.",
  "interventionPlan": "Weekly revision and additional worksheets."
}
```

Example response:

```json
{
  "studentId": 101,
  "keyImprovements": "Good improvement in Mathematics and Tamil.",
  "subjectsNeedingSupport": "Science and Social Science.",
  "interventionPlan": "Weekly revision and additional worksheets."
}
```

Validation example:

```json
{
  "error": "subjectsNeedingSupport is required"
}
```

---

### 2.7 Submit and Reopen Assessment

#### POST /api/v1/assessments/{assessment_id}/submit

Example response:

```json
{
  "assessmentId": 501,
  "status": "SUBMITTED",
  "submittedAt": "2026-08-16T13:20:00Z"
}
```

#### POST /api/v1/assessments/{assessment_id}/reopen

Example response:

```json
{
  "assessmentId": 501,
  "status": "DRAFT",
  "message": "Assessment reopened successfully."
}
```

---

### 2.8 Comparison and Analytics

#### GET /api/v1/assessments/{assessment_id}/comparison

Example response:

```json
{
  "current": { "assessment": "Quarterly Q1", "percentage": 82.46 },
  "previous": { "assessment": "Half-Yearly", "percentage": 79.38 },
  "change": { "percentagePoints": 3.08, "trend": "UP" }
}
```

#### GET /api/v1/assessments/{assessment_id}/comparison/subjects

Example response:

```json
[
  {
    "subject": "Tamil",
    "previousPercentage": 80,
    "currentPercentage": 87.86,
    "change": 7.86,
    "trend": "UP"
  }
]
```

#### GET /api/v1/assessments/{assessment_id}/comparison/students

Example response:

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

#### GET /api/v1/students/{student_id}/performance/trends?subjectId=3

Example response:

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

#### GET /api/v1/assessments/{assessment_id}/statistics

Example response:

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

#### GET /api/v1/students/{student_id}/dashboard

Example response:

```json
{
  "student": {
    "id": 101,
    "name": "Rahul Kumar",
    "class": "Grade 5"
  },
  "currentPerformance": { "percentage": 84.6 },
  "previousPerformance": { "percentage": 78.2 },
  "improvement": { "percentage": 6.4, "trend": "UP" },
  "learningBehaviour": "INDEPENDENT",
  "areasNeedingSupport": ["Science"],
  "observation": {
    "keyImprovements": "Good improvement in Mathematics and Tamil.",
    "subjectsNeedingSupport": "Science",
    "interventionPlan": "Weekly revision"
  }
}
```

#### GET /api/v1/assessments/{assessment_id}/details

Example response:

```json
{
  "assessment": {
    "id": 501,
    "status": "DRAFT",
    "academicYear": "2026-27",
    "class_name": "Grade 5",
    "assessmentType": "Quarterly",
    "term": "Q1"
  },
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

---

## 3. Notes

- The app exposes metadata and assessment APIs under `/api/v1`.
- The API uses camelCase for client-facing fields.
- The metadata list endpoints return only active records (`isActive = true`).
- Delete requests use soft delete semantics: the record remains in the database but is hidden from active lists.
- The schema backing these APIs is defined in the assessment migration script and matches the PostgreSQL tables used by the application.
