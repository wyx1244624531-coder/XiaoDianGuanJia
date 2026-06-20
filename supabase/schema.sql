create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  store_type text not null default 'grain',
  name text not null,
  icon text,
  sort_order int default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  store_type text not null default 'grain',
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  price numeric not null default 0,
  unit text not null default '件',
  stock numeric not null default 0,
  low_stock_threshold numeric not null default 0,
  barcode text,
  is_hot boolean default false,
  status text default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.categories
add column if not exists store_type text not null default 'grain';

alter table public.products
add column if not exists store_type text not null default 'grain';

create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists categories_user_store_type_idx on public.categories(user_id, store_type);
create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists products_user_store_type_idx on public.products(user_id, store_type);
create index if not exists products_category_id_idx on public.products(category_id);

alter table public.categories enable row level security;
alter table public.products enable row level security;

drop policy if exists "Users can read own categories" on public.categories;
drop policy if exists "Users can create own categories" on public.categories;
drop policy if exists "Users can update own categories" on public.categories;
drop policy if exists "Users can delete own categories" on public.categories;

create policy "Users can read own categories"
on public.categories for select
using (auth.uid() = user_id);

create policy "Users can create own categories"
on public.categories for insert
with check (auth.uid() = user_id);

create policy "Users can update own categories"
on public.categories for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own categories"
on public.categories for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own products" on public.products;
drop policy if exists "Users can create own products" on public.products;
drop policy if exists "Users can update own products" on public.products;
drop policy if exists "Users can delete own products" on public.products;

create policy "Users can read own products"
on public.products for select
using (auth.uid() = user_id);

create policy "Users can create own products"
on public.products for insert
with check (auth.uid() = user_id);

create policy "Users can update own products"
on public.products for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own products"
on public.products for delete
using (auth.uid() = user_id);
