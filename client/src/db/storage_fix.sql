-- Drop existing policies if they exist
drop policy if exists "Enable read access for all users" on storage.objects;
drop policy if exists "Enable insert for all users" on storage.objects;
drop policy if exists "Enable delete for all users" on storage.objects;

-- Create more permissive policies for storage
create policy "Enable read access for all users"
    on storage.objects for select
    using ( bucket_id = 'forms' );

create policy "Enable insert for all users"
    on storage.objects for insert
    with check ( bucket_id = 'forms' );

create policy "Enable update for all users"
    on storage.objects for update
    using ( bucket_id = 'forms' );

create policy "Enable delete for all users"
    on storage.objects for delete
    using ( bucket_id = 'forms' );
