# Supabase Database Migrations Guide 🚖

This folder contains the complete, production-grade SQL migrations for **Smart Taxi Manager**.

---

## 📜 Migration Files Overview

| Order | Migration File | Purpose |
|---|---|---|
| **1** | `001_booking_requests.sql` | Creates `public.booking_requests` table, constraints, indexes, and guest INSERT Row Level Security policy. |
| **2** | `002_admin_security.sql` | Creates `public.admin_users` table, `public.is_admin()` helper function, and strict admin RLS policies on bookings and requests. |
| **3** | `003_booking_approval.sql` | Creates atomic PostgreSQL RPC functions `approve_booking_request` and `reject_booking_request` with transactional overlap verification. |

> [!IMPORTANT]
> **Preservation of Existing Data:**
> None of these migrations drop or recreate your existing `public.bookings` table, its data, or its exclusion constraint (`prevent_overlapping_confirmed_bookings`). They only add the public requests table, admin authorization table, and secure RPC functions.

---

## 🛠️ Step-by-Step Execution in Supabase

### Step 1: Open Supabase SQL Editor
1. Log in to your [Supabase Dashboard](https://app.supabase.com).
2. Select your project: `kfectwtfvrdbzjvsmejv`.
3. In the left sidebar, click on **SQL Editor**.
4. Click **+ New Query**.

---

### Step 2: Execute Migration 001
1. Open [`supabase/migrations/001_booking_requests.sql`](./migrations/001_booking_requests.sql).
2. Copy the entire content and paste it into the Supabase SQL Editor.
3. Click **Run** (or press `Ctrl + Enter`).
4. Ensure the output shows `Success. No rows returned`.

---

### Step 3: Execute Migration 002
1. Open [`supabase/migrations/002_admin_security.sql`](./migrations/002_admin_security.sql).
2. Copy the entire content and paste it into the Supabase SQL Editor.
3. Click **Run**.
4. Ensure the output shows `Success. No rows returned`.

---

### Step 4: Register Your Father's Account as Admin

> [!CAUTION]
> **Do not use a random UUID.** You must use your father's actual Supabase Auth User ID!

1. In Supabase Dashboard, click on **Authentication** in the left sidebar.
2. Under **Users**, locate your father's email address (for example `driver@smarttaxi.owner` or your father's personal login email).
3. Copy the **User UID** (a UUID like `e82490fb-2940-4dc6-8c45-568b693f9ef3`).
4. In **SQL Editor**, run the following SQL command, replacing `'PASTE_FATHER_USER_ID_HERE'` with his actual UID:

```sql
INSERT INTO public.admin_users (user_id, role, notes)
VALUES ('PASTE_FATHER_USER_ID_HERE', 'owner', 'Primary Taxi Driver and Owner')
ON CONFLICT (user_id) DO NOTHING;
```

5. Click **Run**.
6. Verify the admin registration by running:
```sql
SELECT u.email, a.user_id, a.role, a.created_at
FROM public.admin_users a
JOIN auth.users u ON u.id = a.user_id;
```

---

### Step 5: Execute Migration 003
1. Open [`supabase/migrations/003_booking_approval.sql`](./migrations/003_booking_approval.sql).
2. Copy the entire content and paste it into the Supabase SQL Editor.
3. Click **Run**.
4. Ensure the output shows `Success. No rows returned`.

---

## 🔍 How to Verify Tables and Policies

After running all 3 migrations, you can run this single check query in the SQL Editor to confirm everything is installed:

```sql
-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'booking_requests', 'admin_users');

-- Verify functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('is_admin', 'approve_booking_request', 'reject_booking_request', 'check_taxi_availability');

-- Verify admin registered
SELECT * FROM public.admin_users;
```

All 3 tables and 4 functions should be listed!
