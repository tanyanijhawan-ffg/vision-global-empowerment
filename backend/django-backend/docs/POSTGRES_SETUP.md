# PostgreSQL Setup and Execution Guide

This project is configured to use PostgreSQL via Django environment variables. The database connection is defined in the Django settings file and can be overridden with environment variables.

## 1. Recommended Environment Variables

Set the following variables before running Django migrations or scripts:

```bash
export DB_NAME=vision_global_empowerment
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_HOST=localhost
export DB_PORT=5432
```

Windows PowerShell:

```powershell
$env:DB_NAME = "vision_global_empowerment"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "your_password"
$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
```

## 2. Connection String Pattern

```text
postgresql://<user>:<password>@<host>:<port>/<database_name>
```

Example:

```text
postgresql://postgres:your_password@localhost:5432/vision_global_empowerment
```

## 3. Database Structure Overview

Core tables relevant to the assessment module:

```text
assessment_type
subject
assessment
assessment_score
assessment_diagnostic
student_learning_behaviour
student_observation
learning_behaviour_option
diagnostic_option
assessment_submission
```

## 4. Schema Naming Conventions

- Use snake_case for table and column names.
- Primary keys are typically auto-increment integer IDs.
- Foreign keys are named clearly, such as `assessment_type`, `student`, `subject`.
- The app uses Postgres-compatible UTF-8 and text fields for free-form descriptions.

## 5. Execute SQL Scripts in PostgreSQL

### Option A: psql command line

```bash
psql "postgresql://postgres:your_password@localhost:5432/vision_global_empowerment" -f ./scripts/seed_assessment_metadata.sql
```

### Option B: run a SQL file in a database

```bash
psql -h localhost -U postgres -d vision_global_empowerment -f ./scripts/seed_assessment_metadata.sql
```

### Option C: Windows PowerShell

```powershell
psql "host=localhost port=5432 dbname=vision_global_empowerment user=postgres password=your_password" -f .\scripts\seed_assessment_metadata.sql
```

## 6. Example SQL Script

Create a script at `postgres/scripts/seed_assessment_metadata.sql` with content like:

```sql
INSERT INTO assessment_type (code, name, duration_months, is_active)
VALUES
  ('QUARTERLY', 'Quarterly', 3, true),
  ('HALF_YEARLY', 'Half-Yearly', 6, true),
  ('ANNUAL', 'Annual', 12, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  duration_months = EXCLUDED.duration_months,
  is_active = EXCLUDED.is_active;
```

## 7. Recommended Folder Structure

```text
backend/
  django-backend/
    docs/
      ASSESSMENT_APIS.md
      POSTGRES_SETUP.md
    postgres/
      scripts/
        seed_assessment_metadata.sql
        run_sql.ps1
```

## 8. Helper Script Example

Create `postgres/scripts/run_sql.ps1`:

```powershell
param(
    [string]$Database = "vision_global_empowerment",
    [string]$Host = "localhost",
    [string]$User = "postgres",
    [string]$Password = "your_password",
    [string]$SqlFile = "./seed_assessment_metadata.sql"
)

psql "host=$Host port=5432 dbname=$Database user=$User password=$Password" -f $SqlFile
```

Usage:

```powershell
./run_sql.ps1 -Database vision_global_empowerment -SqlFile ./seed_assessment_metadata.sql
```

## 9. Important Notes

- For local development, use a dedicated database so you do not overwrite production data.
- If PostgreSQL tables already exist, use a migration strategy or a fresh database before reapplying schema changes.
- Always run database backup and restore commands before destructive operations.
