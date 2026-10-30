# Serrano Hotel — Full Stack Booking System

## Project Structure

```
Atlantis/
├── Atlantis/        ← Frontend + Admin Panel (React + Vite + TypeScript + Tailwind)
└── backend/         ← REST API (Node.js + Express + Prisma + MySQL)
```

---

## Quick Start

### 1. Set up MySQL

Install MySQL and create a database:
```sql
CREATE DATABASE serrano_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env — update DATABASE_URL with your MySQL credentials:
# DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/serrano_db"
npm install
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run migrations (creates all tables)
npm run db:seed         # Seed with hotel data + admin accounts
npm run dev             # Start backend on port 3001
```

**Default Admin Credentials (after seed):**
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@serrano.hotel | Admin@1234 |
| Reservations Manager | reservations@serrano.hotel | Manager@1234 |
| Content Editor | content@serrano.hotel | Editor@1234 |

### 3. Start Frontend (+ Admin)

```bash
cd Atlantis
npm install
npm run dev   # Starts on http://localhost:5173
# Admin panel: http://localhost:5173/admin
```

---

## API Reference

### Base URL: `http://localhost:3001/api`

#### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/search` | Search availability (dates, guests, currency) |
| GET | `/rooms` | List all room categories |
| GET | `/rooms/:slug` | Get room details |
| GET | `/alerts` | Get hotel alerts/announcements |
| GET | `/currency` | Get exchange rates |
| POST | `/bookings` | Create a booking |
| GET | `/bookings/:ref` | Get booking by reference |
| POST | `/bookings/validate-promo` | Validate a promo code |
| GET | `/bookings/guest/:email` | Get guest booking history |

#### Search Example
```
GET /api/search?checkIn=2026-08-01&checkOut=2026-08-05&adults=2&rooms=1&currency=USD
```

#### Create Booking Example
```json
POST /api/bookings
{
  "checkIn": "2026-08-01",
  "checkOut": "2026-08-05",
  "adults": 2,
  "children": 0,
  "roomsCount": 1,
  "currency": "AED",
  "promoCode": "SERRANO10",
  "items": [
    { "roomTypeId": "...", "ratePlanId": "..." }
  ],
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+971501234567",
  "country": "AE",
  "city": "Dubai"
}
```

### Admin API (`/api/admin`)

All admin routes require `Authorization: Bearer <jwt_token>`.

| Path | Description |
|------|-------------|
| POST `/auth/login` | Admin login → returns JWT |
| GET `/dashboard` | Stats, recent bookings, revenue |
| CRUD `/categories` | Room categories |
| CRUD `/rooms` | Room types + images |
| CRUD `/rooms/:id/rate-plans` | Rate plans per room |
| PUT `/rate-plans/:id/overrides` | Seasonal price overrides |
| GET/PUT `/availability/:roomTypeId` | Inventory calendar |
| CRUD `/bookings` | Booking management |
| CRUD `/promos` | Promo codes |
| PUT `/currency` | Exchange rates |
| POST `/currency/sync` | Sync rates from live API |
| CRUD `/guests` | Guest records |
| CRUD `/staff` | Admin user accounts |
| CRUD `/alerts` | Hotel announcements |

---

## Admin Panel Features

- **Dashboard**: Revenue stats, occupancy KPIs, check-ins/outs today, recent bookings, top room types
- **Rooms & Rates**: Full CRUD for categories → room types → rate plans. Image upload per room.
- **Availability Calendar**: Per-room monthly calendar with inline editing. Bulk date range updates.
- **Bookings**: List with filters (status, date range, search), status management, full detail view with fee breakdown
- **Promo Codes**: Create percentage or fixed-AED discounts with validity dates and usage limits
- **Currency**: Manual AED exchange rate management + live API sync button
- **Guests**: Searchable guest registry with booking history links
- **Alerts**: Hotel announcements shown on the booking page
- **Staff**: Role-based account management (Super Admin only)

### Role Permissions

| Feature | Super Admin | Reservations Mgr | Content Editor |
|---------|-------------|-------------------|----------------|
| Dashboard | ✅ | ✅ | ✅ |
| Room CRUD | ✅ | View | ✅ |
| Bookings | ✅ | ✅ | ❌ |
| Promo Codes | ✅ | View | ✅ |
| Currency | ✅ | View | ✅ |
| Guests | ✅ | ✅ | ❌ |
| Staff | ✅ | ❌ | ❌ |

---

## Data Models

```
RoomCategory → RoomType → RatePlan → PriceOverride
                        ↓
                   Availability (per date)
                        ↓
                   BookingItem → Booking → Guest
                        ↓
                   PromoCode
```

---

## Pricing Logic

Matches the frontend exactly:

```
subtotal        = nightlyRate × nights
serviceCharge   = subtotal × 10%
municipalityFee = subtotal × 7%
taxable         = subtotal + serviceCharge + municipalityFee
vat             = taxable × 5%
total           = subtotal + serviceCharge + municipalityFee + vat
```

Rates are stored in AED and converted to the selected currency at display time using `CurrencyRate` table.

---

## Connecting the Frontend to the Backend

The frontend currently uses mock data. To switch it to the live API:

1. The API client is already created at `src/api/client.ts`
2. The Vite proxy is configured to forward `/api` → `http://localhost:3001`
3. To use live data, update `BookingContext.tsx`:
   - Replace `import { roomCategories } from '../data/mock-data'` with API calls to `/api/search`
   - Replace `confirmCheckout()` with a call to `hotelApi.createBooking()`
   - This gives you full persistence, promo validation, and inventory management

---

## Environment Variables

See `backend/.env.example` for all configurable options including:
- Database URL (PostgreSQL recommended)
- JWT secrets
- CORS origins
- Exchange rate API key (optional, for live currency sync)
- Fee rates (service charge, municipality fee, VAT)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS v4, Vite |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | MySQL (via Prisma ORM) |
| Auth | JWT (access + refresh tokens) |
| Images | Local disk (multer) — S3-ready |
| Admin | React 18, TypeScript, Tailwind CSS v4, Vite |
