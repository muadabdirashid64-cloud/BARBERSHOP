import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'super_admin' | 'admin' | 'barber' | 'customer' | 'cashier';

export interface BarberShop {
  id: string;
  name: string;
  location: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}
export type ExpenseCategory = 'rent' | 'utilities' | 'supplies' | 'salaries' | 'marketing' | 'maintenance' | 'other';
export type RevenueSource = 'haircut' | 'beard_trim' | 'hair_wash' | 'hair_styling' | 'facial' | 'home_service' | 'other';

export interface CashierPermissions {
  can_add_income?: boolean;
  can_add_expense?: boolean;
  can_add_customer?: boolean;
  can_use_pos?: boolean;
  can_delete_income?: boolean;
  can_delete_expense?: boolean;
  can_edit_customer?: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  permissions: CashierPermissions | null;
  shop_id: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopOwner {
  id: string;
  full_name: string;
  username: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  shop_id: string | null;
}

export interface BarberShopWithOwner extends BarberShop {
  owner?: ShopOwner | null;
}

export interface Employee {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  experience: string | null;
  salary: number;
  commission_rate: number;
  avatar_url: string | null;
  specialization: string | null;
  status: string;
  hire_date: string;
  shop_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  total_visits: number;
  total_spent: number;
  last_visit: string | null;
  is_active: boolean;
  shop_id: string | null;
  created_at: string;
  updated_at: string;
  favorite_barber_id: string | null;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string | null;
  is_active: boolean;
  image_url: string | null;
  shop_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Revenue {
  id: string;
  appointment_id: string | null;
  source: RevenueSource;
  amount: number;
  description: string | null;
  payment_method: string;
  transaction_date: string;
  received_by: string | null;
  notes: string | null;
  created_at: string;
  employee_id: string | null;
  shop_id: string | null;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  expense_date: string;
  vendor: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  recorded_by: string | null;
  notes: string | null;
  shop_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  product_name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  supplier: string | null;
  sku: string | null;
  reorder_level: number;
  is_active: boolean;
  last_restocked: string | null;
  notes: string | null;
  shop_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeService {
  id: string;
  customer_id: string | null;
  customer_name: string;
  phone_number: string;
  address: string;
  location: string | null;
  service_id: string | null;
  service_type: string;
  appointment_date: string;
  appointment_time: string;
  assigned_barber_id: string | null;
  status: string;
  total_amount: number;
  home_service_fee: number;
  notes: string | null;
  shop_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BarberAttendance {
  id: string;
  employee_id: string | null;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface BarberRating {
  id: string;
  appointment_id: string | null;
  barber_id: string | null;
  customer_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  related_id: string | null;
  related_type: string | null;
  created_at: string;
}

export interface ShopSettings {
  id: string;
  shop_name: string;
  shop_logo_url: string | null;
  shop_address: string | null;
  shop_phone: string | null;
  shop_email: string | null;
  opening_time: string;
  closing_time: string;
  working_days: string[];
  currency: string;
  tax_rate: number;
  language: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerNote {
  id: string;
  customer_id: string | null;
  note: string;
  created_by: string | null;
  created_at: string;
}

export interface CustomerFavorite {
  id: string;
  customer_id: string | null;
  service_id: string | null;
  created_at: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  customer_id: string | null;
  employee_id: string | null;
  service_id: string | null;
  customer_name: string | null;
  service_name: string | null;
  appointment_date: string;
  appointment_time: string | null;
  status: AppointmentStatus;
  price: number | null;
  notes: string | null;
  shop_id: string | null;
  created_at: string;
  updated_at: string;
}
