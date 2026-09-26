BEGIN;

-- Assessment metadata
INSERT INTO assessment_type (code, name, duration_months, is_active)
VALUES
  ('QUARTERLY', 'Quarterly', 3, TRUE),
  ('HALF_YEARLY', 'Half-Yearly', 6, TRUE),
  ('ANNUAL', 'Annual', 12, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  duration_months = EXCLUDED.duration_months,
  is_active = EXCLUDED.is_active;


-- Subjects for Classes 4, 5 and 6
INSERT INTO subject (name, code, class_id, is_active)
SELECT seed.name, seed.code, seed.class_id, TRUE
FROM (VALUES

  -- Class 4
  ('Tamil', 'TAMIL', 4),
  ('English', 'ENGLISH', 4),
  ('Mathematics', 'MATHEMATICS', 4),
  ('Science', 'SCIENCE', 4),
  ('Social Science', 'SOCIAL_SCIENCE', 4),

  -- Class 5
  ('Tamil', 'TAMIL', 5),
  ('English', 'ENGLISH', 5),
  ('Mathematics', 'MATHEMATICS', 5),
  ('Science', 'SCIENCE', 5),
  ('Social Science', 'SOCIAL_SCIENCE', 5),

  -- Class 6
  ('Tamil', 'TAMIL', 6),
  ('English', 'ENGLISH', 6),
  ('Mathematics', 'MATHEMATICS', 6),
  ('Science', 'SCIENCE', 6),
  ('Social Science', 'SOCIAL_SCIENCE', 6)

) AS seed(name, code, class_id)
WHERE NOT EXISTS (
  SELECT 1
  FROM subject current_subject
  WHERE current_subject.name = seed.name
    AND current_subject.class_id = seed.class_id
);

UPDATE subject AS current_subject
SET code = seed.code, is_active = TRUE
FROM (VALUES

  ('Tamil', 'TAMIL', 4),
  ('English', 'ENGLISH', 4),
  ('Mathematics', 'MATHEMATICS', 4),
  ('Science', 'SCIENCE', 4),
  ('Social Science', 'SOCIAL_SCIENCE', 4),

  ('Tamil', 'TAMIL', 5),
  ('English', 'ENGLISH', 5),
  ('Mathematics', 'MATHEMATICS', 5),
  ('Science', 'SCIENCE', 5),
  ('Social Science', 'SOCIAL_SCIENCE', 5),

  ('Tamil', 'TAMIL', 6),
  ('English', 'ENGLISH', 6),
  ('Mathematics', 'MATHEMATICS', 6),
  ('Science', 'SCIENCE', 6),
  ('Social Science', 'SOCIAL_SCIENCE', 6)

) AS seed(name, code, class_id)
WHERE current_subject.name = seed.name
  AND current_subject.class_id = seed.class_id;


-- Diagnostic options
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


-- Learning behaviour options
INSERT INTO learning_behaviour_option (code, name, is_active)
VALUES
  ('INDEPENDENT', 'Independent', TRUE),
  ('SUPERVISION', 'Needs supervision', TRUE),
  ('MOTIVATED', 'Motivated', TRUE),
  ('NEEDS_SUPPORT', 'Needs support', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;


-- Centre hierarchy required by the student API
INSERT INTO program (program_name, status)
SELECT 'Vision Global Empowerment', 'Active'
WHERE NOT EXISTS (
  SELECT 1
  FROM program
  WHERE program_name = 'Vision Global Empowerment'
);


INSERT INTO region (program_id, region_name, state, status)
SELECT p.program_id, 'Tamil Nadu South', 'Tamil Nadu', 'Active'
FROM program p
WHERE p.program_name = 'Vision Global Empowerment'
  AND NOT EXISTS (
    SELECT 1
    FROM region
    WHERE region_name = 'Tamil Nadu South'
  );


INSERT INTO district (region_id, district_name)
SELECT r.region_id, 'Madurai'
FROM region r
WHERE r.region_name = 'Tamil Nadu South'
  AND NOT EXISTS (
    SELECT 1
    FROM district
    WHERE district_name = 'Madurai'
  );


INSERT INTO centre (
  district_id,
  region_id,
  centre_name,
  centre_type,
  village,
  facilitator_name,
  start_date,
  status
)
SELECT
  d.district_id,
  r.region_id,
  'Madurai Academic Centre',
  'Urban',
  'Tallakulam',
  'Meera Nair',
  DATE '2024-01-15',
  'Active'
FROM region r
JOIN district d
  ON d.region_id = r.region_id
 AND d.district_name = 'Madurai'
WHERE r.region_name = 'Tamil Nadu South'
  AND NOT EXISTS (
    SELECT 1
    FROM centre
    WHERE centre_name = 'Madurai Academic Centre'
  );


-- ============================================================
-- STUDENTS
-- ============================================================

INSERT INTO student (
  centre_id,
  full_name,
  nick_name,
  gender,
  dob,
  age,
  school_name,
  school_type,
  class_grade,
  medium_of_instruction
)
SELECT
  c.centre_id,
  seed.full_name,
  seed.nick_name,
  seed.gender,
  seed.dob,
  seed.age,
  seed.school_name,
  'Government',
  seed.class_grade,
  'English'
FROM centre c
CROSS JOIN (
  VALUES

    -- =========================
    -- Class 4
    -- =========================

    (
      'Lakshmi Priya',
      'Lakshmi',
      'F',
      DATE '2015-02-14',
      11,
      'Government Primary School',
      '4'
    ),

    (
      'Rahul Kumar',
      'Rahul',
      'M',
      DATE '2015-07-21',
      11,
      'Government Primary School',
      '4'
    ),

    (
      'Divya Suresh',
      'Divya',
      'F',
      DATE '2015-10-09',
      10,
      'Government Primary School',
      '4'
    ),

    (
      'Aravind Raj',
      'Aravind',
      'M',
      DATE '2015-12-03',
      10,
      'Government Primary School',
      '4'
    ),


    -- =========================
    -- Class 5
    -- Existing students
    -- =========================

    (
      'Anitha Devi',
      'Anitha',
      'F',
      DATE '2014-03-12',
      12,
      'Government Middle School',
      '5'
    ),

    (
      'Karthik Selvam',
      'Karthik',
      'M',
      DATE '2013-08-20',
      13,
      'Government Middle School',
      '5'
    ),

    (
      'Meenakshi Sundaram',
      'Meenakshi',
      'F',
      DATE '2014-11-05',
      11,
      'Government Middle School',
      '5'
    ),

    (
      'Vignesh Pandian',
      'Vignesh',
      'M',
      DATE '2013-06-18',
      13,
      'Government Middle School',
      '5'
    ),


    -- =========================
    -- Class 6
    -- =========================

    (
      'Naveen Kumar',
      'Naveen',
      'M',
      DATE '2013-04-17',
      13,
      'Government Higher Secondary School',
      '6'
    ),

    (
      'Harini Devi',
      'Harini',
      'F',
      DATE '2013-09-28',
      12,
      'Government Higher Secondary School',
      '6'
    ),

    (
      'Sanjay Raj',
      'Sanjay',
      'M',
      DATE '2013-11-11',
      12,
      'Government Higher Secondary School',
      '6'
    ),

    (
      'Pavithra M',
      'Pavithra',
      'F',
      DATE '2013-06-05',
      13,
      'Government Higher Secondary School',
      '6'
    )

) AS seed(
  full_name,
  nick_name,
  gender,
  dob,
  age,
  school_name,
  class_grade
)
WHERE c.centre_name = 'Madurai Academic Centre'
  AND NOT EXISTS (
    SELECT 1
    FROM student existing
    WHERE existing.centre_id = c.centre_id
      AND existing.full_name = seed.full_name
  );


-- ============================================================
-- Existing Class 5 assessment
-- ============================================================

DO $$
DECLARE
  assessment_type_key INTEGER;
  assessment_key INTEGER;
  student_key INTEGER;
  subject_key INTEGER;
  score_value NUMERIC;
BEGIN

  SELECT assessment_type_id
  INTO assessment_type_key
  FROM assessment_type
  WHERE code = 'QUARTERLY';


  SELECT assessment_id
  INTO assessment_key
  FROM assessment
  WHERE academic_year_id = 2026
    AND class_id = 5
    AND assessment_type_id = assessment_type_key
    AND term = 'Q1'
    AND assessment_date = DATE '2026-07-15'
  ORDER BY assessment_id DESC
  LIMIT 1;


  IF assessment_key IS NULL THEN

    INSERT INTO assessment (
      academic_year_id,
      class_id,
      assessment_type_id,
      term,
      assessment_date,
      status
    )
    VALUES (
      2026,
      5,
      assessment_type_key,
      'Q1',
      DATE '2026-07-15',
      'DRAFT'
    )
    RETURNING assessment_id
    INTO assessment_key;

  ELSE

    UPDATE assessment
    SET
      status = 'DRAFT',
      updated_at = NOW()
    WHERE assessment_id = assessment_key;

  END IF;


  DELETE FROM assessment_score
  WHERE assessment_id = assessment_key;

  DELETE FROM assessment_diagnostic
  WHERE assessment_id = assessment_key;

  DELETE FROM student_learning_behaviour
  WHERE assessment_id = assessment_key;

  DELETE FROM student_observation
  WHERE assessment_id = assessment_key;


  FOR student_key IN

    SELECT s.student_id
    FROM student s
    JOIN centre c
      ON c.centre_id = s.centre_id
    WHERE c.centre_name = 'Madurai Academic Centre'
      AND s.class_grade = '5'

  LOOP

    FOR subject_key, score_value IN

      SELECT
        subject_id,
        value::NUMERIC
      FROM subject
      JOIN (
        VALUES
          ('Tamil', 82),
          ('English', 76),
          ('Mathematics', 91),
          ('Science', 85),
          ('Social Science', 78)
      ) AS scores(subject_name, value)
        ON scores.subject_name = subject.name
      WHERE subject.class_id = 5

    LOOP

      INSERT INTO assessment_score (
        assessment_id,
        student_id,
        subject_id,
        obtained_marks,
        max_marks,
        created_at,
        updated_at
      )
      VALUES (
        assessment_key,
        student_key,
        subject_key,
        score_value,
        100,
        NOW(),
        NOW()
      );


      INSERT INTO assessment_diagnostic (
        assessment_id,
        student_id,
        subject_id,
        understanding_level,
        application_ability,
        interest_level,
        created_at,
        updated_at
      )
      VALUES (
        assessment_key,
        student_key,
        subject_key,
        'CLEAR',
        'APPLIES',
        'INTERESTED',
        NOW(),
        NOW()
      );

    END LOOP;


    INSERT INTO student_learning_behaviour (
      assessment_id,
      student_id,
      behaviour_option_id,
      created_at,
      updated_at
    )
    SELECT
      assessment_key,
      student_key,
      behaviour_option_id,
      NOW(),
      NOW()
    FROM learning_behaviour_option
    WHERE code = 'INDEPENDENT';


    INSERT INTO student_observation (
      assessment_id,
      student_id,
      key_improvements,
      subjects_needing_support,
      intervention_plan,
      created_at,
      updated_at
    )
    VALUES (
      assessment_key,
      student_key,
      'Good improvement across core subjects.',
      'English reading and sentence framing.',
      'Weekly revision and additional worksheets.',
      NOW(),
      NOW()
    );

  END LOOP;

END $$;

COMMIT;