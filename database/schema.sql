-- hauers_db schema and initial seed

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role` VARCHAR(50) NOT NULL DEFAULT 'reviewee',
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `is_verified` BOOLEAN DEFAULT FALSE,
  `exam_level` VARCHAR(50) DEFAULT NULL,
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_active` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `readiness_score` INT DEFAULT 0,
  `streak` INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS `questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `question` TEXT NOT NULL,
  `choices` JSON NOT NULL,
  `answer` VARCHAR(255) NOT NULL,
  `domain` VARCHAR(100),
  `difficulty` VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS `progress_metrics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `readinessScore` INT,
  `readinessChange` INT,
  `streak` INT,
  `scoreHistory` JSON,
  `domainProgress` JSON,
  `stats` JSON,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `study_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `examDate` DATE,
  `totalWeeks` INT,
  `currentWeek` INT,
  `weeklyGoal` JSON,
  `dailyTasks` JSON,
  `planPhases` JSON,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

INSERT IGNORE INTO `users` (`id`, `role`, `first_name`, `last_name`, `email`, `password`, `is_verified`, `joined_at`)
VALUES
  (1, 'admin', 'ACCESS', 'Admin', 'admin@hauers.com', '123456', 1, '2025-11-01 00:00:00');

INSERT IGNORE INTO `users` (`id`, `role`, `first_name`, `last_name`, `email`, `password`, `is_verified`, `exam_level`, `joined_at`, `readiness_score`, `streak`)
VALUES
  (2, 'reviewee', 'Mock', 'Reviewee', 'reviewee@hauers.com', '123456', 1, 'Professional', '2026-01-15 00:00:00', 74, 5);


CREATE TABLE IF NOT EXISTS `materials` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `domain` VARCHAR(100),
  `type` VARCHAR(100),
  `icon` VARCHAR(50),
  `title` VARCHAR(255),
  `desc` TEXT,
  `difficulty` VARCHAR(50),
  `estMinutes` INT,
  `recommended` BOOLEAN DEFAULT FALSE
);
