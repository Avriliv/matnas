-- הוספת עמודות להרשאות בטבלת הפרופילים
alter table public.profiles 
add column if not exists permissions jsonb default '[]'::jsonb,
add column if not exists can_view_tasks_from jsonb default '[]'::jsonb;

-- יצירת פונקציה לבדיקת הרשאות
create or replace function public.check_user_permission(user_id uuid, permission text)
returns boolean as $$
begin
  return exists (
    select 1 
    from public.profiles 
    where id = user_id 
    and permissions ? permission
  );
end;
$$ language plpgsql security definer;

-- יצירת פונקציה לבדיקת האם משתמש יכול לראות משימות של משתמש אחר
create or replace function public.can_view_user_tasks(viewer_id uuid, target_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 
    from public.profiles 
    where id = viewer_id 
    and (
      can_view_tasks_from ? target_user_id::text
      or viewer_id = target_user_id -- תמיד יכול לראות את המשימות של עצמו
    )
  );
end;
$$ language plpgsql security definer;

-- עדכון הפוליסיה של טבלת המשימות
create policy "Users can view their own tasks and tasks they have permission to view"
  on public.tasks for select
  using (
    auth.uid() = user_id
    or public.can_view_user_tasks(auth.uid(), user_id)
  );

-- הגדרת הרשאות ברירת מחדל לכל המשתמשים
update public.profiles
set permissions = '["view_own_tasks", "view_department_events", "view_journal", "view_holidays", "view_forms"]'::jsonb
where true;

-- הגדרת הרשאות מיוחדות לאבירי
update public.profiles
set 
  permissions = '["view_department_events", "view_journal", "view_holidays", "view_forms", "view_inventory", "view_equipment"]'::jsonb,
  can_view_tasks_from = '["8001a803-b0be-4b8a-8d0d-a5a65fdfb5cc"]'::jsonb
where id = 'f3a486ab-0383-4739-b57b-8dd4f5badbd5';

-- הגדרת הרשאות מיוחדות לבעז
update public.profiles
set 
  permissions = '["view_department_events", "view_journal", "view_holidays", "view_forms", "view_inventory", "view_equipment"]'::jsonb,
  can_view_tasks_from = '["f3a486ab-0383-4739-b57b-8dd4f5badbd5"]'::jsonb
where id = '8001a803-b0be-4b8a-8d0d-a5a65fdfb5cc';

-- פוליסות אבטחה לטבלאות נוספות
create policy "Everyone can view department events"
  on public.department_events for select
  using (true);

create policy "Everyone can view journal"
  on public.journal for select
  using (true);

create policy "Everyone can view holidays"
  on public.holidays for select
  using (true);

create policy "Everyone can view forms"
  on public.forms for select
  using (true);

create policy "Only admins can view inventory"
  on public.inventory for select
  using (
    public.check_user_permission(auth.uid(), 'view_inventory')
  );

create policy "Only admins can view equipment"
  on public.equipment for select
  using (
    public.check_user_permission(auth.uid(), 'view_equipment')
  );
