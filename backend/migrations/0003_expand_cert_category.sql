-- Expand the certification_category enum with new vendor types
ALTER TYPE certification_category ADD VALUE IF NOT EXISTS 'google';
ALTER TYPE certification_category ADD VALUE IF NOT EXISTS 'meta';
ALTER TYPE certification_category ADD VALUE IF NOT EXISTS 'pmp';
ALTER TYPE certification_category ADD VALUE IF NOT EXISTS 'cisco';
ALTER TYPE certification_category ADD VALUE IF NOT EXISTS 'comptia';
ALTER TYPE certification_category ADD VALUE IF NOT EXISTS 'ibm';
ALTER TYPE certification_category ADD VALUE IF NOT EXISTS 'coursera';
