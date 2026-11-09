import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';
import Kiosk from './kiosk/Kiosk';
import Shop from './shop/Shop';
import { LoyaltyPage, OrderStatusPage } from './kiosk/OrderStatus';
import AdminLayout from './admin/AdminLayout';
import Login from './admin/pages/Login';
import Dashboard from './admin/pages/Dashboard';
import Orders, { Kitchen } from './admin/pages/Orders';
import { Addons, BoostSales, Categories, MenuManagement } from './admin/pages/MenuPages';
import BulkImport from './admin/pages/Bulk';
import { Cash, Expenses, Profit, Sales } from './admin/pages/Reports';
import { StockLogPage, Transfers } from './admin/pages/Stock';
import { Customers, GovDiscounts, Texts, Vouchers } from './admin/pages/Grow';
import { LoyaltyCards, StockOnHand } from './admin/pages/Loyalty';
import { Branches, ConnectAI, Learn, OrderTypes, PaymentMethods, QRCodes, ReceiptStudio, SettingsPage } from './admin/pages/Setup';
import { Appearance, Attendance, Schedule, StaffPage } from './admin/pages/People';
import BrandingPage from './admin/pages/Branding';
import { ToastHost } from './components/ui';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Shop />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/order/:id" element={<OrderStatusPage />} />
        <Route path="/loyalty" element={<LoyaltyPage />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="kitchen" element={<Kitchen />} />
          <Route path="bulk-import" element={<BulkImport />} />
          <Route path="branding" element={<BrandingPage />} />
          <Route path="hero-designer" element={<BrandingPage initial="hero" />} />
          <Route path="welcome-designer" element={<BrandingPage initial="welcome" />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="appearance" element={<Appearance />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="categories" element={<Categories />} />
          <Route path="addons" element={<Addons />} />
          <Route path="boost-sales" element={<BoostSales />} />
          <Route path="reports" element={<Sales />} />
          <Route path="reports/profit" element={<Profit />} />
          <Route path="cash" element={<Cash />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="inventory" element={<StockOnHand />} />
          <Route path="inventory/transfers" element={<Transfers />} />
          <Route path="inventory/log" element={<StockLogPage />} />
          <Route path="customers" element={<Customers />} />
          <Route path="loyalty" element={<LoyaltyCards />} />
          <Route path="texts" element={<Texts />} />
          <Route path="vouchers" element={<Vouchers />} />
          <Route path="gov-discounts" element={<GovDiscounts />} />
          <Route path="order-types" element={<OrderTypes />} />
          <Route path="outlets" element={<Branches />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="payment-methods" element={<PaymentMethods />} />
          <Route path="receipt-editor" element={<ReceiptStudio />} />
          <Route path="qr-codes" element={<QRCodes />} />
          <Route path="mcp" element={<ConnectAI />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="learn" element={<Learn />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost />
    </HashRouter>
  </React.StrictMode>,
);
