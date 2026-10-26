-- HOCKEY TRAINING ASSISTANT
-- DATABASE ACCEPTANCE TESTS
-- MySQL 8.0.16+
--
-- Run schema.sql first.
-- Run drill_catalog.sql second.
-- Run this file third.
--
-- Test data is rolled back at the end.
-- No permanent sample users or workouts.


USE hockey_training_assistant;


-- ============================================
-- PART 1: VERIFY DATABASE STRUCTURE
-- ============================================

-- TEST 1: Confirm all 11 tables exist.

SELECT
    COUNT(*) AS table_count,
    CASE
        WHEN COUNT(*) = 11 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';


-- TEST 2: Verify required primary keys.

SELECT
    COUNT(*) AS primary_key_count,
    CASE
        WHEN COUNT(*) = 11 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM information_schema.table_constraints
WHERE table_schema = DATABASE()
  AND constraint_type = 'PRIMARY KEY';


-- TEST 3: Verify foreign key relationships.

SELECT
    table_name,
    constraint_name,
    referenced_table_name
FROM information_schema.key_column_usage
WHERE table_schema = DATABASE()
  AND referenced_table_name IS NOT NULL
ORDER BY table_name, constraint_name;


-- ============================================
-- PART 2: VERIFY DRILL CATALOG
-- ============================================

-- TEST 4: Confirm all four required drills exist.

SELECT
    COUNT(*) AS seeded_drills,
    CASE
        WHEN COUNT(*) = 4 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM drills
WHERE name IN (
    'Figure Eight Control',
    'Edgework Circuit',
    'Quick Hands Ladder',
    'Head-Up Challenge'
);


-- TEST 5: Verify drill instructions,
-- technique guidance, and durations.

SELECT
    name,
    instructions,
    technique_guidance,
    recommended_seconds,
    CASE
        WHEN instructions IS NOT NULL
         AND TRIM(instructions) <> ''
         AND technique_guidance IS NOT NULL
         AND TRIM(technique_guidance) <> ''
         AND recommended_seconds > 0
        THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM drills
WHERE name IN (
    'Figure Eight Control',
    'Edgework Circuit',
    'Quick Hands Ladder',
    'Head-Up Challenge'
)
ORDER BY name;


-- ============================================
-- PART 3: TEST DYNAMIC DATABASE OPERATIONS
-- ============================================

-- Start transaction so test records can
-- be removed with ROLLBACK.

START TRANSACTION;


-- TEST 6: Register a test player.
-- Password hash is a test placeholder only.

INSERT INTO users (
    email,
    password_hash,
    username,
    role
)
VALUES (
    'database_test_player@example.invalid',
    'TEST_ONLY_NOT_A_REAL_PASSWORD_HASH',
    'DatabaseTestPlayer',
    'player'
);

SET @test_player_id = LAST_INSERT_ID();


-- Verify test player was created.

SELECT
    user_id,
    username,
    role,
    CASE
        WHEN role = 'player' THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM users
WHERE user_id = @test_player_id;


-- ============================================
-- PART 4: TEST USER SETTINGS
-- ============================================

-- TEST 7: Save training preferences.

INSERT INTO user_settings (
    user_id,
    skill_level,
    training_environment,
    primary_goal
)
VALUES (
    @test_player_id,
    'Intermediate',
    'Indoor',
    'Puck control'
);


-- Verify settings.

SELECT
    user_id,
    skill_level,
    training_environment,
    primary_goal,
    CASE
        WHEN skill_level = 'Intermediate'
         AND training_environment = 'Indoor'
         AND primary_goal = 'Puck control'
        THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM user_settings
WHERE user_id = @test_player_id;


-- ============================================
-- PART 5: TEST WORKOUT CREATION
-- ============================================

-- TEST 8: Create a workout.

INSERT INTO workouts (
    player_id,
    title,
    workout_type,
    status,
    planned_duration_seconds,
    visibility
)
VALUES (
    @test_player_id,
    'Database Test Workout',
    'custom',
    'planned',
    960,
    'private'
);

SET @test_workout_id = LAST_INSERT_ID();


-- Verify workout ownership.

SELECT
    workout_id,
    player_id,
    title,
    status,
    CASE
        WHEN player_id = @test_player_id
         AND status = 'planned'
        THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM workouts
WHERE workout_id = @test_workout_id;


-- ============================================
-- PART 6: TEST ORDERED WORKOUT STEPS
-- ============================================

-- TEST 9: Add four drills in sequence.

INSERT INTO workout_sets (
    workout_id,
    drill_id,
    sequence_number,
    target_reps,
    target_seconds,
    status
)
SELECT
    @test_workout_id,
    drill_id,
    1,
    recommended_reps,
    recommended_seconds,
    'planned'
FROM drills
WHERE name = 'Figure Eight Control'
ORDER BY drill_id
LIMIT 1;


INSERT INTO workout_sets (
    workout_id,
    drill_id,
    sequence_number,
    target_reps,
    target_seconds,
    status
)
SELECT
    @test_workout_id,
    drill_id,
    2,
    recommended_reps,
    recommended_seconds,
    'planned'
FROM drills
WHERE name = 'Edgework Circuit'
ORDER BY drill_id
LIMIT 1;


INSERT INTO workout_sets (
    workout_id,
    drill_id,
    sequence_number,
    target_reps,
    target_seconds,
    status
)
SELECT
    @test_workout_id,
    drill_id,
    3,
    recommended_reps,
    recommended_seconds,
    'planned'
FROM drills
WHERE name = 'Quick Hands Ladder'
ORDER BY drill_id
LIMIT 1;


INSERT INTO workout_sets (
    workout_id,
    drill_id,
    sequence_number,
    target_reps,
    target_seconds,
    status
)
SELECT
    @test_workout_id,
    drill_id,
    4,
    recommended_reps,
    recommended_seconds,
    'planned'
FROM drills
WHERE name = 'Head-Up Challenge'
ORDER BY drill_id
LIMIT 1;


-- Verify drill ordering.

SELECT
    ws.sequence_number,
    d.name AS drill_name,
    ws.target_reps,
    ws.target_seconds
FROM workout_sets AS ws
JOIN drills AS d
    ON ws.drill_id = d.drill_id
WHERE ws.workout_id = @test_workout_id
ORDER BY ws.sequence_number;


-- Verify four unique ordered positions.

SELECT
    COUNT(*) AS total_steps,
    COUNT(DISTINCT sequence_number) AS unique_positions,
    CASE
        WHEN COUNT(*) = 4
         AND COUNT(DISTINCT sequence_number) = 4
         AND MIN(sequence_number) = 1
         AND MAX(sequence_number) = 4
        THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM workout_sets
WHERE workout_id = @test_workout_id;


-- ============================================
-- PART 7: TEST WORKOUT SESSION
-- ============================================

-- TEST 10: Start workout.

UPDATE workouts
SET
    status = 'in_progress',
    started_at = CURRENT_TIMESTAMP
WHERE workout_id = @test_workout_id
  AND player_id = @test_player_id;


-- Verify session started.

SELECT
    workout_id,
    status,
    started_at,
    CASE
        WHEN status = 'in_progress'
         AND started_at IS NOT NULL
        THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM workouts
WHERE workout_id = @test_workout_id;


-- ============================================
-- PART 8: TEST REPETITION TRACKING
-- ============================================

-- Get the first workout set.

SET @test_set_id = (
    SELECT set_id
    FROM workout_sets
    WHERE workout_id = @test_workout_id
      AND sequence_number = 1
);


-- TEST 11: Record a repetition.

INSERT INTO repetitions (
    set_id,
    rep_number,
    detected_at,
    quality_score,
    feedback_flag,
    detection_source
)
VALUES (
    @test_set_id,
    1,
    CURRENT_TIMESTAMP,
    85.00,
    FALSE,
    'test'
);

SET @test_rep_id = LAST_INSERT_ID();


-- Verify repetition.

SELECT
    rep_id,
    set_id,
    rep_number,
    quality_score,
    CASE
        WHEN rep_number = 1
         AND quality_score = 85.00
        THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM repetitions
WHERE rep_id = @test_rep_id;


-- ============================================
-- PART 9: TEST PERFORMANCE RESULTS
-- ============================================

-- TEST 12: Save performance summary.

INSERT INTO performance_results (
    set_id,
    successful_reps,
    error_count,
    accuracy_percentage,
    avg_speed,
    avg_time_per_rep,
    recorded_at
)
VALUES (
    @test_set_id,
    1,
    0,
    100.00,
    2.50,
    1.20,
    CURRENT_TIMESTAMP
);


-- Verify performance results.

SELECT
    set_id,
    successful_reps,
    error_count,
    accuracy_percentage,
    CASE
        WHEN successful_reps = 1
         AND error_count = 0
         AND accuracy_percentage = 100.00
        THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM performance_results
WHERE set_id = @test_set_id;


-- ============================================
-- PART 10: TEST FEEDBACK
-- ============================================

-- TEST 13: Save feedback for a repetition.

INSERT INTO feedback_events (
    set_id,
    rep_id,
    event_type,
    message,
    severity
)
VALUES (
    @test_set_id,
    @test_rep_id,
    'technique',
    'Maintain puck control.',
    'info'
);


-- Verify feedback.

SELECT
    feedback_id,
    set_id,
    rep_id,
    event_type,
    message,
    CASE
        WHEN set_id = @test_set_id
         AND rep_id = @test_rep_id
        THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM feedback_events
WHERE set_id = @test_set_id;


-- ============================================
-- PART 11: TEST DYNAMIC RECOMMENDATIONS
-- ============================================

-- TEST 14: Verify recommendation storage.
-- These are TEST values, not real AI output.

INSERT INTO recommendations (
    player_id,
    drill_id,
    reason,
    recommended_sets,
    recommended_reps,
    priority,
    status
)
SELECT
    @test_player_id,
    drill_id,
    'Database integration test',
    2,
    50,
    'medium',
    'pending'
FROM drills
WHERE name = 'Figure Eight Control'
ORDER BY drill_id
LIMIT 1;


-- Verify recommendation.

SELECT
    r.recommendation_id,
    d.name AS drill_name,
    r.recommended_sets,
    r.recommended_reps,
    r.priority,
    CASE
        WHEN r.player_id = @test_player_id
         AND r.status = 'pending'
        THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM recommendations AS r
JOIN drills AS d
    ON r.drill_id = d.drill_id
WHERE r.player_id = @test_player_id;



-- ============================================
-- PART 12: VERIFY UNIQUE CONSTRAINTS
-- ============================================

-- TEST 15: Verify workout sequence constraint.

SELECT
    GROUP_CONCAT(
        column_name
        ORDER BY seq_in_index
        SEPARATOR ','
    ) AS indexed_columns,

    CASE
        WHEN GROUP_CONCAT(
            column_name
            ORDER BY seq_in_index
            SEPARATOR ','
        ) = 'workout_id,sequence_number'
        AND COUNT(*) = 2
        AND SUM(non_unique) = 0
        THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'workout_sets'
  AND index_name = 'uq_workout_sequence';


-- TEST 16: Verify repetition numbering constraint.

SELECT
    GROUP_CONCAT(
        column_name
        ORDER BY seq_in_index
        SEPARATOR ','
    ) AS indexed_columns,

    CASE
        WHEN GROUP_CONCAT(
            column_name
            ORDER BY seq_in_index
            SEPARATOR ','
        ) = 'set_id,rep_number'
        AND COUNT(*) = 2
        AND SUM(non_unique) = 0
        THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'repetitions'
  AND index_name = 'uq_set_rep_number';


-- ============================================
-- PART 13: COMPLETE WORKOUT
-- ============================================

-- TEST 17: Complete session.

UPDATE workouts
SET
    status = 'completed',
    completed_at = CURRENT_TIMESTAMP
WHERE workout_id = @test_workout_id
  AND player_id = @test_player_id;


-- Verify completed session.

SELECT
    workout_id,
    status,
    started_at,
    completed_at,
    CASE
        WHEN status = 'completed'
         AND completed_at IS NOT NULL
        THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM workouts
WHERE workout_id = @test_workout_id;


-- ============================================
-- PART 14: CLEAN UP TEST DATA
-- ============================================

-- Remove all test inserts and updates.
-- Seeded drills and skills are preserved.

ROLLBACK;


-- ============================================
-- PART 15: VERIFY CLEANUP
-- ============================================

-- Confirm test player no longer exists.

SELECT
    CASE
        WHEN COUNT(*) = 0 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM users
WHERE email = 'database_test_player@example.invalid';


-- Confirm seeded drills still exist.

SELECT
    COUNT(*) AS remaining_seeded_drills,
    CASE
        WHEN COUNT(*) = 4 THEN 'PASS'
        ELSE 'FAIL'
    END AS test_result
FROM drills
WHERE name IN (
    'Figure Eight Control',
    'Edgework Circuit',
    'Quick Hands Ladder',
    'Head-Up Challenge'
);
