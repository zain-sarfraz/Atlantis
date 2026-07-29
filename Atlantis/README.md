# The Serrano Resort

Frontend-only luxury hotel room reservation SPA built with React, Vite, TypeScript, Tailwind CSS, and React Router.

All room, rate, and calendar data is mocked locally — no backend or payments.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start Vite dev server    |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |

## Features

- Search with guests stepper, dual-month calendar with per-date prices, promo code
- Room listings by category with sub-type tabs and expandable rate plans
- Room detail modal (gallery, amenities, resort perks)
- Booking summary with live tax/fee breakdown (service 10%, municipality 7%, VAT 5%)
- Cart drawer and My Bookings page
- Filters (bed type, view, price) and sort by price
- Currency switcher (AED / USD / EUR / GBP)
- Dismissible alerts banner

## Project structure

```
src/
  components/   Navbar, SearchBar, Calendar, FilterBar, RoomCard,
                RoomModal, BookingSummary, CartDrawer, AlertsBanner
  context/      BookingContext (useReducer state)
  data/         mock-data.ts, mock-calendar-prices.ts
  pages/        StayPage, MyBookingsPage
  types/        Shared TypeScript types
  utils/        Pricing & date helpers
```
