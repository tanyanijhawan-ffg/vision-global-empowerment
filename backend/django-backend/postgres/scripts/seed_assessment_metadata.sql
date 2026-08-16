INSERT INTO assessment_type (code, name, duration_months, is_active)
VALUES
  ('QUARTERLY', 'Quarterly', 3, true),
  ('HALF_YEARLY', 'Half-Yearly', 6, true),
  ('ANNUAL', 'Annual', 12, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  duration_months = EXCLUDED.duration_months,
  is_active = EXCLUDED.is_active;

INSERT INTO subject (name, code, class_id, is_active)
VALUES
  ('Tamil', 'TAMIL', 5, true),
  ('English', 'ENGLISH', 5, true),
  ('Mathematics', 'MATHEMATICS', 5, true),
  ('Science', 'SCIENCE', 5, true),
  ('Social Science', 'SOCIAL_SCIENCE', 5, true)
ON CONFLICT (class_id, name) DO UPDATE SET
  code = EXCLUDED.code,
  is_active = EXCLUDED.is_active;

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
  ('INDEPENDENT', 'Independent', true),
  ('SUPERVISION', 'Needs supervision', true),
  ('MOTIVATED', 'Motivated', true),
  ('NEEDS_SUPPORT', 'Needs support', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;
