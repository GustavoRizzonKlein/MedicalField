CREATE TABLE access_log (
    id              BIGINT       AUTO_INCREMENT PRIMARY KEY,
    occurred_at     DATETIME(3)  NOT NULL,
    client_ip       VARCHAR(45)  NOT NULL,
    professional_id CHAR(36)     NULL,
    method          VARCHAR(10)  NOT NULL,
    route           VARCHAR(255) NOT NULL,
    status_code     INT          NOT NULL,
    duration_ms     INT          NOT NULL,
    INDEX idx_access_log_occurred_at (occurred_at)
);

-- Every care report sent by e-mail, successful or not (audit trail).
CREATE TABLE email_log (
    id              BIGINT       AUTO_INCREMENT PRIMARY KEY,
    encounter_id    CHAR(36)     NOT NULL,
    recipient       VARCHAR(150) NOT NULL,
    professional_id CHAR(36)     NOT NULL,
    status          VARCHAR(10)  NOT NULL,
    error           TEXT         NULL,
    sent_at         DATETIME(3)  NOT NULL,
    INDEX idx_email_log_sent_at (sent_at)
);
