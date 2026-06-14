-- Add missing columns to audit_logs (model was updated but create_all can't ALTER)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_data jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_data jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address varchar(45);
