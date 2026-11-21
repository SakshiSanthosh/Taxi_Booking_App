-- ==============================================================================
-- MIGRATION 003: Atomic Booking Approval & Rejection Transaction Functions
-- Purpose: Safely approve a customer booking request, enforce double-booking
--          prevention, insert into public.bookings, and update the request atomically.
-- ==============================================================================

-- 1. Secure RPC function to approve customer booking request
CREATE OR REPLACE FUNCTION public.approve_booking_request(
    p_request_id UUID,
    p_fare NUMERIC,
    p_advance_amount NUMERIC DEFAULT 0.00,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_req RECORD;
    v_conflict RECORD;
    v_booking_id UUID;
    v_fare NUMERIC;
    v_advance NUMERIC;
    v_combined_notes TEXT;
BEGIN
    -- Step 1: Ensure caller is an authenticated, authorized admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: Caller is not an authorized administrator.'
            USING ERRCODE = '42501';
    END IF;

    -- Step 2: Validate input amounts
    v_fare := COALESCE(p_fare, 0);
    v_advance := COALESCE(p_advance_amount, 0);

    IF v_fare < 0 THEN
        RAISE EXCEPTION 'Total fare cannot be negative.'
            USING ERRCODE = '22003';
    END IF;

    IF v_advance < 0 THEN
        RAISE EXCEPTION 'Advance amount cannot be negative.'
            USING ERRCODE = '22003';
    END IF;

    IF v_advance > v_fare AND v_fare > 0 THEN
        RAISE EXCEPTION 'Advance amount (%) cannot exceed total fare (%).', v_advance, v_fare
            USING ERRCODE = '22003';
    END IF;

    -- Step 3: Fetch and lock the pending request row to prevent race conditions
    SELECT *
    INTO v_req
    FROM public.booking_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking request with ID % not found.', p_request_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_req.status <> 'pending' THEN
        RAISE EXCEPTION 'Request cannot be approved because its current status is "%".', v_req.status
            USING ERRCODE = '22000';
    END IF;

    -- Step 4: Strict Availability & Overlap Verification against confirmed bookings
    -- Condition: newStart < existingEnd AND newEnd > existingStart
    SELECT id, customer_name, start_at, end_at
    INTO v_conflict
    FROM public.bookings
    WHERE status = 'confirmed'
      AND (v_req.start_at < end_at AND v_req.end_at > start_at)
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Cannot approve: Requested time slot conflicts with confirmed booking for % (% to %).',
            v_conflict.customer_name,
            to_char(v_conflict.start_at AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY HH12:MI AM'),
            to_char(v_conflict.end_at AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY HH12:MI AM')
            USING ERRCODE = '23P01';
    END IF;

    -- Step 5: Construct combined booking notes
    v_combined_notes := COALESCE(v_req.notes, '');
    IF p_admin_notes IS NOT NULL AND trim(p_admin_notes) <> '' THEN
        IF v_combined_notes <> '' THEN
            v_combined_notes := v_combined_notes || E'\n[Admin Notes]: ' || trim(p_admin_notes);
        ELSE
            v_combined_notes := '[Admin Notes]: ' || trim(p_admin_notes);
        END IF;
    END IF;

    -- Step 6: Insert into public.bookings
    INSERT INTO public.bookings (
        user_id,
        customer_name,
        customer_phone,
        pickup_location,
        drop_location,
        start_at,
        end_at,
        fare,
        advance_amount,
        status,
        notes,
        created_at,
        updated_at
    ) VALUES (
        auth.uid(),
        v_req.customer_name,
        v_req.customer_phone,
        v_req.pickup_location,
        v_req.drop_location,
        v_req.start_at,
        v_req.end_at,
        v_fare,
        v_advance,
        'confirmed',
        v_combined_notes,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_booking_id;

    -- Step 7: Update public.booking_requests
    UPDATE public.booking_requests
    SET status = 'approved',
        booking_id = v_booking_id,
        admin_notes = p_admin_notes,
        reviewed_at = timezone('utc'::text, now())
    WHERE id = p_request_id;

    -- Return JSON result
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'request_id', p_request_id,
        'status', 'approved'
    );
END;
$$;

-- 2. Secure RPC function to reject customer booking request
CREATE OR REPLACE FUNCTION public.reject_booking_request(
    p_request_id UUID,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_req RECORD;
BEGIN
    -- Ensure caller is an authorized admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: Caller is not an authorized administrator.'
            USING ERRCODE = '42501';
    END IF;

    -- Lock request row
    SELECT *
    INTO v_req
    FROM public.booking_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking request with ID % not found.', p_request_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_req.status <> 'pending' THEN
        RAISE EXCEPTION 'Request cannot be rejected because its current status is "%".', v_req.status
            USING ERRCODE = '22000';
    END IF;

    -- Update request status to rejected
    UPDATE public.booking_requests
    SET status = 'rejected',
        admin_notes = p_admin_notes,
        reviewed_at = timezone('utc'::text, now())
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'status', 'rejected'
    );
END;
$$;

-- Grant execution to authenticated users (internal admin checks prevent unauthorized execution)
GRANT EXECUTE ON FUNCTION public.approve_booking_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_booking_request TO authenticated;
