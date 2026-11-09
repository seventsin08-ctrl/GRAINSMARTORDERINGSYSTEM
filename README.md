# GrainSmart Ordering System

An Apple-style self-order **kiosk** for customers plus a full **admin dashboard** for the store.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

Everything uses hash links, so it works on any static host (Vercel, Netlify, GitHub Pages).

| Link | What |
| --- | --- |
| `#/` | Customer storefront (hero, menu, bag, checkout, track your order) |
| `#/kiosk` | In-store touch kiosk mode |
| `#/order/<code>` | Live order tracking by 4-digit code |
| `#/loyalty` | Loyalty card / points lookup |
| `#/admin` | Admin console — demo logins `admin` / `admin123` (owner), `staff1` / `staff123` (staff) |

## Features

Built from the GrainSmart screenshots in `grainsmart website images/`.

**Storefront:** hero with editable buttons and badge, scrolling intro strip, "The good stuff" menu (8 layouts, 10 card styles), story section, bag drawer, checkout with order methods (Dine In / Pick Up), variations, sugar levels and add-ons, payment QR + optional proof-of-payment upload, vouchers, Senior/PWD, loyalty card code, 4-digit order code and tracking.

**Admin console:** Dashboard · Orders (Start preparing · notify customer, Cash received, Digital payment received, Cancel) · Kitchen tickets · Products · Categories · Add-ons & variations · Bulk import · Boost sales · Sales reports (date range, CSV for Google Sheets, PDF, staff clock times CSV, reset) · Cash & remits register sessions · Expenses (cash/digital) · Profit estimate · Payment methods with QR upload · Loyalty points & printed card codes · Customers · Vouchers · Texts · Senior & PWD · Stock on hand · Transfers · Stock history · Shop design with live preview · Staff accounts with permissions · Attendance · Schedule · Order methods · Branches · Receipt studio · QR codes · Backup · Appearance (light/dark).

## Data

Data is stored in the browser (`localStorage`) and syncs live between tabs on the same device. A shared cloud database is needed for several devices (tablet kiosk + owner's phone) to see the same orders.

## Phone app (Android APK)

The same system as an iOS-style phone app: tabs for Today, Orders, Kitchen, Shop and More (every admin page), slide-in pages, swipe-back, action sheets, and a drop-down banner with sound and vibration for every new order.

- **Download:** the GitHub workflow `.github/workflows/android-apk.yml` builds the APK on every push and attaches it to the **GrainSmart app (latest build)** release (`app-latest`) as `GrainSmart.apk`.
- **Try it in a browser:** open `#/app`.
- The Android project lives in `android/` (Capacitor). `npm run build && npx cap sync android` copies the web app into it.

## Connecting devices (live sync)

The website, kiosk and phone app share one data engine (`src/store/sync.ts`). To make orders appear on every device:

1. Create a free Supabase project and run the setup SQL shown in **Admin → Connect devices**.
2. Paste the Project URL and anon public key on that page on each device, or add them as repository secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (and optionally `VITE_STORE_ID`) so builds come pre-connected.

Without this, each device keeps its own data.
