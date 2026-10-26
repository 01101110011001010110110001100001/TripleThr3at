-- HOCKEY TRAINING ASSISTANT
-- BACKEND SQL QUERIES
-- MySQL 8.0.16+
-- Templates use ? placeholders; do not run as a complete script.
-- User IDs for authorization must come from authenticated sessions.

USE hockey_training_assistant;


-- 1. USER REGISTRATION
INSERT INTO users (
    email,
    password_hash,
    username,
    role
)
VALUES (?, ?, ?, ?);


-- 2. USER LOGIN

SELECT
    user_id,
    email,
    password_hash,
    username,
    role
FROM users
WHERE email = ?;


-- 3. SAVE USER SETTINGS

INSERT INTO user_settings (
    user_id,
    skill_level,
    training_environment,
    primary_goal,
    audio_visual_cues,
    large_workout_text,
    reduced_motion,
    movement_start,
    auto_start_next_drill,
    camera_preference,
    workout_text_size
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
    skill_level = VALUES(skill_level),
    training_environment = VALUES(training_environment),
    primary_goal = VALUES(primary_goal),
    audio_visual_cues = VALUES(audio_visual_cues),
    large_workout_text = VALUES(large_workout_text),
    reduced_motion = VALUES(reduced_motion),
    movement_start = VALUES(movement_start),
    auto_start_next_drill = VALUES(auto_start_next_drill),
    camera_preference = VALUES(camera_preference),
    workout_text_size = VALUES(workout_text_size);


-- 4. LOAD USER SETTINGS

SELECT *
FROM user_settings
WHERE user_id = ?;


-- 5. DISPLAY AVAILABLE DRILLS

SELECT
    d.drill_id,
    d.name,
    d.description,
    d.instructions,
    d.technique_guidance,
    d.difficulty_level,
    d.measurement_type,
    d.recommended_reps,
    d.recommended_seconds,
    s.skill_name
FROM drills AS d
JOIN skills AS s
    ON d.skill_id = s.skill_id
ORDER BY d.name;


-- 6. VIEW INDIVIDUAL DRILL

SELECT
    d.drill_id,
    d.name,
    d.description,
    d.instructions,
    d.technique_guidance,
    d.recommended_reps,
    d.recommended_seconds,
    s.skill_name
FROM drills AS d
JOIN skills AS s
    ON d.skill_id = s.skill_id
WHERE d.drill_id = ?;


-- 7. CREATE WORKOUT

INSERT INTO workouts (
    player_id,
    title,
    workout_type,
    status,
    planned_duration_seconds,
    visibility
)
VALUES (?, ?, ?, 'planned', ?, ?);


-- 8. GET NEW WORKOUT ID

SELECT LAST_INSERT_ID() AS workout_id;


-- 9. ADD DRILL TO WORKOUT

INSERT INTO workout_sets (
    workout_id,
    drill_id,
    sequence_number,
    target_reps,
    target_seconds,
    status
)
SELECT
    w.workout_id,
    ?,
    ?,
    ?,
    ?,
    'planned'
FROM workouts AS w
WHERE w.workout_id = ?
  AND w.player_id = ?
  AND w.status = 'planned';


-- 10. DISPLAY WORKOUT STEPS IN ORDER

SELECT
    ws.set_id,
    ws.sequence_number,
    d.name AS drill_name,
    d.instructions,
    d.technique_guidance,
    ws.target_reps,
    ws.target_seconds,
    ws.status
FROM workout_sets AS ws
JOIN drills AS d
    ON ws.drill_id = d.drill_id
JOIN workouts AS w
    ON ws.workout_id = w.workout_id
WHERE ws.workout_id = ?
  AND w.player_id = ?
ORDER BY ws.sequence_number ASC;


-- 11. START WORKOUT SESSION

UPDATE workouts
SET
    status = 'in_progress',
    started_at = CURRENT_TIMESTAMP
WHERE workout_id = ?
  AND player_id = ?
  AND status = 'planned';


-- 12. RECORD REPETITION

INSERT INTO repetitions (
    set_id,
    rep_number,
    detected_at,
    quality_score,
    feedback_flag,
    detection_source,
    notes
)
SELECT
    ws.set_id,
    ?,
    CURRENT_TIMESTAMP,
    ?,
    ?,
    ?,
    ?
FROM workout_sets AS ws
JOIN workouts AS w
    ON ws.workout_id = w.workout_id
WHERE ws.set_id = ?
  AND w.player_id = ?
  AND w.status = 'in_progress';


-- 13. UPDATE COMPLETED WORKOUT SET

UPDATE workout_sets AS ws
JOIN workouts AS w
    ON ws.workout_id = w.workout_id
SET
    ws.actual_reps = ?,
    ws.status = 'completed'
WHERE ws.set_id = ?
  AND w.player_id = ?
  AND w.status = 'in_progress';


-- 14. SAVE PERFORMANCE RESULTS

INSERT INTO performance_results (
    set_id,
    successful_reps,
    error_count,
    accuracy_percentage,
    avg_speed,
    avg_time_per_rep,
    recorded_at
)
SELECT
    ws.set_id,
    ?,
    ?,
    ?,
    ?,
    ?,
    CURRENT_TIMESTAMP
FROM workout_sets AS ws
JOIN workouts AS w
    ON ws.workout_id = w.workout_id
WHERE ws.set_id = ?
  AND w.player_id = ?
  AND w.status = 'in_progress'
ON DUPLICATE KEY UPDATE
    successful_reps = VALUES(successful_reps),
    error_count = VALUES(error_count),
    accuracy_percentage = VALUES(accuracy_percentage),
    avg_speed = VALUES(avg_speed),
    avg_time_per_rep = VALUES(avg_time_per_rep),
    recorded_at = CURRENT_TIMESTAMP;


-- 15. SAVE FEEDBACK

INSERT INTO feedback_events (
    set_id,
    rep_id,
    event_type,
    message,
    severity
)
SELECT
    ws.set_id,
    ?,
    ?,
    ?,
    ?
FROM workout_sets AS ws
JOIN workouts AS w
    ON ws.workout_id = w.workout_id
WHERE ws.set_id = ?
  AND w.player_id = ?
  AND w.status = 'in_progress';


-- 16. COMPLETE WORKOUT SESSION

UPDATE workouts
SET
    status = 'completed',
    completed_at = CURRENT_TIMESTAMP
WHERE workout_id = ?
  AND player_id = ?
  AND status = 'in_progress';


-- 17. VIEW WORKOUT HISTORY

SELECT
    workout_id,
    title,
    workout_type,
    status,
    started_at,
    completed_at
FROM workouts
WHERE player_id = ?
ORDER BY workout_id DESC;


-- 18. VIEW PERFORMANCE SUMMARY

SELECT
    w.workout_id,
    w.title,
    d.name AS drill_name,
    ws.sequence_number,
    ws.actual_reps,
    pr.successful_reps,
    pr.error_count,
    pr.accuracy_percentage,
    pr.avg_speed,
    pr.avg_time_per_rep
FROM workouts AS w
JOIN workout_sets AS ws
    ON w.workout_id = ws.workout_id
JOIN drills AS d
    ON ws.drill_id = d.drill_id
LEFT JOIN performance_results AS pr
    ON ws.set_id = pr.set_id
WHERE w.workout_id = ?
  AND w.player_id = ?
ORDER BY ws.sequence_number;


-- 19. REQUEST COACH CONNECTION

INSERT INTO coach_player (
    coach_id,
    player_id,
    permission_status
)
VALUES (?, ?, 'pending');


-- 20. APPROVE COACH CONNECTION

UPDATE coach_player
SET permission_status = 'approved'
WHERE coach_id = ?
  AND player_id = ?
  AND permission_status = 'pending';


-- 21. VIEW COACH'S PLAYERS

SELECT
    u.user_id,
    u.username,
    u.email
FROM coach_player AS cp
JOIN users AS u
    ON cp.player_id = u.user_id
WHERE cp.coach_id = ?
  AND cp.permission_status = 'approved';


-- 22. SAVE DRILL RECOMMENDATION

INSERT INTO recommendations (
    player_id,
    drill_id,
    reason,
    recommended_sets,
    recommended_reps,
    priority,
    status
)
VALUES (?, ?, ?, ?, ?, ?, 'pending');


-- 23. VIEW PLAYER RECOMMENDATIONS

SELECT
    r.recommendation_id,
    d.name AS drill_name,
    r.reason,
    r.recommended_sets,
    r.recommended_reps,
    r.priority,
    r.status
FROM recommendations AS r
JOIN drills AS d
    ON r.drill_id = d.drill_id
WHERE r.player_id = ?
ORDER BY r.created_at DESC;



