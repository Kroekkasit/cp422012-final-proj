-- Schema for central teacher website (auth + future classrooms)

CREATE DATABASE IF NOT EXISTS attendex
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE attendex;

CREATE TABLE IF NOT EXISTS teachers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_username (username)
);

-- Classrooms (teacher creates these from dashboard)
CREATE TABLE IF NOT EXISTS classrooms (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id INT UNSIGNED NOT NULL,
  name VARCHAR(128) NOT NULL,
  subject_name VARCHAR(128) NULL,
  subject_id VARCHAR(32) NULL,
  section VARCHAR(32) NULL,
  max_students INT UNSIGNED NULL,
  room VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_teacher (teacher_id),
  CONSTRAINT fk_classroom_teacher
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Attendance sessions (4-digit code, linked to classroom; host uses code to start AP session)
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  classroom_id INT UNSIGNED NOT NULL,
  code CHAR(4) NOT NULL,
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_code (code),
  KEY idx_classroom (classroom_id),
  CONSTRAINT fk_session_classroom
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Students per classroom (student_id + optional name; one student_id per classroom, one MAC per student_id)
CREATE TABLE IF NOT EXISTS classroom_students (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  classroom_id INT UNSIGNED NOT NULL,
  student_id VARCHAR(32) NOT NULL,
  full_name VARCHAR(128) NULL,
  mac_address CHAR(17) NULL,
  first_seen_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_classroom_student (classroom_id, student_id),
  KEY idx_classroom (classroom_id),
  CONSTRAINT fk_cs_classroom
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Attendance check-ins (one per student per session)
CREATE TABLE IF NOT EXISTS attendance_checks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id INT UNSIGNED NOT NULL,
  classroom_student_id INT UNSIGNED NOT NULL,
  checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_session_student (session_id, classroom_student_id),
  KEY idx_session (session_id),
  CONSTRAINT fk_check_session
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_check_student
    FOREIGN KEY (classroom_student_id) REFERENCES classroom_students(id) ON DELETE CASCADE ON UPDATE CASCADE
);

