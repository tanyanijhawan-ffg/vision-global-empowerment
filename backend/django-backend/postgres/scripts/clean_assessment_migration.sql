-- ============================================================
-- Assessment Management Schema
-- PostgreSQL
--
-- Supports:
--   Academic Year
--   Class
--   Subjects
--   Assessment Types
--   Assessment Subject Configuration
--   Actual Assessments
--   Scores
--   Diagnostics
--   Learning Behaviour
--   Student Observations
--   Assessment Submission
--
-- Design:
--
-- MASTER / CONFIGURATION
--
-- academic_year
--      |
--      +---- class
--               |
--               +---- subject
--               |
--               +---- assessment_subject
--                          |
--                          +---- assessment_type
--
-- ACTUAL ASSESSMENT
--
-- assessment
--      |
--      +---- assessment_score
--      |
--      +---- assessment_diagnostic
--      |
--      +---- student_learning_behaviour
--      |
--      +---- student_observation
--      |
--      +---- assessment_submission
--
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ACADEMIC YEAR
-- ============================================================

CREATE TABLE IF NOT EXISTS academic_year (
    academic_year_id SERIAL PRIMARY KEY,

    name VARCHAR(20) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_academic_year_dates
        CHECK (end_date > start_date)
);


-- ============================================================
-- 2. CLASS
-- ============================================================

CREATE TABLE IF NOT EXISTS class (
    class_id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_class_name
        UNIQUE (name),

    CONSTRAINT uq_class_code
        UNIQUE (code)
);


-- ============================================================
-- 3. ASSESSMENT TYPE
--
-- Reusable master data.
--
-- Examples:
--   Quarterly
--   Half-Yearly
--   Annual
--
-- This table is NOT academic-year specific.
-- ============================================================

CREATE TABLE IF NOT EXISTS assessment_type (
    assessment_type_id SERIAL PRIMARY KEY,

    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,

    duration_months INTEGER NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_assessment_duration
        CHECK (duration_months >= 0)
);


-- ============================================================
-- 5. SUBJECT
--
-- Subject belongs to a class.
--
-- Example:
--   Grade 5 -> Tamil
--   Grade 5 -> English
--   Grade 5 -> Mathematics
-- ============================================================

CREATE TABLE IF NOT EXISTS subject (
    subject_id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),

    class_id INTEGER NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_subject_class
        FOREIGN KEY (class_id)
        REFERENCES class(class_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_subject_class_name
        UNIQUE (class_id, name),

    CONSTRAINT uq_subject_class_code
        UNIQUE (class_id, code)
);


-- ============================================================
-- 6. ASSESSMENT SUBJECT
--
-- This is the configuration table.
--
-- Answers:
--
-- "For this academic year + class + assessment type,
--  which subjects need to be assessed?"
--
-- Example:
--
-- 2026-27 + Grade 5 + Quarterly
--     -> Tamil
--     -> English
--     -> Mathematics
--     -> Science
--     -> Social Science
-- ============================================================

CREATE TABLE IF NOT EXISTS assessment_subject (
    assessment_subject_id SERIAL PRIMARY KEY,

    academic_year_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    assessment_type_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    max_marks NUMERIC(6,2) NOT NULL DEFAULT 100,

    CONSTRAINT fk_assessment_subject_year
        FOREIGN KEY (academic_year_id)
        REFERENCES academic_year(academic_year_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assessment_subject_class
        FOREIGN KEY (class_id)
        REFERENCES class(class_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assessment_subject_type
        FOREIGN KEY (assessment_type_id)
        REFERENCES assessment_type(assessment_type_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assessment_subject_subject
        FOREIGN KEY (subject_id)
        REFERENCES subject(subject_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_assessment_subject_mapping
        UNIQUE (
            academic_year_id,
            class_id,
            assessment_type_id,
            subject_id
        )
);


-- ============================================================
-- 7. DIAGNOSTIC OPTION
--
-- Master data for:
--   Understanding
--   Application
--   Interest
-- ============================================================

CREATE TABLE IF NOT EXISTS diagnostic_option (
    diagnostic_option_id SERIAL PRIMARY KEY,

    category VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,

    sort_order INTEGER NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_diagnostic_category_code
        UNIQUE (category, code),

    CONSTRAINT chk_diagnostic_sort_order
        CHECK (sort_order >= 0)
);


-- ============================================================
-- 8. LEARNING BEHAVIOUR OPTION
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_behaviour_option (
    behaviour_option_id SERIAL PRIMARY KEY,

    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 9. ASSESSMENT
--
-- Represents the ACTUAL assessment event.
--
-- Example:
--
-- Assessment #101
-- Academic Year: 2026-27
-- Class: Grade 5
-- Section: A
-- Assessment Type: Quarterly
-- Date: 2026-07-15
-- Status: DRAFT
--
-- The subjects for this assessment come from
-- assessment_subject configuration.
-- ============================================================

CREATE TABLE IF NOT EXISTS assessment (
    assessment_id SERIAL PRIMARY KEY,

    academic_year_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    assessment_type_id INTEGER NOT NULL,

    assessment_date DATE,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_assessment_year
        FOREIGN KEY (academic_year_id)
        REFERENCES academic_year(academic_year_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assessment_class
        FOREIGN KEY (class_id)
        REFERENCES class(class_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assessment_type
        FOREIGN KEY (assessment_type_id)
        REFERENCES assessment_type(assessment_type_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_assessment_status
        CHECK (
            status IN (
                'DRAFT',
                'OPEN',
                'SUBMITTED',
                'COMPLETED',
                'CANCELLED'
            )
        ),

    CONSTRAINT uq_assessment_instance
        UNIQUE (
            academic_year_id,
            class_id,
            assessment_type_id
        )
);


-- ============================================================
-- 10. ASSESSMENT SCORE
--
-- Stores marks for each student and subject.
-- ============================================================

CREATE TABLE IF NOT EXISTS assessment_score (
    score_id SERIAL PRIMARY KEY,

    assessment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,

    obtained_marks NUMERIC(6,2) NOT NULL DEFAULT 0,
    max_marks NUMERIC(6,2) NOT NULL DEFAULT 100,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_score_assessment
        FOREIGN KEY (assessment_id)
        REFERENCES assessment(assessment_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_score_subject
        FOREIGN KEY (subject_id)
        REFERENCES subject(subject_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_score_marks
        CHECK (
            obtained_marks >= 0
            AND max_marks > 0
            AND obtained_marks <= max_marks
        ),

    CONSTRAINT uq_assessment_student_subject
        UNIQUE (
            assessment_id,
            student_id,
            subject_id
        )
);


-- ============================================================
-- 11. ASSESSMENT DIAGNOSTIC
--
-- Stores diagnostic information for a student + subject
-- within an assessment.
--
-- Example:
--   Understanding: CLEAR
--   Application: APPLIES
--   Interest: INTERESTED
-- ============================================================

CREATE TABLE IF NOT EXISTS assessment_diagnostic (
    diagnostic_id SERIAL PRIMARY KEY,

    assessment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,

    understanding_option_id INTEGER,
    application_option_id INTEGER,
    interest_option_id INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_diagnostic_assessment
        FOREIGN KEY (assessment_id)
        REFERENCES assessment(assessment_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_diagnostic_subject
        FOREIGN KEY (subject_id)
        REFERENCES subject(subject_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_diagnostic_understanding
        FOREIGN KEY (understanding_option_id)
        REFERENCES diagnostic_option(diagnostic_option_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_diagnostic_application
        FOREIGN KEY (application_option_id)
        REFERENCES diagnostic_option(diagnostic_option_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_diagnostic_interest
        FOREIGN KEY (interest_option_id)
        REFERENCES diagnostic_option(diagnostic_option_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_assessment_diagnostic
        UNIQUE (
            assessment_id,
            student_id,
            subject_id
        )
);


-- ============================================================
-- 12. STUDENT LEARNING BEHAVIOUR
--
-- One behaviour assessment per student per assessment.
-- ============================================================

CREATE TABLE IF NOT EXISTS student_learning_behaviour (
    behaviour_id SERIAL PRIMARY KEY,

    assessment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    behaviour_option_id INTEGER NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_behaviour_assessment
        FOREIGN KEY (assessment_id)
        REFERENCES assessment(assessment_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_behaviour_option
        FOREIGN KEY (behaviour_option_id)
        REFERENCES learning_behaviour_option(behaviour_option_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_student_assessment_behaviour
        UNIQUE (
            assessment_id,
            student_id
        )
);


-- ============================================================
-- 13. STUDENT OBSERVATION
--
-- Overall observation for a student for an assessment.
-- ============================================================

CREATE TABLE IF NOT EXISTS student_observation (
    observation_id SERIAL PRIMARY KEY,

    assessment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,

    key_improvements TEXT,
    subjects_needing_support TEXT,
    intervention_plan TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_observation_assessment
        FOREIGN KEY (assessment_id)
        REFERENCES assessment(assessment_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_student_assessment_observation
        UNIQUE (
            assessment_id,
            student_id
        )
);


-- ============================================================
-- 14. ASSESSMENT SUBMISSION
--
-- One submission record per assessment.
-- ============================================================

CREATE TABLE IF NOT EXISTS assessment_submission (
    submission_id SERIAL PRIMARY KEY,

    assessment_id INTEGER NOT NULL UNIQUE,

    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_by VARCHAR(100),

    CONSTRAINT fk_submission_assessment
        FOREIGN KEY (assessment_id)
        REFERENCES assessment(assessment_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 15. SEED ASSESSMENT TYPES
-- ============================================================

INSERT INTO assessment_type (
    code,
    name,
    duration_months,
    is_active
)
VALUES
    ('QUARTERLY', 'Quarterly', 3, TRUE),
    ('HALF_YEARLY', 'Half-Yearly', 6, TRUE),
    ('ANNUAL', 'Annual', 12, TRUE)

ON CONFLICT (code)
DO UPDATE SET
    name = EXCLUDED.name,
    duration_months = EXCLUDED.duration_months,
    is_active = EXCLUDED.is_active;


-- ============================================================
-- 16. SEED DIAGNOSTIC OPTIONS
-- ============================================================

INSERT INTO diagnostic_option (
    category,
    code,
    name,
    sort_order,
    is_active
)
VALUES

    -- Understanding
    ('understanding_level',
     'CLEAR',
     'Understands clearly',
     1,
     TRUE),

    ('understanding_level',
     'REPETITION',
     'Needs repetition',
     2,
     TRUE),

    ('understanding_level',
     'NOT_UNDERSTAND',
     'Does not understand',
     3,
     TRUE),

    -- Application
    ('application_ability',
     'APPLIES',
     'Applies concepts',
     1,
     TRUE),

    ('application_ability',
     'MEMORISES',
     'Memorises only',
     2,
     TRUE),

    ('application_ability',
     'CANNOT_APPLY',
     'Cannot apply',
     3,
     TRUE),

    -- Interest
    ('interest_level',
     'INTERESTED',
     'Interested',
     1,
     TRUE),

    ('interest_level',
     'NEUTRAL',
     'Neutral',
     2,
     TRUE),

    ('interest_level',
     'DISINTERESTED',
     'Disinterested',
     3,
     TRUE)

ON CONFLICT (category, code)
DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;


-- ============================================================
-- 17. SEED LEARNING BEHAVIOUR OPTIONS
-- ============================================================

INSERT INTO learning_behaviour_option (
    code,
    name,
    is_active
)
VALUES
    ('INDEPENDENT', 'Independent', TRUE),
    ('SUPERVISION', 'Needs supervision', TRUE),
    ('MOTIVATED', 'Highly motivated', TRUE),
    ('IRREGULAR', 'Irregular', TRUE)

ON CONFLICT (code)
DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;


COMMIT;