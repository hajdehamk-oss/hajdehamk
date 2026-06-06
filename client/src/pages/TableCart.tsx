import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import confetti from "canvas-confetti";
import Pusher from "pusher-js";
import {
  Lock,
  Plus,
  Minus,
  ShoppingBag,
  Wifi,
  WifiOff,
  Users,
  UtensilsCrossed,
  ArrowLeft,
  Bot,
  Sparkles,
  Send,
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bell,
  Divide,
  Loader2,
  CheckCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Banknote,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MenuItem {
  id: number;
  name: string;
  nameAl?: string | null;
  nameMk?: string | null;
  price: string;
  category: string;
  active: boolean;
  imageUrl?: string | null;
  description?: string | null;
  descriptionAl?: string | null;
  descriptionMk?: string | null;
  specialDiscount?: number | null;
  specialType?: string | null;
}

function getSpecialPrice(item: MenuItem): number | null {
  if (!item.specialDiscount || !item.specialType) return null;
  const base = parsePrice(item.price);
  if (item.specialType === "percent")
    return Math.round(base * (1 - item.specialDiscount / 100));
  if (item.specialType === "fixed")
    return Math.max(0, base - item.specialDiscount);
  return null;
}
function getItemName(item: MenuItem, lang: Lang): string {
  if (lang === "al" && item.nameAl) return item.nameAl;
  if (lang === "mk" && item.nameMk) return item.nameMk;
  return item.name;
}
function getItemDesc(item: MenuItem, lang: Lang): string | null | undefined {
  if (lang === "al" && item.descriptionAl) return item.descriptionAl;
  if (lang === "mk" && item.descriptionMk) return item.descriptionMk;
  return item.description;
}

const CATEGORY_NAMES: Record<string, { al: string; mk: string }> = {
  food: { al: "Ushqim", mk: "Храна" },
  foods: { al: "Ushqime", mk: "Храна" },
  drinks: { al: "Pije", mk: "Пијалоци" },
  beverages: { al: "Pije", mk: "Пијалоци" },
  coffee: { al: "Kafe", mk: "Кафе" },
  coffees: { al: "Kafeja", mk: "Кафиња" },
  dessert: { al: "Ëmbëlsirë", mk: "Десерт" },
  desserts: { al: "Ëmbëlsirat", mk: "Десерти" },
  sweet: { al: "Të ëmbla", mk: "Слатко" },
  sweets: { al: "Ëmbëlsirat", mk: "Слатки" },
  mains: { al: "Pjata kryesore", mk: "Главни јадења" },
  main: { al: "Pjata kryesore", mk: "Главно јадење" },
  starters: { al: "Antipastet", mk: "Предјадења" },
  starter: { al: "Antipaste", mk: "Предјадење" },
  salads: { al: "Sallata", mk: "Салати" },
  salad: { al: "Sallatë", mk: "Салата" },
  soups: { al: "Supa", mk: "Супи" },
  soup: { al: "Supë", mk: "Супа" },
  pizza: { al: "Picë", mk: "Пица" },
  pizzas: { al: "Pica", mk: "Пици" },
  burgers: { al: "Hamburgerë", mk: "Бургери" },
  burger: { al: "Hamburger", mk: "Бургер" },
  grill: { al: "Skarë", mk: "Скара" },
  grills: { al: "Skarë", mk: "Скара" },
  sandwiches: { al: "Sanduiçe", mk: "Сендвичи" },
  sandwich: { al: "Sanduiç", mk: "Сендвич" },
  pasta: { al: "Paste", mk: "Тестенини" },
  seafood: { al: "Fruta deti", mk: "Морска храна" },
  meat: { al: "Mish", mk: "Месо" },
  chicken: { al: "Pule", mk: "Пилешко" },
  snacks: { al: "Snacks", mk: "Грицки" },
  breakfast: { al: "Mëngjes", mk: "Појадок" },
  lunch: { al: "Drekë", mk: "Ручек" },
  dinner: { al: "Darkë", mk: "Вечера" },
  specials: { al: "Specialitete", mk: "Специјалитети" },
  special: { al: "Specialitet", mk: "Специјалитет" },
  vegetarian: { al: "Vegjetarian", mk: "Вегетаријанско" },
  vegan: { al: "Vegan", mk: "Веганско" },
  sides: { al: "Anëse", mk: "Прилози" },
  side: { al: "Anëse", mk: "Прилог" },
  sauces: { al: "Salca", mk: "Сосови" },
  alcohol: { al: "Alkool", mk: "Алкохол" },
  wine: { al: "Verë", mk: "Вино" },
  beer: { al: "Birrë", mk: "Пиво" },
  cocktails: { al: "Kokteje", mk: "Коктели" },
  cocktail: { al: "Koktej", mk: "Коктел" },
  juices: { al: "Lëngje", mk: "Сокови" },
  juice: { al: "Lëng", mk: "Сок" },
  tea: { al: "Çaj", mk: "Чај" },
  water: { al: "Ujë", mk: "Вода" },
  "hot drinks": { al: "Pije të nxehta", mk: "Топли пијалоци" },
  "hot drink": { al: "Pije e nxehtë", mk: "Топол пијалок" },
  hookah: { al: "Nargile", mk: "Наргиле" },
  hookahs: { al: "Nargile", mk: "Наргилиња" },
  shisha: { al: "Nargile", mk: "Шише" },
  wraps: { al: "Rrotullimet", mk: "Ролни" },
  wrap: { al: "Rrotullim", mk: "Ролна" },
  tacos: { al: "Tako", mk: "Такос" },
  appetizers: { al: "Antipastet", mk: "Предјадења" },
  appetizer: { al: "Antipaste", mk: "Предјадење" },
  "main course": { al: "Pjata kryesore", mk: "Главно јадење" },
  breakfasts: { al: "Mëngjesin", mk: "Појадоци" },
};

function getCategoryDisplay(cat: string, lang: Lang): string {
  if (lang === "en") return cat;
  const key = cat.toLowerCase().trim();
  const entry = CATEGORY_NAMES[key];
  if (entry) return entry[lang];
  return cat;
}
interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  addedBy?: string; // per-device identity — used for auto-grouping in split bill
}
interface Props {
  restaurantSlug: string;
  tableNumber: number;
}
type View = "menu" | "cart";
type Lang = "al" | "mk" | "en";

function parsePrice(price: string): number {
  return parseInt(price.replace(/[^0-9]/g, "")) || 0;
}

function buildReceipt(
  lang: Lang,
  restaurantName: string,
  tableNumber: number,
  cart: CartItem[],
  payMethod: "cash" | "card",
): string {
  const L = {
    al: {
      title: "Fatura",
      table: "Tavolina",
      total: "Totali",
      cash: "KESH",
      card: "KARTË",
      pay: (m: string) => `💳 Pagesa: ${m}`,
      thanks: `Ju faleminderit që zgjodhët`,
    },
    mk: {
      title: "Сметка",
      table: "Маса",
      total: "Вкупно",
      cash: "ГОТОВО",
      card: "КАРТИЧКА",
      pay: (m: string) => `💳 Плаќање: ${m}`,
      thanks: `Ви благодариме што го избравте`,
    },
    en: {
      title: "Bill",
      table: "Table",
      total: "Total",
      cash: "CASH",
      card: "CARD",
      pay: (m: string) => `💳 Payment: ${m}`,
      thanks: `Thank you for choosing`,
    },
  }[lang];

  const method = payMethod === "cash" ? L.cash : L.card;
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const itemLines = cart.map(
    (i) =>
      `• ${i.qty}x ${i.name}${"  "}${(i.price * i.qty).toLocaleString()} DEN`,
  );

  return [
    `🧾 *${L.title} — ${restaurantName}*`,
    `📍 ${L.table} ${tableNumber}`,
    ``,
    ...itemLines,
    `─────────────────────`,
    `💰 *${L.total}: ${total.toLocaleString()} DEN*`,
    ``,
    L.pay(method),
    ``,
    `${L.thanks} *${restaurantName}* 🙏`,
  ].join("\n");
}

// ─── Translations ─────────────────────────────────────────────────────────────
const t = {
  al: {
    table: "Tavolina",
    loading: "Duke ngarkuar menunë…",
    notFound: "Restoranti nuk u gjet. Kontrolloni URL-në dhe provoni përsëri.",
    allCategories: "Të gjitha",
    todaySpecials: "⭐ Specialet e Sotme",
    emptyCategory: "Nuk ka artikuj në këtë kategori",
    viewCart: "Shiko shportën",
    cart: "Shporta",
    cartItems: (n: number) => `${n} artikuj`,
    yourOrder: (t: number) => `Porosia juaj · Tavolina ${t}`,
    emptyCart: "Shporta është bosh",
    addItems: "Shto artikuj",
    listening: "Duke dëgjuar...",
    speaking: "Duke folur...",
    aiTitle: "Kamarierin AI",
    aiPlaceholder: "Pyetni për menunë...",
    enableVoice: "Aktivizo zërin",
    disableVoice: "Çaktivizo zërin",
    aiGreeting: (name: string, table: number) =>
      `Përshëndetje! Jam kamarieri juaj AI për **${name}** 👋\n\nJu ndodhet në Tavolinën ${table}. Pyetni çfarë të doni — e njoh menunë plotësisht!`,
    aiError: "Na vjen keq, pati një problem. 🙏",
    quickActions: [
      { label: "⭐ Popullore", prompt: "Çfarë rekomandoni sot?" },
      { label: "🌱 Vegane", prompt: "Keni opsione vegjetariane ose vegane?" },
      { label: "💰 Ekonomike", prompt: "Cilat janë pjatat më të lira?" },
      { label: "🍹 Pije", prompt: "Çfarë pijesh keni?" },
    ],
    aiSystemRules: `1. Përgjigju GJITHMONË në shqip.\n2. Kur rekomandon pjata, përmend emrat SAKTË si janë në meni me çmimet.\n3. Nëse shporta ka artikuj, suggjero diçka plotësuese (pije, ëmbëlsirë).\n4. Përgjigjet duhet të jenë TË SHKURTRA — max 3-4 fjali.\n5. Mos huto informacione për pjata që nuk janë në meni.\n6. Përdor emoji me moderim.`,
    callWaiter: "Thirr kamarierin",
    callWaiterToOrder: "Thirr kamarierin",
    orderPlaced: "Porosia u dërgua",
    confirmingOrder: "Duke konfirmuar porosinë…",
    orderConfirmed: "Porosia juaj u vendos! ✓",
    waiterSheetTitle: "Çfarë keni nevojë?",
    dessertTitle: "Ëmbëlsira e shtëpisë 🍰",
    dessertMsg: (items: string[]) =>
      `A mund t'ju ofrojmë diçka të ëmbël si përfundim?\nSot rekomandojmë: ${items.join(" dhe ")}.`,
    dessertDismiss: "Jo, faleminderit",
    dessertYes: "Shiko ëmbëlsirat",
    splitBill: "Ndaj faturën",
    splitPeople: "Persona",
    splitEach: "Secili paguan",
    splitTotal: "Totali",
    splitClose: "Mbyll",
    splitPerson: (n: number) => `Personi ${n}`,
    splitUnassigned: "Pa caktuar",
    splitYou: "Ti",
    billPayHow: "Si do të paguani?",
    cash: "Kesh",
    card: "Kartë",
    sendOrder: "Dërgo porosinë",
    billTextCash: (table: number | string) =>
      `Përshëndetje! Tavolina ${table} dëshiron faturën — me KESH, ju lutem.`,
    billTextCard: (table: number | string) =>
      `Përshëndetje! Tavolina ${table} dëshiron faturën — me KARTË, ju lutem.`,
    waiterMessages: (table: number | string) => [
      {
        icon: "🙋",
        label: "Thirr kamarierin",
        text: `Përshëndetje! Tavolina ${table} ka nevojë për kamarierin, ju lutem.`,
      },
      {
        icon: "🧾",
        label: "Mund të marr faturën?",
        text: `Përshëndetje! Tavolina ${table} dëshiron faturën, ju lutem.`,
      },
      {
        icon: "🍽️",
        label: "Gati për të porositur",
        text: `Përshëndetje! Tavolina ${table} është gati të porositë.`,
      },
      {
        icon: "🥤",
        label: "Na duhen pije shtesë",
        text: `Përshëndetje! Tavolina ${table} ka nevojë për pije shtesë, ju lutem.`,
      },
      {
        icon: "❓",
        label: "Kam një pyetje",
        text: `Përshëndetje! Tavolina ${table} ka një pyetje.`,
      },
    ],
    tutorialSkip: "Kalo",
    tutorialNext: "Tjetër",
    tutorialDone: "Kuptova!",
    tutorialSteps: [
      {
        icon: "👋",
        title: "Mirë se vini!",
        desc: "Kjo është menuja digjitale e restorantit. Lëvizni poshtë për të parë të gjitha pjatat.",
      },
      {
        icon: "🗂️",
        title: "Filtroni sipas kategorisë",
        desc: "Klikoni butonat e kategorive në krye për të parë vetëm pjatat që dëshironi.",
      },
      {
        icon: "➕",
        title: "Shtoni në shportë",
        desc: "Klikoni butonin + pranë çdo artikulli për ta shtuar në porosinë tuaj.",
      },
      {
        icon: "🤖",
        title: "Kamarieri AI",
        desc: "Klikoni ikonën e botit për të marrë rekomandime dhe për të pyetur për menunë.",
      },
      {
        icon: "🛒",
        title: "Vendosni porosinë",
        desc: "Kur jeni gati, klikoni 'Shiko shportën' dhe konfirmoni porosinë tuaj me një klikim.",
      },
    ],
  },
  mk: {
    table: "Маса",
    loading: "Се вчитува мениот…",
    notFound:
      "Ресторанот не е пронајден. Проверете ја URL-то и обидете се повторно.",
    allCategories: "Сите",
    todaySpecials: "⭐ Денешни Специјалитети",
    emptyCategory: "Нема артикли во оваа категорија",
    viewCart: "Кошничка",
    cart: "Кошничка",
    cartItems: (n: number) => `${n} артикли`,
    yourOrder: (t: number) => `Вашата нарачка · Маса ${t}`,
    emptyCart: "Кошничката е празна",
    addItems: "Додај артикли",
    listening: "Слушам...",
    speaking: "Зборувам...",
    aiTitle: "AI Келнер",
    aiPlaceholder: "Прашајте за менито...",
    enableVoice: "Вклучи глас",
    disableVoice: "Исклучи глас",
    aiGreeting: (name: string, table: number) =>
      `Добредојдовте! Јас сум вашиот AI келнер за **${name}** 👋\n\nСедите на Маса ${table}. Прашајте ме за менито — го знам целосно!`,
    aiError: "Жалиме, се случи проблем. 🙏",
    quickActions: [
      { label: "⭐ Популарно", prompt: "Што препорачувате денес?" },
      { label: "🌱 Вегетаријанско", prompt: "Имате ли вегетаријански опции?" },
      { label: "💰 Поевтино", prompt: "Кои се најевтините јадења?" },
      { label: "🍹 Пијалоци", prompt: "Какви пијалоци имате?" },
    ],
    aiSystemRules: `1. Одговарај СЕКОГАШ на македонски.\n2. Кога препорачуваш јадења, наведи ги имињата ТОЧНО како во менито со цените.\n3. Ако кошничката има артикли, предложи нешто комплементарно (пијалок, десерт).\n4. Одговорите треба да бидат КРАТКИ — макс 3-4 реченици.\n5. Не измислувај информации за јадења кои не се во менито.\n6. Користи емоџи умерено.`,
    callWaiter: "Повикај келнер",
    callWaiterToOrder: "Повикај келнер за нарачка",
    orderPlaced: "Нарачката е дадена",
    confirmingOrder: "Нарачката се потврдува…",
    orderConfirmed: "Вашата нарачка е примена! ✓",
    waiterSheetTitle: "Што ви треба?",
    dessertTitle: "Десерт на куќата 🍰",
    dessertMsg: (items: string[]) =>
      `Може ли да ви предложиме нешто слатко за крај?\nДенес препорачуваме: ${items.join(" и ")}.`,
    dessertDismiss: "Не, фала",
    dessertYes: "Прикажи десерти",
    splitBill: "Подели сметка",
    splitPeople: "Луѓе",
    splitEach: "Секој плаќа",
    splitTotal: "Вкупно",
    splitClose: "Затвори",
    splitPerson: (n: number) => `Лице ${n}`,
    splitUnassigned: "Недоделено",
    splitYou: "Ти",
    billPayHow: "Како ќе платите?",
    cash: "Готово",
    card: "Картичка",
    sendOrder: "Испрати нарачка",
    billTextCash: (table: number | string) =>
      `Здраво! Маса ${table} би сакала сметката — ГОТОВО, ве молам.`,
    billTextCard: (table: number | string) =>
      `Здраво! Маса ${table} би сакала сметката — КАРТИЧКА, ве молам.`,
    waiterMessages: (table: number | string) => [
      {
        icon: "🙋",
        label: "Повикај келнер",
        text: `Здраво! Маса ${table} има потреба од келнер, ве молам.`,
      },
      {
        icon: "🧾",
        label: "Можам ли да ја доб��јам сметката?",
        text: `Здраво! Маса ${table} би сакала сметката, ве молам.`,
      },
      {
        icon: "🍽️",
        label: "Подготвени за нарачка",
        text: `Здраво! Маса ${table} е подготвена да нарача.`,
      },
      {
        icon: "🥤",
        label: "Треба ни пијалоци",
        text: `Здраво! Маса ${table} треба дополнителни пијалоци, ве молам.`,
      },
      {
        icon: "❓",
        label: "Имам прашање",
        text: `Здраво! Маса ${table} има прашање.`,
      },
    ],
    tutorialSkip: "Прескокни",
    tutorialNext: "Следно",
    tutorialDone: "Разбрав!",
    tutorialSteps: [
      {
        icon: "👋",
        title: "Добредојдовте!",
        desc: "Ова е дигиталното мени на ресторанот. Лизгајте надолу за да ги видите сите јадења.",
      },
      {
        icon: "🗂️",
        title: "Филтрирај по категорија",
        desc: "Притиснете ги копчињата за категории на врвt�т за да видите само она што го сакате.",
      },
      {
        icon: "➕",
        title: "Додај во кошничка",
        desc: "Притиснете го копчето + до секој артикл за да го додадете во вашата нарачка.",
      },
      {
        icon: "🤖",
        title: "AI Келнер",
        desc: "Притиснете ја иконата за бот за препораки и прашања за менито.",
      },
      {
        icon: "🛒",
        title: "Нарачај",
        desc: "Кога сте подготвени, притиснете 'Кошничка' и потврдете ја вашата нарачка.",
      },
    ],
  },
  en: {
    table: "Table",
    loading: "Loading menu…",
    notFound: "Restaurant not found. Check the URL and try again.",
    allCategories: "All",
    todaySpecials: "⭐ Today's Specials",
    emptyCategory: "No items in this category",
    viewCart: "View Cart",
    cart: "Cart",
    cartItems: (n: number) => `${n} items`,
    yourOrder: (t: number) => `Your order · Table ${t}`,
    emptyCart: "Your cart is empty",
    addItems: "Add items",
    listening: "Listening...",
    speaking: "Speaking...",
    aiTitle: "AI Waiter",
    aiPlaceholder: "Ask about the menu...",
    enableVoice: "Enable voice",
    disableVoice: "Disable voice",
    aiGreeting: (name: string, table: number) =>
      `Hello! I'm your AI waiter at **${name}** 👋\n\nYou're at Table ${table}. Ask me anything — I know the menu inside out!`,
    aiError: "Sorry, something went wrong. 🙏",
    quickActions: [
      { label: "⭐ Popular", prompt: "What do you recommend today?" },
      { label: "🌱 Vegan", prompt: "Do you have vegetarian or vegan options?" },
      { label: "💰 Budget", prompt: "What are the cheapest dishes?" },
      { label: "🍹 Drinks", prompt: "What drinks do you have?" },
    ],
    aiSystemRules: `1. ALWAYS reply in English.\n2. When recommending dishes, mention names EXACTLY as in the menu with prices.\n3. If the cart has items, suggest something complementary (drink, dessert).\n4. Keep answers SHORT — max 3-4 sentences.\n5. Don't make up dishes not on the menu.\n6. Use emoji sparingly.`,
    callWaiter: "Call Waiter",
    callWaiterToOrder: "Call waiter to take your order",
    orderPlaced: "Order placed",
    confirmingOrder: "Confirming your order…",
    orderConfirmed: "Your order is placed! ✓",
    waiterSheetTitle: "What do you need?",
    dessertTitle: "A little something sweet? 🍰",
    dessertMsg: (items: string[]) =>
      `May we tempt you with a dessert to finish?\nToday we recommend: ${items.join(" and ")}.`,
    dessertDismiss: "No, thank you",
    dessertYes: "Show Desserts",
    splitBill: "Split Bill",
    splitPeople: "People",
    splitEach: "Each person pays",
    splitTotal: "Total",
    splitClose: "Close",
    splitPerson: (n: number) => `Person ${n}`,
    splitUnassigned: "Unassigned",
    splitYou: "You",
    billPayHow: "How will you pay?",
    cash: "Cash",
    card: "Card",
    sendOrder: "Send Order",
    billTextCash: (table: number | string) =>
      `Hi! Table ${table} would like the bill — CASH, please.`,
    billTextCard: (table: number | string) =>
      `Hi! Table ${table} would like the bill — CARD, please.`,
    waiterMessages: (table: number | string) => [
      {
        icon: "🙋",
        label: "Call a waiter",
        text: `Hi! Table ${table} needs a waiter, please.`,
      },
      {
        icon: "🧾",
        label: "Can I have the bill?",
        text: `Hi! Table ${table} would like the bill, please.`,
      },
      {
        icon: "🍽️",
        label: "Ready to order",
        text: `Hi! Table ${table} is ready to order.`,
      },
      {
        icon: "🥤",
        label: "Need more drinks",
        text: `Hi! Table ${table} needs more drinks, please.`,
      },
      {
        icon: "❓",
        label: "I have a question",
        text: `Hi! Table ${table} has a question.`,
      },
    ],
    tutorialSkip: "Skip",
    tutorialNext: "Next",
    tutorialDone: "Got it!",
    tutorialSteps: [
      {
        icon: "👋",
        title: "Welcome!",
        desc: "This is the restaurant's digital menu. Scroll down to explore all available dishes.",
      },
      {
        icon: "🗂️",
        title: "Filter by category",
        desc: "Tap the category buttons at the top to show only what you're looking for.",
      },
      {
        icon: "➕",
        title: "Add to cart",
        desc: "Tap the + button next to any item to add it to your order.",
      },
      {
        icon: "🤖",
        title: "AI Waiter",
        desc: "Tap the bot icon to get personalized recommendations and ask anything about the menu.",
      },
      {
        icon: "🛒",
        title: "Place your order",
        desc: "When you're ready, tap 'View Cart' and confirm your order with one tap.",
      },
    ],
  },
} as const;
function SwipeToDelete({
  children,
  onDelete,
  disabled,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const THRESHOLD = -80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isDragging) return;
    const delta = e.touches[0].clientX - startX.current;
    if (delta < 0) setOffsetX(Math.max(delta, -100));
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    setIsDragging(false);
    if (offsetX < THRESHOLD) {
      onDelete();
    }
    setOffsetX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Red delete background */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5 rounded-2xl">
        <div className="flex flex-col items-center gap-1">
          <X className="h-5 w-5 text-white" />
          <span className="text-[10px] text-white font-bold">
            {Math.abs(offsetX) > 40 ? "Release" : "Swipe"}
          </span>
        </div>
      </div>
      {/* Swipeable content */}
      <motion.div
        animate={{ x: offsetX }}
        transition={
          isDragging
            ? { duration: 0 }
            : { type: "spring", stiffness: 400, damping: 30 }
        }
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}
// ─── Bill Split Drawer ────────────────────────────────────────────────────────
const PERSON_COLORS = [
  {
    dot: "bg-blue-500",
    ring: "ring-blue-400",
    label: "text-blue-600 dark:text-blue-400",
    soft: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  },
  {
    dot: "bg-rose-500",
    ring: "ring-rose-400",
    label: "text-rose-600 dark:text-rose-400",
    soft: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",
  },
  {
    dot: "bg-amber-500",
    ring: "ring-amber-400",
    label: "text-amber-600 dark:text-amber-400",
    soft: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  },
  {
    dot: "bg-emerald-500",
    ring: "ring-emerald-400",
    label: "text-emerald-600 dark:text-emerald-400",
    soft: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
  },
  {
    dot: "bg-violet-500",
    ring: "ring-violet-400",
    label: "text-violet-600 dark:text-violet-400",
    soft: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800",
  },
  {
    dot: "bg-orange-500",
    ring: "ring-orange-400",
    label: "text-orange-600 dark:text-orange-400",
    soft: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  },
  {
    dot: "bg-pink-500",
    ring: "ring-pink-400",
    label: "text-pink-600 dark:text-pink-400",
    soft: "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800",
  },
  {
    dot: "bg-teal-500",
    ring: "ring-teal-400",
    label: "text-teal-600 dark:text-teal-400",
    soft: "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800",
  },
];

function BillSplitDrawer({
  open,
  onClose,
  cart,
  myId,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  myId: string;
  lang: Lang;
}) {
  const tr = t[lang];

  // Group cart items by who added them, preserving insertion order
  const uniqueIds = Array.from(
    new Set(cart.map((i) => i.addedBy).filter(Boolean)),
  ) as string[];
  const unassigned = cart.filter((i) => !i.addedBy);

  const groupTotal = (id: string) =>
    cart
      .filter((i) => i.addedBy === id)
      .reduce((s, i) => s + i.price * i.qty, 0);
  const unassignedTotal = unassigned.reduce((s, i) => s + i.price * i.qty, 0);
  const grandTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const isEmpty = cart.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-stone-900 rounded-t-3xl shadow-2xl flex flex-col"
            style={{
              maxHeight: "85dvh",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-stone-200 dark:bg-stone-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Divide className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">
                    {tr.splitBill}
                  </p>
                  {!isEmpty && (
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {grandTotal} DEN ·{" "}
                      {uniqueIds.length + (unassigned.length > 0 ? 1 : 0)}{" "}
                      {tr.splitPeople.toLowerCase()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center active:bg-muted/70"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Person groups */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {isEmpty ? (
                <p className="text-center text-muted-foreground text-sm py-10">
                  {tr.emptyCart}
                </p>
              ) : (
                <>
                  {uniqueIds.map((id, idx) => {
                    const color = PERSON_COLORS[idx % PERSON_COLORS.length];
                    const isMe = id === myId;
                    const items = cart.filter((i) => i.addedBy === id);
                    const subtotal = groupTotal(id);
                    return (
                      <div key={id}>
                        {/* Person header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-7 w-7 rounded-full ${color.dot} flex items-center justify-center text-white text-[11px] font-bold`}
                            >
                              {idx + 1}
                            </div>
                            <span className="text-sm font-bold text-foreground">
                              {isMe ? tr.splitYou : tr.splitPerson(idx + 1)}
                            </span>
                          </div>
                          <span
                            className={`text-sm font-black font-mono ${color.label}`}
                          >
                            {subtotal}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              DEN
                            </span>
                          </span>
                        </div>
                        {/* Items */}
                        <div
                          className={`rounded-2xl border overflow-hidden ${color.soft}`}
                        >
                          {items.map((item, i) => (
                            <div
                              key={`${item.id}-${i}`}
                              className={`flex items-center justify-between px-3.5 py-2.5 ${i > 0 ? "border-t border-border/50" : ""}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {item.name}
                                </p>
                                {item.qty > 1 && (
                                  <p
                                    className={`text-[11px] font-mono mt-0.5 ${color.label}`}
                                  >
                                    ×{item.qty}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`text-sm font-bold font-mono ml-3 flex-shrink-0 ${color.label}`}
                              >
                                {item.price * item.qty} DEN
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Items without an addedBy (old entries before tracking) */}
                  {unassigned.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-muted-foreground">
                          {tr.splitUnassigned}
                        </span>
                        <span className="text-sm font-bold font-mono text-muted-foreground">
                          {unassignedTotal} DEN
                        </span>
                      </div>
                      <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
                        {unassigned.map((item, i) => (
                          <div
                            key={`u-${item.id}-${i}`}
                            className={`flex items-center justify-between px-3.5 py-2.5 ${i > 0 ? "border-t border-border/50" : ""}`}
                          >
                            <p className="text-sm font-medium text-foreground truncate flex-1">
                              {item.name}
                            </p>
                            <span className="text-sm font-bold font-mono text-muted-foreground ml-3">
                              {item.price * item.qty} DEN
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── ✨ Skeleton Card ────────────────────���────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl border border-stone-200 dark:border-orange-800/50 bg-white dark:bg-stone-800/60 overflow-hidden">
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
        <div className="shimmer absolute inset-0" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        <div className="relative h-3.5 rounded-full bg-muted w-3/4 overflow-hidden">
          <div className="shimmer absolute inset-0" />
        </div>
        <div className="relative h-2.5 rounded-full bg-muted w-1/2 overflow-hidden">
          <div className="shimmer absolute inset-0" />
        </div>
        <div className="relative h-3 rounded-full bg-muted w-1/4 overflow-hidden">
          <div className="shimmer absolute inset-0" />
        </div>
      </div>
      <div className="relative h-9 w-9 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
        <div className="shimmer absolute inset-0" />
      </div>
    </div>
  );
}

// ─── 🌍 Language Picker Screen ────────────────────────────────────────────────
function LangPickerScreen({
  restaurantName,
  onPick,
}: {
  restaurantName: string;
  onPick: (lang: Lang) => void;
}) {
  const options: { lang: Lang; flag: string; label: string; sub: string }[] = [
    { lang: "al", flag: "🇦🇱", label: "Shqip", sub: "Gjuha Shqipe" },
    { lang: "mk", flag: "🇲🇰", label: "Македонски", sub: "Македонски јазик" },
    { lang: "en", flag: "🇬🇧", label: "English", sub: "English language" },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm flex flex-col items-center gap-8"
      >
        <div className="text-center">
          <div className="text-4xl mb-3">🍽️</div>
          <h1 className="text-2xl font-bold text-foreground">
            {restaurantName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select your language · Zgjidhni gjuhën · Изберете јазик
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          {options.map(({ lang, flag, label, sub }) => (
            <motion.button
              key={lang}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPick(lang)}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-stone-200 dark:border-orange-800/50 bg-white dark:bg-stone-800/60 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group text-left"
            >
              <span className="text-3xl leading-none">{flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {label}
                </p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── 🎓 Tutorial Overlay ──────────────────────────────────────────────────────
function TutorialOverlay({ lang, onDone }: { lang: Lang; onDone: () => void }) {
  const tr = t[lang];
  const steps = tr.tutorialSteps as readonly {
    icon: string;
    title: string;
    desc: string;
  }[];
  const [step, setStep] = useState(0);
  const total = steps.length;
  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="relative px-6 pt-8 pb-6">
            <button
              onClick={onDone}
              className="absolute top-4 right-4 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
            >
              {tr.tutorialSkip}
            </button>

            <div className="flex flex-col items-center text-center gap-4">
              <div className="text-6xl leading-none select-none">
                {current.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {current.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {current.desc}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-6 mb-5">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  ←
                </button>
              )}
              <button
                onClick={() => {
                  if (step < total - 1) setStep((s) => s + 1);
                  else onDone();
                }}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform"
              >
                {step < total - 1 ? tr.tutorialNext : tr.tutorialDone}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── 💬 Bouncing Badge ────────────────────────────────────────────────────────
function BounceBadge({ count }: { count: number }) {
  const controls = useAnimation();
  const prevCount = useRef(count);
  useEffect(() => {
    if (count !== prevCount.current) {
      prevCount.current = count;
      controls.start({
        scale: [1, 1.7, 0.8, 1.2, 1],
        rotate: [0, -15, 10, -5, 0],
        transition: { duration: 0.45, ease: "easeOut" },
      });
    }
  }, [count]);
  return (
    <motion.span
      animate={controls}
      className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center leading-none"
    >
      {count}
    </motion.span>
  );
}

// ─── Language Selector ────────────────────────────────────────────────────────
function LangSelector({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="bg-muted rounded-xl p-0.5 flex">
      {(["al", "mk", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${lang === l ? "bg-white dark:bg-stone-700 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ─── Waiter Sheet ─────────────────────────────────────────────────────────────
function WaiterSheet({
  open,
  onClose,
  phoneNumber,
  tableNumber,
  lang,
  receiptItems,
  restaurantName,
  restaurantSlug,
  onSignal,
}: {
  open: boolean;
  onClose: () => void;
  phoneNumber?: string | null;
  tableNumber: number;
  lang: Lang;
  receiptItems: CartItem[];
  restaurantName: string;
  restaurantSlug: string;
  onSignal: (type: "help" | "bill-cash" | "bill-card") => void;
}) {
  const tr = t[lang];
  const [billPicker, setBillPicker] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBillPicker(false);
      setSent(null);
    }
  }, [open]);

  const sendSignal = (type: "help" | "bill-cash" | "bill-card") => {
    onSignal(type);
    setSent(type);
    setTimeout(() => {
      onClose();
      setSent(null);
    }, 1800);
  };

  const WaIcon = () => (
    <svg
      className="h-4 w-4 text-green-500 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.527 5.855L.057 23.04a.75.75 0 00.903.903l5.185-1.47A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.698-.513-5.238-1.406l-.374-.222-3.878 1.1 1.1-3.878-.222-.374A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-stone-900 rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-stone-200 dark:bg-stone-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                {billPicker ? (
                  <button
                    onClick={() => setBillPicker(false)}
                    className="h-8 w-8 rounded-full bg-muted flex items-center justify-center active:bg-muted/70"
                  >
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {billPicker ? tr.billPayHow : tr.waiterSheetTitle}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                    {tr.table} {tableNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center active:bg-muted/70"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {billPicker ? (
                /* ── Cash / Card picker ── */
                <motion.div
                  key="bill-picker"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.18 }}
                  className="px-4 pt-5 pb-8 space-y-3"
                >
                  {/* Section label */}
                  <div className="flex items-center gap-2 px-1 mb-4">
                    <div className="h-px flex-1 bg-border" />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                      {tr.billPayHow}
                    </p>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Receipt preview */}
                  {receiptItems.length > 0 &&
                    (() => {
                      const totalItems = receiptItems.reduce(
                        (s, i) => s + i.qty,
                        0,
                      );
                      const totalPrice = receiptItems.reduce(
                        (s, i) => s + i.price * i.qty,
                        0,
                      );
                      return (
                        <div className="bg-stone-50 dark:bg-stone-800/80 rounded-2xl px-4 py-3 border border-stone-200 dark:border-orange-800/40 font-mono text-[11px] text-muted-foreground space-y-1 mb-1">
                          {receiptItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between gap-2"
                            >
                              <span className="truncate">
                                {item.qty}x {item.name}
                              </span>
                              <span className="flex-shrink-0">
                                {(item.price * item.qty).toLocaleString()} DEN
                              </span>
                            </div>
                          ))}
                          <div className="border-t border-border pt-1 mt-1 flex justify-between font-bold text-foreground">
                            <span>
                              {totalItems}{" "}
                              {lang === "al"
                                ? "artikuj"
                                : lang === "mk"
                                  ? "артикли"
                                  : "items"}
                            </span>
                            <span>{totalPrice.toLocaleString()} DEN</span>
                          </div>
                        </div>
                      );
                    })()}

                  {sent ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-emerald-500" />
                      </div>
                      <p className="text-base font-bold text-foreground">
                        {lang === "al"
                          ? "Kamarieri vjen!"
                          : lang === "mk"
                            ? "Келнерот доаѓа!"
                            : "Waiter is coming!"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lang === "al"
                          ? "Kërkesa juaj u dërgua."
                          : lang === "mk"
                            ? "Барањето е испратено."
                            : "Your request was sent."}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Cash button */}
                      <motion.button
                        whileTap={{ scale: 0.985 }}
                        onClick={() => sendSignal("bill-cash")}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm active:shadow-none active:bg-emerald-50 dark:active:bg-emerald-900/20 transition-all text-left group"
                      >
                        <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200 dark:shadow-emerald-900/40">
                          <Banknote
                            className="h-6 w-6 text-white"
                            strokeWidth={1.75}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-foreground leading-tight">
                            {tr.cash}
                          </p>
                          <p className="text-[12px] text-muted-foreground mt-0.5">
                            {lang === "al"
                              ? "Njofton kamarieren direkt"
                              : lang === "mk"
                                ? "Го известува келнерот директно"
                                : "Notifies the waiter directly"}
                          </p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 opacity-0 group-active:opacity-100 transition-opacity" />
                      </motion.button>

                      {/* Card button */}
                      <motion.button
                        whileTap={{ scale: 0.985 }}
                        onClick={() => sendSignal("bill-card")}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm active:shadow-none active:bg-blue-50 dark:active:bg-blue-900/20 transition-all text-left group"
                      >
                        <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-200 dark:shadow-blue-900/40">
                          <CreditCard
                            className="h-6 w-6 text-white"
                            strokeWidth={1.75}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-foreground leading-tight">
                            {tr.card}
                          </p>
                          <p className="text-[12px] text-muted-foreground mt-0.5">
                            {lang === "al"
                              ? "Njofton kamarieren direkt"
                              : lang === "mk"
                                ? "Го известува келнерот директно"
                                : "Notifies the waiter directly"}
                          </p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 opacity-0 group-active:opacity-100 transition-opacity" />
                      </motion.button>
                    </>
                  )}
                </motion.div>
              ) : (
                /* ── Normal message list ── */
                <motion.div
                  key="msg-list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.18 }}
                  className="p-4 space-y-2.5 pb-6"
                >
                  {sent ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-amber-500" />
                      </div>
                      <p className="text-base font-bold text-foreground">
                        {lang === "al"
                          ? "Kamarieri vjen!"
                          : lang === "mk"
                            ? "Келнерот доаѓа!"
                            : "Waiter is coming!"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lang === "al"
                          ? "Kërkesa juaj u dërgua."
                          : lang === "mk"
                            ? "Барањето е испратено."
                            : "Your request was sent."}
                      </p>
                    </div>
                  ) : (
                    tr.waiterMessages(tableNumber).map((msg) => {
                      const isBill = msg.icon === "🧾";
                      return (
                        <motion.button
                          key={msg.label}
                          whileTap={{ scale: 0.97 }}
                          onClick={() =>
                            isBill ? setBillPicker(true) : sendSignal("help")
                          }
                          className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-border active:bg-primary/5 active:border-primary/20 transition-colors text-left"
                        >
                          <span className="text-2xl flex-shrink-0">
                            {msg.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-snug">
                              {msg.label}
                            </p>
                            {isBill ? (
                              <p className="text-[11px] text-primary font-medium mt-0.5">
                                {tr.cash} · {tr.card}
                              </p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                {msg.text}
                              </p>
                            )}
                          </div>
                          {isBill ? (
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <WaIcon />
                          )}
                        </motion.button>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── AI Waiter Panel ──────────────────────────────────────────────────────────
interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendedItems?: MenuItem[];
}

function AIWaiterPanel({
  open,
  onClose,
  restaurantName,
  menuItems,
  cart,
  tableNumber,
  onAddItem,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  restaurantName: string;
  menuItems: MenuItem[];
  cart: CartItem[];
  tableNumber: number;
  onAddItem: (item: MenuItem) => void;
  lang: Lang;
}) {
  const tr = t[lang];
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const messagesRef = useRef<AIMessage[]>([]);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    synthRef.current = window.speechSynthesis;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      // Stop any ongoing speech on unmount
      synthRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    )
      return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = (
      { al: "sq-AL", mk: "mk-MK", en: "en-US" } as Record<Lang, string>
    )[lang];
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      setIsListening(false);
      setTimeout(() => sendMessage(text), 300);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    return () => {
      recognitionRef.current?.abort();
    };
  }, [lang]);

  const voiceAvailable = lang === "en";

  const speak = useCallback(
    (text: string) => {
      if (!synthRef.current || !voiceEnabled || !voiceAvailable) return;
      synthRef.current.cancel();
      const cleaned = text
        .replace(/\*\*/g, "")
        .replace(/[_~`]/g, "")
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleaned) return;
      const u = new SpeechSynthesisUtterance(cleaned);
      u.lang = "en-US";
      u.rate = 1.0;
      u.pitch = 0.95;
      u.volume = 1;
      const preferred =
        voicesRef.current.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Google") || v.name.includes("Neural")),
        ) ||
        voicesRef.current.find((v) => v.lang.startsWith("en")) ||
        null;
      if (preferred) u.voice = preferred;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      setTimeout(() => synthRef.current?.speak(u), 150);
    },
    [voiceEnabled, voiceAvailable],
  );

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  };
  const handleToggleVoice = () => {
    if (!voiceAvailable) return;
    if (voiceEnabled) stopSpeaking();
    setVoiceEnabled((v) => !v);
  };

  useEffect(() => {
    if (open && !initialized.current) {
      initialized.current = true;
      const greeting = tr.aiGreeting(restaurantName, tableNumber);
      setMessages([{ id: "greeting", role: "assistant", content: greeting }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 350);
  }, [open]);

  useEffect(() => {
    if (initialized.current)
      setMessages([
        {
          id: `greeting-${lang}`,
          role: "assistant",
          content: tr.aiGreeting(restaurantName, tableNumber),
        },
      ]);
  }, [lang]);

  useEffect(() => {
    if (!open) stopSpeaking();
  }, [open]);
  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      stopSpeaking();
    },
    [],
  );

  const buildSystemPrompt = useCallback(() => {
    const menuText = menuItems
      .map(
        (i) =>
          `• ${i.name} — ${i.price}${i.description ? ` (${i.description})` : ""} [${i.category}]`,
      )
      .join("\n");
    const cartText =
      cart.length > 0
        ? cart.map((i) => `  - ${i.qty}x ${i.name} (${i.price} DEN)`).join("\n")
        : "Empty";
    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    return `You are a friendly AI waiter for restaurant "${restaurantName}". The customer is at Table ${tableNumber}.\n\n## Menu\n${menuText}\n\n## Customer's current cart\n${cartText}\n${cart.length > 0 ? `Total: ${cartTotal} DEN` : ""}\n\n## Rules\n${tr.aiSystemRules}`;
  }, [restaurantName, tableNumber, menuItems, cart, lang]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "user", content: text.trim() },
      ]);
      setInput("");
      setIsTyping(true);
      try {
        const history = messagesRef.current
          .filter((m) => m.content.trim())
          .map((m) => ({ role: m.role, content: m.content }));
        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: buildSystemPrompt(),
            max_tokens: 400,
            messages: [...history, { role: "user", content: text.trim() }],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rawText: string = data.text || data.content?.[0]?.text || "";
        if (!rawText) throw new Error("Empty");
        const mentioned = menuItems
          .filter(
            (item) =>
              item.active &&
              rawText.toLowerCase().includes(item.name.toLowerCase()),
          )
          .slice(0, 3);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: rawText,
            recommendedItems: mentioned.length > 0 ? mentioned : undefined,
          },
        ]);
        speak(rawText.replace(/\*\*/g, ""));
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: tr.aiError,
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, buildSystemPrompt, menuItems, speak, lang],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white dark:bg-stone-900 rounded-t-3xl shadow-2xl overflow-hidden"
            style={{
              maxHeight: "85dvh",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-stone-200 dark:bg-stone-700" />
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {tr.aiTitle}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                    {tr.table} {tableNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={handleToggleVoice}
                  whileTap={{ scale: 0.9 }}
                  title={
                    !voiceAvailable
                      ? "Voice not available for this language"
                      : voiceEnabled
                        ? tr.disableVoice
                        : tr.enableVoice
                  }
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${!voiceAvailable ? "bg-muted text-muted-foreground/30 cursor-not-allowed" : voiceEnabled ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"}`}
                >
                  {voiceEnabled && voiceAvailable ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </motion.button>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center active:bg-muted/70"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="flex gap-1.5 px-4 py-2 overflow-x-auto flex-shrink-0 border-b border-border">
              {tr.quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => sendMessage(a.prompt)}
                  disabled={isTyping}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                >
                  {a.label}
                </button>
              ))}
            </div>
            <div
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 340, damping: 26 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {msg.content.replace(/\*\*/g, "")}
                      </p>
                      {msg.recommendedItems &&
                        msg.recommendedItems.length > 0 && (
                          <div className="mt-2.5 space-y-2">
                            {msg.recommendedItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2.5 bg-white dark:bg-stone-800 rounded-xl p-2 border border-border"
                              >
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                                    🍽️
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">
                                    {getItemName(item, lang)}
                                  </p>
                                  {item.specialDiscount && item.specialType ? (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-[9px] font-bold bg-amber-500 text-white px-1 py-0.5 rounded-full">
                                        ⭐
                                      </span>
                                      <span className="text-[10px] text-muted-foreground line-through">
                                        {parsePrice(item.price)}
                                      </span>
                                      <span className="text-xs font-bold text-amber-500">
                                        {getSpecialPrice(item)} DEN
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="text-xs font-bold text-primary">
                                      {item.price}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    onAddItem(item);
                                    onClose();
                                  }}
                                  className="flex-shrink-0 h-7 w-7 rounded-lg bg-primary flex items-center justify-center active:scale-95 transition-transform shadow-sm"
                                >
                                  <Plus className="h-3.5 w-3.5 text-primary-foreground" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-1.5">
                      {[0, 150, 300].map((delay) => (
                        <motion.span
                          key={delay}
                          className="w-1.5 h-1.5 bg-primary rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: delay / 1000,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {isSpeaking && voiceEnabled && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-primary/10 rounded-2xl px-3 py-2 flex items-center gap-2">
                    <Volume2 className="h-3.5 w-3.5 text-primary animate-pulse" />
                    <span className="text-xs text-primary font-medium">
                      {tr.speaking}
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-white dark:bg-stone-900">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                  placeholder={tr.aiPlaceholder}
                  disabled={isTyping || isListening}
                  className="flex-1 h-10 px-4 rounded-full text-sm bg-muted border-0 outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                />
                <button
                  onClick={
                    isListening
                      ? () => recognitionRef.current?.stop()
                      : () => {
                          try {
                            recognitionRef.current?.start();
                          } catch {}
                        }
                  }
                  disabled={isTyping}
                  className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform flex-shrink-0 ${isListening ? "bg-red-500 animate-pulse" : "bg-primary"} disabled:opacity-40 disabled:pointer-events-none`}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4 text-white" />
                  ) : (
                    <Mic className="h-4 w-4 text-primary-foreground" />
                  )}
                </button>
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-sm active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
                >
                  <Send className="h-4 w-4 text-primary-foreground" />
                </button>
              </div>
              {isListening && (
                <p className="text-center text-xs text-primary font-medium mt-2 animate-pulse">
                  {tr.listening}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TableCart({ restaurantSlug, tableNumber }: Props) {
  const channelName = `table-${restaurantSlug}-${tableNumber}`;
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lightboxItem, setLightboxItem] = useState<MenuItem | null>(null);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);

    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);

    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);

      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  const getDefaultLang = (): Lang => {
    const saved = localStorage.getItem("hajdeha_lang") as Lang | null;
    if (saved && ["al", "mk", "en"].includes(saved)) return saved;
    const bl = navigator.language.toLowerCase();
    if (bl.startsWith("sq")) return "al";
    if (bl.startsWith("mk")) return "mk";
    return "en";
  };
  const playSuccessChime = () => {
    try {
      const ctx = new AudioContext();
      const notes = [523, 659, 784]; // C, E, G — major chord
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = freq;
        o.type = "sine";
        const start = ctx.currentTime + i * 0.12;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.12, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        o.start(start);
        o.stop(start + 0.4);
      });
    } catch {}
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#f97316", "#fb923c", "#fdba74", "#ffffff", "#fef3c7"],
      scalar: 0.9,
      ticks: 80,
    });
  };
  const [lang, setLang] = useState<Lang>(getDefaultLang);
  const tr = t[lang];
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<View>("menu");
  const [activeCategory, setActiveCategory] = useState<string>(
    tr.allCategories,
  );
  const [connected, setConnected] = useState(false);
  const [peerCount] = useState(0);
  const [justAdded, setJustAdded] = useState<number | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [waiterSheetOpen, setWaiterSheetOpen] = useState(false);
  const [orderConfirming, setOrderConfirming] = useState(false);
  const [orderConfirmedDone, setOrderConfirmedDone] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [dessertToast, setDessertToast] = useState(false);
  const [dessertItems, setDessertItems] = useState<string[]>([]);
  const dessertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dessertTimerStarted = useRef(false);
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const orderProcessedRef = useRef(false);
  const [sessionOrder, setSessionOrder] = useState<CartItem[]>([]);
  const [showLangPicker, setShowLangPicker] = useState(
    () => localStorage.getItem("hajdeha_lang_chosen") !== "1",
  );
  const [showTutorial, setShowTutorial] = useState(
    () => localStorage.getItem("hajdeha_tutorial_seen") !== "1",
  );
  const isLocal = useRef(false);

  // Stable per-device identity — stored in localStorage so it survives refreshes
  // Used to auto-group items in the split bill by who added them
  const myId = useMemo(() => {
    const key = `hajde-person-${channelName}`;
    let id = localStorage.getItem(key);
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      localStorage.setItem(key, id);
    }
    return id;
  }, [channelName]);

  // 🌙 Auto dark mode — dark between 20:00 and 07:00
  useEffect(() => {
    const apply = () => {
      const h = new Date().getHours();
      document.documentElement.classList.toggle("dark", h >= 20 || h < 7);
    };
    apply();
    const interval = setInterval(apply, 5 * 60_000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup dessert timer on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (dessertTimerRef.current) {
        clearTimeout(dessertTimerRef.current);
      }
    };
  }, []);

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["table-restaurant", restaurantSlug],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants?slug=${restaurantSlug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const menuItems: MenuItem[] = useMemo(
    () => (restaurant?.menuItems || []).filter((i: MenuItem) => i.active),
    [restaurant],
  );
  const specialItems = useMemo(
    () => menuItems.filter((i) => i.specialDiscount && i.specialType),
    [menuItems],
  );
  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map((i) => i.category)));
    const base = [tr.allCategories, ...cats];
    if (specialItems.length > 0) base.splice(1, 0, tr.todaySpecials);
    return base;
  }, [menuItems, lang, specialItems]);
  const filtered = useMemo(
    () =>
      activeCategory === tr.allCategories
        ? menuItems
        : activeCategory === tr.todaySpecials
          ? specialItems
          : menuItems.filter((i) => i.category === activeCategory),
    [menuItems, activeCategory, lang, specialItems],
  );

  useEffect(() => {
    setActiveCategory(tr.allCategories);
  }, [lang]);

  useEffect(() => {
    const pusherKey = import.meta.env.VITE_PUSHER_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER;
    if (!pusherKey || !pusherCluster) return;

    const abortController = new AbortController();
    const { signal } = abortController;

    const pusher = new Pusher(pusherKey, { cluster: pusherCluster });
    const channel = pusher.subscribe(channelName);
    pusher.connection.bind("connected", () => setConnected(true));
    pusher.connection.bind("disconnected", () => setConnected(false));
    pusher.connection.bind("error", () => setConnected(false));
    channel.bind("cart-update", (data: { cart: CartItem[] }) => {
      if (!isLocal.current) {
        // Items without addedBy came from POS — treat as already-ordered session items
        const posItems = data.cart.filter((i) => !i.addedBy);
        const customerItems = data.cart.filter((i) => i.addedBy);
        if (posItems.length > 0) {
          setSessionOrder((prev) => {
            const merged = [...prev];
            posItems.forEach((item) => {
              const existing = merged.find(
                (i) => i.id === item.id && !i.addedBy,
              );
              if (existing) existing.qty = item.qty;
              else merged.push({ ...item });
            });
            return merged;
          });
        }
        setCart(customerItems);
      }
    });
    channel.bind("order-snapshot", (data: { sessionOrder: CartItem[] }) => {
      setSessionOrder(data.sessionOrder);
    });
    channel.bind("cart-cleared", () => {
      setCart([]);
      setSessionOrder([]);
      localStorage.removeItem(`hajde-ts-${channelName}`);
    });
    channel.bind("pusher:subscription_succeeded", () => setConnected(true));

    // Time-based table isolation:
    // - Friends scanning together (within 3 hours) → share the same cart
    // - New customers (cart older than 3 hours) → start fresh automatically
    const tsKey = `hajde-ts-${channelName}`;
    const THREE_HOURS = 3 * 60 * 60 * 1000;
    const lastActive = parseInt(localStorage.getItem(tsKey) || "0", 10);
    const isStale = !lastActive || Date.now() - lastActive > THREE_HOURS;

    if (isStale) {
      // Table has turned over — wipe old cart so new customers start fresh
      fetch("/api/table/cart-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channelName, cart: [] }),
        signal,
      }).catch(() => {});
    } else {
      // Active table — load shared cart (works for friends scanning together too)
      fetch(`/api/table/${channelName}/cart`, { signal })
        .then((r) => r.json())
        .then((d) => {
          if (!signal.aborted && d.cart) setCart(d.cart);
        })
        .catch(() => {});
      // Also restore the shared session order (bill history for the whole table)
      fetch(`/api/table/${channelName}/order-snapshot`, { signal })
        .then((r) => r.json())
        .then((d) => {
          if (!signal.aborted && d.sessionOrder?.length)
            setSessionOrder(d.sessionOrder);
        })
        .catch(() => {});
    }
    return () => {
      abortController.abort();
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [channelName]);

  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncCart = useCallback(
    (newCart: CartItem[]) => {
      isLocal.current = true;
      setTimeout(() => {
        isLocal.current = false;
      }, 200);
      if (newCart.length > 0) {
        localStorage.setItem(`hajde-ts-${channelName}`, Date.now().toString());
      }
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
      syncDebounceRef.current = setTimeout(async () => {
        try {
          await fetch("/api/table/cart-update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel: channelName, cart: newCart }),
          });
        } catch {}
      }, 800);
    },
    [channelName],
  );
  // Listen for SHOW_DESSERTS message from service worker (notification tap)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SHOW_DESSERTS") {
        const dessertCats = [
          "dessert",
          "ëmbëlsirë",
          "desserts",
          "десерт",
          "десерти",
          "sweet",
          "sweets",
        ];
        const dessertCat = categories.find((c) =>
          dessertCats.includes(c.toLowerCase()),
        );
        if (dessertCat) setActiveCategory(dessertCat);
        setView("menu");
        requestAnimationFrame(() =>
          menuScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }),
        );
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handler);
  }, [categories]);

  // After order is confirmed: clear cart & reset so the table is ready for the next customer
  // Also start the dessert reminder timer (20 min after order placed)
  useEffect(() => {
    if (!orderConfirmedDone) return;
    // Prevent running multiple times for the same confirmation
    if (orderProcessedRef.current) return;
    orderProcessedRef.current = true;

    // Start dessert notification once per session (20 min after order)
    if (!dessertTimerStarted.current && menuItems.length) {
      dessertTimerStarted.current = true;

      const DESSERT_DELAY = 20 * 60 * 1000;
      const dessertCats = [
        "dessert",
        "ëmbëlsirë",
        "desserts",
        "десерт",
        "десерт��",
        "sweet",
        "sweets",
      ];
      const pool = menuItems.filter((m) =>
        dessertCats.includes((m.category || "").toLowerCase()),
      );
      const hasDesserts = pool.length >= 2;
      const src = hasDesserts ? pool : menuItems;
      const pickedItems = [...src]
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map((m) => getItemName(m, lang));

      // Try web push via service worker first
      const tryPushNotification = async () => {
        if (!("serviceWorker" in navigator) || !("Notification" in window))
          return false;
        let perm = Notification.permission;
        if (perm === "default") {
          perm = await Notification.requestPermission();
        }
        if (perm !== "granted") return false;
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage({
          type: "SCHEDULE_DESSERT",
          payload: {
            delay: DESSERT_DELAY,
            restaurantName: restaurant?.name ?? "Hajde HA",
            tableUrl: window.location.href,
            items: pickedItems,
            hasDesserts,
            lang,
          },
        });
        return true;
      };

      tryPushNotification().then((scheduled) => {
        if (!scheduled) {
          // Fallback: in-app toast
          dessertTimerRef.current = setTimeout(() => {
            setDessertItems(pickedItems);
            setDessertToast(true);
          }, DESSERT_DELAY);
        }
      });
    }

    // Snapshot the cart into sessionOrder before clearing AND sync to server
    // Use functional update to avoid sessionOrder in deps (prevents infinite loop)
    setSessionOrder((prev) => {
      // Deep copy to avoid mutating prev state
      const merged = prev.map((i) => ({ ...i }));
      cart.forEach((item) => {
        // Match by id AND addedBy so each person's items stay separate
        const existing = merged.find(
          (i) => i.id === item.id && i.addedBy === item.addedBy,
        );
        if (existing) existing.qty += item.qty;
        else merged.push({ ...item });
      });
      return merged;
    });

    const timer = setTimeout(() => {
      setCart([]);
      syncCart([]);
      setOrderConfirmedDone(false);
      setOrderConfirming(false);
      orderProcessedRef.current = false; // Reset for next order
      // Keep the timestamp alive so follow-up orders stay in the same session
      localStorage.setItem(`hajde-ts-${channelName}`, Date.now().toString());
    }, 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderConfirmedDone, syncCart, channelName]);

  const addItem = (item: MenuItem) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setCart((prev) => {
      // Match by item id AND current user — each person's items stay separate
      const idx = prev.findIndex((i) => i.id === item.id && i.addedBy === myId);
      const next =
        idx >= 0
          ? prev.map((i, n) => (n === idx ? { ...i, qty: i.qty + 1 } : i))
          : [
              ...prev,
              {
                id: item.id,
                name: item.name,
                price: getSpecialPrice(item) ?? parsePrice(item.price),
                qty: 1,
                addedBy: myId,
              },
            ];
      syncCart(next);
      return next;
    });
    setJustAdded(item.id);
    setTimeout(() => setJustAdded(null), 600);
  };

  // When addedBy is provided, only affect that person's entry; otherwise affect any
  const updateQty = (id: number, delta: number, addedBy?: string) => {
    if (delta < 0 && navigator.vibrate) navigator.vibrate([30, 20, 30]);
    setCart((prev) => {
      const next = prev
        .map((i) => {
          const match =
            i.id === id && (addedBy === undefined || i.addedBy === addedBy);
          return match ? { ...i, qty: i.qty + delta } : i;
        })
        .filter((i) => i.qty > 0);
      syncCart(next);
      return next;
    });
  };

  // Table display label — uses optional prefix (e.g. "D3" vs "3")
  const displayTable: string = restaurant?.tablePrefix
    ? `${restaurant.tablePrefix}${tableNumber}`
    : String(tableNumber);

  // Build a WhatsApp order message in the current language
  const buildOrderWhatsApp = () => {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const L =
      lang === "al"
        ? { title: "Porosi e re", table: "Tavolina", totalLbl: "Totali" }
        : lang === "mk"
          ? { title: "Нова нарачка", table: "Маса", totalLbl: "Вкупно" }
          : { title: "New Order", table: "Table", totalLbl: "Total" };
    const itemLines = cart.map(
      (i) => `• ${i.qty}x ${i.name}  ${(i.price * i.qty).toLocaleString()} DEN`,
    );
    return [
      `🍽️ *${L.title} — ${restaurant?.name ?? ""}*`,
      `📍 ${L.table} ${displayTable}`,
      ``,
      ...itemLines,
      `─────────────────────`,
      `💰 *${L.totalLbl}: ${total.toLocaleString()} DEN*`,
    ].join("\n");
  };

  const menuOnly = (restaurant as any)?.orderMode === "menu-only";

  const [customerNote, setCustomerNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Send order to backend, open WhatsApp, fire success effects
  const handleSendOrder = async () => {
    if (orderConfirming || orderConfirmedDone || cart.length === 0) return;
    setOrderConfirming(true);
    try {
      const res = await fetch("/api/table/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: channelName,
          cart,
          tableNumber: displayTable,
          restaurantName: restaurant?.name ?? "",
          total: cart.reduce((s, i) => s + i.price * i.qty, 0),
          customerNote: customerNote.trim() || null,
          timestamp: Date.now(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // 📲 Open WhatsApp with the order summary — only in WhatsApp mode.
      // In tablet mode the order goes live to the restaurant's tablet POS.
      const orderMode = (restaurant as any)?.orderMode ?? "whatsapp";
      if (orderMode !== "tablet") {
        const phone = (restaurant?.phoneNumber ?? "").replace(/\D/g, "");
        const msg = buildOrderWhatsApp();
        const waUrl = phone
          ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
          : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, "_blank");
      }

      // 🎉 Fire success effects then let useEffect handle cart clear
      fireConfetti();
      playSuccessChime();
      if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
      setCustomerNote("");
      setShowNoteInput(false);
      setOrderConfirmedDone(true);
    } catch {
      setOrderConfirming(false);
      alert(
        lang === "al"
          ? "Gabim gjatë dërgimit të porosisë. Provoni përsëri."
          : lang === "mk"
            ? "Грешка при испраќање на нарачката. Обидете се повторно."
            : "Error sending order. Please try again.",
      );
    }
  };

  // Merge sessionOrder (already ordered) + cart (new items) for display
  // This ensures 2nd+ orders show the full accumulated cart
  const fullCart = useMemo(() => {
    // While order is being confirmed, only show sessionOrder to avoid doubling
    if (orderConfirming || orderConfirmedDone) {
      return sessionOrder;
    }

    const merged = sessionOrder.map((item) => ({ ...item }));
    cart.forEach((item) => {
      const existing = merged.find(
        (i) => i.id === item.id && i.addedBy === item.addedBy,
      );
      if (existing) existing.qty += item.qty;
      else merged.push({ ...item });
    });
    return merged;
  }, [sessionOrder, cart, orderConfirming, orderConfirmedDone]);
  const total = fullCart.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCount = fullCart.reduce((s, i) => s + i.qty, 0);

  // ── Loading skeleton
  if (isLoading) {
    return (
      <div className="h-[100dvh] w-screen flex flex-col overflow-hidden bg-background touch-manipulation">
        <style>{`
          * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
          ::-webkit-scrollbar { display: none; }
          @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
          .shimmer { background: linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.28) 50%,transparent 100%); animation: shimmer 1.4s infinite; }
          html, body { overscroll-behavior: none; }
        `}</style>
        <div
          className="flex-shrink-0 bg-white dark:bg-stone-900 border-b border-border px-4 flex items-center gap-3 min-h-[56px]"
          style={{
            paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
            paddingBottom: 12,
          }}
        >
          <div className="relative h-9 w-9 rounded-xl bg-muted overflow-hidden flex-shrink-0">
            <div className="shimmer absolute inset-0" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="relative h-3.5 rounded-full bg-muted w-36 overflow-hidden">
              <div className="shimmer absolute inset-0" />
            </div>
            <div className="relative h-2.5 rounded-full bg-muted w-20 overflow-hidden">
              <div className="shimmer absolute inset-0" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-4 py-2.5 bg-white dark:bg-stone-900 border-b border-border overflow-hidden">
          {[52, 60, 48, 68, 44].map((w, i) => (
            <div
              key={i}
              className="relative h-8 rounded-full bg-muted overflow-hidden flex-shrink-0"
              style={{ width: w }}
            >
              <div className="shimmer absolute inset-0" />
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-hidden p-3 sm:p-4 space-y-3 max-w-2xl mx-auto w-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.075, duration: 0.28 }}
            >
              <SkeletonCard />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="h-[100dvh] w-full bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
        <UtensilsCrossed className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground max-w-xs">{tr.notFound}</p>
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] w-screen flex flex-col overflow-hidden bg-background touch-manipulation"
      data-testid="table-cart-page"
    >
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        .shimmer { background: linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.28) 50%,transparent 100%); animation: shimmer 1.4s infinite; }
        html, body { overscroll-behavior: none; }
      `}</style>
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed top-0 left-0 right-0 z-[60] flex justify-center"
            style={{ paddingTop: "max(8px, env(safe-area-inset-top, 8px))" }}
          >
            <div className="mx-3 flex items-center gap-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2.5 rounded-2xl shadow-xl text-sm font-semibold">
              <WifiOff className="h-4 w-4 flex-shrink-0" />
              <span>
                {lang === "al"
                  ? "Jeni offline — ndryshimet do të sinkronizohen"
                  : lang === "mk"
                    ? "Сте офлајн — промените ќе се синхронизираат"
                    : "You're offline — changes will sync when reconnected"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Bill Split Drawer */}
      <BillSplitDrawer
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        cart={fullCart}
        myId={myId}
        lang={lang}
      />

      {/* Dessert toast */}
      <AnimatePresence>
        {dessertToast && dessertItems.length > 0 && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed top-0 left-0 right-0 z-50 px-3"
            style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
          >
            <div className="max-w-lg mx-auto bg-white dark:bg-stone-900 border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xl">🍰</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {tr.dessertTitle}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug whitespace-pre-line">
                    {tr.dessertMsg(dessertItems)}
                  </p>
                </div>
                <button
                  onClick={() => setDessertToast(false)}
                  className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 active:bg-muted/70"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex border-t border-border">
                <button
                  onClick={() => {
                    const dessertCats = [
                      "dessert",
                      "ëmbëlsirë",
                      "desserts",
                      "десерт",
                      "десерти",
                      "sweet",
                      "sweets",
                    ];
                    const dessertCat = categories.find((c) =>
                      dessertCats.includes(c.toLowerCase()),
                    );
                    if (dessertCat) setActiveCategory(dessertCat);
                    setView("menu");
                    setDessertToast(false);
                    requestAnimationFrame(() =>
                      menuScrollRef.current?.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      }),
                    );
                  }}
                  className="flex-1 py-3 text-xs font-bold text-amber-600 dark:text-amber-400 active:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <span>🍰</span>
                    {tr.dessertYes}
                  </span>
                </button>
                <div className="w-px bg-border" />
                <button
                  onClick={() => setDessertToast(false)}
                  className="flex-1 py-3 text-xs font-medium text-muted-foreground active:bg-muted/50 transition-colors"
                >
                  {tr.dessertDismiss}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <WaiterSheet
        open={waiterSheetOpen}
        onClose={() => setWaiterSheetOpen(false)}
        phoneNumber={restaurant.phoneNumber}
        tableNumber={displayTable}
        lang={lang}
        receiptItems={fullCart}
        restaurantName={restaurant.name}
        restaurantSlug={restaurantSlug}
        onSignal={async (type: "help" | "bill-cash" | "bill-card") => {
          try {
            await fetch("/api/table/waiter-signal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                restaurantSlug,
                tableNumber: displayTable,
                type,
              }),
            });
          } catch {}
        }}
      />
      <AIWaiterPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        restaurantName={restaurant.name}
        menuItems={menuItems}
        cart={cart}
        tableNumber={displayTable}
        onAddItem={addItem}
        lang={lang}
      />

      {/* AI FAB */}
      <motion.button
        onClick={() => setAiOpen(true)}
        whileTap={{ scale: 0.9 }}
        className="fixed z-30 bg-gradient-to-br from-primary to-primary/80 shadow-xl flex items-center justify-center rounded-full"
        style={{
          bottom: itemCount > 0 ? 96 : 28,
          right: 16,
          height: 50,
          width: 50,
          transition: "bottom 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <Bot className="h-5 w-5 text-white" />
        <motion.span
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute -top-1 -right-1"
        >
          <Sparkles className="h-3 w-3 text-yellow-400 drop-shadow" />
        </motion.span>
      </motion.button>

      {/* Call Waiter FAB — hidden in cart view (has its own button there) */}
      <motion.button
        onClick={() => setWaiterSheetOpen(true)}
        whileTap={{ scale: 0.93 }}
        data-testid="button-call-waiter"
        className="fixed z-30 bg-white dark:bg-stone-800 border border-border shadow-xl flex items-center gap-2 rounded-full px-4"
        style={{
          bottom: itemCount > 0 ? 96 : 28,
          left: 16,
          height: 50,
          transition: "bottom 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          display: view === "cart" ? "none" : "flex",
        }}
      >
        <Bell className="h-4 w-4 text-foreground flex-shrink-0" />
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          {tr.callWaiter}
        </span>
      </motion.button>

      {/* ─── Header ── */}
      <header
        className="flex-shrink-0 bg-white dark:bg-stone-900 border-b border-border px-3 sm:px-4 flex items-center justify-between gap-2 shadow-sm min-h-[56px]"
        style={{
          paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
          paddingBottom: 12,
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight truncate max-w-[120px] sm:max-w-none">
              {restaurant.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-widest">
                {tr.table} {displayTable}
              </p>
              {restaurant.wifiPassword && (
                <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
                  <Wifi className="h-2.5 w-2.5 text-blue-500" />
                  <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-300">
                    {restaurant.wifiPassword}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <LangSelector lang={lang} onChange={setLang} />
          {peerCount > 0 && (
            <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
              <Users className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {peerCount}
              </span>
            </div>
          )}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${connected ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/30 text-red-500"}`}
          >
            {connected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">
              {connected ? "LIVE" : "OFF"}
            </span>
          </div>
          {itemCount > 0 && !menuOnly && (
            <button
              data-testid="button-toggle-cart"
              onClick={() => setView(view === "cart" ? "menu" : "cart")}
              className="relative h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            >
              <ShoppingBag className="h-4 w-4 text-primary-foreground" />
              <BounceBadge count={itemCount} />
            </button>
          )}
        </div>
      </header>

      {/* ─── Content ── */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <AnimatePresence mode="sync">
          {view === "menu" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 flex flex-col overflow-hidden"
            >
              <div className="flex-shrink-0 relative border-b border-border bg-white dark:bg-stone-900">
                <div className="flex gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar">
                  {categories.map((cat) => {
                    const isSpecialsCat = cat === tr.todaySpecials;
                    const isActive = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setActiveCategory(cat);
                          menuScrollRef.current?.scrollTo({
                            top: 0,
                            behavior: "smooth",
                          });
                        }}
                        className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${
                          isSpecialsCat
                            ? isActive
                              ? "bg-amber-500 text-white shadow-sm"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                            : isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {cat === tr.allCategories || isSpecialsCat
                          ? cat
                          : getCategoryDisplay(cat, lang)}
                      </button>
                    );
                  })}
                  {/* Spacer so last pill isn't hidden behind fade */}
                  <div className="flex-shrink-0 w-8" />
                </div>
                {/* Right-edge fade hint */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white dark:from-stone-900 to-transparent" />
              </div>
              <div
                ref={menuScrollRef}
                className="flex-1 overflow-y-auto min-h-0"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div
                  className="p-3 sm:p-4 space-y-3 max-w-2xl mx-auto w-full"
                  style={{ paddingBottom: 104 }}
                >
                  {restaurant.wifiPassword && (
                    <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3">
                      <div className="h-8 w-8 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <Wifi className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                          WiFi Password
                        </p>
                        <p className="text-sm font-bold font-mono text-blue-700 dark:text-blue-300 truncate">
                          {restaurant.wifiPassword}
                        </p>
                      </div>
                    </div>
                  )}
                  {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {tr.emptyCategory}
                      </p>
                    </div>
                  )}
                  {filtered.map((item) => {
                    const allForItem = cart.filter((c) => c.id === item.id);
                    const totalQty = allForItem.reduce((s, c) => s + c.qty, 0);
                    const myQty =
                      allForItem.find((c) => c.addedBy === myId)?.qty ?? 0;
                    const inCart = totalQty > 0;
                    const qty = totalQty;
                    const isJust = justAdded === item.id;
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        className={`relative flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 ${isJust ? "border-primary ring-2 ring-primary/25 bg-primary/5 dark:bg-primary/10" : inCart ? "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30" : "bg-white dark:bg-stone-800/60 border-stone-200 dark:border-orange-800/50"}`}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={getItemName(item, lang)}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover flex-shrink-0 cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxItem(item);
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-xl">
                            🍽️
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] sm:text-sm font-semibold text-foreground leading-snug line-clamp-2">
                            {getItemName(item, lang)}
                          </p>
                          {getItemDesc(item, lang) && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                              {getItemDesc(item, lang)}
                            </p>
                          )}
                          {item.specialDiscount && item.specialType ? (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                                ⭐ Today's Special
                              </span>
                              <span className="text-[11px] text-muted-foreground line-through">
                                {parsePrice(item.price)} DEN
                              </span>
                              <span className="text-[13px] sm:text-sm font-bold text-amber-500">
                                {getSpecialPrice(item)}{" "}
                                <span className="text-[10px] font-normal">
                                  DEN
                                </span>
                              </span>
                              <span className="text-[10px] font-bold text-red-500">
                                -
                                {item.specialType === "percent"
                                  ? `${item.specialDiscount}%`
                                  : `${item.specialDiscount} DEN`}
                              </span>
                            </div>
                          ) : (
                            <p className="text-[13px] sm:text-sm font-bold text-primary mt-1">
                              {parsePrice(item.price)}{" "}
                              <span className="text-[10px] text-muted-foreground font-normal">
                                DEN
                              </span>
                            </p>
                          )}
                        </div>
                        {!menuOnly && (
                          <div className="flex-shrink-0">
                            <AnimatePresence mode="wait">
                              {qty > 0 ? (
                                <motion.div
                                  key="stepper"
                                  initial={{ scale: 0.85, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.85, opacity: 0 }}
                                  transition={{ duration: 0.12 }}
                                  className="flex items-center gap-1 bg-muted rounded-xl px-1.5 py-1"
                                >
                                  <button
                                    data-testid={`button-decrease-${item.id}`}
                                    onClick={() => updateQty(item.id, -1, myId)}
                                    disabled={myQty === 0}
                                    className="h-7 w-7 rounded-lg flex items-center justify-center active:bg-black/10 dark:active:bg-white/10 disabled:opacity-30"
                                  >
                                    <Minus className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                  <span className="text-sm font-bold text-foreground w-5 text-center">
                                    {qty}
                                  </span>
                                  <button
                                    data-testid={`button-increase-${item.id}`}
                                    onClick={() => addItem(item)}
                                    className="h-7 w-7 rounded-lg flex items-center justify-center active:bg-black/10 dark:active:bg-white/10"
                                  >
                                    <Plus className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                </motion.div>
                              ) : (
                                <motion.button
                                  key="add"
                                  initial={{ scale: 0.85, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.85, opacity: 0 }}
                                  whileTap={{ scale: 0.88 }}
                                  transition={{ duration: 0.12 }}
                                  data-testid={`button-add-${item.id}`}
                                  onClick={() => addItem(item)}
                                  className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm active:brightness-90 transition-all"
                                >
                                  <Plus className="h-4 w-4 text-primary-foreground" />
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              <AnimatePresence>
                {itemCount > 0 && !menuOnly && (
                  <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    className="flex-shrink-0 px-4 pt-3 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-t border-border"
                    style={{
                      paddingBottom:
                        "max(16px, env(safe-area-inset-bottom, 16px))",
                    }}
                  >
                    <button
                      data-testid="button-open-cart"
                      onClick={() => setView("cart")}
                      className="w-full rounded-2xl bg-primary flex items-center justify-between px-5 active:bg-primary/90 transition-colors shadow-md"
                      style={{ height: 52 }}
                    >
                      <span className="h-6 w-6 rounded-full bg-white/25 text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {itemCount}
                      </span>
                      <span className="text-sm font-bold text-primary-foreground">
                        {tr.viewCart}
                      </span>
                      <span className="text-sm font-bold text-primary-foreground/80 font-mono">
                        {total} DEN
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {view === "cart" && (
            <motion.div
              key="cart"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 flex flex-col overflow-hidden bg-background"
            >
              <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white dark:bg-stone-900 border-b border-border">
                <button
                  data-testid="button-back-to-menu"
                  onClick={() => setView("menu")}
                  className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center active:bg-muted/70 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {tr.cart}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
                    {tr.table} {displayTable} · {tr.cartItems(itemCount)}
                  </p>
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto overscroll-contain min-h-0"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div
                  className="p-4 space-y-2.5 max-w-2xl mx-auto w-full"
                  style={{ paddingBottom: 24 }}
                >
                  {fullCart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                      <ShoppingBag className="h-12 w-12 text-muted-foreground/25" />
                      <p className="text-sm text-muted-foreground">
                        {tr.emptyCart}
                      </p>
                      <Button
                        variant="outline"
                        className="rounded-xl border-primary/30 text-primary hover:bg-primary/5"
                        onClick={() => setView("menu")}
                      >
                        {tr.addItems}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 pb-1 font-mono">
                        {tr.yourOrder(displayTable)}
                      </p>
                      {(() => {
                        const uniqueIds = Array.from(
                          new Set(
                            fullCart.map((i) => i.addedBy).filter(Boolean),
                          ),
                        );
                        const personColor = (id?: string) =>
                          id != null
                            ? PERSON_COLORS[
                                uniqueIds.indexOf(id) % PERSON_COLORS.length
                              ]
                            : null;
                        return fullCart.map((item) => {
                          const menuItem = menuItems.find(
                            (m) => m.id === item.id,
                          );
                          const displayName = menuItem
                            ? getItemName(menuItem, lang)
                            : item.name;
                          const color = personColor(item.addedBy);
                          const isMe = item.addedBy === myId;
                          const isInSession = sessionOrder.some(
                            (s) =>
                              s.id === item.id && s.addedBy === item.addedBy,
                          );
                          const isInCart = cart.some(
                            (c) =>
                              c.id === item.id && c.addedBy === item.addedBy,
                          );
                          const isLocked = isInSession && !isInCart;
                          const canSwipe = !isLocked;

                          return (
                            <SwipeToDelete
                              key={`${item.id}-${item.addedBy ?? "shared"}`}
                              onDelete={() =>
                                updateQty(item.id, -item.qty, item.addedBy)
                              }
                              disabled={!canSwipe}
                            >
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="flex items-center gap-3 p-3.5 bg-white dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-orange-800/50"
                              >
                                {color && (
                                  <div
                                    className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${color.dot}`}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                      {displayName}
                                    </p>
                                    {isMe && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-muted text-muted-foreground">
                                        {tr.splitYou}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-primary font-mono mt-0.5">
                                    {item.price} × {item.qty} ={" "}
                                    <span className="font-bold">
                                      {item.price * item.qty}
                                    </span>{" "}
                                    DEN
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 bg-muted rounded-xl px-1.5 py-1 flex-shrink-0">
                                  <button
                                    data-testid={`button-cart-decrease-${item.id}`}
                                    onClick={() => {
                                      if (isLocked) {
                                        const msg =
                                          lang === "al"
                                            ? "Ky artikull është porositur tashmë."
                                            : lang === "mk"
                                              ? "Овој артикл е веќе нарачан."
                                              : "This item is already ordered.";
                                        alert(msg);
                                        return;
                                      }
                                      updateQty(item.id, -1, item.addedBy);
                                    }}
                                    className="h-7 w-7 rounded-lg flex items-center justify-center active:bg-black/10 dark:active:bg-white/10"
                                  >
                                    {isLocked ? (
                                      <Lock className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <Minus className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </button>
                                  <span className="text-sm font-bold text-foreground w-5 text-center font-mono">
                                    {item.qty}
                                  </span>
                                  <button
                                    data-testid={`button-cart-increase-${item.id}`}
                                    onClick={() => {
                                      if (isLocked) {
                                        const msg =
                                          lang === "al"
                                            ? "Ky artikull është porositur tashmë."
                                            : lang === "mk"
                                              ? "Овој артикл е веќе нарачан."
                                              : "This item is already ordered.";
                                        alert(msg);
                                        return;
                                      }
                                      updateQty(item.id, 1, item.addedBy);
                                    }}
                                    className="h-7 w-7 rounded-lg flex items-center justify-center active:bg-black/10 dark:active:bg-white/10"
                                  >
                                    {isLocked ? (
                                      <Lock className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <Plus className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            </SwipeToDelete>
                          );
                        });
                      })()}
                    </>
                  )}
                </div>
              </div>

              {fullCart.length > 0 && (
                <div
                  className="flex-shrink-0 px-4 pt-3 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-t border-border space-y-3"
                  style={{
                    paddingBottom:
                      "max(16px, env(safe-area-inset-bottom, 16px))",
                  }}
                >
                  {/* Customer note */}
                  {!showNoteInput ? (
                    <button
                      type="button"
                      onClick={() => setShowNoteInput(true)}
                      className="w-full flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors text-left"
                    >
                      <span className="text-base leading-none">📝</span>
                      {lang === "al"
                        ? "Shto shënim..."
                        : lang === "mk"
                          ? "Додади забелешка..."
                          : "Add a note..."}
                    </button>
                  ) : (
                    <div className="relative">
                      <textarea
                        autoFocus
                        value={customerNote}
                        onChange={(e) => setCustomerNote(e.target.value)}
                        maxLength={200}
                        rows={3}
                        placeholder={
                          lang === "al"
                            ? "Shënime (p.sh. pa akull, alergjik ndaj arrave...)"
                            : lang === "mk"
                              ? "Забелешка (пр. без мраз, алергичен на орев...)"
                              : "Note (e.g. no ice, allergic to nuts...)"
                        }
                        className="w-full rounded-xl border border-primary/40 bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      {customerNote.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setShowNoteInput(false)}
                          className="absolute top-2 right-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}

                  {/* Total row */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm text-muted-foreground">
                      {tr.cartItems(itemCount)}
                    </span>
                    <span className="text-xl font-bold text-foreground font-mono">
                      {total}{" "}
                      <span className="text-sm text-muted-foreground font-sans font-normal">
                        DEN
                      </span>
                    </span>
                  </div>

                  {/* Action buttons row: Split Bill + Send Order */}
                  <div className="flex gap-3">
                    {/* 💸 Split Bill button */}
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSplitOpen(true)}
                      className="flex-shrink-0 h-[52px] px-5 rounded-2xl bg-muted border border-border flex items-center gap-2 active:bg-muted/70 transition-colors"
                    >
                      <Divide className="h-4 w-4 text-foreground flex-shrink-0" />
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                        {tr.splitBill}
                      </span>
                    </motion.button>

                    {/* 📤 Send Order button */}
                    <AnimatePresence mode="wait">
                      {orderConfirmedDone ? (
                        <motion.div
                          key="confirmed"
                          initial={{ scale: 0.92, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex-1 rounded-2xl bg-primary flex items-center justify-center gap-2 shadow-md"
                          style={{ height: 52 }}
                        >
                          <CheckCircle className="h-4 w-4 text-primary-foreground" />
                          <span className="text-sm font-bold text-primary-foreground">
                            {tr.orderConfirmed}
                          </span>
                        </motion.div>
                      ) : (
                        <motion.button
                          key="send"
                          data-testid="button-send-order"
                          whileTap={{ scale: 0.97 }}
                          disabled={orderConfirming || cart.length === 0}
                          onClick={handleSendOrder}
                          className="flex-1 rounded-2xl bg-foreground dark:bg-stone-100 flex items-center justify-center gap-2.5 active:opacity-80 transition-opacity shadow-md disabled:opacity-60"
                          style={{ height: 52 }}
                        >
                          {orderConfirming ? (
                            <>
                              <Loader2 className="h-4 w-4 text-background dark:text-stone-900 animate-spin" />
                              <span className="text-sm font-bold text-background dark:text-stone-900">
                                {tr.confirmingOrder}
                              </span>
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 text-background dark:text-stone-900" />
                              <span className="text-sm font-bold text-background dark:text-stone-900">
                                {tr.sendOrder}
                              </span>
                            </>
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 🔔 Secondary Call Waiter button */}
                  <motion.button
                    data-testid="button-call-waiter-cart"
                    onClick={() => setWaiterSheetOpen(true)}
                    whileTap={{ scale: 0.97 }}
                    disabled={orderConfirmedDone}
                    className="w-full h-10 rounded-xl border border-border bg-transparent flex items-center justify-center gap-2 active:bg-muted/60 transition-colors disabled:opacity-40"
                  >
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      {tr.callWaiter}
                    </span>
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showLangPicker && restaurant && (
        <LangPickerScreen
          restaurantName={restaurant.name}
          onPick={(picked) => {
            setLang(picked);
            localStorage.setItem("hajdeha_lang", picked);
            localStorage.setItem("hajdeha_lang_chosen", "1");
            setShowLangPicker(false);
          }}
        />
      )}

      {!showLangPicker && showTutorial && (
        <TutorialOverlay
          lang={lang}
          onDone={() => {
            localStorage.setItem("hajdeha_tutorial_seen", "1");
            setShowTutorial(false);
          }}
        />
      )}

      {/* ── Image Lightbox ── */}
      {lightboxItem &&
        (() => {
          const lbQty = cart.reduce(
            (s, i) => (i.id === lightboxItem.id ? s + i.qty : s),
            0,
          );
          const lbMyQty =
            cart.find((i) => i.id === lightboxItem.id && i.addedBy === myId)
              ?.qty ?? 0;
          return (
            <div
              className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-6"
              style={{
                backdropFilter: "blur(16px)",
                backgroundColor: "rgba(0,0,0,0.65)",
              }}
              onClick={() => setLightboxItem(null)}
            >
              <div
                className="w-full sm:max-w-sm bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border-2 border-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <img
                    src={lightboxItem.imageUrl!}
                    alt={getItemName(lightboxItem, lang)}
                    className="w-full max-h-[55vh] object-contain bg-black"
                  />
                  <button
                    className="absolute top-3 right-3 text-white bg-black/40 rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black/70 transition-colors"
                    onClick={() => setLightboxItem(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 leading-tight">
                    {getItemName(lightboxItem, lang)}
                  </h2>
                  {getItemDesc(lightboxItem, lang) && (
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">
                      {getItemDesc(lightboxItem, lang)}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    {lightboxItem.specialDiscount &&
                    lightboxItem.specialType ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                            ⭐ Today's Special
                          </span>
                          <span className="text-[11px] font-bold text-red-500">
                            -
                            {lightboxItem.specialType === "percent"
                              ? `${lightboxItem.specialDiscount}%`
                              : `${lightboxItem.specialDiscount} DEN`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-stone-400 line-through text-sm">
                            {parsePrice(lightboxItem.price)} DEN
                          </span>
                          <span className="text-amber-500 font-bold text-xl">
                            {getSpecialPrice(lightboxItem)} DEN
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-primary font-bold text-xl">
                        {lightboxItem.price
                          ? `${parsePrice(lightboxItem.price)} DEN`
                          : ""}
                      </p>
                    )}
                    {!menuOnly && (
                      <AnimatePresence mode="wait">
                        {lbQty > 0 ? (
                          <motion.div
                            key="stepper"
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="flex items-center gap-2 bg-muted rounded-2xl px-2 py-1.5"
                          >
                            <button
                              onClick={() =>
                                updateQty(lightboxItem.id, -1, myId)
                              }
                              disabled={lbMyQty === 0}
                              className="h-8 w-8 rounded-xl flex items-center justify-center active:bg-black/10 dark:active:bg-white/10 disabled:opacity-30"
                            >
                              <Minus className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <span className="text-base font-bold text-foreground w-6 text-center">
                              {lbQty}
                            </span>
                            <button
                              onClick={() => addItem(lightboxItem)}
                              className="h-8 w-8 rounded-xl flex items-center justify-center active:bg-black/10 dark:active:bg-white/10"
                            >
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="add"
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            whileTap={{ scale: 0.88 }}
                            transition={{ duration: 0.12 }}
                            onClick={() => addItem(lightboxItem)}
                            className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-sm active:brightness-90 transition-all"
                          >
                            <Plus className="h-5 w-5 text-primary-foreground" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
