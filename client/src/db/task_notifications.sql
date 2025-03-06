-- טבלת התראות למשימות
create table if not exists task_notifications (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks(id) on delete cascade,
  subtask_index integer,
  type text not null check (type in ('before_due', 'on_date', 'on_status')),
  days_before integer,
  notify_date timestamp with time zone,
  status text,
  notification_method text not null check (notification_method in ('email', 'browser', 'both')),
  repeat text not null check (repeat in ('once', 'daily', 'weekly')),
  enabled boolean default true,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- הרשאות RLS
alter table task_notifications enable row level security;

create policy "Enable read access for authenticated users"
  on task_notifications for select
  using (auth.uid() = user_id);

create policy "Enable insert for authenticated users"
  on task_notifications for insert
  with check (auth.uid() = user_id);

create policy "Enable update for authenticated users"
  on task_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Enable delete for authenticated users"
  on task_notifications for delete
  using (auth.uid() = user_id);

-- אינדקסים
create index if not exists task_notifications_task_id_idx on task_notifications(task_id);
create index if not exists task_notifications_user_id_idx on task_notifications(user_id);
create index if not exists task_notifications_notify_date_idx on task_notifications(notify_date);
