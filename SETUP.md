# JYGEN Admin setup

The admin app is a standalone Vite project in this directory. It uses the same Supabase project as the JYGEN public site and only needs a browser-safe anon/publishable key. Never put a Supabase `service_role` or secret key in this app, in a `VITE_` variable, or in a deployed frontend.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

These values are public by design. Database access is protected by Supabase Auth and RLS. Keep `.env.local` untracked and do not add secrets to Vite variables.

## Apply the database SQL

In the Supabase dashboard for the project already used by `jygen.tech`, open **SQL Editor** and run these files in order:

1. `supabase/schema.sql`
2. `supabase/indexes.sql`
3. `supabase/rls.sql`

The schema keeps the existing `public.contacts` table and website form fields in place. It adds only the admin fields if missing. It does not assume a type for `contacts.id`; note and activity records store the contact id as text. The RLS script removes existing `contacts` policies before installing role-scoped access: anon can insert only, while it cannot read, update, or delete contacts. The existing public form currently writes server-side with its secret key, so it continues to work without any public site changes.

The signup trigger creates new admin profiles as inactive `viewer` accounts. They cannot sign in to the workspace or read leads until a super admin explicitly activates them. Disable public Auth signups in Supabase once initial admin accounts are created; create and approve additional accounts through the approved admin process.

## Create the first super admin

1. In Supabase **Authentication → Users**, create the first admin account with the intended email and a temporary password. (Alternatively, create the user through the application's email/password auth flow if signup is enabled.)
2. The auth trigger creates a `viewer` profile. In SQL Editor, promote only that known user, using their exact Auth user UUID:

   ```sql
   update public.admin_profiles
   set role = 'super_admin', active = true, updated_at = now()
   where id = 'AUTH_USER_UUID_HERE';
   ```

3. Confirm exactly one row was updated, then sign in at `/login`. Do not promote users based only on client-supplied metadata; roles are read from `admin_profiles` and protected by RLS.
4. Add `https://admin.jygen.tech/reset-password` to Supabase **Authentication → URL Configuration → Redirect URLs**. Keep the existing global Site URL unchanged if the public site or another app already relies on it.

## Run locally

From this directory:

```bash
npm install
npm run dev
npm run build
```

Without Supabase environment variables, the login screen remains available but sign-in and protected data routes are disabled. Add both values before local data and authentication checks; there is no demo login or bundled lead data.

## Vercel deployment

1. Import the repository into Vercel and set the **Root Directory** to `admin`.
2. Keep the build command as `npm run build` and output directory as `dist` (also set in `vercel.json`).
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Project Settings for each deployment environment. Redeploy after changing them; Vite embeds these public values at build time.
4. Attach `admin.jygen.tech` to this Vercel project and configure its DNS records as Vercel instructs.
5. Add the admin origin and `/reset-password` callback URL in Supabase Auth settings, then test sign-in, password reset, and each role with separate accounts.

The Vercel SPA rewrite serves the app for direct navigation to client routes. The existing `jygen.tech` Vercel project and public site configuration should remain separate from this admin deployment.
