CREATE TABLE IF NOT EXISTS public.cb_products (
  id TEXT PRIMARY KEY,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cb_categories (
  id TEXT PRIMARY KEY,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cb_settings (
  id TEXT PRIMARY KEY,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  status TEXT,
  avatar_url TEXT,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id TEXT,
  role_id TEXT,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  name TEXT,
  sku TEXT,
  category TEXT,
  current_stock NUMERIC DEFAULT 0,
  min_stock_level NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  making_cost NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.toy_box_inventory (
  id TEXT PRIMARY KEY,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  phone TEXT,
  address TEXT,
  product_name TEXT,
  size TEXT,
  quantity INTEGER DEFAULT 1,
  source TEXT,
  status TEXT,
  tracking_id TEXT,
  notes TEXT,
  created_by TEXT,
  amount NUMERIC DEFAULT 0,
  items JSONB,
  payment_status TEXT,
  shipping_zone TEXT,
  email TEXT,
  ordered_items JSONB,
  call_attempts INTEGER DEFAULT 0,
  last_call_status TEXT,
  first_call_time TIMESTAMPTZ,
  pending_call_since TIMESTAMPTZ,
  courier_status TEXT,
  dispatched_at TIMESTAMPTZ,
  courier_name TEXT,
  courier_assigned_id TEXT,
  last_call_at TIMESTAMPTZ,
  ip_address TEXT,
  traffic_source TEXT,
  first_caller_name TEXT,
  inventory_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_activity_logs (
  id SERIAL PRIMARY KEY,
  order_id TEXT,
  action_type TEXT,
  old_status TEXT,
  new_status TEXT,
  changed_by_user_id TEXT,
  changed_by_user_name TEXT,
  action_description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  status TEXT,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_completions (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  completed_by TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assigned_tasks (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW public.products AS SELECT * FROM public.cb_products;
CREATE OR REPLACE VIEW public.categories AS SELECT * FROM public.cb_categories;
CREATE OR REPLACE VIEW public.site_settings AS SELECT * FROM public.cb_settings;
CREATE OR REPLACE VIEW public.system_configs AS SELECT * FROM public.cb_settings;
