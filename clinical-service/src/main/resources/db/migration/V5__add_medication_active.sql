-- Soft delete: a medication already used in an encounter is deactivated instead of removed,
-- so old care reports keep its name. Inactive medications are hidden from new encounters.
ALTER TABLE medication ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
