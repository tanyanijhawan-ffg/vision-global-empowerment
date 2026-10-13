-- =====================================================
-- DATABASE: Student Monitoring System
-- PostgreSQL DDL Script
-- =====================================================

CREATE SCHEMA IF NOT EXISTS student_monitoring;

SET search_path TO student_monitoring;

-- PROGRAM
CREATE TABLE program (
    program_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    program_name VARCHAR(100) NOT NULL,
    status VARCHAR(20)
);

-- REGION
CREATE TABLE region (
    region_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    program_id INTEGER NOT NULL,
    region_name VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    status VARCHAR(20),

    CONSTRAINT fk_region_program
        FOREIGN KEY (program_id)
        REFERENCES program(program_id)
);

-- DISTRICT
CREATE TABLE district (
    district_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    region_id INTEGER NOT NULL,
    district_name VARCHAR(100) NOT NULL,

    CONSTRAINT fk_district_region
        FOREIGN KEY (region_id)
        REFERENCES region(region_id)
);

-- CENTRE
CREATE TABLE centre (
    centre_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    district_id INTEGER NOT NULL,
    region_id INTEGER NOT NULL,

    centre_name VARCHAR(150) NOT NULL,
    centre_type VARCHAR(50),
    block VARCHAR(100),
    village VARCHAR(100),
    gps_location VARCHAR(255),
    facilitator_name VARCHAR(100),
    start_date DATE,
    status VARCHAR(20),

    CONSTRAINT fk_centre_district
        FOREIGN KEY (district_id)
        REFERENCES district(district_id),

    CONSTRAINT fk_centre_region
        FOREIGN KEY (region_id)
        REFERENCES region(region_id)
);

-- STUDENT
CREATE TABLE student (
    student_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    centre_id INTEGER NOT NULL,

    full_name VARCHAR(150) NOT NULL,
    nick_name VARCHAR(100),
    gender VARCHAR(20),
    dob DATE,
    age INTEGER,
    photo VARCHAR(255),

    school_name VARCHAR(150),
    school_type VARCHAR(50),
    class_grade VARCHAR(30),
    medium_of_instruction VARCHAR(50),

    attendance_pattern VARCHAR(100),
    previous_academic_performance VARCHAR(100),

    CONSTRAINT fk_student_centre
        FOREIGN KEY (centre_id)
        REFERENCES centre(centre_id)
);

-- FAMILY
CREATE TABLE family (
    family_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL,

    father_name VARCHAR(100),
    mother_name VARCHAR(100),
    guardian VARCHAR(100),
    parent_phone VARCHAR(20),

    father_occupation VARCHAR(100),
    mother_occupation VARCHAR(100),

    father_education VARCHAR(100),
    mother_education VARCHAR(100),

    family_members INTEGER,
    school_going_children INTEGER,
    birth_order INTEGER,

    CONSTRAINT fk_family_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON DELETE CASCADE
);

-- SOCIO ECONOMIC
CREATE TABLE socio_economic (
    socio_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL,

    caste_category VARCHAR(50),
    tribe_name VARCHAR(100),
    religion VARCHAR(100),
    income_range VARCHAR(50),
    house_type VARCHAR(100),
    ownership VARCHAR(100),

    drinking_water BOOLEAN,
    toilet BOOLEAN,
    electricity BOOLEAN,
    study_space BOOLEAN,

    CONSTRAINT fk_socio_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON DELETE CASCADE
);

-- VULNERABILITY MASTER
CREATE TABLE vulnerability_master (
    vulnerability_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vulnerability_name VARCHAR(100) NOT NULL
);

-- STUDENT VULNERABILITY
CREATE TABLE student_vulnerability (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL,
    vulnerability_id INTEGER NOT NULL,
    remarks TEXT,

    CONSTRAINT fk_sv_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_sv_vulnerability
        FOREIGN KEY (vulnerability_id)
        REFERENCES vulnerability_master(vulnerability_id)
);

-- MOTIVATION
CREATE TABLE motivation (
    motivation_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL,

    category VARCHAR(100),
    reason TEXT,
    narrative TEXT,

    CONSTRAINT fk_motivation_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON DELETE CASCADE
);

-- ASPIRATION
CREATE TABLE aspiration (
    aspiration_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL,

    career_goal VARCHAR(255),
    interests TEXT,
    strengths TEXT,

    CONSTRAINT fk_aspiration_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON DELETE CASCADE
);

-- ATTENDANCE
CREATE TABLE attendance (
    attendance_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL,

    attendance_date DATE NOT NULL,
    status VARCHAR(20),

    time_in TIME,
    time_out TIME,

    absence_reason TEXT,
    participation_level VARCHAR(100),
    attention_level VARCHAR(100),
    behaviour VARCHAR(100),
    tutor_observation TEXT,

    CONSTRAINT fk_attendance_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON DELETE CASCADE
);

-- LEARNING BEHAVIOUR
CREATE TABLE learning_behaviour (
    behaviour_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    attendance_id INTEGER NOT NULL,

    homework_completed BOOLEAN,
    classwork_completed BOOLEAN,
    asked_questions BOOLEAN,
    helped_others BOOLEAN,

    CONSTRAINT fk_learning_behaviour_attendance
        FOREIGN KEY (attendance_id)
        REFERENCES attendance(attendance_id)
        ON DELETE CASCADE
);

-- ACADEMIC ASSESSMENT
CREATE TABLE academic_assessment (
    assessment_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL,

    assessment_type VARCHAR(100),
    assessment_date DATE,

    total NUMERIC(5,2),
    percentage NUMERIC(5,2),

    learning_behaviour VARCHAR(100),
    narrative TEXT,
    intervention_plan TEXT,

    CONSTRAINT fk_assessment_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON DELETE CASCADE
);

-- SUBJECT SCORE
CREATE TABLE subject_score (
    subject_score_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assessment_id INTEGER NOT NULL,

    subject_name VARCHAR(100),
    marks NUMERIC(5,2),

    understanding_level VARCHAR(100),
    application_ability VARCHAR(100),

    CONSTRAINT fk_subject_score_assessment
        FOREIGN KEY (assessment_id)
        REFERENCES academic_assessment(assessment_id)
        ON DELETE CASCADE
);

-- INDEXES
CREATE INDEX idx_region_program ON region(program_id);
CREATE INDEX idx_district_region ON district(region_id);
CREATE INDEX idx_centre_district ON centre(district_id);
CREATE INDEX idx_student_centre ON student(centre_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_assessment_student ON academic_assessment(student_id);
CREATE INDEX idx_subject_assessment ON subject_score(assessment_id);
CREATE INDEX idx_student_vulnerability_student ON student_vulnerability(student_id);
CREATE INDEX idx_student_vulnerability_vulnerability ON student_vulnerability(vulnerability_id);
