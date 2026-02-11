
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- PROFILES (Users)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Profiles
alter table profiles enable row level security;
create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- PRESENTATIONS
create table presentations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  title text not null,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Presentations
alter table presentations enable row level security;
create policy "Users can CRUD their own presentations" on presentations
  for all using (auth.uid() = user_id);

-- SESSIONS
create table sessions (
  id uuid default uuid_generate_v4() primary key,
  presentation_id uuid references presentations(id) on delete cascade not null,
  access_code text unique not null,
  is_live boolean default false,
  current_activity_index integer default 0,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Sessions
alter table sessions enable row level security;
create policy "Presenters can CRUD their sessions" on sessions
  for all using (
    exists (
      select 1 from presentations
      where presentations.id = sessions.presentation_id
      and presentations.user_id = auth.uid()
    )
  );
-- Participants need to view sessions by access_code
create policy "Anyone can view live sessions by code" on sessions
  for select using (true); 

-- ACTIVITIES
create table activities (
  id uuid default uuid_generate_v4() primary key,
  presentation_id uuid references presentations(id) on delete cascade not null,
  type text not null, -- 'multiple_choice', 'word_cloud', etc.
  question text not null,
  options jsonb, -- Stores ActivityOptions
  order_index integer not null,
  is_active boolean default true,
  settings jsonb, -- Stores ActivitySettings
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Activities
alter table activities enable row level security;
create policy "Presenters can CRUD their activities" on activities
  for all using (
    exists (
      select 1 from presentations
      where presentations.id = activities.presentation_id
      and presentations.user_id = auth.uid()
    )
  );
-- Participants need to read activities for a session
create policy "Participants can view activities for active sessions" on activities
  for select using (
    exists (
      select 1 from sessions
      where sessions.presentation_id = activities.presentation_id
      and sessions.is_live = true
    )
  );

-- PARTICIPANTS (Anonymous or registered users joining a session)
create table participants (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references sessions(id) on delete cascade not null,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Participants
alter table participants enable row level security;
-- Allow anonymous inserts (anyone can join) - In production you might want to restrict this
create policy "Anyone can join as participant" on participants for insert with check (true);
create policy "Participants can view themselves" on participants for select using (true); -- Ideally restrict to own ID via session/cookie?
create policy "Presenters can view participants in their sessions" on participants
  for select using (
    exists (
      select 1 from sessions
      join presentations on sessions.presentation_id = presentations.id
      where sessions.id = participants.session_id
      and presentations.user_id = auth.uid()
    )
  );

-- RESPONSES
create table responses (
  id uuid default uuid_generate_v4() primary key,
  activity_id uuid references activities(id) on delete cascade not null,
  session_id uuid references sessions(id) on delete cascade not null,
  participant_id uuid references participants(id) on delete cascade not null,
  answer jsonb not null, -- Stores ResponseAnswer
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
  -- NOTE: No unique constraint on (activity_id, participant_id) because
  -- multiple responses per participant are allowed based on activity settings
  -- (max_responses_per_participant). The limit is enforced at the application level.
);

-- RLS for Responses
alter table responses enable row level security;

-- Allow anonymous response submission
create policy "Allow anonymous response submission" on responses 
  for insert with check (true);

-- Allow reading responses
-- Necessary for participants to check their own response limits
-- and for presenters/results visualization to receive Realtime updates
create policy "Allow reading responses" on responses 
  for select using (true);


-- Realtime subscription setup (optional enablement)
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table activities;
alter publication supabase_realtime add table responses;
