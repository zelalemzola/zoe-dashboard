# Zoe Coffee Distribution Dashboard

A full-featured management system for coffee distribution businesses. Built with Next.js, TypeScript, Tailwind CSS, Supabase, and shadcn/ui.

## Features

### 1. Analytics Dashboard
- Revenue, costs, profit/loss, and balance
- Overview of completed sales and expenses

### 2. Task Management
- Create tasks with title, description, deadline
- Assign to team members (from Supabase users)
- Progress tracking (todo, in progress, done)
- "All Tasks" and "My Tasks" views

### 3. Inventory Management
- Add products with units (kg, g, pcs, box)
- Record restocks (provider, product, quantity, price)
- Low stock alerts
- Restock history

### 4. Customer Management
- Customer details (name, contact, address)
- Payment type: On delivery or Credit (with days)
- Custom product pricing per customer
- Last order tracking

### 5. Order Management
- Create orders with customer, delivery date
- Multiple products per order
- Pre-filled prices from customer pricing
- Override payment type/credit days per order
- Status: pending, processing, delivered, cancelled

### 6. Sales Management
- Record sales from delivered orders
- Pre-filled client, products, amounts
- Completion tasks: Paid, Receipt given, Withholding received
- Sale marked complete when all tasks done
- Filter by completion status

### 7. Credit Tracking
- Client credit: amounts owed, due dates, days overdue
- Provider payables: amounts owed to suppliers
- Overdue alerts

### 8. Provider Management
- Provider details (name, contact, address)
- Payment type: On delivery or Credit
- Product pricing per provider (pre-fills when restocking)

### 9. Cost Management
- Recurring costs (rent, utilities) with frequency
- One-time costs (taxes, purchases)
- Category and description

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI:** shadcn/ui (Radix Nova)
- **Database & Auth:** Supabase

## Quick Start

1. **Install dependencies:** `npm install`
2. **Configure Supabase:** Add keys to `.env.local` (see [SETUP.md](./SETUP.md))
3. **Run migration:** Execute `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor
4. **Start dev server:** `npm run dev`
5. **Sign up** at `/signup` and start using the dashboard

See [SETUP.md](./SETUP.md) for detailed setup instructions.
