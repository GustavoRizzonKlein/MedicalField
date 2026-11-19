CREATE TABLE medication (
                            id CHAR(36) PRIMARY KEY,
                            name VARCHAR(255) NOT NULL,
                            unit VARCHAR(50) NOT NULL,
                            maximum_dose NUMERIC(10, 2) NOT NULL
);