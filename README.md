# ForgeAdmin - Firebase-Powered E-Commerce Admin Dashboard

ForgeAdmin is a multi-page e-commerce admin dashboard with real Firebase integration.
It includes authentication, Firestore-backed CRUD modules, dashboard stats, and seed data for hackathon demos.

## Current Status

- Firebase Auth is integrated (email/password flow)
- Firestore is integrated as the primary database
- Major modules are fully wired to API endpoints
- UI user profile (name/email/initials/role) is dynamic from logged-in user data
- Robust CSV Export module installed for Inventory and Orders datatables
- Fully Dynamic Analytics charts equipped with auto-calculating trends based on 7-Day / 30-Day interval queries
- Cloud Composite Index bottlenecks resolved by native JavaScript pagination sorting
- Hackathon mode is enabled for faster demo setup

## Features

- Auth: signup, login, logout, protected pages
- Dashboard: revenue/orders/customers/products cards from Firestore
- Analytics: Live interactive metric tracking over selected time intervals (7d, 30d, custom)
- Products: list, search, create, edit, delete
- Categories: list, create, edit, delete (with product count guard on delete)
- Inventory: stock monitoring and stock updates, auto-exports to CSV
- Orders: list, search, status transitions, order details modal, filtered batch CSV exports
- Customers: list/search/create/edit/soft-delete
- Reviews: moderation (approve/reject/delete)
- Promotions: coupon CRUD with validation
- Staff: list/create/edit/delete
- Settings: profile + notification preferences + internal security access updates
- Seed utility page to populate demo data quickly

## Tech Stack

- HTML5, CSS3, Tailwind CSS
- Vanilla JavaScript (ES modules)
- Firebase Auth
- Cloud Firestore
- Font Awesome + Inter font

## Project Structure

```txt
/
├── index.html
├── seed.html
├── firestore.rules
├── style.css
├── js/
│   ├── firebase-config.js
│   ├── forge-api.js
│   ├── ui-utils.js
│   ├── seed.js
│   ├── auth.js
│   ├── auth-ui.js
│   └── pages/
│       ├── dashboard.js
│       ├── analytics.js
│       ├── products.js
│       ├── categories.js
│       ├── inventory.js
│       ├── orders.js
│       ├── customers.js
│       ├── reviews.js
│       ├── promotions.js
│       ├── staff.js
│       ├── settings.js
│       ├── signup.js
│       └── login.js
└── pages/
    ├── signup.html
    ├── dashboard.html
    ├── analytics.html
    ├── products.html
    ├── categories.html
    ├── inventory.html
    ├── orders.html
    ├── customers.html
    ├── reviews.html
    ├── promotions.html
    ├── staff.html
    └── settings.html
```

## Firebase Setup

### 1) Create Firebase Project

1. Open Firebase Console
2. Create/select project
3. Add a web app
4. Copy Firebase config values

### 2) Configure App

Update `js/firebase-config.js` with your Firebase credentials.

### 3) Enable Authentication

- Go to Authentication -> Sign-in method
- Enable Email/Password provider

### 4) Create Firestore Database

- Go to Firestore Database
- Create database (recommended: production mode + proper rules)

### 5) Deploy Firestore Rules

This repo includes `firestore.rules`.
Deploy rules using Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

## Run Locally

Because this uses ES modules, run on a local server (not file://).

Example (if you have Python):

```bash
python -m http.server 5500
```

Then open:

- `http://localhost:5500/index.html`

## Demo Data (Seed)

1. Login first
2. Open `seed.html`
3. Click **Seed Database**
4. Go to dashboard and test all modules with sample data

The seed creates:

- categories, products, customers, orders
- reviews, promotions, staff

## Validation and Safety Improvements Included

- Escaping helpers for HTML/attribute injection prevention
- Input validation for key numeric fields:
  - product price/stock
  - promotion discount values
  - inventory stock updates
- Basic required-field validation for customer/staff records
- Double-submit protection through button loading state

## Hackathon Mode Notes

Current implementation is optimized for demo speed:

- New signup users are assigned admin role for quick testing
- Firestore rules are currently relaxed for authenticated users

Before production, tighten:

- role assignment policy
- Firestore access rules
- authorization checks per module/action

## Troubleshooting

### Registration failed

Likely causes:

- Email/password auth not enabled
- Firestore rules blocking `settings/{uid}` write
- network/auth domain mismatch

### Dashboard stats not loading

Likely causes:

- rules not deployed
- empty `orders`/`products`/`customers` collections
- not authenticated session

### Name not updating after login

User name/email/role come from:

- Firebase user profile
- Firestore `settings/{uid}.profile` and `settings/{uid}.role`

If missing, update settings page or check signup flow writes.

## Security and Production Checklist

- Replace hackathon rules with least-privilege rules
- Enforce strict role-based checks in rules and app logic
- Disable auto-admin on signup
- Add audit logging for critical operations
- Add pagination/index strategy for scale
- Add server-side validation layer (Cloud Functions/API) for sensitive writes

## Related Docs

- `FIREBASE_AUTH_INTEGRATION.md`
- `TESTING_GUIDE.md`
- `START_SERVER.md`
- `QUICK_FIX.md`

## License

MIT (see `LICENSE`)
