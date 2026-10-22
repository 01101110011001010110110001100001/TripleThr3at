
-- HOCKEY TRAINING ASSISTANT
-- SQL BASED ON CORRECTED ERD
-- MySQL 8.0.16+

DROP DATABASE IF EXISTS hockey_training_assistant;

CREATE DATABASE hockey_training_assistant
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;



CREATE DATABASE IF NOT EXISTS hockey_training_assistant
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;

USE hockey_training_assistant;



--  DATABASE TABLES

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    role ENUM('player', 'coach') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;


-- 2. SKILLS
CREATE TABLE IF NOT EXISTS skills (
    skill_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    skill_name VARCHAR(120) NOT NULL,
    description TEXT,

    PRIMARY KEY (skill_id)
) ENGINE=InnoDB;


-- 3. DRILLS
CREATE TABLE IF NOT EXISTS drills (
    drill_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    skill_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    instructions TEXT,
    difficulty_level VARCHAR(40),
    measurement_type VARCHAR(40),
    recommended_reps INT UNSIGNED,
    recommended_seconds INT UNSIGNED,

    PRIMARY KEY (drill_id),

    CONSTRAINT fk_drills_skill
        FOREIGN KEY (skill_id)
        REFERENCES skills(skill_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- 4. WORKOUTS
CREATE TABLE IF NOT EXISTS workouts (
    workout_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    player_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    workout_type VARCHAR(50),
    status VARCHAR(30),
    planned_duration_seconds INT UNSIGNED,
    started_at DATETIME,
    completed_at DATETIME,
    visibility VARCHAR(30),
    notes TEXT,

    PRIMARY KEY (workout_id),

    CONSTRAINT fk_workouts_player
        FOREIGN KEY (player_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- 5. WORKOUT_SETS
CREATE TABLE IF NOT EXISTS workout_sets (
    set_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    workout_id BIGINT UNSIGNED NOT NULL,
    drill_id BIGINT UNSIGNED NOT NULL,
    sequence_number INT UNSIGNED NOT NULL,
    target_reps INT UNSIGNED,
    target_seconds INT UNSIGNED,
    actual_reps INT UNSIGNED,
    status VARCHAR(30),
    notes TEXT,

    PRIMARY KEY (set_id),

    CONSTRAINT fk_sets_workout
        FOREIGN KEY (workout_id)
        REFERENCES workouts(workout_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_sets_drill
        FOREIGN KEY (drill_id)
        REFERENCES drills(drill_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- 6. REPETITIONS
CREATE TABLE IF NOT EXISTS repetitions (
    rep_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    set_id BIGINT UNSIGNED NOT NULL,
    rep_number INT UNSIGNED,
    detected_at DATETIME,
    quality_score DECIMAL(5,2),
    feedback_flag BOOLEAN,
    detection_source VARCHAR(40),
    notes TEXT,

    PRIMARY KEY (rep_id),

    UNIQUE KEY uq_repetitions_set_rep (set_id, rep_id),

    CONSTRAINT fk_repetitions_set
        FOREIGN KEY (set_id)
        REFERENCES workout_sets(set_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- 7. PERFORMANCE_RESULTS
CREATE TABLE IF NOT EXISTS performance_results (
    result_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    set_id BIGINT UNSIGNED NOT NULL,
    successful_reps INT UNSIGNED,
    error_count INT UNSIGNED,
    accuracy_percentage DECIMAL(5,2),
    avg_speed DECIMAL(10,2),
    avg_time_per_rep DECIMAL(10,2),
    recorded_at DATETIME,

    PRIMARY KEY (result_id),

    UNIQUE KEY uq_performance_set (set_id),

    CONSTRAINT fk_performance_set
        FOREIGN KEY (set_id)
        REFERENCES workout_sets(set_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- 8. FEEDBACK_EVENTS
CREATE TABLE IF NOT EXISTS feedback_events (
    feedback_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    set_id BIGINT UNSIGNED NOT NULL,
    rep_id BIGINT UNSIGNED NULL,
    event_type VARCHAR(60),
    message TEXT,
    severity VARCHAR(30),
    `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (feedback_id),

    CONSTRAINT fk_feedback_set
        FOREIGN KEY (set_id)
        REFERENCES workout_sets(set_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_feedback_rep_same_set
        FOREIGN KEY (set_id, rep_id)
        REFERENCES repetitions(set_id, rep_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- 9. RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS recommendations (
    recommendation_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    player_id BIGINT UNSIGNED NOT NULL,
    drill_id BIGINT UNSIGNED NOT NULL,
    reason TEXT,
    recommended_sets INT UNSIGNED,
    recommended_reps INT UNSIGNED,
    priority VARCHAR(30),
    status VARCHAR(30),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (recommendation_id),

    CONSTRAINT fk_recommendations_player
        FOREIGN KEY (player_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_recommendations_drill
        FOREIGN KEY (drill_id)
        REFERENCES drills(drill_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- 10. COACH_PLAYER
CREATE TABLE IF NOT EXISTS coach_player (
    coach_id BIGINT UNSIGNED NOT NULL,
    player_id BIGINT UNSIGNED NOT NULL,
    permission_status VARCHAR(30),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (coach_id, player_id),

    CONSTRAINT fk_coach_player_coach
        FOREIGN KEY (coach_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_coach_player_player
        FOREIGN KEY (player_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- ============================================
-- PART 2: INSERT SAMPLE DATA
-- ============================================


-- 11. SAMPLE USERS
-- Placeholder hashes are for database testing only.

INSERT INTO users (
    email,
    password_hash,
    username,
    role
)
SELECT
    'alex.demo@example.com',
    'DEMO_HASH_NOT_FOR_LOGIN',
    'Alex',
    'player'
WHERE NOT EXISTS (
    SELECT 1 FROM users
    WHERE email = 'alex.demo@example.com'
);

INSERT INTO users (
    email,
    password_hash,
    username,
    role
)
SELECT
    'mike.demo@example.com',
    'DEMO_HASH_NOT_FOR_LOGIN',
    'Coach Mike',
    'coach'
WHERE NOT EXISTS (
    SELECT 1 FROM users
    WHERE email = 'mike.demo@example.com'
);


-- 12. SAMPLE SKILLS

INSERT INTO skills (skill_name, description)
SELECT
    'Shooting',
    'Improving shot accuracy and power'
WHERE NOT EXISTS (
    SELECT 1 FROM skills
    WHERE skill_name = 'Shooting'
);

INSERT INTO skills (skill_name, description)
SELECT
    'Stickhandling',
    'Improving puck control'
WHERE NOT EXISTS (
    SELECT 1 FROM skills
    WHERE skill_name = 'Stickhandling'
);

INSERT INTO skills (skill_name, description)
SELECT
    'Skating',
    'Improving skating speed and technique'
WHERE NOT EXISTS (
    SELECT 1 FROM skills
    WHERE skill_name = 'Skating'
);


-- 13. INSERT SAMPLE HOCKEY DRILLS

-- Wrist Shot Practice
INSERT INTO drills (
    skill_id,
    name,
    description,
    difficulty_level,
    measurement_type,
    recommended_reps
)
SELECT
    skill_id,
    'Wrist Shot Practice',
    'Practice shooting accuracy',
    'Beginner',
    'repetitions',
    10
FROM skills
WHERE skill_name = 'Shooting'
ORDER BY skill_id
LIMIT 1;


-- Puck Control Practice
INSERT INTO drills (
    skill_id,
    name,
    description,
    difficulty_level,
    measurement_type,
    recommended_reps
)
SELECT
    skill_id,
    'Puck Control Practice',
    'Practice controlling the puck',
    'Beginner',
    'repetitions',
    15
FROM skills
WHERE skill_name = 'Stickhandling'
ORDER BY skill_id
LIMIT 1;


-- Forward Skating Practice
INSERT INTO drills (
    skill_id,
    name,
    description,
    difficulty_level,
    measurement_type,
    recommended_reps
)
SELECT
    skill_id,
    'Forward Skating Practice',
    'Practice skating technique',
    'Beginner',
    'repetitions',
    10
FROM skills
WHERE skill_name = 'Skating'
ORDER BY skill_id
LIMIT 1;


-- ============================================
-- VERIFY DRILLS
-- ============================================

SELECT
    drills.drill_id,
    drills.name,
    skills.skill_name,
    drills.recommended_reps
FROM drills
JOIN skills
    ON drills.skill_id = skills.skill_id;


-- ============================================
-- PART 3: VERIFY DATA
-- ============================================

SELECT * FROM users;

SELECT * FROM skills;

SHOW TABLES;
