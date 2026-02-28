-- Run this once if your classrooms table already exists without the new columns.
-- mysql -u root -p attendex < migrations/001_classrooms_extra_columns.sql
USE attendex;

ALTER TABLE classrooms ADD COLUMN subject_name VARCHAR(128) NULL AFTER name;
ALTER TABLE classrooms ADD COLUMN subject_id VARCHAR(32) NULL AFTER subject_name;
ALTER TABLE classrooms ADD COLUMN section VARCHAR(32) NULL AFTER subject_id;
ALTER TABLE classrooms ADD COLUMN max_students INT UNSIGNED NULL AFTER section;
ALTER TABLE classrooms ADD COLUMN room VARCHAR(64) NULL AFTER max_students;
