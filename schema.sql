create DATABASE IF NOT EXISTS edu
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE edu;

SET FOREIGN_KEY_CHECKS = 0;


-- Users table: student accounts with session tracking and per-garden paid access
CREATE TABLE IF NOT EXISTS users (
  id                VARCHAR(20)    NOT NULL PRIMARY KEY,
  email             VARCHAR(255)   NOT NULL UNIQUE,
  phone             VARCHAR(30)    NOT NULL,
  name              VARCHAR(255)   DEFAULT NULL,
  passwordHash      VARCHAR(255)   NOT NULL,
  isVerified        TINYINT(1)     NOT NULL DEFAULT 0,
  verificationCode  VARCHAR(10)    NOT NULL DEFAULT '',
  createdAt         DATETIME       NOT NULL,
  current_session_id VARCHAR(40)   DEFAULT NULL,
  paidGardens       JSON           DEFAULT ('[]')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments table: sandbox checkout transactions
CREATE TABLE IF NOT EXISTS payments (
  id            VARCHAR(30)   NOT NULL PRIMARY KEY,
  userId        VARCHAR(20)   NOT NULL,
  userEmail     VARCHAR(255)  NOT NULL,
  gardenId      VARCHAR(20)   NOT NULL,
  currency      VARCHAR(4)    NOT NULL DEFAULT 'EGP',
  amount        INT           NOT NULL,
  gateway       VARCHAR(20)   NOT NULL DEFAULT 'paymob',
  paymentMethod VARCHAR(50)   NOT NULL,
  screenshot    TEXT          DEFAULT NULL,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  timestamp     DATETIME      NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student growth table: per‑seed watch progress
CREATE TABLE IF NOT EXISTS student_growth (
  userId         VARCHAR(20) NOT NULL,
  seedId         VARCHAR(20) NOT NULL,
  watchedSeconds INT         NOT NULL DEFAULT 0,
  lastUpdated    DATETIME    DEFAULT NULL,
  PRIMARY KEY (userId, seedId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gardens (courses) table
CREATE TABLE IF NOT EXISTS gardens (
  id            VARCHAR(20)   NOT NULL PRIMARY KEY,
  titleEn       VARCHAR(255)  NOT NULL,
  titleAr       VARCHAR(255)  NOT NULL,
  titleTr       VARCHAR(255)  NOT NULL,
  descriptionEn TEXT          NOT NULL,
  descriptionAr TEXT          NOT NULL,
  descriptionTr TEXT          NOT NULL,
  category      VARCHAR(100)  NOT NULL,
  priceEGP      INT           NOT NULL DEFAULT 0,
  priceTRY      INT           NOT NULL DEFAULT 0,
  rating        DECIMAL(2,1)  NOT NULL DEFAULT 0.0,
  image         VARCHAR(500)  NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seeds (video lessons) table
CREATE TABLE IF NOT EXISTS seeds (
  id       VARCHAR(20)   NOT NULL PRIMARY KEY,
  gardenId VARCHAR(20)   NOT NULL,
  titleEn  VARCHAR(255)  NOT NULL,
  titleAr  VARCHAR(255)  NOT NULL,
  titleTr  VARCHAR(255)  NOT NULL,
  duration VARCHAR(10)   NOT NULL DEFAULT '00:00',
  videoUrl VARCHAR(500)  NOT NULL DEFAULT '',
  status   ENUM('bloomed','growing','dormant') NOT NULL DEFAULT 'growing',
  section  VARCHAR(100) NOT NULL DEFAULT '',
  sortOrder INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed tags (many-to-many between seeds and tag strings)
CREATE TABLE IF NOT EXISTS seed_tags (
  seedId VARCHAR(20) NOT NULL,
  tag    VARCHAR(50) NOT NULL,
  PRIMARY KEY (seedId, tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Emails (mock inbox) table
CREATE TABLE IF NOT EXISTS emails (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  userId          VARCHAR(20)   NOT NULL,
  toEmail         VARCHAR(255)  NOT NULL,
  subject         VARCHAR(255)  NOT NULL,
  bodyEn          TEXT          NOT NULL,
  bodyAr          TEXT          NOT NULL,
  bodyTr          TEXT          NOT NULL,
  otpCode         VARCHAR(10)   DEFAULT NULL,
  isRead          TINYINT(1)    NOT NULL DEFAULT 0,
  timestamp       DATETIME      NOT NULL,
  isGrowthReport  TINYINT(1)    NOT NULL DEFAULT 0,
  isWelcome       TINYINT(1)    NOT NULL DEFAULT 0,
  gardenId        VARCHAR(20)   DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Queries (student questions on seeds) table
CREATE TABLE IF NOT EXISTS queries (
  id          VARCHAR(30)  NOT NULL PRIMARY KEY,
  seedId      VARCHAR(20)  NOT NULL,
  studentName VARCHAR(100) NOT NULL,
  studentEmail VARCHAR(255) NOT NULL,
  avatar      VARCHAR(500) DEFAULT '',
  question    TEXT         NOT NULL,
  createdTime DATETIME     NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Query replies table
CREATE TABLE IF NOT EXISTS query_replies (
  id        VARCHAR(30) NOT NULL PRIMARY KEY,
  queryId   VARCHAR(30) NOT NULL,
  author    VARCHAR(100) NOT NULL,
  text      TEXT         NOT NULL,
  timestamp DATETIME     NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OTP verifications (garden access OTP codes) table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id        VARCHAR(30) NOT NULL PRIMARY KEY,
  userId    VARCHAR(20) NOT NULL,
  gardenId  VARCHAR(20) NOT NULL,
  otpCode   VARCHAR(10) NOT NULL,
  isUsed    TINYINT(1)  NOT NULL DEFAULT 0,
  timestamp DATETIME    NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quiz questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id           VARCHAR(30)  NOT NULL PRIMARY KEY,
  seedId       VARCHAR(20)  NOT NULL,
  timestamp    INT          NOT NULL DEFAULT 0,
  questionEn   TEXT         NOT NULL,
  questionAr   TEXT         NOT NULL,
  questionTr   TEXT         NOT NULL,
  optionsEn    JSON         NOT NULL,
  optionsAr    JSON         NOT NULL,
  optionsTr    JSON         NOT NULL,
  correctIndex INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quiz answers table
CREATE TABLE IF NOT EXISTS quiz_answers (
  userId     VARCHAR(20) NOT NULL,
  userEmail  VARCHAR(255) NOT NULL DEFAULT '',
  userName   VARCHAR(255) NOT NULL DEFAULT '',
  seedId     VARCHAR(20) NOT NULL,
  questionId VARCHAR(30) NOT NULL,
  isCorrect  TINYINT(1)  NOT NULL DEFAULT 0,
  timestamp  DATETIME    NOT NULL,
  PRIMARY KEY (userId, seedId, questionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
USE edu;

select * from users;
select * from gardens;
select * from seeds;
select * from seed_tags;
select * from payments;
select * from emails;
select * from otp_verifications;
select * from queries;
select * from quiz_questions;
select * from quiz_answers;
select * from student_growth;