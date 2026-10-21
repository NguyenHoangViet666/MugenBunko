// Applied on startup for both existing databases and fresh installations.
export const readerSchema = `
CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at BIGINT NOT NULL,
    INDEX idx_revoked_tokens_expiry (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS email_otps (
    email VARCHAR(150) PRIMARY KEY, code_hash CHAR(64) NOT NULL,
    expires_at BIGINT NOT NULL, sent_at BIGINT NOT NULL, attempts INT NOT NULL DEFAULT 0,
    INDEX idx_email_otps_expiry (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS reading_progress (
    user_id INT NOT NULL, novel_id INT NOT NULL, chapter_id INT NOT NULL,
    scroll_ratio DOUBLE NOT NULL DEFAULT 0, paragraph_index INT NOT NULL DEFAULT 0,
    paragraph_offset DOUBLE NOT NULL DEFAULT 0, client_updated_at BIGINT NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (user_id, novel_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS chapter_reads (
    user_id INT NOT NULL, chapter_id INT NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, chapter_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS reading_sessions (
    user_id INT NOT NULL, chapter_id INT NOT NULL, session_id CHAR(32) NOT NULL,
    started_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (user_id, chapter_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS library_collections (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
    name VARCHAR(80) NOT NULL, description VARCHAR(280) NOT NULL DEFAULT '',
    cover_novel_id INT NULL, is_public BOOLEAN NOT NULL DEFAULT FALSE,
    share_id CHAR(32) NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cover_novel_id) REFERENCES novels(id) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS collection_novels (
    collection_id INT NOT NULL, novel_id INT NOT NULL,
    PRIMARY KEY (collection_id, novel_id),
    FOREIGN KEY (collection_id) REFERENCES library_collections(id) ON DELETE CASCADE,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS chapter_versions (
    id INT AUTO_INCREMENT PRIMARY KEY, chapter_id INT NOT NULL, editor_id INT NULL,
    volume_name VARCHAR(100) NOT NULL, title VARCHAR(255) NOT NULL, content LONGTEXT NOT NULL,
    word_count INT NOT NULL DEFAULT 0, source VARCHAR(20) NOT NULL DEFAULT 'save',
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    FOREIGN KEY (editor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_chapter_versions (chapter_id, id)
) ENGINE=InnoDB;
`;
