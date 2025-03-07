create table if not exists events (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text not null,
  date date not null,
  supplier text,
  participants jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- הוספת אינדקסים לשיפור ביצועים
create index if not exists events_date_idx on events(date);
create index if not exists events_type_idx on events(type);

-- הוספת טריגר לעדכון שדה updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger events_updated_at
    before update on events
    for each row
    execute function update_updated_at_column();
