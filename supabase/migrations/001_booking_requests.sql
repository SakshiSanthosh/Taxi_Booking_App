-- ==============================================================================
-- MIGRATION 001: Create public.booking_requests Table
-- Purpose: Store public customer taxi booking requests submitted via website/app.
-- Security: RLS enabled; public guests can INSERT pending requests only.
-- ==============================================================================

-- 1. Create booking_requests table
CREATE TABLE IF NOT EXISTS public.booking_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    drop_location TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    admin_notes TEXT,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ,

    -- Constraint: End time must be strictly after start time
    CONSTRAINT check_request_end_after_start CHECK (end_at > start_at)
);

-- 2. Indexes for fast status filtering and chronological sorting
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON public.booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_created_at ON public.booking_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_requests_start_at ON public.booking_requests(start_at ASC);
CREATE INDEX IF NOT EXISTS idx_booking_requests_booking_id ON public.booking_requests(booking_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- 4. Public Guest INSERT Policy
-- Guests (both anonymous and authenticated) can ONLY submit requests with status = 'pending'
-- and CANNOT tamper with booking_id, reviewed_at, or admin_notes during creation.
DROP POLICY IF EXISTS "Public guests can submit pending booking requests" ON public.booking_requests;
CREATE POLICY "Public guests can submit pending booking requests"
    ON public.booking_requests
    FOR INSERT
    TO public
    WITH CHECK (
        status = 'pending'
        AND booking_id IS NULL
        AND reviewed_at IS NULL
        AND admin_notes IS NULL
    );

-- 5. Revoke dangerous permissions from public/anon
REVOKE UPDATE, DELETE, TRUNCATE ON public.booking_requests FROM anon, public;

COMMENT ON TABLE public.booking_requests IS 'Customer ride booking requests pending driver review and approval';
