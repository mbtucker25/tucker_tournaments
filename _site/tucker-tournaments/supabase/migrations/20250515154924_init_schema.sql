-- 🏌️ Teams table
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp default now()
);

-- 🧑‍🤝‍🧑 Registrations (golfers)
create table registrations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),
  first_name text,
  last_name text,
  email text,
  phone text,
  created_at timestamp default now()
);

-- 👕 Shirt orders per golfer
create table shirt_orders (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references registrations(id),
  yxs int default 0,
  ys int default 0,
  ym int default 0,
  yl int default 0,
  as int default 0,
  am int default 0,
  al int default 0,
  axl int default 0,
  a2xl int default 0,
  total int default 0,
  amount float default 0.0
);
