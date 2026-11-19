-- ==============================================================================
-- SMART TAXI MANAGER - SUPABASE DATABASE SCHEMA
-- Application: Single-driver taxi booking & availability management system
-- Timezone: Display timezone is Asia/Kolkata (IST, UTC+05:30)
-- ==============================================================================

-- 1. Enable btree_gist extension (required for EXCLUDE constraint with scalar UUID and tstzrange)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    pickup_location TEXT,
    drop_location TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    fare NUMERIC(10, 2) DEFAULT 0.00 CHECK (fare >= 0),
    advance_amount NUMERIC(10, 2) DEFAULT 0.00 CHECK (advance_amount >= 0),
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Business Rule: End time must be strictly after start time
    CONSTRAINT check_end_after_start CHECK (end_at > start_at),

    -- Business Rule: Fare must be greater than or equal to advance amount
    CONSTRAINT check_advance_fare CHECK (advance_amount <= fare),

    -- Database-Level Overlap Protection:
    -- Prevents two CONFIRMED bookings for the same owner from overlapping.
    -- Uses half-open interval '[)' (inclusive start, exclusive end) so consecutive trips
    -- (e.g. Booking A ends 2:00 PM, Booking B starts 2:00 PM) are permitted.
    -- Cancelled and completed bookings do not lock the slot.
    CONSTRAINT prevent_overlapping_confirmed_bookings
        EXCLUDE USING gist (
            user_id WITH =,
            tstzrange(start_at, end_at, '[)') WITH &&
        )
        WHERE (status = 'confirmed')
);

-- 3. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON public.bookings(start_at ASC);
CREATE INDEX IF NOT EXISTS idx_bookings_end_at ON public.bookings(end_at ASC);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_time ON public.bookings(user_id, status, start_at);

-- 4. Automatically update updated_at on row modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies - Strict ownership enforcement (only the authenticated owner can access their bookings)
DROP POLICY IF EXISTS "Owner can view own bookings" ON public.bookings;
CREATE POLICY "Owner can view own bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can insert own bookings" ON public.bookings;
CREATE POLICY "Owner can insert own bookings"
    ON public.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can update own bookings" ON public.bookings;
CREATE POLICY "Owner can update own bookings"
    ON public.bookings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can delete own bookings" ON public.bookings;
CREATE POLICY "Owner can delete own bookings"
    ON public.bookings
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 7. Helper Stored Function for Availability Overlap Check (optional server-side RPC)
-- Returns true if slot is available (no conflicting confirmed booking exists)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_taxi_availability(
    p_user_id UUID,
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_available BOOLEAN,
    conflict_count INT,
    conflicts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conflicts JSONB;
    v_count INT;
BEGIN
    SELECT 
        COUNT(*),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', b.id,
            'customer_name', b.customer_name,
            'customer_phone', b.customer_phone,
            'pickup_location', b.pickup_location,
            'drop_location', b.drop_location,
            'start_at', b.start_at,
            'end_at', b.end_at,
            'status', b.status
        )), '[]'::jsonb)
    INTO v_count, v_conflicts
    FROM public.bookings b
    WHERE b.user_id = p_user_id
      AND b.status = 'confirmed'
      AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
      AND (p_start_at < b.end_at AND p_end_at > b.start_at);

    RETURN QUERY SELECT 
        (v_count = 0) AS is_available,
        v_count AS conflict_count,
        v_conflicts AS conflicts;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.check_taxi_availability TO authenticated;
