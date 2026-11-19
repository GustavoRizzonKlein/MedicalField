CREATE TABLE professional (
    id              CHAR(36)     PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    registry_type   ENUM('CRM', 'COREN', 'RESPONDER') NOT NULL,
    registry_number VARCHAR(30)  NOT NULL UNIQUE,
    role            ENUM('ADMIN', 'RESPONDER') NOT NULL,
    password_hash   VARCHAR(100) NOT NULL,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);

-- One row per HTTP request received by this service.
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

-- Logs recorded by the client app while offline, sent later via POST /logs.
-- The id comes from the client, so resending the same entry is harmless (idempotent).
CREATE TABLE client_log (
    id              CHAR(36)     PRIMARY KEY,
    professional_id CHAR(36)     NOT NULL,
    device_id       VARCHAR(100) NOT NULL,
    occurred_at     DATETIME(3)  NOT NULL,
    level           VARCHAR(10)  NOT NULL,
    action          VARCHAR(100) NOT NULL,
    details         TEXT         NULL,
    received_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_client_log_occurred_at (occurred_at)
);
