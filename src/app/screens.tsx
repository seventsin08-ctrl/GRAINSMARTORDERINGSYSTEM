import type { ReactNode } from 'react';
import { Addons, BoostSales, Categories, MenuManagement } from '../admin/pages/MenuPages';
import BulkImport from '../admin/pages/Bulk';
import { Cash, Expenses, Profit, Sales } from '../admin/pages/Reports';
import { StockLogPage, Transfers } from '../admin/pages/Stock';
import { Customers, GovDiscounts, Texts, Vouchers } from '../admin/pages/Grow';
import { LoyaltyCards, StockOnHand } from '../admin/pages/Loyalty';
import { Branches, ConnectAI, Learn, OrderTypes, PaymentMethods, QRCodes, ReceiptStudio, SettingsPage } from '../admin/pages/Setup';
import { Appearance, Attendance, Schedule, StaffPage } from '../admin/pages/People';
import BrandingPage from '../admin/pages/Branding';
import SyncPage from '../admin/pages/SyncPage';

/** Every admin page, reused inside the phone app's "More" tab. */
export const ADMIN_SCREENS: Record<string, () => ReactNode> = {
  '/admin/menu': () => <MenuManagement />,
  '/admin/categories': () => <Categories />,
  '/admin/addons': () => <Addons />,
  '/admin/bulk-import': () => <BulkImport />,
  '/admin/boost-sales': () => <BoostSales />,
  '/admin/reports': () => <Sales />,
  '/admin/cash': () => <Cash />,
  '/admin/expenses': () => <Expenses />,
  '/admin/reports/profit': () => <Profit />,
  '/admin/payment-methods': () => <PaymentMethods />,
  '/admin/loyalty': () => <LoyaltyCards />,
  '/admin/customers': () => <Customers />,
  '/admin/vouchers': () => <Vouchers />,
  '/admin/texts': () => <Texts />,
  '/admin/gov-discounts': () => <GovDiscounts />,
  '/admin/inventory': () => <StockOnHand />,
  '/admin/inventory/transfers': () => <Transfers />,
  '/admin/inventory/log': () => <StockLogPage />,
  '/admin/branding': () => <BrandingPage />,
  '/admin/staff': () => <StaffPage />,
  '/admin/attendance': () => <Attendance />,
  '/admin/schedule': () => <Schedule />,
  '/admin/order-types': () => <OrderTypes />,
  '/admin/outlets': () => <Branches />,
  '/admin/receipt-editor': () => <ReceiptStudio />,
  '/admin/qr-codes': () => <QRCodes />,
  '/admin/mcp': () => <ConnectAI />,
  '/admin/sync': () => <SyncPage />,
  '/admin/appearance': () => <Appearance />,
  '/admin/settings': () => <SettingsPage />,
  '/admin/learn': () => <Learn />,
};
