-- ==============================================================================
-- MIGRATION 002: Admin Access Control and Security Policies
-- Purpose: Restrict administrative access to explicit authorized admin users only.
--          Protects bookings and booking_requests from unauthorized access.
-- ==============================================================================

-- 1. Create admin_users table to whitelist authorized Supabase Auth user IDs
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'owner')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Helper Security-Definer Function to check admin status
-- Executes safely with fixed search_path to prevent search_path hijacking
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = p_user_id
    );
END;
$$;

-- Grant execution to authenticated and anon users (function returns FALSE if not logged in)
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated, anon;

-- 3. RLS Policy on admin_users table:
-- An authenticated user can read the admin table only if they are an authorized admin
DROP POLICY IF EXISTS "Admins can view admin list" ON public.admin_users;
CREATE POLICY "Admins can view admin list"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- 4. Secure RLS Policies on public.booking_requests:
-- Only verified admin users can view, review, update, or delete customer requests
DROP POLICY IF EXISTS "Admins can view all booking requests" ON public.booking_requests;
CREATE POLICY "Admins can view all booking requests"
    ON public.booking_requests
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update booking requests" ON public.booking_requests;
CREATE POLICY "Admins can update booking requests"
    ON public.booking_requests
    FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete booking requests" ON public.booking_requests;
CREATE POLICY "Admins can delete booking requests"
    ON public.booking_requests
    FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- 5. Update RLS Policies on existing public.bookings table:
-- Retain strict ownership / admin protection without dropping existing data or constraints
DROP POLICY IF EXISTS "Owner can view own bookings" ON public.bookings;
CREATE POLICY "Owner can view own bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Owner can insert own bookings" ON public.bookings;
CREATE POLICY "Owner can insert own bookings"
    ON public.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Owner can update own bookings" ON public.bookings;
CREATE POLICY "Owner can update own bookings"
    ON public.bookings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
    WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Owner can delete own bookings" ON public.bookings;
CREATE POLICY "Owner can delete own bookings"
    ON public.bookings
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

COMMENT ON TABLE public.admin_users IS 'Explicit whitelist of authorized taxi admin user IDs';
