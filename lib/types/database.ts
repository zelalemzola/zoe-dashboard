export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  contact: string | null;
  address: string | null;
  payment_type: "on_delivery" | "credit";
  credit_days: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerPrice {
  id: string;
  customer_id: string;
  product_id: string;
  price: number;
  created_at: string;
}

export interface Provider {
  id: string;
  name: string;
  contact: string | null;
  address: string | null;
  payment_type: "on_delivery" | "credit";
  credit_days: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderPrice {
  id: string;
  provider_id: string;
  product_id: string;
  price: number;
  bulk_price?: number | null;
  bulk_min_quantity?: number | null;
  created_at: string;
}

export type OrderStatus = "pending" | "processing" | "delivered" | "cancelled";
export type PaymentType = "on_delivery" | "credit";

export interface Order {
  id: string;
  customer_id: string;
  delivery_date: string;
  status: OrderStatus;
  payment_type: PaymentType;
  credit_days: number;
  credit_due_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface Sale {
  id: string;
  order_id: string | null;
  customer_id: string;
  sale_date: string;
  total_amount: number;
  is_paid: boolean;
  receipt_given: boolean;
  withholding_received: boolean;
  completed_at: string | null;
  credit_due_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface Restock {
  id: string;
  provider_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  restock_date: string;
  is_paid: boolean;
  receipt_received: boolean;
  withholding_issued: boolean;
  withholding_amount?: number | null;
  credit_due_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  created_by: string | null;
  deadline: string | null;
  status: TaskStatus;
  progress: number;
  created_at: string;
  updated_at: string;
}

export type CostType = "recurring" | "one_time";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface Cost {
  id: string;
  amount: number;
  type: CostType;
  category: string;
  description: string | null;
  date: string;
  recurring_frequency: RecurringFrequency | null;
  created_by: string | null;
  created_at: string;
}

// Extended types with relations
export interface OrderWithDetails extends Order {
  customer?: Customer;
  items?: (OrderItem & { product?: Product })[];
}

export interface SaleWithDetails extends Sale {
  customer?: Customer;
  items?: (SaleItem & { product?: Product })[];
}

export interface TaskWithAssignee extends Task {
  assignee?: Profile;
}
