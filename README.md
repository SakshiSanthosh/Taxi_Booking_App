# Smart Taxi Manager 🚖

A responsive, mobile-first web application designed specifically for an owner-driver operating a single taxi who receives customer bookings through phone calls.

---

## 🌟 Key Capabilities

1. **Dashboard Dispatch Desk**:
   - Live metrics for **Today's Trips**, **Tomorrow's Trips**, and **Total Upcoming Bookings**.
   - Immediate **Next Scheduled Trip** highlight banner with route, departure time, and one-tap **Call Customer** button.
   - Quick **Check Availability** and **Add Booking** shortcuts.

2. **Availability Checker (Core Feature)**:
   - Evaluates slot availability using the strict interval condition:
     $$\text{newStart} < \text{existingEnd} \land \text{newEnd} > \text{existingStart}$$
   - **Exclusion of Cancelled & Completed Bookings**: Releases freed slots automatically.
   - **Consecutive Booking Support**: Trips where one ends exactly when the next begins (e.g. 2:00 PM and 2:00 PM) do not conflict.
   - Direct transfer of validated slots to the booking form via **"Book this Slot Now"**.
   - Dual-layer protection: **Frontend client pre-check** + **PostgreSQL EXCLUDE constraint** in Supabase.

3. **Booking Calendar**:
   - Monthly calendar view with previous/next month navigation & "Today" shortcut.
   - Color-coded badges for **Confirmed** (emerald), **Completed** (blue), and **Cancelled** (strikethrough).
   - Tap any date to view and inspect all trips scheduled for that day.
   - Tap any trip to view complete details, route, fare, and customer contact actions.

4. **Booking History & Management**:
   - Instant search across customer name, phone number, and pickup/drop locations.
   - Filter by status (`all`, `confirmed`, `completed`, `cancelled`).
   - Filter by date (`today`, `upcoming`, `past`, or specific calendar day).
   - Status actions: Mark as Completed, Cancel Trip (frees time slot), or Edit Booking (excludes own ID during overlap validation).

5. **Trip Reminders & Notification System**:
   - Web Notification API integration with permission prompt.
   - High-priority banner for imminent trips starting within 2 hours.
   - Web Audio chime alerts for timely driver reminders.
   - Transparent explanation regarding browser-level notification limits.

---

## 🛠️ Technology Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS (dark mode palette, touch-friendly tap targets)
- **Database & Backend**: Supabase (PostgreSQL 15+)
- **Authentication**: Supabase Auth (Email & Password, single-owner restriction)
- **Timezone**: `Asia/Kolkata` (IST, UTC+05:30)
- **Icons**: Lucide React
- **Deployment**: Vercel

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Database Setup (Supabase)
1. Open your project in the [Supabase Dashboard](https://app.supabase.com).
2. Go to **SQL Editor** -> **New query**.
3. Paste and run the entire contents of `supabase/schema.sql`.
4. This script sets up:
   - Table `bookings` with all required columns.
   - `btree_gist` extension for exclusion constraints.
   - PostgreSQL exclusion constraint `prevent_overlapping_confirmed_bookings` preventing double-booking at the database engine level.
   - Row Level Security (RLS) policies ensuring only the authenticated driver can read or write their records.
   - Helper function `check_taxi_availability`.

### 4. Owner Account Setup
1. In the Supabase Dashboard, go to **Authentication** -> **Users**.
2. Click **Add User** -> **Create User** with your driver email and password.
3. In **Authentication** -> **Providers** -> **Email**, disable **"Allow new users to sign up"** to prevent public registration.

### 5. Run the Local Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your mobile or desktop browser.

---

## 💡 Offline / Demo Mode Support

If you want to test or demo the app before setting up Supabase:
- Click **"Explore Demo Driver Account"** on the login screen, or click the **Storage: Settings** button in the top navigation.
- The app includes realistic sample bookings in local storage and executes the full overlap algorithm, status transitions, and calendar navigation.
- You can enter Supabase credentials at any time directly through the in-app **Settings** modal without rebuilding.

---

## 🧪 Testing

Run the automated overlap verification test suite:
```bash
node test/overlap.test.js
```
The suite verifies 10/10 edge cases including exact overlaps, partial overlaps, consecutive trip boundaries, cancelled/completed slot release, midnight-crossing trips, and editing self-exclusion.

---

## 📦 Production Build & Vercel Deployment

Build the optimized production bundle:
```bash
npm run build
```
The output will be created in `dist/`.

To deploy to Vercel:
1. Connect your GitHub repository to Vercel.
2. In the Vercel project settings, add the environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Click **Deploy**. The included `vercel.json` ensures client-side routing works smoothly.

