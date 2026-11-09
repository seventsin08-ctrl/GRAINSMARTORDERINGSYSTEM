# GrainSmart Ordering System

An Apple-style self-order **kiosk** for customers plus a full **admin dashboard** for the store.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

| URL | What |
| --- | --- |
| `/kiosk` | Customer kiosk (welcome → dine in / take out → menu → cart → checkout → order number) |
| `/order/:id` | Live order-tracking page (QR on the confirmation screen and receipt) |
| `/loyalty` | Customer stamp-card lookup |
| `/admin` | Admin dashboard — demo PIN **1234** |

## Features

**Kiosk:** welcome/attract screen with idle reset, order types, categories, search, featured items, item options (required/optional add-ons, notes, quantity), upsell suggestions, cart, vouchers, Senior/PWD discount with ID capture, payment methods, loyalty stamps by mobile number, order number + tracking QR, senior-friendly mode.

**Admin:**
- Dashboard (sales, orders, new vs returning customers, best sellers, busiest hours, to-dos; Today/7/30/90 days)
- Orders (live board + list, sound alert, accept → ready → complete, paid/unpaid, cancel with stock restore, printable receipt, CSV export)
- Menu: items, categories (reorder), add-ons, Boost Sales (upsells)
- Reports: Sales, Cash & remits (drawer over/short), Expenses, Profit
- Stock: per-branch inventory, adjustments, transfers, stock history with duplicate-deduction guard
- Grow: Customers, Loyalty, Texts, Vouchers, Senior & PWD log
- Store setup: Order types, Branches, Staff PINs, Payment methods, **Branding Studio** (logo, colors, theme presets, fonts, layout, hero, welcome page, live preview on desktop/tablet/mobile, undo/redo, publish), Receipt Studio, QR codes, Connect AI (data snapshot + backup/restore), Settings, Learn

## Data

Data is stored in the browser (`localStorage`) and syncs live between the kiosk and admin tabs on the same device. Use **Connect AI → Backup** to move data between devices. A shared cloud database (so several tablets and phones see the same orders) is the next step.
