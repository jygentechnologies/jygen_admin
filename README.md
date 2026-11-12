# JYGEN Admin

The dashboard is a standalone React + TypeScript app for `admin.jygen.tech`. Configure its deployment project with this folder as the project root. The public `jygen.tech` site is a separate project and does not include this app in its build.

## Local preview

- `npm install` installs this app's dependencies.
- `npm run dev` starts the dashboard through Vite.
- `npm run build` type-checks and builds the app into `dist/`.
- `vercel.json` contains SPA route rewrites and security headers for a standalone Vercel project.

## Supabase

Follow [SETUP.md](SETUP.md) to configure the existing Supabase project, apply schema/RLS/index SQL, bootstrap the first super admin, and deploy the app. Only a browser-safe anon/publishable key is used in this frontend; a service-role key must never be added here.
