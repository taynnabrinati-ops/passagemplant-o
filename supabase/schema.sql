-- Schema for the DoctorWorks bed board.
--
-- The app in this repository runs on the seeded dataset in src/data/demo.ts.
-- This file documents the tables the board reads so the provider in
-- src/data/provider.ts can be pointed at a real Postgres/Supabase instance
-- without changing any component. See README.md.

create type unit_kind as enum ('icu', 'ward');
create type culture_status as enum ('pending', 'positive', 'negative');
create type consult_status as enum ('pending', 'answered');
create type app_role as enum ('admin', 'coordinator', 'kiosk', 'nir');

create table units (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null unique,
  sort_order  int         not null default 0,
  kind        unit_kind   not null default 'icu'
);

create table beds (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid not null references units (id) on delete cascade,
  bed_number  int  not null,
  label       text,
  sort_order  int  not null default 0,
  unique (unit_id, bed_number)
);

create table patients (
  id              uuid primary key default gen_random_uuid(),
  bed_id          uuid references beds (id) on delete set null,
  name            text not null,
  birth_date      date,
  age_years       int,
  admission_date  date not null,
  insurance       text,
  syndromic_dx    text,
  specific_dx     text,
  is_active       boolean not null default true,
  palliative_care boolean not null default false,
  terminality     boolean not null default false,
  cfm_priority    text check (cfm_priority in ('P1', 'P2', 'P3', 'P4', 'P5')),
  has_allergy     boolean not null default false,
  discharged_at   timestamptz,
  created_at      timestamptz not null default now()
);

-- The projection the bed grid reads. Keeping the board on a view means the
-- full record never has to be exposed to every logged-in clinician.
create view patients_public as
  select id, bed_id, name, birth_date, age_years, admission_date, insurance,
         syndromic_dx, specific_dx, is_active, palliative_care, terminality,
         cfm_priority, has_allergy
  from patients;

create table conducts (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients (id) on delete cascade,
  text        text not null,
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table cultures (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references patients (id) on delete cascade,
  material         text not null,
  site             text,
  organism         text,
  collection_date  date not null,
  status           culture_status not null default 'pending',
  resolved_at      timestamptz,
  deleted_at       timestamptz
);

create table invasions (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients (id) on delete cascade,
  kind        text not null,
  site        text,
  start_date  date not null,
  removed_at  timestamptz
);

create table medications (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients (id) on delete cascade,
  kind        text not null,
  drug        text not null,
  detail      text,
  start_date  date not null,
  end_date    date,
  -- Carries the `[1x/dia]` marker that switches off the antibiotic D-1 offset.
  note        text
);

create table ward_visits (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients (id) on delete cascade,
  visited_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table consults (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients (id) on delete cascade,
  specialty   text not null,
  status      consult_status not null default 'pending',
  deleted_at  timestamptz
);

create table teams (
  id       uuid primary key default gen_random_uuid(),
  unit_id  uuid not null references units (id) on delete cascade,
  name     text not null
);

create table team_members (
  team_id  uuid not null references teams (id) on delete cascade,
  user_id  uuid not null,
  primary key (team_id, user_id)
);

create table user_roles (
  user_id  uuid not null,
  role     app_role not null,
  primary key (user_id, role)
);

create index on beds (unit_id, sort_order);
create index on patients (bed_id) where is_active;
create index on conducts (patient_id) where deleted_at is null and not done;
create index on cultures (patient_id) where deleted_at is null and resolved_at is null;
create index on ward_visits (visited_at) where deleted_at is null;
create index on consults (patient_id) where deleted_at is null;
