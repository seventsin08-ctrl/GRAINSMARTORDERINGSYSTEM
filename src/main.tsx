import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';
import Kiosk from './kiosk/Kiosk';
import { LoyaltyPage, OrderStatusPage } from './kiosk/OrderStatus';
import AdminLayout from './admin/AdminLayout';
import Login from './admin/pages/Login';
import Dashboard from './admin/pages/Dashboard';
import Orders from './admin/pages/Orders';
import { Addons, BoostSales, Categories, MenuManagement } from './admin/pages/MenuPages';
import { Cash, Expenses, Profit, Sales } from './admin/pages/Reports';
import { Inventory, StockLogPage, Transfers } from './admin/pages/Stock';
import { Customers, GovDiscounts, Loyalty, Texts, Vouchers } from './admin/pages/Grow';
import { Branches, ConnectAI, Learn, OrderTypes, PaymentMethods, QRCodes, ReceiptStudio, SettingsPage, StaffPage } from './admin/pages/Setup';
import BrandingStudio from './admin/pages/Branding';
import { ToastHost } from './components/ui';
import { useDB } from './store/db';

const theme = localStorage.getItem('gs.theme');
if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);

function Home() {
  const name = useDB((d) => d.branding.storeName);
  return (
    <div className="login">
      <div style={{ textAlign: 'center', maxWidth: 640 }}>
        <div className="brand-mark" style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px', fontSize: 34 }}>🌾</div>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05 }}>GrainSmart</h1>
        <p className="muted" style={{ fontSize: 21, margin: '12px 0 32px' }}>Self-order kiosk and store dashboard for {name}.</p>
        <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
          <Link className="btn primary lg" to="/kiosk">Open kiosk</Link>
          <Link className="btn lg" to="/admin">Admin dashboard</Link>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/order/:id" element={<OrderStatusPage />} />
        <Route path="/loyalty" element={<LoyaltyPage />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/branding" element={<BrandingStudio />} />
        <Route path="/admin/hero-designer" element={<BrandingStudio initial="hero" />} />
        <Route path="/admin/welcome-designer" element={<BrandingStudio initial="welcome" />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="categories" element={<Categories />} />
          <Route path="addons" element={<Addons />} />
          <Route path="boost-sales" element={<BoostSales />} />
          <Route path="reports" element={<Sales />} />
          <Route path="reports/profit" element={<Profit />} />
          <Route path="cash" element={<Cash />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/transfers" element={<Transfers />} />
          <Route path="inventory/log" element={<StockLogPage />} />
          <Route path="customers" element={<Customers />} />
          <Route path="loyalty" element={<Loyalty />} />
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
    </BrowserRouter>
  </React.StrictMode>,
);
