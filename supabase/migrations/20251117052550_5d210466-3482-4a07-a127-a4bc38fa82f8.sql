-- Create profiles table for user information
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default now() not null
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Create chat rooms table
create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now() not null
);

alter table public.chat_rooms enable row level security;

create policy "Chat rooms are viewable by everyone"
  on public.chat_rooms for select
  using (true);

create policy "Authenticated users can create rooms"
  on public.chat_rooms for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Create chat messages table
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.chat_rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null,
  is_ai boolean default false not null,
  created_at timestamp with time zone default now() not null
);

alter table public.chat_messages enable row level security;

create policy "Messages are viewable by everyone"
  on public.chat_messages for select
  using (true);

create policy "Authenticated users can insert messages"
  on public.chat_messages for insert
  to authenticated
  with check (auth.uid() = user_id or is_ai = true);

-- Enable realtime for messages
alter publication supabase_realtime add table public.chat_messages;

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();