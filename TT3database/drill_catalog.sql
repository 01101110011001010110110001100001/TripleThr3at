-- HOCKEY TRAINING ASSISTANT
-- DRILL CATALOG SEED DATA
-- MySQL 8.0.16+

USE hockey_training_assistant;

-- PART 1: INSERT SKILL CATEGORIES

INSERT INTO skills (
    skill_name,
    description
)
SELECT
    'Puck Control',
    'Develop puck handling and control.'
WHERE NOT EXISTS (
    SELECT 1 FROM skills
    WHERE skill_name = 'Puck Control'
);

INSERT INTO skills (
    skill_name,
    description
)
SELECT
    'Coordination',
    'Improve movement and puck coordination.'
WHERE NOT EXISTS (
    SELECT 1 FROM skills
    WHERE skill_name = 'Coordination'
);

INSERT INTO skills (
    skill_name,
    description
)
SELECT
    'Speed',
    'Improve hand speed and reaction time.'
WHERE NOT EXISTS (
    SELECT 1 FROM skills
    WHERE skill_name = 'Speed'
);

INSERT INTO skills (
    skill_name,
    description
)
SELECT
    'Awareness',
    'Improve head-up puck control and awareness.'
WHERE NOT EXISTS (
    SELECT 1 FROM skills
    WHERE skill_name = 'Awareness'
);


-- ============================================
-- PART 2: INSERT HOCKEY DRILLS
-- ============================================

-- 1. FIGURE EIGHT CONTROL

INSERT INTO drills (
    skill_id,
    name,
    description,
    instructions,
    technique_guidance,
    difficulty_level,
    measurement_type,
    recommended_reps,
    recommended_seconds
)
SELECT
    s.skill_id,
    'Figure Eight Control',
    'Build control through wide, consistent puck paths.',
    'Move the puck in a figure-eight pattern around both markers.',
    'Keep your knees bent, hands relaxed, and puck close to your stick. Focus on smooth movements around both markers.',
    NULL,
    'loops',
    80,
    240
FROM skills AS s
WHERE s.skill_name = 'Puck Control'
  AND NOT EXISTS (
      SELECT 1 FROM drills
      WHERE name = 'Figure Eight Control'
  );


-- 2. EDGEWORK CIRCUIT

INSERT INTO drills (
    skill_id,
    name,
    description,
    instructions,
    technique_guidance,
    difficulty_level,
    measurement_type,
    recommended_reps,
    recommended_seconds
)
SELECT
    s.skill_id,
    'Edgework Circuit',
    'Coordinate lateral footwork with controlled puck movement.',
    'Move laterally through three stations while controlling the puck.',
    'Stay balanced with bent knees. Move side to side while maintaining control of the puck and keeping your upper body stable.',
    NULL,
    'lateral cycles',
    24,
    240
FROM skills AS s
WHERE s.skill_name = 'Coordination'
  AND NOT EXISTS (
      SELECT 1 FROM drills
      WHERE name = 'Edgework Circuit'
  );


-- 3. QUICK HANDS LADDER

INSERT INTO drills (
    skill_id,
    name,
    description,
    instructions,
    technique_guidance,
    difficulty_level,
    measurement_type,
    recommended_reps,
    recommended_seconds
)
SELECT
    s.skill_id,
    'Quick Hands Ladder',
    'Increase hand speed without losing control.',
    'Move the puck quickly through each opening.',
    'Use short, controlled stick movements. Keep your hands active and gradually increase speed without sacrificing accuracy.',
    NULL,
    'touches',
    120,
    240
FROM skills AS s
WHERE s.skill_name = 'Speed'
  AND NOT EXISTS (
      SELECT 1 FROM drills
      WHERE name = 'Quick Hands Ladder'
  );


-- 4. HEAD-UP CHALLENGE

INSERT INTO drills (
    skill_id,
    name,
    description,
    instructions,
    technique_guidance,
    difficulty_level,
    measurement_type,
    recommended_reps,
    recommended_seconds
)
SELECT
    s.skill_id,
    'Head-Up Challenge',
    'Keep your eyes forward while controlling the puck.',
    'Control the puck while keeping your head up.',
    'Maintain a relaxed grip and use peripheral vision to track the puck. Keep your eyes forward and avoid looking down.',
    NULL,
    'time',
    NULL,
    240
FROM skills AS s
WHERE s.skill_name = 'Awareness'
  AND NOT EXISTS (
      SELECT 1 FROM drills
      WHERE name = 'Head-Up Challenge'
  );


-- ============================================
-- PART 3: VERIFY INSERTED DATA
-- ============================================

-- Display all skill categories.

SELECT *
FROM skills;


-- Display all seeded drills with their
-- instructions, technique guidance,
-- and recommended durations.

SELECT
    d.drill_id,
    d.name,
    s.skill_name,
    d.description,
    d.instructions,
    d.technique_guidance,
    d.difficulty_level,
    d.measurement_type,
    d.recommended_reps,
    d.recommended_seconds
FROM drills AS d
JOIN skills AS s
    ON d.skill_id = s.skill_id
ORDER BY d.drill_id;

USE hockey_training_assistant;

-- Verify skill categories
SELECT
    COUNT(*) AS skill_count,
    IF(COUNT(*) = 4, 'PASS', 'FAIL') AS result
FROM skills;

-- Verify seeded drills
SELECT
    COUNT(*) AS drill_count,
    IF(COUNT(*) = 4, 'PASS', 'FAIL') AS result
FROM drills;

-- Verify no duplicate skill names
SELECT
    COUNT(*) AS duplicate_skill_names
FROM (
    SELECT skill_name
    FROM skills
    GROUP BY skill_name
    HAVING COUNT(*) > 1
) AS duplicates;

-- Verify no duplicate drill names
SELECT
    COUNT(*) AS duplicate_drill_names
FROM (
    SELECT name
    FROM drills
    GROUP BY name
    HAVING COUNT(*) > 1
) AS duplicates;

-- Verify required drill content
SELECT
    name,
    IF(
        NULLIF(TRIM(instructions), '') IS NOT NULL
        AND NULLIF(TRIM(technique_guidance), '') IS NOT NULL
        AND recommended_seconds > 0,
        'PASS',
        'FAIL'
    ) AS result
FROM drills
ORDER BY name;


-- ============================================
-- PART 4: VERIFY DATABASE UNIQUENESS
-- ============================================

-- Verify unique skill name constraint
SELECT
    IF(COUNT(*) = 1, 'PASS', 'FAIL') AS test_result
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'skills'
  AND index_name = 'uq_skills_name'
  AND non_unique = 0
  AND column_name = 'skill_name';


-- Verify unique drill name constraint
SELECT
    IF(COUNT(*) = 1, 'PASS', 'FAIL') AS test_result
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'drills'
  AND index_name = 'uq_drills_name'
  AND non_unique = 0
  AND column_name = 'name';
