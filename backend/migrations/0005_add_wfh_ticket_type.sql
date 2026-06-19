-- Add 'wfh' to the ticket_type enum
ALTER TYPE ticket_type ADD VALUE IF NOT EXISTS 'wfh';
