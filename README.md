<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Divine Love Hospital Management System

A role-based hospital management system built with React, TypeScript, Firebase Auth, and Firestore. Manages patients, visits, prescriptions, lab tests, pharmacy inventory, billing, staff, and attendance.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite
- **Backend:** Firebase (Auth + Firestore), Express (dev server)
- **Deployment:** Vercel (static SPA)

## Roles

| Role        | Access                                              |
|-------------|-----------------------------------------------------|
| Admin       | Full access to all modules, staff management        |
| Doctor      | Patients, visits, prescriptions, lab orders         |
| Nurse       | Patients, visits, lab orders, vitals                |
| Pharmacist  | Pharmacy inventory, dispense prescriptions          |
| Accountant  | Billing / invoices                                  |

## Run Locally

**Prerequisites:** Node.js 18+

1. Clone the repo:
   ```bash
   git clone https://github.com/AARON-WISDOM001/HospitalMgt.git
   cd HospitalMgt
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example and fill in your Firebase project values:
   ```bash
   cp .env.example .env
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. Deploy the contents to Vercel, Netlify, or any static host.

## Firestore Security Rules

The `firestore.rules` file contains hardened role-based access control:

- Default deny on all paths
- Role-specific write permissions (doctor-only prescriptions, pharmacist-only dispensing, accountant-only invoices)
- Field validation with size limits to prevent data poisoning
- Negative inventory protection
- Invoice immutability once paid
- Self-role-change prevention (only admins can modify roles)

Deploy rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

## Project Structure

```
src/
├── App.tsx            # Routes + role-based guards
├── hooks/useAuth.tsx  # Auth context (Firebase Auth + Firestore profile)
├── lib/
│   ├── firebase.ts    # Firebase SDK init
│   ├── errorHandlers.ts
│   └── utils.ts
├── pages/             # Dashboard, Patients, Visits, Pharmacy, etc.
├── components/        # Layout shell
└── types.ts           # TypeScript interfaces & enums
```

## License

Private — all rights reserved.
