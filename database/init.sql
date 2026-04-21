SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS `university_library`;
CREATE DATABASE `university_library` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `university_library`;

-- ============================================================
-- LEVEL 1: Independent Tables
-- ============================================================
CREATE TABLE `Department` (
  `department_id` INT PRIMARY KEY AUTO_INCREMENT,
  `department_name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE `Publishers` (
  `publisher_id` INT PRIMARY KEY AUTO_INCREMENT,
  `publisher_name` VARCHAR(150) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE `Categories` (
  `category_id` INT PRIMARY KEY AUTO_INCREMENT,
  `category_name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE `Authors` (
  `author_id` INT PRIMARY KEY AUTO_INCREMENT,
  `author_name` VARCHAR(150) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE `Librarians` (
  `librarian_id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','staff') DEFAULT 'staff'
) ENGINE=InnoDB;

CREATE TABLE `Borrowing_Policy` (
  `policy_id` INT PRIMARY KEY AUTO_INCREMENT,
  `member_type` ENUM('student','faculty') NOT NULL UNIQUE,
  `max_books_allowed` INT NOT NULL,
  `loan_duration_days` INT,
  `fine_per_day` DECIMAL(5,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB;

-- ============================================================
-- LEVEL 2: Entities with Dependencies
-- ============================================================
CREATE TABLE `Students` (
  `student_id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `registration_no` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(15),
  `password` VARCHAR(255),
  `department_id` INT NOT NULL,
  `academic_year` ENUM('1st Year','2nd Year','3rd Year','4th Year','Graduate'),
  `gender` ENUM('male','female','other') NULL,
  `date_of_birth` DATE NULL,
  `address` VARCHAR(500) NULL,
  `profile_bio` TEXT NULL,
  `cgpa` DECIMAL(3,2) DEFAULT 0.00,
  `is_registered` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_student_dept` FOREIGN KEY (`department_id`) REFERENCES `Department`(`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `Faculty` (
  `faculty_id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `employee_no` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(15),
  `password` VARCHAR(255),
  `department_id` INT NOT NULL,
  `designation` VARCHAR(100),
  `qualification` VARCHAR(255) NULL,
  `specialization` VARCHAR(255) NULL,
  `office_location` VARCHAR(255) NULL,
  `profile_bio` TEXT NULL,
  `joining_date` DATE NULL,
  `gender` ENUM('male','female','other') NULL,
  `is_registered` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_faculty_dept` FOREIGN KEY (`department_id`) REFERENCES `Department`(`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `Books` (
  `book_id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `isbn` VARCHAR(20) UNIQUE,
  `edition` VARCHAR(50),
  `publication_year` INT,
  `publisher_id` INT,
  `category_id` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_book_publisher` FOREIGN KEY (`publisher_id`) REFERENCES `Publishers`(`publisher_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_book_category` FOREIGN KEY (`category_id`) REFERENCES `Categories`(`category_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- LEVEL 3: Core Business Logic
-- ============================================================
CREATE TABLE `Library_Members` (
  `member_id` INT PRIMARY KEY AUTO_INCREMENT,
  `member_type` ENUM('student','faculty') NOT NULL,
  `student_id` INT UNIQUE,
  `faculty_id` INT UNIQUE,
  `membership_date` DATE NOT NULL,
  `status` ENUM('active','suspended') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_member_student` FOREIGN KEY (`student_id`) REFERENCES `Students`(`student_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_member_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `Faculty`(`faculty_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ARC Trigger: enforce exactly one of student_id / faculty_id
DELIMITER //
CREATE TRIGGER `trg_member_exclusive_arc` BEFORE INSERT ON `Library_Members` FOR EACH ROW 
BEGIN 
    IF (NEW.student_id IS NOT NULL AND NEW.faculty_id IS NOT NULL)
       OR (NEW.student_id IS NULL AND NEW.faculty_id IS NULL) THEN 
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Must set exactly one of student_id or faculty_id'; 
    END IF; 
END//
DELIMITER ;

CREATE TABLE `Book_Copies` (
  `copy_id` INT PRIMARY KEY AUTO_INCREMENT,
  `book_id` INT NOT NULL,
  `barcode` VARCHAR(50) NOT NULL UNIQUE,
  `shelf_location` VARCHAR(100),
  `status` ENUM('available','issued') NOT NULL DEFAULT 'available',
  CONSTRAINT `fk_copy_book` FOREIGN KEY (`book_id`) REFERENCES `Books`(`book_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `Book_Authors` (
  `book_id` INT NOT NULL,
  `author_id` INT NOT NULL,
  `author_order` INT DEFAULT 1,
  PRIMARY KEY (`book_id`, `author_id`),
  CONSTRAINT `fk_ba_book` FOREIGN KEY (`book_id`) REFERENCES `Books`(`book_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ba_author` FOREIGN KEY (`author_id`) REFERENCES `Authors`(`author_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- LEVEL 4: Transactions
-- ============================================================
CREATE TABLE `Issue_Transactions` (
  `issue_id` INT PRIMARY KEY AUTO_INCREMENT,
  `copy_id` INT NOT NULL,
  `member_id` INT NOT NULL,
  `librarian_id` INT NOT NULL,
  `issue_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `return_date` DATE,
  `fine_amount` DECIMAL(8,2) DEFAULT 0.00,
  CONSTRAINT `fk_txn_copy` FOREIGN KEY (`copy_id`) REFERENCES `Book_Copies`(`copy_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_txn_member` FOREIGN KEY (`member_id`) REFERENCES `Library_Members`(`member_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_txn_librarian` FOREIGN KEY (`librarian_id`) REFERENCES `Librarians`(`librarian_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- Dummy credentials:
--   admin    username: admin      password: admin123
--   staff    username: staff1     password: staff123
--   student  email: ali.hassan@uni.edu  / reg: CS-2021-001  password: student123
--   faculty  email: irfan.malik@uni.edu / emp: FAC-001       password: faculty123
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO `Department` (`department_name`) VALUES
  ('Computer Science'),
  ('Mathematics'),
  ('Physics'),
  ('Electrical Engineering'),
  ('Business Administration');

INSERT INTO `Publishers` (`publisher_name`) VALUES
  ('MIT Press'),
  ('O''Reilly Media'),
  ('Pearson'),
  ('Wiley'),
  ('McGraw-Hill');

INSERT INTO `Categories` (`category_name`) VALUES
  ('Algorithms'),
  ('Networking'),
  ('Database'),
  ('Operating Systems'),
  ('Software Engineering');

INSERT INTO `Authors` (`author_name`) VALUES
  ('Thomas H. Cormen'),
  ('Robert C. Martin'),
  ('Andrew Tanenbaum'),
  ('Abraham Silberschatz'),
  ('Ian Sommerville');

INSERT INTO `Borrowing_Policy` (`member_type`, `max_books_allowed`, `loan_duration_days`, `fine_per_day`) VALUES
  ('student', 5,  14, 1.00),
  ('faculty', 10, 30, 0.00);

-- ── Librarians (password: admin123) ──────────────────────────────────────────
-- Hash below = bcrypt('admin123', 10)
INSERT INTO `Librarians` (`name`, `username`, `password`, `role`) VALUES
  ('System Admin',  'admin',  '$2b$10$544MYTvwzP.JMqX7GjmhM.03u1kIRnEoTc5Cw6FA2d73nm14pulzq', 'admin'),
  ('Sara Khan',     'staff1', '$2b$10$544MYTvwzP.JMqX7GjmhM.03u1kIRnEoTc5Cw6FA2d73nm14pulzq', 'staff');

-- ── Students (password: student123) ──────────────────────────────────────────
-- Hash below = bcrypt('student123', 10)
INSERT INTO `Students`
  (`name`, `registration_no`, `email`, `department_id`, `academic_year`, `gender`, `password`, `is_registered`)
VALUES
  ('Ali Hassan',   'CS-2021-001', 'ali.hassan@uni.edu',   1, '3rd Year', 'male',   '$2b$10$JUVLoUqKcmZZGg37GzBKrexhjI5I9q63RJLfE5TbHmaT7OHy0rv4e', 1),
  ('Sara Ahmed',   'CS-2022-002', 'sara.ahmed@uni.edu',   1, '2nd Year', 'female', '$2b$10$JUVLoUqKcmZZGg37GzBKrexhjI5I9q63RJLfE5TbHmaT7OHy0rv4e', 1),
  ('Bilal Yousuf', 'MT-2020-001', 'bilal.yousuf@uni.edu', 2, '4th Year', 'male',   '$2b$10$JUVLoUqKcmZZGg37GzBKrexhjI5I9q63RJLfE5TbHmaT7OHy0rv4e', 1);

-- ── Faculty (password: faculty123) ───────────────────────────────────────────
-- Hash below = bcrypt('faculty123', 10)
INSERT INTO `Faculty`
  (`name`, `employee_no`, `email`, `department_id`, `designation`, `gender`, `password`, `is_registered`)
VALUES
  ('Dr. Irfan Malik',  'FAC-001', 'irfan.malik@uni.edu',  1, 'Associate Professor', 'male',   '$2b$10$Ep5g2lE0lEMzaHJ5.bmoMuXj2qQr6XKk9HgRsxbFiB1uLoH8dhQXa', 1),
  ('Dr. Amna Siddiqui','FAC-002', 'amna.siddiqui@uni.edu',2, 'Assistant Professor', 'female', '$2b$10$Ep5g2lE0lEMzaHJ5.bmoMuXj2qQr6XKk9HgRsxbFiB1uLoH8dhQXa', 1);

-- ── Library Members ───────────────────────────────────────────────────────────
INSERT INTO `Library_Members` (`member_type`, `student_id`, `faculty_id`, `membership_date`) VALUES
  ('student', 1, NULL, '2021-09-01'),
  ('student', 2, NULL, '2022-09-01'),
  ('student', 3, NULL, '2020-09-01'),
  ('faculty', NULL, 1,  '2021-09-01'),
  ('faculty', NULL, 2,  '2022-01-15');

-- ── Books ─────────────────────────────────────────────────────────────────────
INSERT INTO `Books` (`title`, `isbn`, `publisher_id`, `category_id`, `edition`, `publication_year`) VALUES
  ('Introduction to Algorithms',         '978-0262033848', 1, 1, '4th', 2022),
  ('Computer Networks',                  '978-0133594140', 3, 2, '5th', 2011),
  ('Database System Concepts',           '978-0078022159', 3, 3, '7th', 2019),
  ('Operating System Concepts',          '978-1118063330', 4, 4, '10th',2018),
  ('Clean Code',                         '978-0132350884', 2, 5, '1st', 2008),
  ('Software Engineering',               '978-0133943030', 3, 5, '10th',2015);

INSERT INTO `Book_Authors` (`book_id`, `author_id`, `author_order`) VALUES
  (1, 1, 1),
  (2, 3, 1),
  (3, 4, 1),
  (4, 4, 1),
  (5, 2, 1),
  (6, 5, 1);

INSERT INTO `Book_Copies` (`book_id`, `barcode`, `status`, `shelf_location`) VALUES
  (1, 'CS-001-A', 'available', 'Shelf-A1'),
  (1, 'CS-001-B', 'available', 'Shelf-A1'),
  (2, 'NW-002-A', 'available', 'Shelf-B1'),
  (3, 'DB-003-A', 'available', 'Shelf-C1'),
  (3, 'DB-003-B', 'available', 'Shelf-C1'),
  (4, 'OS-004-A', 'available', 'Shelf-D1'),
  (5, 'CC-005-A', 'available', 'Shelf-E1'),
  (6, 'SE-006-A', 'available', 'Shelf-E2');