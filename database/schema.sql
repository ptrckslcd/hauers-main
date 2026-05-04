-- ============================================================
-- HAUERS — COMPLETE DATABASE SCHEMA
-- MySQL 8.4 LTS
-- Based on HAUERS_SYSTEM_BLUEPRINT.md §9
-- ============================================================
-- NOTE: Passwords in seed data are stored as plaintext for
-- the prototype/demo only. Production must use bcrypt hashing.
-- Replace '$2b$10$[hash]' placeholders with real bcrypt hashes
-- before deploying. See Blueprint §2.6.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. USERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `role`          ENUM('reviewee', 'admin') NOT NULL DEFAULT 'reviewee',
  `first_name`    VARCHAR(100) NOT NULL,
  `last_name`     VARCHAR(100) NOT NULL,
  `email`         VARCHAR(255) NOT NULL UNIQUE,
  `password`      VARCHAR(255) NOT NULL,
  `is_verified`   BOOLEAN NOT NULL DEFAULT FALSE,
  `is_enrolled`   BOOLEAN NOT NULL DEFAULT FALSE,
  `exam_level`    ENUM('professional', 'subprofessional') DEFAULT NULL,
  `batch_id`      INT DEFAULT NULL,
  `streak`        INT NOT NULL DEFAULT 0,
  `is_suspended`  BOOLEAN NOT NULL DEFAULT FALSE,
  `is_approved`   BOOLEAN NOT NULL DEFAULT FALSE,
  `last_active`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────────
-- 2. EMAIL VERIFICATIONS (for OTP flow)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `email_verifications` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`     INT NOT NULL,
  `otp_hash`    VARCHAR(255) NOT NULL,
  `expires_at`  TIMESTAMP NOT NULL,
  `used`        BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 3. BATCHES (review cohorts managed by admin)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `batches` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `name`          VARCHAR(255) NOT NULL,
  `exam_level`    ENUM('professional', 'subprofessional') NOT NULL,
  `start_date`    DATE NOT NULL,
  `end_date`      DATE NOT NULL,
  `max_capacity`  INT DEFAULT NULL,
  `status`        ENUM('draft', 'active', 'closed') NOT NULL DEFAULT 'draft',
  `created_by`    INT NOT NULL,
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);

-- ────────────────────────────────────────────────────────────
-- 4. ENROLLMENT CODES (distributed by admin to reviewees)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `enrollment_codes` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `code`        VARCHAR(50) NOT NULL UNIQUE,
  `batch_id`    INT NOT NULL,
  `max_uses`    INT NOT NULL DEFAULT 1,
  `used_count`  INT NOT NULL DEFAULT 0,
  `expires_at`  DATETIME NULL DEFAULT NULL,
  `is_active`   BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 5. ENROLLMENTS (links reviewees to their batch)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `enrollments` (
  `id`                    INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`               INT NOT NULL,
  `batch_id`              INT NOT NULL,
  `enrollment_code_id`    INT DEFAULT NULL,
  `enrolled_at`           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_enrollment` (`user_id`, `batch_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`enrollment_code_id`) REFERENCES `enrollment_codes`(`id`) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- 6. DOMAINS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `domains` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `code`        VARCHAR(50) NOT NULL UNIQUE,
  `name`        VARCHAR(100) NOT NULL,
  `exam_level`  ENUM('professional', 'subprofessional', 'both') NOT NULL DEFAULT 'both',
  `sort_order`  INT NOT NULL DEFAULT 0
);

INSERT IGNORE INTO `domains` (`code`, `name`, `exam_level`, `sort_order`) VALUES
  ('verbal',       'Verbal Ability',      'both',           1),
  ('numerical',    'Numerical Ability',   'both',           2),
  ('clerical',     'Clerical Ability',    'both',           3),
  ('general_info', 'General Information', 'professional',   4),
  ('analytical',   'Analytical Ability',  'professional',   5);

-- ────────────────────────────────────────────────────────────
-- 7. QUESTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `questions` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `question_text`     TEXT NOT NULL,
  `choice_a`          VARCHAR(500) NOT NULL,
  `choice_b`          VARCHAR(500) NOT NULL,
  `choice_c`          VARCHAR(500) NOT NULL,
  `choice_d`          VARCHAR(500) NOT NULL,
  `correct_choice`    ENUM('a', 'b', 'c', 'd') NOT NULL,
  `explanation`       TEXT DEFAULT NULL,
  `difficulty`        ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  `exam_level`        ENUM('professional', 'subprofessional', 'both') NOT NULL DEFAULT 'both',
  `melo_difficulty`   FLOAT NOT NULL DEFAULT 1200.0,
  `status`            ENUM('active', 'draft', 'archived') NOT NULL DEFAULT 'active',
  `created_by`        INT DEFAULT NULL,
  `created_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- 8. QUESTION_DOMAINS (multi-domain tagging — needed for M-Elo
--    multi-concept updates where one question spans domains)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `question_domains` (
  `question_id`   INT NOT NULL,
  `domain_id`     INT NOT NULL,
  `weight`        FLOAT NOT NULL DEFAULT 1.0,
  PRIMARY KEY (`question_id`, `domain_id`),
  FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 9. LEARNER PROFILES (Learner Profiling Module data)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `learner_profiles` (
  `id`                      INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`                 INT NOT NULL UNIQUE,
  `target_exam_date`        DATE DEFAULT NULL,
  `study_hours_per_week`    FLOAT NOT NULL DEFAULT 5.0,
  `preferred_study_time`    ENUM('morning', 'afternoon', 'evening') DEFAULT NULL,
  `primary_device`          ENUM('desktop', 'mobile', 'tablet') DEFAULT NULL,
  `custom_field_responses`  JSON DEFAULT NULL,
  `completed_at`            DATETIME NULL DEFAULT NULL,
  `updated_at`              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 10. LEARNER DOMAIN SELF-RATINGS (Likert 1–5 per domain,
--     collected during onboarding — compared vs M-Elo in UI)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `learner_domain_self_ratings` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`     INT NOT NULL,
  `domain_id`   INT NOT NULL,
  `self_rating` TINYINT NOT NULL DEFAULT 3,
  UNIQUE KEY `unique_user_domain` (`user_id`, `domain_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 11. DOMAIN RATINGS (live M-Elo theta per user per domain —
--     the core adaptive state of the system)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `domain_ratings` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`         INT NOT NULL,
  `domain_id`       INT NOT NULL,
  `theta`           FLOAT NOT NULL DEFAULT 1200.0,
  `k_factor`        FLOAT NOT NULL DEFAULT 48.0,
  `sessions_count`  INT NOT NULL DEFAULT 0,
  `last_updated`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_domain_rating` (`user_id`, `domain_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 12. DOMAIN RATING HISTORY (snapshot per session for trend
--     charts in My Progress page)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `domain_rating_history` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`       INT NOT NULL,
  `domain_id`     INT NOT NULL,
  `session_id`    INT DEFAULT NULL,
  `session_type`  ENUM('diagnostic', 'practice') DEFAULT NULL,
  `theta`         FLOAT NOT NULL,
  `recorded_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 13. DIAGNOSTIC SESSIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `diagnostic_sessions` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`           INT NOT NULL,
  `batch_id`          INT NOT NULL,
  `exam_level`        ENUM('professional', 'subprofessional') NOT NULL,
  `total_questions`   INT NOT NULL,
  `correct_count`     INT NOT NULL DEFAULT 0,
  `time_taken_s`      INT DEFAULT NULL,
  `status`            ENUM('in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'in_progress',
  `started_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at`      DATETIME NULL DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 14. DIAGNOSTIC ANSWERS (per-item responses)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `diagnostic_answers` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `session_id`        INT NOT NULL,
  `question_id`       INT NOT NULL,
  `selected_choice`   ENUM('a', 'b', 'c', 'd') DEFAULT NULL,
  `is_correct`        BOOLEAN DEFAULT NULL,
  `time_spent_ms`     INT DEFAULT NULL,
  `answered_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`session_id`) REFERENCES `diagnostic_sessions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 15. PRACTICE SESSIONS (adaptive review sessions)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `practice_sessions` (
  `id`                  INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`             INT NOT NULL,
  `batch_id`            INT NOT NULL,
  `session_type`        ENUM('recommended', 'custom') NOT NULL DEFAULT 'recommended',
  `mode`                ENUM('practice', 'timed') NOT NULL DEFAULT 'practice',
  `domain_filter`       VARCHAR(100) DEFAULT NULL,
  `total_questions`     INT NOT NULL,
  `correct_count`       INT NOT NULL DEFAULT 0,
  `time_taken_s`        INT DEFAULT NULL,
  `status`              ENUM('in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'in_progress',
  `fatigue_detected`    BOOLEAN NOT NULL DEFAULT FALSE,
  `distribution_mode`   VARCHAR(20) DEFAULT '70_30',
  `started_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at`        DATETIME NULL DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE
);

-- Migrate existing practice_sessions tables (MySQL 8.0+)
ALTER TABLE `practice_sessions`
  ADD COLUMN IF NOT EXISTS `mode`          ENUM('practice','timed') NOT NULL DEFAULT 'practice',
  ADD COLUMN IF NOT EXISTS `domain_filter` VARCHAR(100) DEFAULT NULL;

-- ────────────────────────────────────────────────────────────
-- 16. SESSION ANSWERS (per-item responses in practice sessions
--     with M-Elo delta persisted per answer)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `session_answers` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `session_id`        INT NOT NULL,
  `question_id`       INT NOT NULL,
  `selected_choice`   ENUM('a', 'b', 'c', 'd') DEFAULT NULL,
  `is_correct`        BOOLEAN DEFAULT NULL,
  `theta_delta_json`  JSON DEFAULT NULL,
  `time_spent_ms`     INT DEFAULT NULL,
  `answered_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`session_id`) REFERENCES `practice_sessions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 17. STUDY PLANS (one per user, auto-generated post-diagnostic)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `study_plans` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`         INT NOT NULL UNIQUE,
  `batch_id`        INT NOT NULL,
  `generated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_adjusted`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `adjustment_log`  JSON DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 18. STUDY PLAN WEEKS (structured week rows per plan)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `study_plan_weeks` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `plan_id`       INT NOT NULL,
  `week_number`   INT NOT NULL,
  `week_start`    DATE NOT NULL,
  `week_end`      DATE NOT NULL,
  `phase_label`   VARCHAR(100) DEFAULT NULL,
  FOREIGN KEY (`plan_id`) REFERENCES `study_plans`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 19. STUDY PLAN DAYS (one row per day per week)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `study_plan_days` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `week_id`       INT NOT NULL,
  `day_of_week`   TINYINT NOT NULL COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
  `domain_id`     INT NOT NULL,
  `focus_label`   VARCHAR(100) DEFAULT NULL,
  `est_minutes`   INT NOT NULL DEFAULT 30,
  `is_rest_day`   BOOLEAN NOT NULL DEFAULT FALSE,
  `is_completed`  BOOLEAN NOT NULL DEFAULT FALSE,
  `completed_at`  DATETIME NULL DEFAULT NULL,
  FOREIGN KEY (`week_id`) REFERENCES `study_plan_weeks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`)
);

-- ────────────────────────────────────────────────────────────
-- 20. MATERIALS (review content library — admin-managed)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `materials` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `domain_id`     INT NOT NULL,
  `type`          ENUM('lesson_module', 'practice_set', 'mock_exam', 'reference_sheet') NOT NULL,
  `title`         VARCHAR(255) NOT NULL,
  `description`   TEXT DEFAULT NULL,
  `difficulty`    ENUM('basic', 'intermediate', 'advanced') NOT NULL DEFAULT 'intermediate',
  `exam_level`    ENUM('professional', 'subprofessional', 'both') NOT NULL DEFAULT 'both',
  `content_url`   VARCHAR(500) DEFAULT NULL,
  `est_minutes`   INT DEFAULT NULL,
  `status`        ENUM('published', 'draft') NOT NULL DEFAULT 'published',
  `uploaded_by`   INT DEFAULT NULL,
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`),
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Inline HTML body (optional; used when admin chooses “paste content” instead of file/URL)
ALTER TABLE `materials`
  ADD COLUMN IF NOT EXISTS `content_html` MEDIUMTEXT NULL AFTER `content_url`;

-- ────────────────────────────────────────────────────────────
-- 21. ANNOUNCEMENTS (global or batch-specific from admin)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `announcements` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `title`             VARCHAR(255) NOT NULL,
  `body`              TEXT NOT NULL,
  `category`          ENUM('general', 'schedule', 'important') NOT NULL DEFAULT 'general',
  `target_type`       ENUM('all', 'batch') NOT NULL DEFAULT 'all',
  `target_batch_id`   INT DEFAULT NULL,
  `published_by`      INT NOT NULL,
  `status`            ENUM('published', 'draft') NOT NULL DEFAULT 'draft',
  `publish_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`target_batch_id`) REFERENCES `batches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`published_by`) REFERENCES `users`(`id`)
);

-- ────────────────────────────────────────────────────────────
-- 22. ANNOUNCEMENT READS (per-user read tracking)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `announcement_reads` (
  `user_id`           INT NOT NULL,
  `announcement_id`   INT NOT NULL,
  `read_at`           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `announcement_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 23. DATA DELETION REQUESTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `deletion_requests` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`      INT NOT NULL,
  `reason`       TEXT DEFAULT NULL,
  `status`       ENUM('pending', 'reviewed', 'completed') NOT NULL DEFAULT 'pending',
  `requested_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at`  TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 25. PLATFORM SETTINGS (admin-tunable configuration)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id`            TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
  `settings_json` JSON NOT NULL,
  `updated_by`    INT NULL,
  `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `platform_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
INSERT IGNORE INTO `platform_settings` (`id`, `settings_json`) VALUES
  (1, '{\"platformNameDisplay\":\"Hauers\",\"sessionQuestionCountDefault\":15,\"kFactors\":{\"diagnostic\":48,\"standard\":24},\"studyPlanPhases\":[{\"label\":\"Foundation\",\"startWeek\":1,\"endWeek\":4},{\"label\":\"Build\",\"startWeek\":5,\"endWeek\":8},{\"label\":\"Refine\",\"startWeek\":9,\"endWeek\":12}]}');

-- ────────────────────────────────────────────────────────────
-- 26. SYSTEM ERROR LOGS (last-N errors for admin visibility)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `system_error_logs` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `route`      VARCHAR(255) DEFAULT NULL,
  `message`    TEXT NOT NULL,
  `stack`      MEDIUMTEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────────────────
-- 24. PROFILE FORM FIELDS (dynamic learner profile form —
--     admin-managed via /admin/profile-form)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `profile_form_fields` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `field_key`     VARCHAR(100) NOT NULL UNIQUE,
  `label`         VARCHAR(255) NOT NULL,
  `field_type`    ENUM('text', 'number', 'date', 'radio', 'checkbox', 'rating', 'select') NOT NULL,
  `options_json`  JSON DEFAULT NULL,
  `is_required`   BOOLEAN NOT NULL DEFAULT FALSE,
  `is_protected`  BOOLEAN NOT NULL DEFAULT FALSE,
  `sort_order`    INT NOT NULL DEFAULT 0,
  `is_active`     BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed: Protected/fixed fields required by the M-Elo system
INSERT IGNORE INTO `profile_form_fields`
  (`field_key`, `label`, `field_type`, `is_required`, `is_protected`, `sort_order`) VALUES
  ('target_exam_date',    'Target Exam Date',            'date',   TRUE,  TRUE, 1),
  ('study_hours_per_week','Available Study Hours / Week', 'number', TRUE,  TRUE, 2),
  ('preferred_study_time','Preferred Study Time',         'radio',  FALSE, TRUE, 3);

-- ────────────────────────────────────────────────────────────
-- 24b. PROFILE FORM DEFINITION (SurveyJS JSON — /admin/profile-form)
--      Legacy profile_form_fields rows are kept for reference only.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `profile_form_definition` (
  `id`           TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
  `survey_json`  JSON NOT NULL,
  `updated_by`   INT NULL,
  `updated_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pf_def_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

INSERT IGNORE INTO `profile_form_definition` (`id`, `survey_json`) VALUES
  (1, '{"pages":[{"name":"profile_custom","title":"Institutional questions","elements":[]}]}');

-- ────────────────────────────────────────────────────────────
-- SEED DATA
-- ────────────────────────────────────────────────────────────

-- Admin user
-- IMPORTANT: Password is plaintext for demo only.
--            Replace with a proper bcrypt hash before production.
INSERT IGNORE INTO `users`
  (`id`, `role`, `first_name`, `last_name`, `email`, `password`, `is_verified`, `is_enrolled`, `created_at`)
VALUES
  (1, 'admin', 'ACCESS', 'Admin', 'admin@hauers.com', '123456', 1, 0, '2025-11-01 00:00:00');

-- Demo reviewee (pre-enrolled for testing)
INSERT IGNORE INTO `users`
  (`id`, `role`, `first_name`, `last_name`, `email`, `password`, `is_verified`, `is_enrolled`, `exam_level`, `streak`, `created_at`)
VALUES
  (2, 'reviewee', 'Mock', 'Reviewee', 'reviewee@hauers.com', '123456', 1, 1, 'professional', 5, '2026-01-15 00:00:00');

-- Demo batch (for the mock reviewee)
INSERT IGNORE INTO `batches`
  (`id`, `name`, `exam_level`, `start_date`, `end_date`, `status`, `created_by`)
VALUES
  (1, 'Demo Batch 2026 — Professional', 'professional', '2026-01-01', '2026-12-31', 'active', 1);

-- Link demo reviewee to the demo batch
UPDATE `users` SET `batch_id` = 1 WHERE `id` = 2;

-- Demo enrollment record
INSERT IGNORE INTO `enrollments` (`user_id`, `batch_id`) VALUES (2, 1);

-- Demo domain ratings for mock reviewee (professional level — 5 domains)
INSERT IGNORE INTO `domain_ratings` (`user_id`, `domain_id`, `theta`, `k_factor`, `sessions_count`)
SELECT 2, d.id,
  CASE d.code
    WHEN 'verbal'       THEN 1310.0
    WHEN 'numerical'    THEN 1180.0
    WHEN 'clerical'     THEN 1240.0
    WHEN 'general_info' THEN 1150.0
    WHEN 'analytical'   THEN 1090.0
  END,
  24.0, 8
FROM `domains` d;
