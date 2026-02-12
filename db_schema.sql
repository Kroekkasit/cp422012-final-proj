-- MySQL schema for classroom MAC-based attendance PoC

CREATE DATABASE IF NOT EXISTS classroom_attendance
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE classroom_attendance;

-- Single professor/AP for this PoC. If you need multiple APs/classes,
-- extend this with course and ap tables.

CREATE TABLE IF NOT EXISTS students (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id VARCHAR(32) NOT NULL,          -- stdid from user
  full_name VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_student_id (student_id)
);

CREATE TABLE IF NOT EXISTS devices (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mac_address CHAR(17) NOT NULL,            -- normalized XX:XX:XX:XX:XX:XX
  last_ip VARCHAR(45) NULL,                 -- IPv4/IPv6 textual
  last_seen TIMESTAMP NULL,
  student_id INT UNSIGNED NULL,             -- null until registered
  registered TINYINT(1) NOT NULL DEFAULT 0, -- 1 once stdid bound
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_mac (mac_address),
  KEY idx_student_id (student_id),
  CONSTRAINT fk_devices_student
    FOREIGN KEY (student_id) REFERENCES students(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  device_id INT UNSIGNED NOT NULL,
  ap_label VARCHAR(64) DEFAULT 'default_ap',
  checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_student (student_id),
  KEY idx_device (device_id),
  CONSTRAINT fk_attendance_student
    FOREIGN KEY (student_id) REFERENCES students(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_device
    FOREIGN KEY (device_id) REFERENCES devices(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
);

