-- HOCKEY TRAINING ASSISTANT
-- SQL BASED ON CORRECTED ERD
-- MySQL 8.0.16+

DROP DATABASE IF EXISTS hockey_training_assistant;

CREATE DATABASE IF NOT EXISTS hockey_training_assistant
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;

USE hockey_training_assistant;



-- DATABASE TABLES

-- 1. USERS
CREATE TABLE users (
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
CREATE TABLE skills (
    skill_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    skill_name VARCHAR(120) NOT NULL,
    description TEXT,

    PRIMARY KEY (skill_id),

    UNIQUE KEY uq_skills_name (skill_name)
) ENGINE=InnoDB;


-- 3. DRILLS
CREATE TABLE drills (
    drill_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    skill_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    instructions TEXT,
    technique_guidance TEXT,
    difficulty_level VARCHAR(40),
    measurement_type VARCHAR(40),
    recommended_reps INT UNSIGNED,
    recommended_seconds INT UNSIGNED,

    PRIMARY KEY (drill_id),

    UNIQUE KEY uq_drills_name (name),

    CONSTRAINT fk_drills_skill
        FOREIGN KEY (skill_id)
        REFERENCES skills(skill_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- 4. WORKOUTS
CREATE TABLE workouts (
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
CREATE TABLE workout_sets (
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

    UNIQUE KEY uq_workout_sequence (
        workout_id,
        sequence_number
    ),

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
CREATE TABLE repetitions (
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

    UNIQUE KEY uq_set_rep_number (
        set_id,
        rep_number
    ),

    CONSTRAINT fk_repetitions_set
        FOREIGN KEY (set_id)
        REFERENCES workout_sets(set_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;


-- 7. PERFORMANCE_RESULTS
CREATE TABLE performance_results (
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
CREATE TABLE feedback_events (
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
CREATE TABLE recommendations (
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
CREATE TABLE coach_player (
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


-- 11. USER_SETTINGS
CREATE TABLE user_settings (
    user_id BIGINT UNSIGNED NOT NULL,

    -- Training preferences
    skill_level ENUM(
        'Beginner',
        'Intermediate',
        'Advanced'
    ) NOT NULL DEFAULT 'Beginner',

    training_environment ENUM(
        'Indoor',
        'Outdoor'
    ) NOT NULL DEFAULT 'Indoor',

    primary_goal ENUM(
        'Puck control',
        'Speed',
        'Awareness'
    ) NOT NULL DEFAULT 'Puck control',

    -- Workout controls
    audio_visual_cues BOOLEAN NOT NULL DEFAULT TRUE,
    large_workout_text BOOLEAN NOT NULL DEFAULT FALSE,
    reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,
    movement_start BOOLEAN NOT NULL DEFAULT TRUE,
    auto_start_next_drill BOOLEAN NOT NULL DEFAULT TRUE,

    -- Privacy and accessibility
    camera_preference BOOLEAN NOT NULL DEFAULT FALSE,
    workout_text_size VARCHAR(30) DEFAULT 'Default',

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id),

    CONSTRAINT fk_settings_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

SHOW TABLES;
DESCRIBE drills;
DESCRIBE user_settings;
DESCRIBE workouts;
