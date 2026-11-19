-- Creates one database per service and the application user.
-- Run once as root:  mysql -u root -p -e "source C:/dev/MedicalField/database/setup-local.sql"
-- The password below is for local development only. Use a different one on the VM.

CREATE DATABASE IF NOT EXISTS medicalfield_clinical;
CREATE DATABASE IF NOT EXISTS medicalfield_identity;
CREATE DATABASE IF NOT EXISTS medicalfield_documents;

CREATE USER IF NOT EXISTS 'medicalfield'@'localhost' IDENTIFIED BY 'medicalfield_dev';

GRANT ALL PRIVILEGES ON medicalfield_clinical.* TO 'medicalfield'@'localhost';
GRANT ALL PRIVILEGES ON medicalfield_identity.* TO 'medicalfield'@'localhost';
GRANT ALL PRIVILEGES ON medicalfield_documents.* TO 'medicalfield'@'localhost';

FLUSH PRIVILEGES;
