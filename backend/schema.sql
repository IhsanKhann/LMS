-- ============================================================
-- University Library Management System - Complete SQL Schema
-- Creation Order: Respects all Foreign Key dependencies
-- ============================================================

CREATE DATABASE IF NOT EXISTS university_library;
USE university_library;

-- ============================================================
-- LEVEL 1: Independent Tables (No Foreign Keys)
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

CREATE TABLE Librarians (
  librarian_id INT PRIMARY KEY AUTO_INCREMENT,
  name         VARCHAR(100) NOT NULL,
  username     VARCHAR(50) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,  -- bcrypt hash
  role         ENUM('admin', 'staff') DEFAULT 'staff',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Borrowing_Policy (
  policy_id         INT PRIMARY KEY AUTO_INCREMENT,
  member_type       ENUM('student', 'faculty') NOT NULL UNIQUE,
  max_books_allowed INT NOT NULL,
  loan_duration_days INT,             -- NULL = no limit (faculty)
  fine_per_day      DECIMAL(5,2) NOT NULL DEFAULT 0.00
);

-- ============================================================
-- LEVEL 2: References Level 1
-- ============================================================

CREATE TABLE Students (
  student_id      INT PRIMARY KEY AUTO_INCREMENT,
  name            VARCHAR(100) NOT NULL,
  registration_no VARCHAR(50) NOT NULL UNIQUE,
  email           VARCHAR(100) NOT NULL UNIQUE,
  phone           VARCHAR(15),
  department_id   INT NOT NULL,
  date_of_birth   DATE,
  enrollment_date DATE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES Department(department_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_student_dept (department_id),
  INDEX idx_student_email (email)
);

CREATE TABLE Faculty (
  faculty_id    INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  employee_no   VARCHAR(50) NOT NULL UNIQUE,
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
  isbn             VARCHAR(20) UNIQUE,
  edition          VARCHAR(50),
  publication_year INT,
  publisher_id     INT,
  category_id      INT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publisher_id) REFERENCES Publishers(publisher_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (category_id) REFERENCES Categories(category_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_book_title (title),
  INDEX idx_book_isbn (isbn)
);

-- ============================================================
-- LEVEL 3: References Level 1 & 2
-- ============================================================

-- EXCLUSIVE ARC: exactly one of (student_id, faculty_id) must be NOT NULL
CREATE TABLE Library_Members (
  member_id       INT PRIMARY KEY AUTO_INCREMENT,
  member_type     ENUM('student', 'faculty') NOT NULL,
  student_id      INT UNIQUE,            -- nullable FK
  faculty_id      INT UNIQUE,            -- nullable FK
  membership_date DATE NOT NULL,
  status          ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES Students(student_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  -- Exclusive Arc Constraint: exactly one FK must be NOT NULL
  CONSTRAINT chk_exclusive_arc
    CHECK (
      (student_id IS NOT NULL AND faculty_id IS NULL) OR
      (student_id IS NULL AND faculty_id IS NOT NULL)
    )
);

CREATE TABLE Book_Copies (
  copy_id        INT PRIMARY KEY AUTO_INCREMENT,
  book_id        INT NOT NULL,
  barcode        VARCHAR(50) NOT NULL UNIQUE,
  shelf_location VARCHAR(50),
  status         ENUM('available', 'issued') NOT NULL DEFAULT 'available',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES Books(book_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_copy_barcode (barcode),
  INDEX idx_copy_status (status)
);

-- Bridge table for M:N Books <-> Authors
CREATE TABLE Book_Authors (
  book_id      INT NOT NULL,
  author_id    INT NOT NULL,
  author_order INT NOT NULL DEFAULT 1,  -- 1=first/primary author
  PRIMARY KEY (book_id, author_id),
  FOREIGN KEY (book_id) REFERENCES Books(book_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (author_id) REFERENCES Authors(author_id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- LEVEL 4: Final Level (References everything above)
-- ============================================================

CREATE TABLE Issue_Transactions (
  issue_id     INT PRIMARY KEY AUTO_INCREMENT,
  copy_id      INT NOT NULL,
  member_id    INT NOT NULL,
  librarian_id INT NOT NULL,
  issue_date   DATE NOT NULL DEFAULT (CURRENT_DATE),
  due_date     DATE NOT NULL,
  return_date  DATE,                    -- NULL = not yet returned
  fine_amount  DECIMAL(8,2) DEFAULT 0.00,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (copy_id) REFERENCES Book_Copies(copy_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (member_id) REFERENCES Library_Members(member_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (librarian_id) REFERENCES Librarians(librarian_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_txn_member (member_id),
  INDEX idx_txn_copy (copy_id),
  INDEX idx_txn_due (due_date)
);

-- ============================================================
-- VIEWS (Avoid storing derived data)
-- ============================================================

CREATE VIEW vw_book_availability AS
  SELECT
    b.book_id, b.title, b.isbn, b.edition, b.publication_year,
    p.publisher_name,
    c.category_name,
    COUNT(bc.copy_id)                                              AS total_copies,
    SUM(CASE WHEN bc.status = 'available' THEN 1 ELSE 0 END)      AS available_copies
  FROM Books b
  LEFT JOIN Book_Copies bc ON b.book_id = bc.book_id
  LEFT JOIN Publishers p   ON b.publisher_id = p.publisher_id
  LEFT JOIN Categories c   ON b.category_id = c.category_id
  GROUP BY b.book_id, b.title, b.isbn, b.edition,
           b.publication_year, p.publisher_name, c.category_name;

CREATE VIEW vw_overdue_transactions AS
  SELECT
    it.issue_id, b.title, bc.barcode,
    COALESCE(s.name, f.name)   AS borrower_name,
    COALESCE(s.email, f.email) AS borrower_email,
    lm.member_type,
    it.issue_date, it.due_date,
    DATEDIFF(CURRENT_DATE, it.due_date) AS days_overdue,
    (DATEDIFF(CURRENT_DATE, it.due_date) * bp.fine_per_day) AS accrued_fine
  FROM Issue_Transactions it
  JOIN Book_Copies bc        ON it.copy_id = bc.copy_id
  JOIN Books b               ON bc.book_id = b.book_id
  JOIN Library_Members lm    ON it.member_id = lm.member_id
  JOIN Borrowing_Policy bp   ON lm.member_type = bp.member_type
  LEFT JOIN Students s       ON lm.student_id = s.student_id
  LEFT JOIN Faculty f        ON lm.faculty_id = f.faculty_id
  WHERE it.return_date IS NULL AND it.due_date < CURRENT_DATE
  ORDER BY days_overdue DESC;

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO Department (department_name) VALUES
  ('Computer Science'), ('Mathematics'), ('English Literature'),
  ('Physics'), ('Business Administration');

INSERT INTO Publishers (publisher_name) VALUES
  ('MIT Press'), ('O\'Reilly Media'), ('Pearson Education'),
  ('Cambridge University Press'), ('McGraw-Hill');

INSERT INTO Categories (category_name) VALUES
  ('Computer Science'), ('Mathematics'), ('Fiction'),
  ('Science'), ('Engineering'), ('History');

INSERT INTO Borrowing_Policy (member_type, max_books_allowed, loan_duration_days, fine_per_day) VALUES
  ('student', 5, 14, 1.00),
  ('faculty', 10, NULL, 0.00);

INSERT INTO Librarians (name, username, password, role) VALUES
  ('Admin User', 'admin', '$2b$10$examplehashhere', 'admin'),
  ('Staff One', 'staff1', '$2b$10$examplehashhere', 'staff');