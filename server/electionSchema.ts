// Additive, idempotent migration; no sample election or automatic role grants.
export const electionSchema = `
CREATE TABLE IF NOT EXISTS elections (
 id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(160) NOT NULL, description TEXT NOT NULL,
 rules JSON NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'draft',
 nomination_closes_at BIGINT NOT NULL, voting_closes_at BIGINT NOT NULL,
 result_snapshot JSON NULL, created_by INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 published_at TIMESTAMP NULL, INDEX idx_elections_status (status, id),
 FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS election_candidates (
 id INT AUTO_INCREMENT PRIMARY KEY, election_id INT NOT NULL, user_id INT NOT NULL, nominated_by INT NOT NULL,
 status VARCHAR(20) NOT NULL, motivation TEXT NOT NULL, experience TEXT NOT NULL,
 availability VARCHAR(280) NOT NULL, scenario_answer TEXT NOT NULL, supplement TEXT NULL,
 verification_reason TEXT NULL, decision VARCHAR(20) NOT NULL DEFAULT 'pending',
 public_reason TEXT NULL, internal_note TEXT NULL, override_reason TEXT NULL, decided_by INT NULL,
 probation_ends_at BIGINT NULL, term_ends_at BIGINT NULL, confirmed_at BIGINT NULL, ended_at BIGINT NULL, end_reason TEXT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_election_candidate (election_id, user_id),
 INDEX idx_election_candidate_term (user_id,decision,ended_at,term_ends_at),
 INDEX idx_election_term_expiry (decision,ended_at,term_ends_at,election_id),
 FOREIGN KEY (election_id) REFERENCES elections(id), FOREIGN KEY (user_id) REFERENCES users(id),
 FOREIGN KEY (nominated_by) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS election_voters (
 election_id INT NOT NULL, user_id INT NOT NULL, can_vote BOOLEAN NOT NULL, can_review BOOLEAN NOT NULL,
 PRIMARY KEY (election_id, user_id), FOREIGN KEY (election_id) REFERENCES elections(id),
 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS election_ballots (
 election_id INT NOT NULL, voter_id INT NOT NULL, candidate_id INT NOT NULL,
 updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 PRIMARY KEY (election_id, voter_id, candidate_id), INDEX idx_ballot_candidate (candidate_id),
 FOREIGN KEY (election_id) REFERENCES elections(id), FOREIGN KEY (voter_id) REFERENCES users(id),
 FOREIGN KEY (candidate_id) REFERENCES election_candidates(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS election_reviews (
 election_id INT NOT NULL, candidate_id INT NOT NULL, reviewer_id INT NOT NULL,
 verdict VARCHAR(12) NOT NULL, criteria JSON NOT NULL, comment TEXT NOT NULL,
 updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 PRIMARY KEY (election_id, candidate_id, reviewer_id),
 FOREIGN KEY (election_id) REFERENCES elections(id), FOREIGN KEY (candidate_id) REFERENCES election_candidates(id),
 FOREIGN KEY (reviewer_id) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS election_complaints (
 id INT AUTO_INCREMENT PRIMARY KEY, election_id INT NOT NULL, user_id INT NOT NULL,
 message TEXT NOT NULL, status VARCHAR(12) NOT NULL DEFAULT 'open', resolution TEXT NULL,
 resolved_by INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (election_id) REFERENCES elections(id), FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS election_audit (
 id INT AUTO_INCREMENT PRIMARY KEY, election_id INT NOT NULL, actor_id INT NULL,
 action VARCHAR(50) NOT NULL, details JSON NOT NULL, created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
 INDEX idx_election_audit (election_id, id), FOREIGN KEY (election_id) REFERENCES elections(id)
) ENGINE=InnoDB;
`;
