# VISIONS LEP | STUDENT MODULE GUIDE

## Student Module Guide

This guide explains how to register students, edit their profiles, browse and filter the student list, and read the Student Reports dashboard in Visions LEP. It is written for staff who use the application, with a technical reference at the end.

---

## 1. What the module is for

The Student module has three main pages:

- **List** — Browse, search, and filter all registered students. This is the default Students page.
- **Reports** — Charts and breakdowns of student demographics, socio-economic conditions, education profile, and geography.
- **Registration / Edit form** — An eight-step form used both to register a new student and to update an existing one.

Open **Students** in the left menu, then choose **List** or **Reports**. To register a student, select **Register Student** on the List page. To edit a student, open the student and select **Edit**.

---

## 2. Browsing and filtering students (List)

Open **Students → List**. The page shows all students you are allowed to see.

- Use the **Search by name, ID...** box to find a student.
- Use the **All Regions**, **All Centres**, and **All Classes** dropdowns to narrow the list.

The filter dropdowns list **every region, centre, and class entered in Masters**, not only the ones that already have students. This means you can select a region, centre, or class that has no students yet. When a filter matches no students, the list shows **"No students found matching filters"** — the area is left blank on purpose.

Selecting a different region clears the centre and class selections. Selecting a different centre clears the class selection.

The records shown are scoped to the signed-in user's area. Some users may therefore see fewer regions, centres, or students than others. Selecting a student opens their profile.

---

## 3. Registering a new student

1. Open **Students → List**, then select **Register Student**.
2. Work through the eight steps described below. Select **Next** to move forward and **Back** to return.
3. On the final step, select **Submit** (the button labelled **Register Student** / **Save Student**).
4. Wait for the confirmation and the return to the student list or profile before leaving the page.

The same form is used for editing. When you open an existing student and choose **Edit**, the form is pre-filled with that student's saved details; change what you need and submit. See **Section 5, Editing a student**.

### The eight steps

| Step | Name | What it captures |
|------|------|------------------|
| 1 | Identification | Full name, nickname/call name, gender, date of birth, and the student's photograph. |
| 2 | Education | School name, school type, current class/grade, medium of instruction, school attendance pattern, and previous academic performance. |
| 3 | Family | Father's and mother's name, occupation, and education; guardian, parent phone number, school-going children, family members, and birth order. |
| 4 | Socio-Economic | Caste category, tribal community / sub-caste, religion, monthly household income, housing condition and ownership, and access to electricity, clean water, toilet, and study space. |
| 5 | Vulnerabilities | Vulnerability checkboxes (for example first-generation learner, migrant family), plus a remarks field for "Other". |
| 6 | Motivation | Reasons for joining, grouped by category, and five facilitator narratives. |
| 7 | Aspirations | Career goal, interests, and strengths observed. |
| 8 | Assignment | The region, district, and centre the student is assigned to. |

### Required fields

The form cannot be submitted until these are complete. If any are missing, the form jumps to the first step that needs attention and lists what is missing:

- **Full name**, **date of birth**, and **gender** (Step 1)
- **Student photograph** (Step 1) — required for a new registration; optional when editing a student who already has a photo
- **Current class / grade** (Step 2)
- **All five facilitator narratives** (Step 6)
- **Centre** (Step 8)

Most other fields are optional. Fill in as much as is known; you can complete the rest later by editing the student.

### Dropdown fields

Several fields are dropdown menus rather than free text. The key ones:

| Field | Options |
|-------|---------|
| School Attendance Pattern | Regular, Irregular, Correspondence / Open Schooling, Any Other |
| Father's / Mother's Education | Primary, Middle, High School, Higher Secondary School, Diploma, UG, PG, Above PG |
| Caste Category | Scheduled Tribe (ST), Scheduled Caste (SC), Most Backward Class (MBC), Backward Class (BC), Other Backward Class (OBC), General / Other, Prefer Not to Disclose |
| Religion | Hinduism, Christianity, Islam, Buddhism, Jainism, Sikhism, Other Religion, Atheist / No Religion, Prefer Not to Disclose |
| Housing Condition | Permanent House – Concrete Roof, Permanent House – Tiled Roof, Thatched House, Metal Sheet Roof, Asbestos Sheet Roof, Other |
| Housing Ownership | Own House, Rented House, Leased House, Other |
| Tribal Community / Sub-Caste | A configurable list managed under Masters (see Section 6). |

**Tribal Community / Sub-Caste is optional.** Leave it empty for students who do not belong to a tribal community. Only students you tag are counted in the Tribal Communities report.

---

## 4. Reading a student profile

Selecting a student from the List opens their profile. The **Overview** tab shows the complete registration details grouped into sections: Identification, Educational Context, Family Structure, Socio-Economic Conditions, Vulnerability Assessment, Motivation for Joining, Aspirations & Interests, and Location Tagging. Whatever was entered in the form is shown here.

Other tabs show the student's attendance history and latest assessment scores. From the profile you can **Edit** the student or **Delete** them. Deleting a student also removes their attendance records, so treat delete as permanent.

---

## 5. Editing a student

1. Open the student's profile and select **Edit** (or open the student and go to the edit page).
2. The same eight-step form opens, pre-filled with the saved details.
3. Update any field and submit.

Notes for editing:

- The **photograph** is not required when editing if the student already has one — the existing photo is kept unless you choose a new one.
- Dropdown fields behave exactly as in registration, so you can update the tribal community, caste category, and so on at any time.
- Changes are saved to the same student record; a second student is not created.

---

## 6. Masters that feed the student module

Some student dropdowns are **configurable** so programme teams can adapt them to their locations. These are managed under **Masters** in the left menu by a Super Admin.

- **Regions, Districts, Centres** — define where students can be assigned. The Students → List filters and the registration Assignment step use these.
- **Tribal Communities** — define the names shown in the registration Tribal Community / Sub-Caste dropdown.

### Adding a tribal community

1. Open **Masters → Tribal Communities**.
2. Select **Add Community**, enter the community or sub-caste name, and save.
3. The name now appears in the registration and edit dropdown.

Add the communities **before** opening the registration form — the dropdown loads the list when the form opens, so a community added while the form is already open appears only after the form is refreshed. Searching and editing existing communities works from the same Masters page.

You do **not** need to assign a tribal community to every student. Only tag the students it applies to.

---

## 7. Student Reports dashboard

Open **Students → Reports**. The page shows charts for the students you are allowed to see, with **All Regions** and **All Centres** filters at the top to narrow the report to a region or centre.

The charts are grouped into collapsible sections. Select a section heading to open it and see its charts; select it again to close it. This keeps the page compact — only the section you are reading needs to be open.

| Section | Charts |
|---------|--------|
| **Demographics** | Tribal Communities / Sub-Castes, Caste Category, Religion, Gender, Top Vulnerabilities |
| **Socio-Economic Conditions** | Housing Condition, Housing Ownership, Monthly Household Income, and access to Electricity, Clean Water, Toilet, and Study Space |
| **Education Profile** | School Attendance Pattern, School Type, Medium of Instruction, Father's Education, Mother's Education |
| **Geography** | Students by Region, by District, and by Centre |

Only categories with at least one student are drawn. A chart with no matching data shows **"No data recorded yet."** Charts count only the fields actually filled in — for example, students with no tribal community assigned are not counted in the Tribal Communities chart.

---

## 8. Helpful checks and common problems

- **A region/centre/class is missing from a filter:** the filters show every value in Masters, so if one is missing it has not been entered under Masters yet. Add it under the relevant Masters page.
- **A filter shows no students:** that region/centre/class has no students assigned yet. The blank "No students found" result is expected.
- **Submit is blocked on registration:** complete the required fields — full name, date of birth, gender, photograph, current class, all five facilitator narratives, and centre. The form jumps to the step that needs attention.
- **A newly added tribal community is not in the dropdown:** refresh the registration/edit form so it reloads the Masters list.
- **Saving an edit fails with a permission or CSRF error:** make sure you are signed in; the application sends your login token with the save. Sign out and back in if the problem persists.
- **Sensitive information:** the free-text notes (concerns, narratives, vulnerability remarks) are stored on the student record. Avoid entering sensitive personal details unless they are necessary for the student's support.

---

## 9. Data captured

Each student has one profile record linked to a centre (and through it, a district and region). The profile stores identification, education, family, socio-economic, vulnerability, motivation, and aspiration details, plus a photograph. A student also has a class record per academic year, used when the student is promoted.

Editing a student updates the same profile rather than creating a new one. Deleting a student removes their profile and attendance records. The dropdown values (caste category, religion, housing, and so on) are stored as text, so values chosen from the menus appear the same way on the profile and in reports.

---

## 10. Technical reference

The frontend pages are `StudentsList.tsx` (./frontend/visions-platform/src/pages/students/StudentsList.tsx), `StudentRegistration.tsx` (./frontend/visions-platform/src/pages/students/StudentRegistration.tsx), `StudentProfile.tsx` (./frontend/visions-platform/src/pages/students/StudentProfile.tsx), and `StudentReports.tsx` (./frontend/visions-platform/src/pages/students/StudentReports.tsx). The Tribal Communities master page is `TribalCommunitiesList.tsx` (./frontend/visions-platform/src/pages/masters/TribalCommunitiesList.tsx).

Student data is defined in the student, family, socio-economic, vulnerability, motivation, and aspiration models under ./backend/django-backend/school/models/. The configurable tribal community list is the `TribalCommunity` model (./backend/django-backend/school/models/tribal_community.py). Request handling is in the student views (./backend/django-backend/school/views/student.py), the student serializer (./backend/django-backend/school/serializers/student.py), the masters views (./backend/django-backend/school/views/master.py), and the reports/dashboard views (./backend/django-backend/school/views/dashboard.py).

The following paths include the /api prefix used by the backend tests. A deployment may use a different API base URL.

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/students/ | List students. Supports centreId, classGrade, gender, and academic-year filters. |
| POST | /api/students/ | Register a new student (multipart form, includes the photograph). |
| GET | /api/students/{id}/ | Load one student's full profile. |
| PATCH | /api/students/{id}/ | Update a student's details. |
| DELETE | /api/students/{id}/ | Delete a student and their attendance records. |
| GET | /api/students/{id}/summary/ | Attendance and assessment summary for the profile page. |
| GET | /api/students/export/ | Download the student workbook (xlsx) template/data. |
| POST | /api/students/bulk-upload/ | Bulk-register students from an xlsx workbook. |
| GET, POST | /api/masters/tribal-communities/ | List or add tribal community / sub-caste names. |
| PATCH, DELETE | /api/masters/tribal-communities/{id}/ | Edit or remove a tribal community. |
| GET | /api/masters/regions/ , /api/masters/districts/ , /api/masters/centres/ | Master lists used by the student filters and assignment step. |
| GET | /api/dashboard/student-report/ | Aggregated student breakdowns for the Reports page. Supports region_id and centre_id filters. |

Registering and updating a student save the profile, family, socio-economic, vulnerability, motivation, and aspiration records together in one transaction: invalid data prevents the record from being partially saved. The Masters lists and the student report are scoped by the signed-in user's area, so different users may see different totals.

---

*Visions LEP • Staff Reference*
