-- =====================================================================
-- Emplo HRMS - Full schema migration (PostgreSQL / Supabase)
-- =====================================================================
-- This script creates the complete production HRMS schema.
--
-- SAFETY:
--   * By default it builds everything inside a DEDICATED schema named
--     "emplo" so it does NOT touch your existing public.* tables or data.
--     Supabase's Table Editor / Schema Visualizer can switch to this
--     schema to view the ER diagram.
--   * To install into "public" instead (DESTRUCTIVE if old tables exist),
--     see the note at the bottom of this file.
--
-- Apply with:
--   psql "<your-session-pooler-connection-string>" -f 0001_emplo_hrms_schema.sql
-- =====================================================================

-- Extensions (safe if already present)
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email

-- Dedicated, isolated schema so nothing in public is affected.
CREATE SCHEMA IF NOT EXISTS emplo;
SET search_path TO emplo, public;

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------
DO $$
BEGIN
    CREATE TYPE emplo.role_name           AS ENUM ('admin','hr','manager','employee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.gender_type         AS ENUM ('male','female','other','undisclosed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.marital_status_type AS ENUM ('single','married','divorced','widowed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.employment_status   AS ENUM ('active','on_leave','suspended','terminated','resigned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.employment_type     AS ENUM ('full_time','part_time','contract','intern');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.address_type        AS ENUM ('current','permanent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.bank_account_type   AS ENUM ('savings','current','salary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.editable_section    AS ENUM ('personal','address','contact','bank','certification');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.change_status       AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.document_type       AS ENUM ('id_proof','address_proof','education','offer_letter','contract','payslip','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.verification_status AS ENUM ('uploaded','verified','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.cert_category       AS ENUM ('microsoft','aws','azure','gcp','scrum','pmp','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.leave_status        AS ENUM ('pending','forwarded_to_hr','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.attendance_status   AS ENUM ('present','absent','half_day','on_leave','holiday','weekend');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.review_status       AS ENUM ('draft','submitted','acknowledged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.pay_frequency       AS ENUM ('monthly','bi_weekly','weekly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE emplo.salary_approval     AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- updated_at trigger function
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION emplo.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- AUTH & AUTHORIZATION
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emplo.roles (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        emplo.role_name NOT NULL UNIQUE,
    description varchar(255),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- employees is referenced by users, but employees also references
-- departments/designations which reference employees. Create base tables
-- first, then wire cross-FKs via ALTER below.
CREATE TABLE IF NOT EXISTS emplo.departments (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name             varchar(150) NOT NULL UNIQUE,
    code             varchar(30)  NOT NULL UNIQUE,
    head_employee_id uuid,                      -- FK added after employees exists
    is_active        boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emplo.designations (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title         varchar(150) NOT NULL,
    department_id uuid REFERENCES emplo.departments(id) ON DELETE SET NULL,
    level         int,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (title, department_id)
);

CREATE TABLE IF NOT EXISTS emplo.holiday_calendars (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       varchar(120) NOT NULL UNIQUE,
    region     varchar(100),
    year       int NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emplo.employees (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code       varchar(50) NOT NULL UNIQUE,
    first_name          varchar(120) NOT NULL,
    last_name           varchar(120) NOT NULL,
    personal_email      citext,
    work_email          citext UNIQUE,
    mobile_number       varchar(20),
    date_of_birth       date,
    gender              emplo.gender_type,
    marital_status      emplo.marital_status_type,
    date_of_joining     date,
    date_of_exit        date,
    department_id       uuid REFERENCES emplo.departments(id)  ON DELETE SET NULL,
    designation_id      uuid REFERENCES emplo.designations(id) ON DELETE SET NULL,
    manager_id          uuid REFERENCES emplo.employees(id)    ON DELETE SET NULL,  -- self-ref
    holiday_calendar_id uuid REFERENCES emplo.holiday_calendars(id) ON DELETE SET NULL,
    employment_status   emplo.employment_status NOT NULL DEFAULT 'active',
    employment_type     emplo.employment_type   NOT NULL DEFAULT 'full_time',
    work_location       varchar(120),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_employee_exit_after_join CHECK (date_of_exit IS NULL OR date_of_exit >= date_of_joining),
    CONSTRAINT chk_employee_not_self_manager CHECK (manager_id IS NULL OR manager_id <> id)
);

-- department head FK (now that employees exists)
ALTER TABLE emplo.departments
    DROP CONSTRAINT IF EXISTS fk_departments_head,
    ADD CONSTRAINT fk_departments_head
        FOREIGN KEY (head_employee_id) REFERENCES emplo.employees(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS emplo.users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         citext NOT NULL UNIQUE,
    password_hash varchar(255) NOT NULL,
    is_active     boolean NOT NULL DEFAULT true,
    role_id       uuid NOT NULL REFERENCES emplo.roles(id) ON DELETE RESTRICT,
    employee_id   uuid UNIQUE REFERENCES emplo.employees(id) ON DELETE SET NULL,  -- optional 1:1
    last_login_at timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- EMPLOYEE DETAIL
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emplo.employee_addresses (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id  uuid NOT NULL REFERENCES emplo.employees(id) ON DELETE CASCADE,
    address_type emplo.address_type NOT NULL,
    line1        varchar(255),
    line2        varchar(255),
    city         varchar(100),
    state        varchar(100),
    postal_code  varchar(20),
    country      varchar(100),
    is_primary   boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (employee_id, address_type)
);

CREATE TABLE IF NOT EXISTS emplo.emergency_contacts (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id      uuid NOT NULL REFERENCES emplo.employees(id) ON DELETE CASCADE,
    contact_name     varchar(150) NOT NULL,
    relationship     varchar(80),
    contact_number   varchar(20),
    alternate_number varchar(20),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emplo.employee_bank_accounts (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         uuid NOT NULL REFERENCES emplo.employees(id) ON DELETE CASCADE,
    account_holder_name varchar(150) NOT NULL,
    bank_name           varchar(150) NOT NULL,
    account_number_enc  varchar(255) NOT NULL,   -- store encrypted, never plaintext
    ifsc_swift_code     varchar(30)  NOT NULL,
    branch              varchar(150),
    account_type        emplo.bank_account_type NOT NULL DEFAULT 'salary',
    is_primary          boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- SELF-SERVICE / APPROVALS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emplo.employee_edit_permissions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES emplo.employees(id) ON DELETE CASCADE,
    section     emplo.editable_section NOT NULL,
    granted_by  uuid REFERENCES emplo.users(id) ON DELETE SET NULL,
    start_at    timestamptz NOT NULL,
    expiry_at   timestamptz NOT NULL,
    is_revoked  boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_edit_perm_window CHECK (expiry_at > start_at)
);

CREATE TABLE IF NOT EXISTS emplo.profile_change_requests (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id      uuid NOT NULL REFERENCES emplo.employees(id) ON DELETE CASCADE,
    section          emplo.editable_section NOT NULL,
    proposed_changes jsonb NOT NULL,
    previous_values  jsonb,
    status           emplo.change_status NOT NULL DEFAULT 'pending',
    reviewed_by      uuid REFERENCES emplo.users(id) ON DELETE SET NULL,
    review_remarks   varchar(500),
    reviewed_at      timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- DOCUMENTS & CERTIFICATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emplo.employee_documents (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id   uuid NOT NULL REFERENCES emplo.employees(id) ON DELETE CASCADE,
    document_name varchar(255),
    document_type emplo.document_type NOT NULL,
    file_url      text NOT NULL,                 -- object-storage URL/key, not base64
    file_mime     varchar(100),
    file_size     bigint,
    status        emplo.verification_status NOT NULL DEFAULT 'uploaded',
    uploaded_by   uuid REFERENCES emplo.users(id) ON DELETE SET NULL,
    verified_by   uuid REFERENCES emplo.users(id) ON DELETE SET NULL,
    verified_at   timestamptz,
    remarks       varchar(500),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emplo.employee_certifications (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         uuid NOT NULL REFERENCES emplo.employees(id) ON DELETE CASCADE,
    certificate_name    varchar(255) NOT NULL,
    certificate_number  varchar(100),
    category            emplo.cert_category NOT NULL DEFAULT 'other',
    issuing_authority   varchar(200),
    issued_date         date,
    expiry_date         date,
    file_url            text,
    verification_status emplo.verification_status NOT NULL DEFAULT 'uploaded',
    verified_by         uuid REFERENCES emplo.users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_cert_expiry_after_issue CHECK (expiry_date IS NULL OR expiry_date >= issued_date)
);

-- ---------------------------------------------------------------------
-- LEAVE MANAGEMENT
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emplo.leave_types (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 varchar(100) NOT NULL UNIQUE,
    code                 varchar(20)  NOT NULL UNIQUE,
    default_annual_quota numeric(5,1) NOT NULL DEFAULT 0,
    is_paid              boolean NOT NULL DEFAULT true,
    carry_forward        boolean NOT NULL DEFAULT false,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emplo.leave_balances (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id   uuid NOT NULL REFERENCES emplo.employees(id)   ON DELETE CASCADE,
    leave_type_id uuid NOT NULL REFERENCES emplo.leave_types(id) ON DELETE CASCADE,
    year          int  NOT NULL,
    allocated     numeric(5,1) NOT NULL DEFAULT 0,
    used          numeric(5,1) NOT NULL DEFAULT 0,
    pending       numeric(5,1) NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS emplo.leave_requests (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id       uuid NOT NULL REFERENCES emplo.employees(id)   ON DELETE CASCADE,
    leave_type_id     uuid NOT NULL REFERENCES emplo.leave_types(id) ON DELETE RESTRICT,
    start_date        date NOT NULL,
    end_date          date NOT NULL,
    total_days        numeric(5,1) NOT NULL,
    reason            text,
    status            emplo.leave_status NOT NULL DEFAULT 'pending',
    manager_id        uuid REFERENCES emplo.employees(id) ON DELETE SET NULL,
    manager_remarks   varchar(500),
    manager_action_at timestamptz,
    hr_id             uuid REFERENCES emplo.users(id) ON DELETE SET NULL,
    hr_remarks        varchar(500),
    hr_action_at      timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS emplo.holidays (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id  uuid NOT NULL REFERENCES emplo.holiday_calendars(id) ON DELETE CASCADE,
    holiday_date date NOT NULL,
    name         varchar(150) NOT NULL,
    is_optional  boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (calendar_id, holiday_date)
);

-- ---------------------------------------------------------------------
-- ATTENDANCE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emplo.attendance_records (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES emplo.employees(id) ON DELETE CASCADE,
    work_date   date NOT NULL,
    check_in    timestamptz,
    check_out   timestamptz,
    work_hours  numeric(5,2),
    status      emplo.attendance_status NOT NULL DEFAULT 'present',
    source      varchar(50),       -- biometric, web, mobile, manual
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (employee_id, work_date),
    CONSTRAINT chk_attendance_times CHECK (check_out IS NULL OR check_in IS NULL OR check_out >= check_in)
);

-- ---------------------------------------------------------------------
-- PERFORMANCE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emplo.performance_reviews (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         uuid NOT NULL REFERENCES emplo.employees(id) ON DELETE CASCADE,
    reviewer_id         uuid REFERENCES emplo.employees(id) ON DELETE SET NULL,
    review_period_start date NOT NULL,
    review_period_end   date NOT NULL,
    rating              numeric(4,2),
    strengths           text,
    improvement_areas   text,
    comments            text,
    status              emplo.review_status NOT NULL DEFAULT 'draft',
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_review_period CHECK (review_period_end >= review_period_start),
    CONSTRAINT chk_review_rating  CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

-- ---------------------------------------------------------------------
-- COMPENSATION
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emplo.employee_salary (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     uuid NOT NULL UNIQUE REFERENCES emplo.employees(id) ON DELETE CASCADE,
    current_gross   numeric(14,2) NOT NULL,
    current_net     numeric(14,2),
    currency        char(3) NOT NULL DEFAULT 'INR',
    pay_frequency   emplo.pay_frequency NOT NULL DEFAULT 'monthly',
    effective_since date NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emplo.salary_revisions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         uuid NOT NULL REFERENCES emplo.employees(id) ON DELETE CASCADE,
    effective_date      date NOT NULL,
    previous_salary     numeric(14,2),
    revised_salary      numeric(14,2) NOT NULL,
    revision_percentage numeric(6,2),
    comments            varchar(1000),
    approval_status     emplo.salary_approval NOT NULL DEFAULT 'pending',
    created_by          uuid REFERENCES emplo.users(id) ON DELETE SET NULL,
    approved_by         uuid REFERENCES emplo.users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- SYSTEM GOVERNANCE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emplo.audit_logs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    uuid REFERENCES emplo.users(id) ON DELETE SET NULL,
    action      varchar(50)  NOT NULL,    -- create|update|delete|login|approve|reject
    entity_type varchar(100) NOT NULL,
    entity_id   varchar(100),
    before_data jsonb,
    after_data  jsonb,
    ip_address  inet,
    user_agent  varchar(255),
    created_at  timestamptz NOT NULL DEFAULT now()   -- immutable, no updated_at
);

-- ---------------------------------------------------------------------
-- INDEXES (FK lookups + hot query paths)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_users_role_id           ON emplo.users(role_id);
CREATE INDEX IF NOT EXISTS ix_designations_dept       ON emplo.designations(department_id);
CREATE INDEX IF NOT EXISTS ix_employees_department_id ON emplo.employees(department_id);
CREATE INDEX IF NOT EXISTS ix_employees_designation_id ON emplo.employees(designation_id);
CREATE INDEX IF NOT EXISTS ix_employees_manager_id    ON emplo.employees(manager_id);
CREATE INDEX IF NOT EXISTS ix_employees_status        ON emplo.employees(employment_status);
CREATE INDEX IF NOT EXISTS ix_addresses_employee_id   ON emplo.employee_addresses(employee_id);
CREATE INDEX IF NOT EXISTS ix_contacts_employee_id    ON emplo.emergency_contacts(employee_id);
CREATE INDEX IF NOT EXISTS ix_bank_employee_id        ON emplo.employee_bank_accounts(employee_id);
CREATE INDEX IF NOT EXISTS ix_documents_employee_id   ON emplo.employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS ix_certs_employee_id       ON emplo.employee_certifications(employee_id);
CREATE INDEX IF NOT EXISTS ix_certs_expiry            ON emplo.employee_certifications(expiry_date);
CREATE INDEX IF NOT EXISTS ix_leave_bal_employee_id   ON emplo.leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS ix_leave_req_employee_id   ON emplo.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS ix_leave_req_status        ON emplo.leave_requests(status)
    WHERE status IN ('pending','forwarded_to_hr');
CREATE INDEX IF NOT EXISTS ix_attendance_emp_date     ON emplo.attendance_records(employee_id, work_date DESC);
CREATE INDEX IF NOT EXISTS ix_reviews_employee_id     ON emplo.performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS ix_salary_rev_employee_id  ON emplo.salary_revisions(employee_id);
CREATE INDEX IF NOT EXISTS ix_salary_rev_pending      ON emplo.salary_revisions(approval_status)
    WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS ix_audit_entity            ON emplo.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ix_audit_actor_time        ON emplo.audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_after_gin         ON emplo.audit_logs USING gin (after_data);

-- ---------------------------------------------------------------------
-- updated_at triggers (every table except immutable audit_logs)
-- ---------------------------------------------------------------------
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'roles','users','departments','designations','employees',
        'employee_addresses','emergency_contacts','employee_bank_accounts',
        'employee_edit_permissions','profile_change_requests',
        'employee_documents','employee_certifications',
        'leave_types','leave_balances','leave_requests',
        'holiday_calendars','holidays','attendance_records',
        'performance_reviews','employee_salary','salary_revisions'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_set_updated_at ON emplo.%I;', t);
        EXECUTE format(
            'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON emplo.%I
             FOR EACH ROW EXECUTE FUNCTION emplo.set_updated_at();', t);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- SEED reference data (roles) - idempotent
-- ---------------------------------------------------------------------
INSERT INTO emplo.roles (name, description) VALUES
    ('admin',    'Full system administrator'),
    ('hr',       'HR administrator'),
    ('manager',  'People manager'),
    ('employee', 'Standard employee')
ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- DONE. View in Supabase:
--   Table Editor -> schema dropdown (top-left) -> select "emplo".
--   Database -> Schema Visualizer -> select "emplo" to see the ER diagram.
--
-- To expose this schema to the Supabase API/PostgREST (optional):
--   Project Settings -> API -> "Exposed schemas" -> add "emplo".
--
-- ---------------------------------------------------------------------
-- ALTERNATIVE: install into the public schema instead of "emplo".
--   This is DESTRUCTIVE if the current Emplo app tables already live in
--   public. Only do this on a fresh database or after backing up data.
--   Steps: replace all "emplo." prefixes with "public." (or set
--   search_path TO public) and re-run. NOT done automatically.
-- =====================================================================
