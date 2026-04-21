-- ─────────────────────────────────────────────────────────────────────────────
-- patch_missing_columns.sql
-- Run this once against your running database to add the columns that the
-- controllers reference but that were never created in init.sql.
--
-- Safe to run multiple times — each statement checks IF NOT EXISTS first.
-- ─────────────────────────────────────────────────────────────────────────────

USE university_library;

-- ── 1. Faculty: qualification, specialization, office_location, profile_bio ──
-- The faculty controller selects all of these; add any that are missing.
ALTER TABLE Faculty
  ADD COLUMN IF NOT EXISTS qualification    VARCHAR(255)  NULL AFTER designation,
  ADD COLUMN IF NOT EXISTS specialization   VARCHAR(255)  NULL AFTER qualification,
  ADD COLUMN IF NOT EXISTS office_location  VARCHAR(255)  NULL AFTER specialization,
  ADD COLUMN IF NOT EXISTS profile_bio      TEXT          NULL AFTER office_location,
  ADD COLUMN IF NOT EXISTS joining_date     DATE          NULL AFTER profile_bio,
  ADD COLUMN IF NOT EXISTS gender           ENUM('male','female','other') NULL AFTER joining_date,
  ADD COLUMN IF NOT EXISTS is_registered    TINYINT(1)    NOT NULL DEFAULT 0 AFTER gender;

-- ── 2. Students: gender, date_of_birth, address, profile_bio, cgpa ───────────
ALTER TABLE Students
  ADD COLUMN IF NOT EXISTS gender           ENUM('male','female','other') NULL AFTER academic_year,
  ADD COLUMN IF NOT EXISTS date_of_birth    DATE          NULL AFTER gender,
  ADD COLUMN IF NOT EXISTS address          VARCHAR(500)  NULL AFTER date_of_birth,
  ADD COLUMN IF NOT EXISTS profile_bio      TEXT          NULL AFTER address,
  ADD COLUMN IF NOT EXISTS cgpa             DECIMAL(3,2)  NULL AFTER profile_bio,
  ADD COLUMN IF NOT EXISTS is_registered    TINYINT(1)    NOT NULL DEFAULT 0;

-- ── 3. Library_Members: created_at ───────────────────────────────────────────
ALTER TABLE Library_Members
  ADD COLUMN IF NOT EXISTS created_at       DATETIME      NOT NULL
    DEFAULT CURRENT_TIMESTAMP AFTER status;