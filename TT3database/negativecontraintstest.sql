
-- HOCKEY TRAINING ASSISTANT
-- NEGATIVE CONSTRAINT TESTS
-- MySQL 8.0.16+
--
-- Tests run in a transaction and are rolled back.

USE hockey_training_assistant;

DELIMITER $$

DROP PROCEDURE IF EXISTS test_negative_constraints$$

CREATE PROCEDURE test_negative_constraints()
BEGIN
    DECLARE v_player_id BIGINT UNSIGNED;
    DECLARE v_workout_id BIGINT UNSIGNED;
    DECLARE v_drill_id BIGINT UNSIGNED;
    DECLARE v_set_id BIGINT UNSIGNED;
    DECLARE v_error BOOLEAN DEFAULT FALSE;

    START TRANSACTION;

    -- Create temporary test player
    INSERT INTO users (
        email, password_hash, username, role
    )
    VALUES (
        'negative_test@example.invalid',
        'TEST_ONLY',
        'NegativeTestPlayer',
        'player'
    );

    SET v_player_id = LAST_INSERT_ID();

    -- Create temporary workout
    INSERT INTO workouts (
        player_id, title, status
    )
    VALUES (
        v_player_id,
        'Negative Constraint Test',
        'planned'
    );

    SET v_workout_id = LAST_INSERT_ID();

    -- Verify required seeded drill exists
    SET v_drill_id = (
        SELECT drill_id
        FROM drills
        WHERE name = 'Figure Eight Control'
        ORDER BY drill_id
        LIMIT 1
    );

    IF v_drill_id IS NULL THEN
        ROLLBACK;

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Missing Figure Eight Control. Run drill_catalog.sql first.';
    END IF;


    -- TEST 1: Duplicate user email
    SET v_error = FALSE;

    BEGIN
        DECLARE CONTINUE HANDLER FOR 1062
            SET v_error = TRUE;

        INSERT INTO users (
            email, password_hash, username, role
        )
        VALUES (
            'negative_test@example.invalid',
            'TEST_ONLY',
            'DuplicateUser',
            'player'
        );
    END;

    SELECT 'Duplicate user email' AS test_name,
           IF(v_error, 'PASS', 'FAIL') AS result;


    -- TEST 2: Invalid workout foreign key
    SET v_error = FALSE;

    BEGIN
        DECLARE CONTINUE HANDLER FOR 1452
            SET v_error = TRUE;

        INSERT INTO workouts (
            player_id, title, status
        )
        VALUES (
            0,
            'Invalid Player Workout',
            'planned'
        );
    END;

    SELECT 'Invalid player foreign key' AS test_name,
           IF(v_error, 'PASS', 'FAIL') AS result;


    -- Create valid workout set
    INSERT INTO workout_sets (
        workout_id, drill_id,
        sequence_number, status
    )
    VALUES (
        v_workout_id,
        v_drill_id,
        1,
        'planned'
    );

    SET v_set_id = LAST_INSERT_ID();


    -- TEST 3: Duplicate workout position
    SET v_error = FALSE;

    BEGIN
        DECLARE CONTINUE HANDLER FOR 1062
            SET v_error = TRUE;

        INSERT INTO workout_sets (
            workout_id, drill_id,
            sequence_number, status
        )
        VALUES (
            v_workout_id,
            v_drill_id,
            1,
            'planned'
        );
    END;

    SELECT 'Duplicate workout position' AS test_name,
           IF(v_error, 'PASS', 'FAIL') AS result;


    -- Create valid repetition
    INSERT INTO repetitions (
        set_id, rep_number
    )
    VALUES (
        v_set_id, 1
    );


    -- TEST 4: Duplicate repetition number
    SET v_error = FALSE;

    BEGIN
        DECLARE CONTINUE HANDLER FOR 1062
            SET v_error = TRUE;

        INSERT INTO repetitions (
            set_id, rep_number
        )
        VALUES (
            v_set_id, 1
        );
    END;

    SELECT 'Duplicate repetition number' AS test_name,
           IF(v_error, 'PASS', 'FAIL') AS result;


    -- TEST 5: Invalid drill foreign key
    SET v_error = FALSE;

    BEGIN
        DECLARE CONTINUE HANDLER FOR 1452
            SET v_error = TRUE;

        INSERT INTO workout_sets (
            workout_id, drill_id,
            sequence_number, status
        )
        VALUES (
            v_workout_id,
            0,
            2,
            'planned'
        );
    END;

    SELECT 'Invalid drill foreign key' AS test_name,
           IF(v_error, 'PASS', 'FAIL') AS result;


    -- ============================================
    -- TEST 6: DUPLICATE SKILL NAME
    -- ============================================

    SET v_error = FALSE;

    BEGIN
        DECLARE CONTINUE HANDLER FOR 1062
            SET v_error = TRUE;

        INSERT INTO skills (
            skill_name,
            description
        )
        VALUES (
            'Puck Control',
            'Duplicate skill test'
        );
    END;

    SELECT
        'Duplicate skill name' AS test_name,
        IF(v_error, 'PASS', 'FAIL') AS result;


    -- ============================================
    -- TEST 7: DUPLICATE DRILL NAME
    -- ============================================

    SET v_error = FALSE;

    BEGIN
        DECLARE CONTINUE HANDLER FOR 1062
            SET v_error = TRUE;

        INSERT INTO drills (
            skill_id,
            name,
            description
        )
        VALUES (
            (
                SELECT skill_id
                FROM skills
                WHERE skill_name = 'Puck Control'
                LIMIT 1
            ),
            'Figure Eight Control',
            'Duplicate drill test'
        );
    END;

    SELECT
        'Duplicate drill name' AS test_name,
        IF(v_error, 'PASS', 'FAIL') AS result;


    -- Remove all temporary test records
    ROLLBACK;

END$$

DELIMITER ;


-- ============================================
-- EXECUTE TESTS
-- ============================================

CALL test_negative_constraints();


-- ============================================
-- CLEAN UP TEST PROCEDURE
-- ============================================

DROP PROCEDURE IF EXISTS test_negative_constraints;

