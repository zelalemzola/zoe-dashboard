# Zoe Coffee Distribution - Setup Guide

## Prerequisites

- Node.js 18+
- Supabase account

## 1. Environment Variables

Your `.env.local` should have (you mentioned you added Supabase keys):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

And either:

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Or (new Supabase key format you're using):

```
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key
```

The app supports both variable names.

## 2. Environment: Service Role Key

For user management (creating users as admin), add to `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get it from **Supabase Dashboard → Settings → API → service_role** (keep this secret!).

## 3. Database Schema

Run the SQL migrations in your Supabase project:

1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order: `001_initial_schema.sql`, `002_fix_profile_signup.sql`, `004_roles_and_leads.sql`

These create:

- `profiles` – user profiles (auto-created on signup)
- `products` – products with quantity
- `customers` – customers with payment type (on_delivery/credit) and credit days
- `customer_prices` – per-customer product pricing
- `providers` – suppliers with payment type and credit days
- `provider_prices` – per-provider product pricing
- `orders` – customer orders with delivery date
- `order_items` – order line items
- `sales` – completed sales with completion tasks (paid, receipt, withholding)
- `sale_items` – sale line items
- `restocks` – inventory restocks from providers
- `tasks` – team tasks with assignees
- `costs` – recurring and one-time expenses
- `leads` – sales outreach (cafés, status, follow-up dates)

## 4. Create Admin User

**Option A: First-time setup (recommended)**

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
2. Go to `/setup` in your browser
3. Click "Create Admin" – creates admin@zoecoffee.com with password `Admin123!`
4. Log in and **change the password** in Supabase Dashboard (Authentication → Users)

**Option B: Use existing user**

1. Sign up at `/signup` with your email
2. Run in Supabase SQL Editor: `UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';`

## 5. Enable Email Auth (Supabase)

In Supabase Dashboard → Authentication → Providers:

- Enable Email provider
- Disable “Confirm email” if you want immediate sign-in during development

## 6. Run the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You’ll be redirected to `/login`.

## 7. First-Time Setup

1. Sign up at `/signup`
2. A profile is created automatically
3. Go to the Dashboard and start adding:
   - **Products** (Inventory)
   - **Providers** (Providers) – add product prices
   - **Customers** (Customers) – add custom prices and payment type

## Shadcn Components Used

These are already installed:

- Button, Card, Dialog, Input, Label, Select
- Table, Tabs, Badge, Checkbox
- Dropdown Menu, Sheet, Drawer
- Progress, Avatar, Separator
- Sidebar, Tooltip, Sonner (toast)
- Textarea, Popover, Skeleton

If something is missing, add it with:

```bash
npx shadcn@latest add <component-name>
```
