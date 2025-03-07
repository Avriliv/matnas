-- Step 1: Enable UUID extension
create extension if not exists "uuid-ossp";

-- Step 2: Drop existing objects
drop trigger if exists on_events_update on public.events;
drop function if exists public.handle_updated_at();
drop index if exists events_date_idx;
drop index if exists events_type_idx;
drop table if exists public.events;

-- Step 3: Create the table
create table public.events (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    type text not null,
    event_date date not null,
    supplier text,
    participants jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Step 4: Create the function for updating timestamps
create function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Step 5: Create the trigger
create trigger on_events_update
    before update on public.events
    for each row
    execute function public.handle_updated_at();

-- Step 6: Create indices
create index events_date_idx on public.events(event_date);
create index events_type_idx on public.events(type);
