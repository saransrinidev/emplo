-- Add profile_photo column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_photo text;
