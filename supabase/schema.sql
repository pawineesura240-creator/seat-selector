-- Run this whole file in Supabase > SQL Editor.
create table if not exists public.students (
  student_id text primary key,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.seats (
  seat_no integer primary key check (seat_no between 1 and 28),
  student_id text unique references public.students(student_id) on delete set null,
  student_name text,
  selected_at timestamptz
);

create table if not exists public.app_settings (
  id integer primary key check (id = 1),
  opens_at timestamptz,
  closes_at timestamptz,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.seats(seat_no) select n from generate_series(1,28) n
on conflict (seat_no) do nothing;
insert into public.app_settings(id, enabled) values (1, false)
on conflict (id) do nothing;

-- Prevent browser clients from reading/writing directly. The server uses the service role key.
alter table public.students enable row level security;
alter table public.seats enable row level security;
alter table public.app_settings enable row level security;

-- Atomic selection: the database checks the schedule and locks the target row,
-- so two students cannot reserve the same seat at the same time.
create or replace function public.choose_seat(p_student_id text, p_student_name text, p_seat_no integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.app_settings%rowtype;
  target public.seats%rowtype;
  registered_name text;
begin
  select * into cfg from public.app_settings where id = 1;
  if not found or cfg.enabled = false
     or (cfg.opens_at is not null and now() < cfg.opens_at)
     or (cfg.closes_at is not null and now() > cfg.closes_at) then
    raise exception 'SELECTION_CLOSED';
  end if;

  select full_name into registered_name from public.students where student_id = p_student_id;
  if registered_name is null or lower(trim(registered_name)) <> lower(trim(p_student_name)) then
    raise exception 'STUDENT_NOT_REGISTERED';
  end if;

  -- One student can only have one seat.
  if exists(select 1 from public.seats where student_id = p_student_id) then
    raise exception 'ALREADY_SELECTED';
  end if;

  select * into target from public.seats where seat_no = p_seat_no for update;
  if not found or target.student_id is not null then raise exception 'SEAT_TAKEN'; end if;

  update public.seats set student_id = p_student_id, student_name = registered_name, selected_at = now()
    where seat_no = p_seat_no and student_id is null;
  if not found then raise exception 'SEAT_TAKEN'; end if;
  return json_build_object('seat_no', p_seat_no, 'student_id', p_student_id);
end;
$$;

-- Only server-side service role should call the RPC.
revoke all on function public.choose_seat(text,text,integer) from public, anon, authenticated;
grant execute on function public.choose_seat(text,text,integer) to service_role;

-- Optional: add the 28 students here after replacing the sample values.
-- Do not put the service role key into any NEXT_PUBLIC_ variable.
-- insert into public.students(student_id, full_name) values
-- ('65001', 'ชื่อ นามสกุล 1'),
-- ('65002', 'ชื่อ นามสกุล 2');
