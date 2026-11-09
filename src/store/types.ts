export type ID = string;

export interface Category {
  id: ID;
  name: string;
  sort: number;
  active: boolean;
}

export interface AddonOption {
  id: ID;
  name: string;
  price: number;
}

export interface AddonGroup {
  id: ID;
  name: string;
  required: boolean;
  multiple: boolean;
  options: AddonOption[];
}

export interface MenuItem {
  id: ID;
  name: string;
  description: string;
  categoryId: ID;
  price: number;
  cost: number;
  image: string; // URL or data URL
  available: boolean;
  featured: boolean;
  trackStock: boolean;
  /** stock per branch id */
  stock: Record<ID, number>;
  lowStockAt: number;
  addonGroupIds: ID[];
}

export interface CartLine {
  key: string;
  itemId: ID;
  name: string;
  unitPrice: number;
  unitCost: number;
  qty: number;
  addons: { groupName: string; name: string; price: number }[];
  note: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: ID;
  number: number;
  createdAt: number;
  updatedAt: number;
  branchId: ID;
  orderTypeId: ID;
  orderTypeName: string;
  customerName: string;
  customerPhone: string;
  lines: CartLine[];
  subtotal: number;
  discount: number;
  discountLabel: string;
  voucherCode: string;
  serviceCharge: number;
  total: number;
  cost: number;
  paymentMethodId: ID;
  paymentMethodName: string;
  paid: boolean;
  status: OrderStatus;
  tableNo: string;
  govDiscount?: { type: 'senior' | 'pwd'; idNumber: string; name: string };
  stampsEarned: number;
  /** 4-digit public order code customers use to track */
  code: string;
  paymentStatus: 'due' | 'cash' | 'digital';
  proofImage: string;
  loyaltyCardCode: string;
  pointsAwarded?: boolean;
  notified?: boolean;
}

export interface Customer {
  id: ID;
  name: string;
  phone: string;
  createdAt: number;
  stamps: number;
  rewardsRedeemed: number;
  optInTexts: boolean;
}

export interface Voucher {
  id: ID;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSpend: number;
  maxUses: number;
  used: number;
  expiresAt: string; // yyyy-mm-dd or ''
  active: boolean;
}

export interface Expense {
  id: ID;
  date: string;
  category: string;
  description: string;
  amount: number;
  branchId: ID;
  paidWith: 'cash' | 'digital';
  at: number;
}

export interface CashSession {
  id: ID;
  openedAt: number;
  openedBy: string;
  float: number;
  note: string;
  closedAt?: number;
  closedBy?: string;
  counted?: number;
  expected?: number;
  closeNote?: string;
  movements: { id: ID; at: number; type: 'in' | 'out' | 'remit'; amount: number; note: string; by: string }[];
}

export interface Shift {
  id: ID;
  staffId: ID;
  clockIn: number;
  clockOut?: number;
}

export interface PlannedShift {
  id: ID;
  staffId: ID;
  date: string;
  start: string;
  end: string;
  note: string;
}

export interface LoyaltyCard {
  id: ID;
  code: string;
  label: string;
  points: number;
  issuedAt: number;
  redeemed: number;
  active: boolean;
  history: { at: number; delta: number; note: string }[];
}

export interface CashEntry {
  id: ID;
  date: string;
  type: 'opening' | 'remit' | 'payout' | 'closing';
  amount: number;
  staffName: string;
  note: string;
  branchId: ID;
}

export type StockLogKind =
  | 'order_deduction'
  | 'restored'
  | 'duplicate_refused'
  | 'manual'
  | 'manual_repeat'
  | 'transfer'
  | 'failed';

export interface StockLog {
  id: ID;
  at: number;
  kind: StockLogKind;
  itemId: ID;
  itemName: string;
  branchId: ID;
  delta: number;
  after: number;
  orderId?: ID;
  orderNumber?: number | string;
  by: string;
  note: string;
}

export interface Transfer {
  id: ID;
  at: number;
  fromBranchId: ID;
  toBranchId: ID;
  itemId: ID;
  qty: number;
  by: string;
  note: string;
}

export interface OrderType {
  id: ID;
  name: string;
  icon: string;
  active: boolean;
  askTable: boolean;
  serviceChargePct: number;
}

export interface Branch {
  id: ID;
  name: string;
  address: string;
  phone: string;
  active: boolean;
}

export type StaffRole = 'owner' | 'admin' | 'staff';

export type Perm =
  | 'orders' | 'payment' | 'cash_view_all' | 'expenses_view' | 'products' | 'branding' | 'attendance_own' | 'schedule_own'
  | 'stock' | 'loyalty_config' | 'kitchen' | 'cash_remits' | 'expenses_record' | 'profit' | 'categories' | 'sales'
  | 'attendance_team' | 'schedule_team' | 'loyalty';

export interface Staff {
  id: ID;
  name: string;
  username: string;
  password: string;
  role: StaffRole;
  perms: Perm[];
  pin: string;
  branchId: ID;
  active: boolean;
}

export interface PaymentMethod {
  id: ID;
  name: string;
  instructions: string;
  payAtCounter: boolean;
  active: boolean;
  qr: string;
  allowProof: boolean;
  kind: 'cash' | 'digital';
}

export interface TextMessage {
  id: ID;
  at: number;
  audience: 'all' | 'loyalty' | 'inactive';
  body: string;
  recipients: number;
}

export interface GovDiscountLog {
  id: ID;
  at: number;
  orderId: ID;
  orderNumber: number | string;
  type: 'senior' | 'pwd';
  name: string;
  idNumber: string;
  discount: number;
}

export interface UpsellRule {
  id: ID;
  triggerCategoryId: ID | 'any';
  suggestItemId: ID;
  headline: string;
  active: boolean;
}

export interface Branding {
  storeName: string;
  tagline: string;
  logo: string; // data URL or ''
  accent: string;
  accentText: string;
  background: string;
  surface: string;
  text: string;
  mode: 'light' | 'dark';
  font: 'system' | 'serif' | 'rounded' | 'mono';
  radius: number;
  cardStyle: 'elevated' | 'flat' | 'outline';
  menuLayout: 'grid' | 'list';
  columns: 2 | 3 | 4;
  showDescriptions: boolean;
  seniorMode: boolean;
  announcement: string;
  announcementOn: boolean;
  hero: {
    title: string;
    subtitle: string;
    image: string;
    align: 'left' | 'center';
    overlay: number;
  };
  welcome: {
    title: string;
    subtitle: string;
    button: string;
    image: string;
    idleSeconds: number;
  };
  look: 'garden' | 'sunday' | 'afterdark' | 'custom';
  fontPair: FontPair;
  logoPosition: 'left' | 'center';
  shopLayout: ShopLayout;
  productCard: ProductCard;
  adminLogo: string;
  heroEyebrow: string;
  heroBadge: string;
  heroButtons: ShopButton[];
  storyButtons: ShopButton[];
  sectionOrder: ShopSection[];
  introStrip: string[];
  menuEyebrow: string;
  menuTitle: string;
  menuSubtitle: string;
  story: { eyebrow: string; title: string; titleItalic: string; text: string; bubble: string };
  footerText: string;
}

export type FontPair = 'warm' | 'modern' | 'editorial' | 'rounded' | 'humanist' | 'geometric' | 'softdisplay' | 'compact';
export type ShopLayout = 'default' | 'sidebar' | 'magazine' | 'gridfocus' | 'list' | 'mosaic' | 'storefront' | 'kiosk';
export type ProductCard = 'classic' | 'soft' | 'minimal' | 'framed' | 'editorial' | 'accent' | 'floating' | 'compact' | 'rounded' | 'imagefirst';
export type ShopSection = 'intro' | 'menu' | 'story';
export interface ShopButton {
  id: ID;
  label: string;
  action: 'menu' | 'bag' | 'track' | 'story' | 'kiosk';
  style: 'primary' | 'secondary' | 'link';
}

export interface ReceiptSettings {
  header: string;
  footer: string;
  showLogo: boolean;
  showItemsCost: boolean;
  showQr: boolean;
  width: 58 | 80;
}

export interface LoyaltySettings {
  enabled: boolean;
  stampsForReward: number;
  spendPerStamp: number;
  rewardText: string;
  earnBy: 'drinks' | 'spend';
  pointsPer: number;
  eligibleItemIds: ID[];
  largeIncluded: boolean;
  toppingsIncluded: boolean;
}

export interface Settings {
  currency: string;
  taxIncluded: boolean;
  taxPct: number;
  govDiscountPct: number;
  adminPin: string;
  autoAcceptOrders: boolean;
  activeBranchId: ID;
  kioskBranchId: ID;
  singlePaymentId: ID;
  timezone: string;
}

export interface DB {
  version: number;
  nextOrderNumber: number;
  categories: Category[];
  addonGroups: AddonGroup[];
  items: MenuItem[];
  orders: Order[];
  customers: Customer[];
  vouchers: Voucher[];
  expenses: Expense[];
  cash: CashEntry[];
  stockLog: StockLog[];
  transfers: Transfer[];
  orderTypes: OrderType[];
  branches: Branch[];
  staff: Staff[];
  paymentMethods: PaymentMethod[];
  texts: TextMessage[];
  govLog: GovDiscountLog[];
  upsells: UpsellRule[];
  branding: Branding;
  receipt: ReceiptSettings;
  loyalty: LoyaltySettings;
  settings: Settings;
  cashSessions: CashSession[];
  shifts: Shift[];
  planned: PlannedShift[];
  loyaltyCards: LoyaltyCard[];
}
