
# Hockey Training Assistant — MySQL Database

## Overview
This folder contains the MySQL database for the Hockey Training Assistant.

The database has 11 tables that store user accounts, training preferences, hockey drills, workouts, repetitions, performance results, and recommendations.
 - I will have to update ERD again 

**Database:** using MySQL 8.0.16+  

## SQL Files

### 1. schema.sql
**Purpose:** Creates the database and its 11 tables.

**Key components:**
- Primary keys and foreign keys
- User accounts and training settings
- Workouts, repetitions, and performance tracking
- Coach-player relationships and recommendations

**Note:** Contains `DROP DATABASE IF EXISTS`, which deletes existing data. This is for development resets only. Remove or separate it before testing with real user data.

### 2. drill_catalog.sql
**Purpose:** Seeds the database with four hockey drills.

**Key components:**
- Skill categories: Puck Control, Coordination, Speed, Awareness
- Drill instructions and technique guidance
- Recommended repetitions and durations
- Duplicate prevention

### 3. database_queries.sql
**Purpose:** Provides 23 SQL queries for backend integration.

**Key components:**
- Registration and login
- User preferences
- Workout creation and tracking
- Performance results and feedback
- Coach connections and recommendations
- Workout ownership checks

### 4. database_tests.sql
**Purpose:** Tests database functionality.

**Key components:**
- Table relationships and constraints
- Workout creation and drill ordering
- Repetition and performance tracking
- Test data cleanup using ROLLBACK

### 5. negative_tests.sql
**Purpose:** Verifies that invalid database operations are rejected.

**Key components:**
- Duplicate data prevention
- Foreign key validation
- Unique constraint testing

## Backend Integration — Ethan

### 1. Connect Python to MySQL
Use a MySQL driver or whatever platform to connect to MySQL

Connect to the `hockey_training_assistant` database and store credentials in environment variables.

### 2. Implement SQL Queries
Use `database_queries.sql` to build the backend's database functions and API endpoints.

The queries contain `?` placeholders. Convert these to the driver's parameter syntax (`%s` for mysql-connector-python).

**Important:** Queries 9, 12, 14, and 15 have ownership checks. Follow their exact parameter order.

### 3. Implement Workout Personalization
Read the user's preferences from `user_settings`:

- `skill_level`: Beginner, Intermediate, Advanced
- `primary_goal`: Puck control, Speed, Awareness
- `training_environment`: Indoor, Outdoor

Use these settings to:
- Recommend drills based on the user's primary goal
- Adjust sets, reps, and rest time based on skill level
- Consider indoor/outdoor training conditions

Query 5 returns all drills. Goal-based recommendations must be implemented in the backend.

Rest duration does not currently have a dedicated database column.

### 4. Implement Authentication and Data Security
- Use authenticated user IDs for database operations.
- Prevent users from modifying other players' workouts.
- Validate coach permissions.
- Handle SQL errors and database transactions.

### 5. Test Backend Integration
Verify that Python can:
- Retrieve drills and user preferences
- Create and complete workouts
- Save repetitions, feedback, and performance
- Retrieve workout history and recommendations

## Database Setup

Run these files in order:

1. `schema.sql`
2. `drill_catalog.sql`
3. `database_tests.sql`
4. `negative_tests.sql`

`database_queries.sql` contains backend query templates and should not be executed as one script.

## Current Status
SQL structure, seed data, and test scripts are prepared for integration.

Next: Run the database tests, connect the Python backend, and test the complete application workflow.
