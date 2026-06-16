-- MUGENBUNKO Database Schema for MySQL 8.0+
-- Relational model containing strict referential integrity Constraints

CREATE DATABASE IF NOT EXISTS `mugenbunko` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `mugenbunko`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) UNIQUE NOT NULL,
    `password` VARCHAR(255) NOT NULL, -- Store plain text for test / hashed for prod
    `displayname` VARCHAR(100) NOT NULL,
    `coins` INT DEFAULT 1000,
    `level` INT DEFAULT 1,
    `xp` INT DEFAULT 0,
    `bio` TEXT NULL,
    `avatar_seed` VARCHAR(100) NULL,
    `status` VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended'
    `author_request` VARCHAR(20) DEFAULT NULL, -- 'pending', 'approved', 'rejected'
    `date_joined` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. User Roles Table (Supports multiple roles per user)
CREATE TABLE IF NOT EXISTS `user_roles` (
    `user_id` INT NOT NULL,
    `role` VARCHAR(20) NOT NULL, -- 'reader', 'author', 'moderator', 'admin'
    PRIMARY KEY (`user_id`, `role`),
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Novels Table
CREATE TABLE IF NOT EXISTS `novels` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `author_id` INT NOT NULL,
    `cover` VARCHAR(255) DEFAULT 'assets/default_novel_cover.png',
    `summary` TEXT NULL,
    `genre` VARCHAR(500) NOT NULL,
    `status` VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended'
    `type` VARCHAR(50) DEFAULT 'series', -- 'series', 'oneshot'
    `reads` INT DEFAULT 0,
    `rating` DECIMAL(2,1) DEFAULT 5.0,
    `bookmarks_count` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Novel Tags Table (Many-to-many tag relations)
CREATE TABLE IF NOT EXISTS `novel_tags` (
    `novel_id` INT NOT NULL,
    `tag` VARCHAR(50) NOT NULL,
    PRIMARY KEY (`novel_id`, `tag`),
    FOREIGN KEY (`novel_id`) REFERENCES `novels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Chapters Table
CREATE TABLE IF NOT EXISTS `chapters` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `novel_id` INT NOT NULL,
    `volume_name` VARCHAR(100) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `status` VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'scheduled'
    `scheduled_release` TIMESTAMP NULL,
    `word_count` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`novel_id`) REFERENCES `novels` (`id`) ON DELETE CASCADE,
    INDEX `idx_chapters_novel_status` (`novel_id`, `status`),
    INDEX `idx_chapters_scheduled` (`scheduled_release`)
) ENGINE=InnoDB;

-- 6. Bookmarks / Library Table (Tracks who bookmarked which novel)
CREATE TABLE IF NOT EXISTS `bookmarks` (
    `user_id` INT NOT NULL,
    `novel_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`, `novel_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`novel_id`) REFERENCES `novels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Follows Table (Tracks readers following authors)
CREATE TABLE IF NOT EXISTS `follows` (
    `follower_id` INT NOT NULL,
    `author_id` INT NOT NULL,
    PRIMARY KEY (`follower_id`, `author_id`),
    FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Comments Table (Self-referencing for 2-level replies)
CREATE TABLE IF NOT EXISTS `comments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `novel_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `parent_id` INT NULL, -- NULL for root comments, references comments(id) for replies
    `text` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`novel_id`) REFERENCES `novels` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Reviews Table
CREATE TABLE IF NOT EXISTS `reviews` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `novel_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `stars` INT NOT NULL CHECK (`stars` BETWEEN 1 AND 5),
    `text` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`novel_id`) REFERENCES `novels` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_user_novel_review` (`user_id`, `novel_id`) -- Each user reviews a novel once
) ENGINE=InnoDB;

-- 10. Reports Table
CREATE TABLE IF NOT EXISTS `reports` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `reporter_id` INT NOT NULL,
    `comment_id` INT NOT NULL,
    `reason` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;



-- 13. System Global Events Table
CREATE TABLE IF NOT EXISTS `events` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 14. Novel Specific Announcements
CREATE TABLE IF NOT EXISTS `announcements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `novel_id` INT NOT NULL,
    `text` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`novel_id`) REFERENCES `novels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 15. User Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `text` TEXT NOT NULL,
    `is_read` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_notifications_user_created` (`user_id`, `created_at` DESC)
) ENGINE=InnoDB;

-- 16. Forum Posts Table
CREATE TABLE IF NOT EXISTS `forum_posts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `author_id` INT NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `restrict_comments` TINYINT(1) DEFAULT 0,
    `image_url` VARCHAR(500) NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_forum_posts_created` (`created_at` DESC),
    INDEX `idx_forum_posts_author` (`author_id`)
) ENGINE=InnoDB;

-- 17. Forum Comments Table
CREATE TABLE IF NOT EXISTS `forum_comments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `post_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `parent_id` INT NULL DEFAULT NULL,
    `text` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`parent_id`) REFERENCES `forum_comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 18. Friends Table
CREATE TABLE IF NOT EXISTS `friends` (
    `user_id_1` INT NOT NULL,
    `user_id_2` INT NOT NULL,
    `status` VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted'
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id_1`, `user_id_2`),
    FOREIGN KEY (`user_id_1`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id_2`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 19. Direct Messages Table
CREATE TABLE IF NOT EXISTS `messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sender_id` INT NOT NULL,
    `receiver_id` INT NOT NULL,
    `message_text` TEXT NOT NULL,
    `is_read` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_messages_unread` (`receiver_id`, `is_read`)
) ENGINE=InnoDB;

-- 20. Forum Post Likes Table
CREATE TABLE IF NOT EXISTS `forum_post_likes` (
    `post_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    PRIMARY KEY (`post_id`, `user_id`),
    FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 21. Read Cooldowns Table (IP Cooldowns for reading novels)
CREATE TABLE IF NOT EXISTS `read_cooldowns` (
    `ip_address` VARCHAR(45) NOT NULL,
    `novel_id` INT NOT NULL,
    `last_read_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`ip_address`, `novel_id`),
    FOREIGN KEY (`novel_id`) REFERENCES `novels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 22. Deleted Novels Table (Tracks titles and reasons for deleted novels)
CREATE TABLE IF NOT EXISTS `deleted_novels` (
    `id` INT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `reason` TEXT NULL,
    `deleted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ========================================================
-- SEED DATA: Exactly One Admin account named "Nguyễn Hoàng Việt"
-- ========================================================

-- Disable constraints temporarily to guarantee clean insert
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `read_cooldowns`;
TRUNCATE TABLE `forum_post_likes`;
TRUNCATE TABLE `messages`;
TRUNCATE TABLE `friends`;
TRUNCATE TABLE `forum_comments`;
TRUNCATE TABLE `forum_posts`;
TRUNCATE TABLE `notifications`;
TRUNCATE TABLE `announcements`;
TRUNCATE TABLE `events`;
TRUNCATE TABLE `reports`;
TRUNCATE TABLE `reviews`;
TRUNCATE TABLE `comments`;
TRUNCATE TABLE `follows`;
TRUNCATE TABLE `bookmarks`;
TRUNCATE TABLE `chapters`;
TRUNCATE TABLE `novel_tags`;
TRUNCATE TABLE `novels`;
TRUNCATE TABLE `user_roles`;
TRUNCATE TABLE `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed Single Admin account (ID: 1)
INSERT INTO `users` (`id`, `username`, `password`, `displayname`, `coins`, `level`, `xp`, `bio`, `avatar_seed`, `status`) 
VALUES (1, 'MugenBunko', '$2b$10$lejcU/gpgZ7KjK9ZLBac4etcyiaTCWowsOrN9Pt/qvEsipLAlx/Sq', 'Nguyễn Hoàng Việt', 1000, 1, 0, 'Nhà sáng lập tối cao của thư viện điện tử MugenBunko.', 'adminUser', 'active');

-- Add roles for the admin user (Inherits reader and admin)
INSERT INTO `user_roles` (`user_id`, `role`) VALUES (1, 'reader');
INSERT INTO `user_roles` (`user_id`, `role`) VALUES (1, 'admin');




