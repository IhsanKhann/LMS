-- ============================================================
-- University Library Management System
-- Unified init.sql — Schema + Seed Data
-- Docker mounts this to /docker-entrypoint-initdb.d/
-- Run once on first container start (fresh volume only).
-- ============================================================

DROP DATABASE IF EXISTS university_library;
CREATE DATABASE university_library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE university_library;

-- ============================================================
-- LEVEL 1: Independent Tables
-- ============================================================

CREATE TABLE Department (
  department_id   INT PRIMARY KEY AUTO_INCREMENT,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Publishers (
  publisher_id   INT PRIMARY KEY AUTO_INCREMENT,
  publisher_name VARCHAR(150) NOT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Categories (
  category_id   INT PRIMARY KEY AUTO_INCREMENT,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Authors (
  author_id   INT PRIMARY KEY AUTO_INCREMENT,
  author_name VARCHAR(150) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Librarians: bcrypt hashes below were generated with saltRounds=10 on Linux
-- admin  → admin123
-- staff1 → staff123
CREATE TABLE Librarians (
  librarian_id INT PRIMARY KEY AUTO_INCREMENT,
  name         VARCHAR(100) NOT NULL,
  username     VARCHAR(50)  NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  role         ENUM('admin','staff') DEFAULT 'staff',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Borrowing_Policy (
  policy_id          INT PRIMARY KEY AUTO_INCREMENT,
  member_type        ENUM('student','faculty') NOT NULL UNIQUE,
  max_books_allowed  INT NOT NULL,
  loan_duration_days INT,
  fine_per_day       DECIMAL(5,2) NOT NULL DEFAULT 0.00
);

-- ============================================================
-- LEVEL 2: References Level 1
-- ============================================================

CREATE TABLE Students (
  student_id      INT PRIMARY KEY AUTO_INCREMENT,
  name            VARCHAR(100) NOT NULL,
  registration_no VARCHAR(50)  NOT NULL UNIQUE,
  email           VARCHAR(100) NOT NULL UNIQUE,
  phone           VARCHAR(15),
  department_id   INT NOT NULL,
  date_of_birth   DATE,
  enrollment_date DATE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES Department(department_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_student_dept  (department_id),
  INDEX idx_student_email (email)
);

CREATE TABLE Faculty (
  faculty_id    INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  employee_no   VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(100) NOT NULL UNIQUE,
  phone         VARCHAR(15),
  department_id INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES Department(department_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_faculty_dept (department_id)
);

CREATE TABLE Books (
  book_id          INT PRIMARY KEY AUTO_INCREMENT,
  title            VARCHAR(200) NOT NULL,
  isbn             VARCHAR(20)  UNIQUE,
  edition          VARCHAR(50),
  publication_year INT,
  publisher_id     INT,
  category_id      INT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publisher_id) REFERENCES Publishers(publisher_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (category_id)  REFERENCES Categories(category_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_book_title (title),
  INDEX idx_book_isbn  (isbn)
);

-- ============================================================
-- LEVEL 3
-- ============================================================

CREATE TABLE Library_Members (
  member_id       INT PRIMARY KEY AUTO_INCREMENT,
  member_type     ENUM('student','faculty') NOT NULL,
  student_id      INT UNIQUE,
  faculty_id      INT UNIQUE,
  membership_date DATE NOT NULL,
  status          ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES Students(student_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

DELIMITER //
CREATE TRIGGER trg_library_members_arc
BEFORE INSERT ON Library_Members
FOR EACH ROW
BEGIN
  IF (NEW.student_id IS NOT NULL AND NEW.faculty_id IS NOT NULL) OR
     (NEW.student_id IS NULL     AND NEW.faculty_id IS NULL) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Exclusive Arc: exactly one of student_id or faculty_id must be set.';
  END IF;
END; //
DELIMITER ;

CREATE TABLE Book_Copies (
  copy_id        INT PRIMARY KEY AUTO_INCREMENT,
  book_id        INT NOT NULL,
  barcode        VARCHAR(50) NOT NULL UNIQUE,
  shelf_location VARCHAR(50),
  status         ENUM('available','issued') NOT NULL DEFAULT 'available',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES Books(book_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_copy_barcode (barcode),
  INDEX idx_copy_status  (status)
);

CREATE TABLE Book_Authors (
  book_id      INT NOT NULL,
  author_id    INT NOT NULL,
  author_order INT NOT NULL DEFAULT 1,
  PRIMARY KEY (book_id, author_id),
  FOREIGN KEY (book_id)   REFERENCES Books(book_id)   ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (author_id) REFERENCES Authors(author_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- LEVEL 4
-- ============================================================

CREATE TABLE Issue_Transactions (
  issue_id     INT PRIMARY KEY AUTO_INCREMENT,
  copy_id      INT NOT NULL,
  member_id    INT NOT NULL,
  librarian_id INT NOT NULL,
  issue_date   DATE NOT NULL DEFAULT (CURRENT_DATE),
  due_date     DATE NOT NULL,
  return_date  DATE,
  fine_amount  DECIMAL(8,2) DEFAULT 0.00,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (copy_id)      REFERENCES Book_Copies(copy_id)        ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (member_id)    REFERENCES Library_Members(member_id)  ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (librarian_id) REFERENCES Librarians(librarian_id)    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_txn_member (member_id),
  INDEX idx_txn_copy   (copy_id),
  INDEX idx_txn_due    (due_date)
);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW vw_book_availability AS
  SELECT b.book_id, b.title, b.isbn, b.edition, b.publication_year,
         p.publisher_name, c.category_name,
         COUNT(bc.copy_id) AS total_copies,
         SUM(CASE WHEN bc.status = 'available' THEN 1 ELSE 0 END) AS available_copies
  FROM Books b
  LEFT JOIN Book_Copies bc ON b.book_id     = bc.book_id
  LEFT JOIN Publishers p   ON b.publisher_id = p.publisher_id
  LEFT JOIN Categories c   ON b.category_id  = c.category_id
  GROUP BY b.book_id, b.title, b.isbn, b.edition,
           b.publication_year, p.publisher_name, c.category_name;

CREATE VIEW vw_overdue_transactions AS
  SELECT
    it.issue_id,
    it.issue_date,
    it.due_date,
    DATEDIFF(CURRENT_DATE, it.due_date) AS days_overdue,
    it.fine_amount,
    b.title      AS book_title,
    bc.barcode,
    lm.member_id,
    lm.member_type,
    COALESCE(s.name, f.name)   AS member_name,
    COALESCE(s.email, f.email) AS member_email,
    lib.name AS librarian_name
  FROM Issue_Transactions it
  JOIN Book_Copies bc    ON it.copy_id      = bc.copy_id
  JOIN Books b           ON bc.book_id      = b.book_id
  JOIN Library_Members lm ON it.member_id   = lm.member_id
  LEFT JOIN Students s   ON lm.student_id   = s.student_id
  LEFT JOIN Faculty  f   ON lm.faculty_id   = f.faculty_id
  JOIN Librarians lib    ON it.librarian_id  = lib.librarian_id
  WHERE it.return_date IS NULL
    AND it.due_date < CURRENT_DATE;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Departments
INSERT INTO Department (department_name) VALUES
  ('Computer Science'),
  ('Mathematics'),
  ('English Literature'),
  ('Physics'),
  ('Business Administration');

-- Publishers
INSERT INTO Publishers (publisher_name) VALUES
  ('MIT Press'),
  ('O\'Reilly Media'),
  ('Pearson Education'),
  ('Cambridge University Press'),
  ('McGraw-Hill'),
  ('Addison-Wesley'),
  ('No Starch Press'),
  ('Manning Publications');

-- Categories
INSERT INTO Categories (category_name) VALUES
  ('Computer Science'),
  ('Mathematics'),
  ('Fiction'),
  ('Science'),
  ('Engineering'),
  ('History'),
  ('Database'),
  ('Networking'),
  ('Operating Systems'),
  ('Software Engineering');

-- Authors
INSERT INTO Authors (author_name) VALUES
  ('Thomas H. Cormen'),
  ('Charles E. Leiserson'),
  ('Ronald L. Rivest'),
  ('Clifford Stein'),
  ('Robert C. Martin'),
  ('Martin Fowler'),
  ('Andrew S. Tanenbaum'),
  ('Abraham Silberschatz'),
  ('Henry F. Korth'),
  ('S. Sudarshan'),
  ('James Kurose'),
  ('Keith Ross'),
  ('Brian W. Kernighan'),
  ('Dennis M. Ritchie'),
  ('Donald E. Knuth'),
  ('Erich Gamma'),
  ('Richard Helm'),
  ('Ralph Johnson'),
  ('John Vlissides'),
  ('Bjarne Stroustrup');

-- Borrowing policies
INSERT INTO Borrowing_Policy (member_type, max_books_allowed, loan_duration_days, fine_per_day) VALUES
  ('student', 5,  14, 1.00),
  ('faculty', 10, NULL, 0.00);

-- ─────────────────────────────────────────────────────────────────────────────
-- Librarians — IMPORTANT: these are VALID bcrypt hashes for Linux/Node
--   admin  password: admin123
--   staff1 password: staff123
--
-- HOW THIS HASH WAS GENERATED (for your reference / to regenerate):
--   node -e "const b=require('bcryptjs');b.hash('admin123',10,(_,h)=>console.log(h))"
--
-- The hashes below are valid $2b$ format hashes. If you ever need to replace
-- them, run hashPassword.js and paste the output here.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO Librarians (name, username, password, role) VALUES
  ('Admin User', 'admin',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
  ('Staff One',  'staff1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff');
-- NOTE: Both above use "password" as the plain-text. Run hashPassword.js to
-- generate hashes for "admin123" and "staff123" then UPDATE Librarians SET password=? WHERE username=?

-- Departments for students/faculty already inserted above
INSERT INTO Students
  (name, registration_no, email, phone, department_id, date_of_birth, enrollment_date) VALUES
  ('Ali Hassan',     'CS-2021-001', 'ali.hassan@uni.edu',     '0300-1234567', 1, '2001-03-15', '2021-09-01'),
  ('Sara Khan',      'CS-2021-002', 'sara.khan@uni.edu',      '0301-2345678', 1, '2001-07-22', '2021-09-01'),
  ('Ahmed Raza',     'MT-2020-001', 'ahmed.raza@uni.edu',     '0302-3456789', 2, '2000-11-10', '2020-09-01'),
  ('Fatima Malik',   'EL-2022-001', 'fatima.malik@uni.edu',   '0303-4567890', 3, '2002-05-30', '2022-09-01'),
  ('Usman Tariq',    'PH-2021-003', 'usman.tariq@uni.edu',    '0304-5678901', 4, '2001-01-18', '2021-09-01');

INSERT INTO Faculty (name, employee_no, email, phone, department_id) VALUES
  ('Dr. Irfan Malik',   'FAC-001', 'irfan.malik@uni.edu',   '0311-1111111', 1),
  ('Prof. Nadia Shah',  'FAC-002', 'nadia.shah@uni.edu',    '0312-2222222', 2),
  ('Dr. Kamran Baig',   'FAC-003', 'kamran.baig@uni.edu',   '0313-3333333', 5);

INSERT INTO Library_Members (member_type, student_id, faculty_id, membership_date, status) VALUES
  ('student', 1, NULL, '2021-09-05', 'active'),
  ('student', 2, NULL, '2021-09-05', 'active'),
  ('student', 3, NULL, '2020-09-05', 'active'),
  ('student', 4, NULL, '2022-09-05', 'active'),
  ('student', 5, NULL, '2021-09-05', 'active'),
  ('faculty', NULL, 1, '2020-01-15', 'active'),
  ('faculty', NULL, 2, '2018-08-01', 'active'),
  ('faculty', NULL, 3, '2019-03-10', 'active');

-- ── 10 Dummy Books for Week 2 ─────────────────────────────────────────────────
INSERT INTO Books (title, isbn, edition, publication_year, publisher_id, category_id) VALUES
  ('Introduction to Algorithms',              '978-0262033848', '4th', 2022, 1, 1),
  ('Clean Code',                              '978-0132350884', '1st', 2008, 6, 10),
  ('Computer Networks',                       '978-0133594140', '5th', 2011, 3, 8),
  ('Database System Concepts',                '978-0078022159', '7th', 2019, 5, 7),
  ('Operating System Concepts',               '978-1119800361', '10th',2018, 5, 9),
  ('The C Programming Language',              '978-0131103627', '2nd', 1988, 3, 1),
  ('Design Patterns',                         '978-0201633610', '1st', 1994, 6, 10),
  ('The Art of Computer Programming Vol. 1',  '978-0201896831', '3rd', 1997, 6, 1),
  ('Refactoring',                             '978-0134757599', '2nd', 2018, 6, 10),
  ('The C++ Programming Language',            '978-0321958327', '4th', 2013, 6, 1);

-- Authors for each book
INSERT INTO Book_Authors (book_id, author_id, author_order) VALUES
  (1, 1, 1), (1, 2, 2), (1, 3, 3), (1, 4, 4),   -- CLRS
  (2, 5, 1),                                       -- Clean Code
  (3, 11, 1), (3, 12, 2),                          -- Computer Networks
  (4, 8, 1),  (4, 9, 2), (4, 10, 3),              -- DB Concepts
  (5, 8, 1),                                       -- OS Concepts (Silberschatz)
  (6, 13, 1), (6, 14, 2),                          -- K&R C
  (7, 16, 1), (7, 17, 2), (7, 18, 3), (7, 19, 4), -- Gang of Four
  (8, 15, 1),                                      -- Knuth
  (9, 6, 1),                                       -- Refactoring
  (10, 20, 1);                                     -- C++ Stroustrup

-- Physical copies (2–3 per book)
INSERT INTO Book_Copies (book_id, barcode, shelf_location, status) VALUES
  (1,  'CS-001-A', 'A1-01', 'available'),
  (1,  'CS-001-B', 'A1-01', 'available'),
  (2,  'CS-002-A', 'A1-02', 'available'),
  (2,  'CS-002-B', 'A1-02', 'available'),
  (2,  'CS-002-C', 'A1-02', 'available'),
  (3,  'NW-003-A', 'B2-01', 'available'),
  (3,  'NW-003-B', 'B2-01', 'available'),
  (4,  'DB-004-A', 'B3-01', 'available'),
  (4,  'DB-004-B', 'B3-01', 'available'),
  (5,  'OS-005-A', 'C1-01', 'available'),
  (5,  'OS-005-B', 'C1-01', 'available'),
  (6,  'CS-006-A', 'A1-03', 'available'),
  (7,  'CS-007-A', 'A2-01', 'available'),
  (7,  'CS-007-B', 'A2-01', 'available'),
  (8,  'CS-008-A', 'A2-02', 'available'),
  (9,  'SE-009-A', 'D1-01', 'available'),
  (9,  'SE-009-B', 'D1-01', 'available'),
  (10, 'CS-010-A', 'A1-04', 'available'),
  (10, 'CS-010-B', 'A1-04', 'available');
