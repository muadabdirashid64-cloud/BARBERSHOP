import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { RefreshProvider } from '@/context/RefreshContext';
import { ShopProvider } from '@/context/ShopContext';
import { ProtectedRoute, PublicRoute } from '@/components/ProtectedRoute';
import AdminLayout from '@/layouts/AdminLayout';
import CashierLayout from '@/layouts/CashierLayout';
import BarberLayout from '@/layouts/BarberLayout';
import CustomerLayout from '@/layouts/CustomerLayout';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import SuperAdminShopLayout from '@/layouts/SuperAdminShopLayout';
import Login from '@/pages/Login';
import AdminDashboard from '@/pages/admin/Dashboard';
import Employees from '@/pages/admin/Employees';
import Customers from '@/pages/admin/Customers';
import Services from '@/pages/admin/Services';
import Income from '@/pages/admin/Income';
import Expenses from '@/pages/admin/Expenses';
import Inventory from '@/pages/admin/Inventory';
import HomeServices from '@/pages/admin/HomeServices';
import Settings from '@/pages/admin/Settings';
import Reports from '@/pages/admin/Reports';
import CashierDashboard from '@/pages/cashier/Dashboard';
import POS from '@/pages/cashier/POS';
import CashierIncome from '@/pages/cashier/Income';
import CashierExpenses from '@/pages/cashier/Expenses';
import CashierCustomers from '@/pages/cashier/Customers';
import BarberDashboard from '@/pages/barber/Dashboard';
import BarberAppointments from '@/pages/barber/Appointments';
import BarberCustomers from '@/pages/barber/Customers';
import CustomerDashboard from '@/pages/customer/Dashboard';
import Book from '@/pages/customer/Book';
import CustomerHomeServices from '@/pages/customer/HomeServices';
import Favorites from '@/pages/customer/Favorites';
import SuperAdminDashboard from '@/pages/super-admin/Dashboard';
import SuperAdminBarberShops from '@/pages/super-admin/BarberShops';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
        <RefreshProvider>
        <ShopProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<Navigate to="/login" replace />} />

            <Route path="/super-admin" element={<ProtectedRoute role="super_admin"><SuperAdminLayout /></ProtectedRoute>}>
              <Route index element={<SuperAdminDashboard />} />
              <Route path="shops" element={<SuperAdminBarberShops />} />
            </Route>

            <Route path="/super-admin/manage" element={<ProtectedRoute role="super_admin"><SuperAdminShopLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="employees" element={<Employees />} />
              <Route path="customers" element={<Customers />} />
              <Route path="services" element={<Services />} />
              <Route path="income" element={<Income />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="home-services" element={<HomeServices />} />
              <Route path="reports" element={<Reports />} />
              <Route path="cashier" element={<CashierDashboard />} />
            </Route>

            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="employees" element={<Employees />} />
              <Route path="customers" element={<Customers />} />
              <Route path="services" element={<Services />} />
              <Route path="income" element={<Income />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="home-services" element={<HomeServices />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="/cashier" element={<ProtectedRoute role="cashier"><CashierLayout /></ProtectedRoute>}>
              <Route index element={<CashierDashboard />} />
              <Route path="pos" element={<POS />} />
              <Route path="income" element={<CashierIncome />} />
              <Route path="expenses" element={<CashierExpenses />} />
              <Route path="customers" element={<CashierCustomers />} />
            </Route>

            <Route path="/barber" element={<ProtectedRoute role="barber"><BarberLayout /></ProtectedRoute>}>
              <Route index element={<BarberDashboard />} />
              <Route path="appointments" element={<BarberAppointments />} />
              <Route path="customers" element={<BarberCustomers />} />
            </Route>

            <Route path="/customer" element={<ProtectedRoute role="customer"><CustomerLayout /></ProtectedRoute>}>
              <Route index element={<CustomerDashboard />} />
              <Route path="book" element={<Book />} />
              <Route path="home-services" element={<CustomerHomeServices />} />
              <Route path="favorites" element={<Favorites />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        </ShopProvider>
        </RefreshProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
