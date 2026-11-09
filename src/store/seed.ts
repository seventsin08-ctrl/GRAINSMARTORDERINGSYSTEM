import type { AddonGroup, Branding, DB, MenuItem, Perm, ShopButton } from './types';

export function art(emoji: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><text x="200" y="250" font-size="150" text-anchor="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`;
export const DRINK_PHOTO = asset('milktea.jpg');
export const LOGO = asset('logo.png');

const B1 = 'br_main';
const B2 = 'br_mall';

const CATS: [string, string][] = [
  ['cat_milktea', 'Milk Tea'],
  ['cat_pmilktea', 'Premium Milk Tea'],
  ['cat_coffee', 'Coffee & Matcha'],
  ['cat_vita', 'Premium Vita Coffee'],
  ['cat_juice', 'Fruit Juice'],
  ['cat_shimmer', 'Premium Shimmer Juice'],
  ['cat_frappe', 'Frappee'],
  ['cat_snacks', 'Fries & Snacks'],
  ['cat_rice', 'Rice Meals'],
  ['cat_cakes', 'Cakes & Sweets'],
];

const DRINK_ADDONS = ['ag_var', 'ag_sugar', 'ag_addons'];

function drink(id: string, name: string, cat: string, price: number, cost: number, description = '', extra: Partial<MenuItem> = {}): MenuItem {
  return {
    id, name, description, categoryId: cat, price, cost, image: DRINK_PHOTO, available: true, featured: false,
    trackStock: false, stock: { [B1]: 0, [B2]: 0 }, lowStockAt: 5, addonGroupIds: DRINK_ADDONS, ...extra,
  };
}
function food(id: string, name: string, cat: string, price: number, cost: number, emoji: string, description = '', extra: Partial<MenuItem> = {}): MenuItem {
  return {
    id, name, description, categoryId: cat, price, cost, image: art(emoji, '#f3efe4', '#dfe6d6'), available: true, featured: false,
    trackStock: true, stock: { [B1]: 30, [B2]: 15 }, lowStockAt: 5, addonGroupIds: [], ...extra,
  };
}

export const ALL_PERMS: { id: Perm; label: string }[] = [
  { id: 'orders', label: 'Receive/manage orders' },
  { id: 'kitchen', label: 'Kitchen tickets' },
  { id: 'payment', label: 'Mark payments received' },
  { id: 'cash_remits', label: 'Open and close cash session' },
  { id: 'cash_view_all', label: 'View all cash sessions' },
  { id: 'expenses_record', label: 'Record expenses' },
  { id: 'expenses_view', label: 'View expenses' },
  { id: 'profit', label: 'View profit reports' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
  { id: 'branding', label: 'Branding & methods' },
  { id: 'sales', label: 'Sales reports' },
  { id: 'attendance_own', label: 'View own attendance' },
  { id: 'attendance_team', label: 'Manage team attendance' },
  { id: 'schedule_own', label: 'View own schedule' },
  { id: 'schedule_team', label: 'Manage team schedules' },
  { id: 'stock', label: 'Manage stock' },
  { id: 'loyalty', label: 'Loyalty cards' },
  { id: 'loyalty_config', label: 'Configure loyalty & adjust points' },
];

export const btn = (id: string, label: string, action: ShopButton['action'], style: ShopButton['style']): ShopButton => ({ id, label, action, style });

export const DEFAULT_BRANDING: Branding = {
  storeName: 'GRAINSMART',
  tagline: 'Slow sips. Little joys.',
  logo: LOGO,
  accent: '#2f5640',
  accentText: '#ffffff',
  background: '#fbfaf6',
  surface: '#ffffff',
  text: '#1f2a22',
  mode: 'light',
  font: 'serif',
  radius: 18,
  cardStyle: 'elevated',
  menuLayout: 'grid',
  columns: 3,
  showDescriptions: true,
  seniorMode: false,
  announcement: 'Handcrafted with a little care · Made fresh for you',
  announcementOn: false,
  hero: {
    title: 'Good things comes to those who wait.',
    subtitle: 'Handcrafted milk tea, comfort food and something sweet for the walk home.',
    image: '',
    align: 'left',
    overlay: 35,
  },
  welcome: {
    title: 'Slow sips. Little joys.',
    subtitle: 'Touch anywhere to start your order.',
    button: 'Start order',
    image: '',
    idleSeconds: 90,
  },
  look: 'garden',
  fontPair: 'warm',
  logoPosition: 'left',
  shopLayout: 'sidebar',
  productCard: 'accent',
  adminLogo: '',
  heroEyebrow: 'A little pause in your day',
  heroBadge: 'Made fresh with a little care',
  heroButtons: [btn('hb1', 'Explore the menu', 'menu', 'primary'), btn('hb2', 'Open my bag', 'bag', 'secondary')],
  storyButtons: [btn('sb1', 'Find your new favourite', 'menu', 'link')],
  sectionOrder: ['intro', 'menu', 'story'],
  introStrip: ['House-made pearls', 'Tea leaves we love', 'Comfort food, always', 'Take a soft moment'],
  menuEyebrow: 'Something for every craving',
  menuTitle: 'The good stuff',
  menuSubtitle: 'Find a favourite, make it yours, and we’ll get it ready fresh.',
  story: {
    eyebrow: 'Welcome to your little green corner',
    title: 'Come as you are.',
    titleItalic: 'Stay for a sip.',
    text: 'We believe a good cup can change the shape of a day. So we brew with care, cook with heart, and save you a seat.',
    bubble: 'A softer kind of everyday.',
  },
  footerText: 'Little joys, made fresh.',
};

export function seed(): DB {
  const groups: AddonGroup[] = [
    { id: 'ag_var', name: 'Variation', required: true, multiple: false, options: [
      { id: 'o_16', name: '16oz', price: 0 }, { id: 'o_22', name: '22oz', price: 20 }, { id: 'o_c16', name: 'Cold 16oz', price: 0 }] },
    { id: 'ag_sugar', name: 'Sugar level', required: true, multiple: false, options: [
      { id: 'o_s0', name: '0% sugar', price: 0 }, { id: 'o_s25', name: '25% sugar', price: 0 }, { id: 'o_s50', name: '50% sugar', price: 0 },
      { id: 'o_s75', name: '75% sugar', price: 0 }, { id: 'o_s100', name: '100% sugar', price: 0 }] },
    { id: 'ag_addons', name: 'Add-ons', required: false, multiple: true, options: [
      { id: 'o_pearl', name: 'Pearls', price: 10 }, { id: 'o_cheese', name: 'Cheesecake', price: 20 }, { id: 'o_cream', name: 'Cream cheese', price: 20 },
      { id: 'o_jelly', name: 'Mix fruit jelly', price: 15 }, { id: 'o_nata', name: 'Nata de coco', price: 10 }] },
  ];

  const items: MenuItem[] = [
    drink('it_caramel_mt', 'Caramel', 'cat_milktea', 59, 22, 'Silky milk tea with burnt caramel.'),
    drink('it_cheesecake_mt', 'Cheesecake', 'cat_milktea', 59, 22, 'Creamy cheesecake milk tea.'),
    drink('it_matcha_mt', 'Matcha', 'cat_milktea', 69, 26, 'Earthy matcha with fresh milk.'),
    drink('it_nutella_mt', 'Nutella', 'cat_milktea', 69, 27, 'Hazelnut chocolate milk tea.'),
    drink('it_okinawa_mt', 'Okinawa', 'cat_milktea', 59, 22, 'Roasted brown sugar milk tea.'),
    drink('it_brownsugar', 'Brown Sugar', 'cat_pmilktea', 99, 35, 'Tiger stripes of brown sugar syrup and pearls.', { featured: true }),
    drink('it_hokkaido', 'Hokkaido', 'cat_pmilktea', 99, 35, 'Rich, toasty Hokkaido milk tea.'),
    drink('it_taro', 'Taro', 'cat_pmilktea', 99, 34, 'Purple yam, nutty and sweet.'),
    drink('it_whiterabbit', 'White Rabbit', 'cat_pmilktea', 99, 36, 'Like the candy you grew up with.'),
    drink('it_barleymatcha', 'Barley Matcha', 'cat_coffee', 99, 33, 'Toasty barley meets ceremonial matcha.', { featured: true }),
    drink('it_barleylatte', 'Barley Matcha Latte', 'cat_coffee', 99, 34, 'Barley matcha with steamed milk.'),
    drink('it_cafefilipino', 'Café Filipino (Black Coffee)', 'cat_coffee', 49, 15, 'Strong, local, honest.'),
    drink('it_cafemocha', 'Café Mocha', 'cat_coffee', 49, 18, 'Espresso, chocolate and milk.'),
    drink('it_caramelmac', 'Caramel Macchiato', 'cat_coffee', 69, 24, 'Vanilla milk, espresso, caramel drizzle.'),
    drink('it_spanish', 'Spanish Latte', 'cat_coffee', 79, 26, 'Sweet milk and a double shot.'),
    drink('it_icedmocha', 'Iced Mocha', 'cat_coffee', 79, 27, 'Cold, chocolatey and bold.'),
    drink('it_ricecoffee', 'GrainSmart Rice Coffee', 'cat_vita', 99, 30, 'Our house roasted rice coffee.', { featured: true }),
    drink('it_toffee', 'Toffee Caramel Cappuccino', 'cat_vita', 99, 32, 'Foamy, buttery and warm.'),
    drink('it_berrymelon', 'Berry Melon', 'cat_juice', 29, 9, 'Bright berries and sweet melon.'),
    drink('it_greenapple', 'Green Apple Kiwi', 'cat_juice', 39, 12, 'Crisp and tangy.'),
    drink('it_honeypeach', 'Honey Peach Mango', 'cat_juice', 39, 12, 'Sunshine in a cup.'),
    drink('it_cherrylychee', 'Cherry Lychee', 'cat_shimmer', 99, 30, 'Sparkling shimmer juice.'),
    drink('it_lemoncucumber', 'Lemon Cucumber', 'cat_shimmer', 99, 30, 'Cool, fresh and fizzy.'),
    drink('it_cookies', 'Cookies N’ Cream', 'cat_frappe', 99, 35, 'Blended cookies and cream.'),
    drink('it_javachip', 'Java Chip', 'cat_frappe', 99, 35, 'Coffee frappe with chocolate chips.'),
    food('it_fries', 'Cheesy Fries', 'cat_snacks', 69, 22, '🍟', 'Golden fries with cheese powder.'),
    food('it_nuggets', 'Chicken Nuggets', 'cat_snacks', 89, 35, '🍗', '6 pieces with dip.'),
    food('it_tapsilog', 'Tapsilog', 'cat_rice', 149, 65, '🍳', 'Beef tapa, garlic rice and egg.', { featured: true }),
    food('it_chicken', 'Fried Chicken Rice', 'cat_rice', 129, 55, '🍚', 'Crispy chicken, rice and gravy.'),
    food('it_cake', 'Chocolate Cake', 'cat_cakes', 89, 32, '🍰', 'Moist slice, dark chocolate.'),
    food('it_cheesecake', 'Blueberry Cheesecake', 'cat_cakes', 99, 38, '🍰', 'Creamy, tangy, a little sweet.'),
  ];

  const ownerPerms = ALL_PERMS.map((p) => p.id);

  return {
    version: 2,
    nextOrderNumber: 101,
    categories: CATS.map(([id, name], i) => ({ id, name, sort: i + 1, active: true })),
    addonGroups: groups,
    items,
    orders: [],
    customers: [],
    vouchers: [{ id: 'v_welcome', code: 'WELCOME10', type: 'percent', value: 10, minSpend: 150, maxUses: 100, used: 0, expiresAt: '', active: true }],
    expenses: [],
    cash: [],
    stockLog: [],
    transfers: [],
    orderTypes: [
      { id: 'ot_dine', name: 'Dine In', icon: '🍽️', active: true, askTable: true, serviceChargePct: 0 },
      { id: 'ot_pickup', name: 'Pick Up', icon: '🛍️', active: true, askTable: false, serviceChargePct: 0 },
    ],
    branches: [
      { id: B1, name: 'Main Branch', address: 'Sample address', phone: '', active: true },
      { id: B2, name: 'Second Branch', address: '', phone: '', active: true },
    ],
    staff: [
      { id: 'st_admin', name: 'admin', username: 'admin', password: 'admin123', role: 'owner', perms: ownerPerms, pin: '1234', branchId: B1, active: true },
      { id: 'st_jessica', name: 'jessica', username: 'jessica', password: 'staff123', role: 'staff', perms: ['orders', 'kitchen', 'attendance_own'], pin: '1111', branchId: B1, active: true },
      { id: 'st_staff1', name: 'staff1', username: 'staff1', password: 'staff123', role: 'staff', perms: ['orders', 'payment', 'cash_remits', 'kitchen', 'loyalty'], pin: '2222', branchId: B1, active: true },
    ],
    paymentMethods: [
      { id: 'pm_online', name: 'ONLINE PAYMENT', instructions: 'Pay as you order. Scan the QR below.', payAtCounter: false, active: true, qr: '', allowProof: true, kind: 'digital' },
      { id: 'pm_cash', name: 'Cash', instructions: 'Pay at the counter when you pick up.', payAtCounter: true, active: true, qr: '', allowProof: false, kind: 'cash' },
    ],
    texts: [],
    govLog: [],
    upsells: [
      { id: 'up_1', triggerCategoryId: 'cat_pmilktea', suggestItemId: 'it_fries', headline: 'Fries go great with that', active: true },
      { id: 'up_2', triggerCategoryId: 'cat_coffee', suggestItemId: 'it_cake', headline: 'Add a slice of cake?', active: true },
    ],
    branding: structuredClone(DEFAULT_BRANDING),
    receipt: { header: 'Thank you for ordering!', footer: 'Slow sips. Little joys.', showLogo: true, showItemsCost: false, showQr: true, width: 80 },
    loyalty: {
      enabled: true, stampsForReward: 5, spendPerStamp: 100, rewardText: 'One free drink',
      earnBy: 'drinks', pointsPer: 1, eligibleItemIds: items.filter((i) => i.addonGroupIds.length).map((i) => i.id),
      largeIncluded: true, toppingsIncluded: false,
    },
    settings: {
      currency: '₱', taxIncluded: true, taxPct: 12, govDiscountPct: 20, adminPin: '1234', autoAcceptOrders: false,
      activeBranchId: B1, kioskBranchId: B1, singlePaymentId: '', timezone: 'Asia/Manila',
    },
    cashSessions: [],
    shifts: [],
    planned: [],
    loyaltyCards: [],
  };
}
