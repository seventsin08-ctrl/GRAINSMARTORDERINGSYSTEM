import type { DB, MenuItem } from './types';

export function art(emoji: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="185" font-size="130" text-anchor="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const B1 = 'br_main';
const B2 = 'br_mall';

function item(
  id: string,
  name: string,
  categoryId: string,
  price: number,
  cost: number,
  emoji: string,
  colors: [string, string],
  extra: Partial<MenuItem> = {},
): MenuItem {
  return {
    id,
    name,
    description: '',
    categoryId,
    price,
    cost,
    image: art(emoji, colors[0], colors[1]),
    available: true,
    featured: false,
    trackStock: true,
    stock: { [B1]: 40, [B2]: 25 },
    lowStockAt: 5,
    addonGroupIds: [],
    ...extra,
  };
}

const coffee: [string, string] = ['#f3e7dc', '#d9b99b'];
const tea: [string, string] = ['#f6eee3', '#e2c9a6'];
const food: [string, string] = ['#fdf1e0', '#f5c99b'];
const cold: [string, string] = ['#e6f0fb', '#b8d4f2'];

export function seed(): DB {
  return {
    version: 1,
    nextOrderNumber: 101,
    categories: [
      { id: 'cat_coffee', name: 'Coffee', sort: 1, active: true },
      { id: 'cat_iced', name: 'Iced Coffee', sort: 2, active: true },
      { id: 'cat_milktea', name: 'Milk Tea', sort: 3, active: true },
      { id: 'cat_food', name: 'Bites', sort: 4, active: true },
      { id: 'cat_rice', name: 'Rice Meals', sort: 5, active: true },
    ],
    addonGroups: [
      {
        id: 'ag_size',
        name: 'Size',
        required: true,
        multiple: false,
        options: [
          { id: 'o_reg', name: 'Regular', price: 0 },
          { id: 'o_lrg', name: 'Large', price: 20 },
        ],
      },
      {
        id: 'ag_sugar',
        name: 'Sweetness',
        required: true,
        multiple: false,
        options: [
          { id: 'o_s0', name: '0%', price: 0 },
          { id: 'o_s50', name: '50%', price: 0 },
          { id: 'o_s100', name: '100%', price: 0 },
        ],
      },
      {
        id: 'ag_extras',
        name: 'Extras',
        required: false,
        multiple: true,
        options: [
          { id: 'o_shot', name: 'Extra shot', price: 25 },
          { id: 'o_pearl', name: 'Pearls', price: 15 },
          { id: 'o_cream', name: 'Cream cheese', price: 20 },
          { id: 'o_oat', name: 'Oat milk', price: 30 },
        ],
      },
    ],
    items: [
      item('it_americano', 'Americano', 'cat_coffee', 95, 28, '☕', coffee, {
        description: 'Double shot of espresso over hot water. Clean and bold.',
        addonGroupIds: ['ag_size', 'ag_extras'],
      }),
      item('it_latte', 'Café Latte', 'cat_coffee', 125, 38, '☕', coffee, {
        description: 'Silky steamed milk with a double shot.',
        featured: true,
        addonGroupIds: ['ag_size', 'ag_sugar', 'ag_extras'],
      }),
      item('it_spanish', 'Spanish Latte', 'cat_iced', 140, 42, '🧋', cold, {
        description: 'Sweet condensed milk, espresso and ice.',
        featured: true,
        addonGroupIds: ['ag_size', 'ag_sugar', 'ag_extras'],
      }),
      item('it_icedmocha', 'Iced Mocha', 'cat_iced', 145, 45, '🥤', cold, {
        description: 'Dark chocolate, espresso and cold milk.',
        addonGroupIds: ['ag_size', 'ag_sugar', 'ag_extras'],
      }),
      item('it_wintermelon', 'Wintermelon', 'cat_milktea', 110, 30, '🧋', tea, {
        description: 'Caramel-like wintermelon milk tea.',
        addonGroupIds: ['ag_size', 'ag_sugar', 'ag_extras'],
      }),
      item('it_okinawa', 'Okinawa', 'cat_milktea', 115, 32, '🧋', tea, {
        description: 'Roasted brown sugar milk tea.',
        featured: true,
        addonGroupIds: ['ag_size', 'ag_sugar', 'ag_extras'],
      }),
      item('it_croissant', 'Butter Croissant', 'cat_food', 85, 30, '🥐', food, {
        description: 'Flaky, golden, baked every morning.',
      }),
      item('it_cookie', 'Choco Chip Cookie', 'cat_food', 60, 18, '🍪', food, {
        description: 'Chewy center, crisp edges.',
      }),
      item('it_tapsilog', 'Tapsilog', 'cat_rice', 165, 70, '🍳', food, {
        description: 'Beef tapa, garlic rice and a sunny-side egg.',
        addonGroupIds: ['ag_extras'],
      }),
      item('it_chickensilog', 'Chicksilog', 'cat_rice', 155, 62, '🍗', food, {
        description: 'Crispy fried chicken, garlic rice and egg.',
      }),
    ],
    orders: [],
    customers: [],
    vouchers: [
      {
        id: 'v_welcome',
        code: 'WELCOME10',
        type: 'percent',
        value: 10,
        minSpend: 150,
        maxUses: 100,
        used: 0,
        expiresAt: '',
        active: true,
      },
    ],
    expenses: [],
    cash: [],
    stockLog: [],
    transfers: [],
    orderTypes: [
      { id: 'ot_dine', name: 'Dine in', icon: '🍽️', active: true, askTable: true, serviceChargePct: 0 },
      { id: 'ot_take', name: 'Take out', icon: '🛍️', active: true, askTable: false, serviceChargePct: 0 },
    ],
    branches: [
      { id: B1, name: 'Main Branch', address: '123 Rizal Ave.', phone: '0917 000 0000', active: true },
      { id: B2, name: 'Mall Kiosk', address: 'Level 2, City Mall', phone: '0917 111 1111', active: true },
    ],
    staff: [
      { id: 'st_owner', name: 'Owner', role: 'owner', pin: '1234', branchId: B1, active: true },
      { id: 'st_cash', name: 'Ana', role: 'cashier', pin: '1111', branchId: B1, active: true },
    ],
    paymentMethods: [
      { id: 'pm_cash', name: 'Cash', instructions: 'Pay at the counter.', payAtCounter: true, active: true },
      { id: 'pm_gcash', name: 'GCash', instructions: 'Scan the GCash QR at the counter and show your receipt.', payAtCounter: false, active: true },
      { id: 'pm_card', name: 'Card', instructions: 'Tap your card at the counter.', payAtCounter: true, active: true },
    ],
    texts: [],
    govLog: [],
    upsells: [
      { id: 'up_1', triggerCategoryId: 'cat_coffee', suggestItemId: 'it_croissant', headline: 'Perfect with a fresh croissant', active: true },
      { id: 'up_2', triggerCategoryId: 'cat_milktea', suggestItemId: 'it_cookie', headline: 'Add a cookie?', active: true },
    ],
    branding: {
      storeName: 'Dummy Store',
      tagline: 'Your smart ordering partner',
      logo: '',
      accent: '#0071e3',
      accentText: '#ffffff',
      background: '#f5f5f7',
      surface: '#ffffff',
      text: '#1d1d1f',
      mode: 'light',
      font: 'system',
      radius: 18,
      cardStyle: 'elevated',
      menuLayout: 'grid',
      columns: 3,
      showDescriptions: true,
      seniorMode: false,
      announcement: 'Get 10% off your first order with WELCOME10',
      announcementOn: true,
      hero: {
        title: 'Our Menu',
        subtitle: 'Freshly made. Thoughtfully crafted.',
        image: '',
        align: 'center',
        overlay: 0,
      },
      welcome: {
        title: 'Good taste starts here.',
        subtitle: 'Touch anywhere to start your order.',
        button: 'Start order',
        image: '',
        idleSeconds: 90,
      },
    },
    receipt: {
      header: 'Thank you for ordering!',
      footer: 'Follow us for promos. Come back soon!',
      showLogo: true,
      showItemsCost: false,
      showQr: true,
      width: 80,
    },
    loyalty: { enabled: true, stampsForReward: 8, spendPerStamp: 100, rewardText: 'One free drink of your choice' },
    settings: {
      currency: '₱',
      taxIncluded: true,
      taxPct: 12,
      govDiscountPct: 20,
      adminPin: '1234',
      autoAcceptOrders: false,
      activeBranchId: B1,
      kioskBranchId: B1,
    },
  };
}
