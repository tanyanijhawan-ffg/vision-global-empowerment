-- Clean PostgreSQL migration script for assessment metadata tables
-- Safe for local/dev/prod setup when rebuilding the schema

BEGIN;

-- 1. Assessment metadata tables
CREATE TABLE IF NOT EXISTS assessment_type (
    assessment_type_id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    duration_months INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS subject (
    subject_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    class_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS diagnostic_option (
    diagnostic_option_id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (category, code)
);

CREATE TABLE IF NOT EXISTS learning_behaviour_option (
    behaviour_option_id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. Assessment core tables
CREATE TABLE IF NOT EXISTS assessment (
    assessment_id SERIAL PRIMARY KEY,
    academic_year_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL DEFAULT 1,
    assessment_type_id INTEGER NOT NULL REFERENCES assessment_type(assessment_type_id) ON DELETE CASCADE,
    term VARCHAR(20) NOT NULL,
    assessment_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_score (
    score_id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL REFERENCES subject(subject_id) ON DELETE CASCADE,
    obtained_marks NUMERIC(6,2) NOT NULL DEFAULT 0,
    max_marks NUMERIC(6,2) NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS assessment_diagnostic (
    diagnostic_id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL REFERENCES subject(subject_id) ON DELETE CASCADE,
    understanding_level VARCHAR(50),
    application_ability VARCHAR(50),
    interest_level VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS student_learning_behaviour (
    behaviour_id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    behaviour_option_id INTEGER NOT NULL REFERENCES learning_behaviour_option(behaviour_option_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_observation (
    observation_id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    key_improvements TEXT,
    subjects_needing_support TEXT,
    intervention_plan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, student_id)
);

CREATE TABLE IF NOT EXISTS assessment_submission (
    submission_id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL UNIQUE REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_by VARCHAR(100)
);

-- 3. Seed default metadata
INSERT INTO assessment_type (code, name, duration_months, is_active)
VALUES
    ('QUARTERLY', 'Quarterly', 3, TRUE),
    ('HALF_YEARLY', 'Half-Yearly', 6, TRUE),
    ('ANNUAL', 'Annual', 12, TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    duration_months = EXCLUDED.duration_months,
    is_active = EXCLUDED.is_active;

INSERT INTO subject (name, code, class_id, is_active)
VALUES
    ('Tamil', 'TAMIL', 5, TRUE),
    ('English', 'ENGLISH', 5, TRUE),
    ('Mathematics', 'MATHEMATICS', 5, TRUE),
    ('Science', 'SCIENCE', 5, TRUE),
    ('Social Science', 'SOCIAL_SCIENCE', 5, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO diagnostic_option (category, code, name, sort_order)
VALUES
    ('understanding_level', 'CLEAR', 'Understands clearly', 1),
    ('understanding_level', 'REPETITION', 'Needs repetition', 2),
    ('understanding_level', 'NOT_UNDERSTAND', 'Does not understand', 3),
    ('application_ability', 'APPLIES', 'Applies concepts', 1),
    ('application_ability', 'MEMORISES', 'Memorises only', 2),
    ('application_ability', 'CANNOT_APPLY', 'Cannot apply', 3),
    ('interest_level', 'INTERESTED', 'Interested', 1),
    ('interest_level', 'NEUTRAL', 'Neutral', 2),
    ('interest_level', 'DISINTERESTED', 'Disinterested', 3)
ON CONFLICT (category, code) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

INSERT INTO learning_behaviour_option (code, name, is_active)
VALUES
    ('INDEPENDENT', 'Independent', TRUE),
    ('SUPERVISION', 'Needs supervision', TRUE),
    ('MOTIVATED', 'Motivated', TRUE),
    ('NEEDS_SUPPORT', 'Needs support', TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

COMMIT;
