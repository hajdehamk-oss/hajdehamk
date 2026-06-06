/// <reference types="w3c-web-usb" />
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Pusher from "pusher-js";
import {
  Plus,
  Minus,
  Coffee,
  CheckCircle,
  Clock,
  Receipt,
  ChevronLeft,
  ShoppingBag,
  UserPlus,
  X,
  User,
  Bell,
  Sun,
  Moon,
  ArrowRightLeft,
  Merge,
  LayoutGrid,
  Divide,
  Printer,
  ClipboardList,
  KeyRound,
  ChefHat,
} from "lucide-react";

interface MenuItem {
  id: number;
  name: string;
  nameAl?: string | null;
  nameMk?: string | null;
  price: string;
  category: string;
  active: boolean;
  specialDiscount?: number | null;
  specialType?: string | null;
}

function getMenuItemSpecialPrice(item: MenuItem): number | null {
  if (!item.specialDiscount || !item.specialType) return null;
  const base = parsePrice(item.price);
  if (item.specialType === "percent")
    return Math.round(base * (1 - item.specialDiscount / 100));
  if (item.specialType === "fixed")
    return Math.max(0, base - item.specialDiscount);
  return null;
}

interface OrderItem {
  id: number;
  name: string;
  nameAl?: string;
  nameMk?: string;
  price: number;
  qty: number;
  discount?: number;
}

interface OrderRound {
  items: OrderItem[];
  sentAt: number;
}

interface TableOrder {
  items: OrderItem[];
  rounds: OrderRound[];
  startedAt: Date | null;
  section?: string;
  waiterId?: number;
  waiterName?: string;
  customerNote?: string | null;
}

interface PersonTab {
  name: string;
  items: OrderItem[];
  startedAt: Date | null;
}

interface Restaurant {
  id: number;
  name: string;
  menuItems: MenuItem[];
  tableCount?: number;
  sections?: string[];
}

interface TableSection {
  name: string;
  tables: number[];
}

interface SplitPerson {
  name: string;
  colorIdx: number;
  paid: boolean;
  payMethod: "cash" | "card" | null;
}

const SPLIT_COLORS = [
  {
    bg: "bg-blue-500/20",
    border: "border-blue-500/50",
    text: "text-blue-400",
    dot: "bg-blue-500",
  },
  {
    bg: "bg-rose-500/20",
    border: "border-rose-500/50",
    text: "text-rose-400",
    dot: "bg-rose-500",
  },
  {
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/50",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-purple-500/20",
    border: "border-purple-500/50",
    text: "text-purple-400",
    dot: "bg-purple-500",
  },
  {
    bg: "bg-amber-500/20",
    border: "border-amber-500/50",
    text: "text-amber-400",
    dot: "bg-amber-500",
  },
  {
    bg: "bg-pink-500/20",
    border: "border-pink-500/50",
    text: "text-pink-400",
    dot: "bg-pink-500",
  },
];

const emptyTable = (): TableOrder => ({
  items: [],
  rounds: [],
  startedAt: null,
  waiterId: undefined,
  waiterName: undefined,
  customerNote: null,
});

function parsePrice(price: string): number {
  return parseInt(price.replace(/[^0-9]/g, "")) || 0;
}

const ep = (item: OrderItem): number =>
  item.discount
    ? Math.round(item.price * (1 - item.discount / 100))
    : item.price;

type ActiveSlot =
  | { kind: "table"; idx: number }
  | { kind: "person"; idx: number }
  | null;
type Screen = "tables" | "menu" | "order";

interface IncomingOrder {
  id: string;
  tableNumber: number | string;
  cart: OrderItem[];
  timestamp: number;
  roundNumber: number;
}

interface WaiterSignal {
  id: string;
  tableNumber: number | string;
  type: "help" | "bill-cash" | "bill-card";
  timestamp: number;
}

interface POSProps {
  slug: string;
}

const defaultSections: TableSection[] = [
  { name: "Indoor", tables: [] },
  { name: "Outdoor", tables: [] },
  { name: "Bar", tables: [] },
];

// ─── Translations ─────────────────────────────────────────────────────────────
const posTranslations = {
  en: {
    addItems: "ADD ITEMS",
    orderScreen: "ORDER",
    printerConnected: "Printer connected — click to disconnect",
    connectPrinter: "Connect thermal printer",
    transferTable: "Transfer Table",
    mergeTables: "Merge Tables",
    sections: "Sections",
    allSections: "All Sections",
    totalOpen: "TOTAL OPEN",
    orderDot: "Order",
    persons: "PERSONS",
    newBtn: "New",
    noActivePersons: "No active persons",
    activeLabel: "ACTIVE",
    pay: "Pay",
    paidBtn: "✓ Paid",
    paidCheck: "Paid ✓",
    cancel: "Cancel",
    splitBill: "Split Bill",
    addPerson: "Add Person",
    assignItems: "ASSIGN EACH ITEM TO A PERSON",
    checkout: "CHECKOUT",
    unassigned: "Unassigned:",
    nothingAssigned: "Nothing assigned",
    allPaid: "All Paid!",
    tableCleared: "Table cleared",
    transferTitle: "Transfer Table",
    transferFromHint: "Select source table (table to move FROM)",
    mergeTitle: "Merge Tables",
    mergeFirstHint: "Select first table to merge",
    tableSections: "Table Sections",
    assignTablesHint: "Select a section, then tap tables to assign them",
    unassignedLabel: "UNASSIGNED",
    saveSections: "Save sections",
    newPersonTitle: "New Person",
    enterNameHint: "Enter the person's name",
    namePlaceholder: "e.g. John, Mary, Person1…",
    create: "Create",
    enterPinContinue: "Enter your PIN to continue",
    enterPinClaim: "Enter your PIN to claim the table",
    pinPlaceholder: "3-digit PIN",
    enterBtn: "Enter",
    newOrder: "New Order",
    orderLabel: "Order",
    tableTag: "TABLE",
    claimOrder: "Claim Order",
    confirmClaim: "Confirm & Claim Order",
    confirm: "Confirm",
    enterYourPin: "ENTER YOUR PIN",
    cashBill: "Cash Bill",
    cardBill: "Card Bill",
    needHelp: "Need help",
    ordersTitle: "Orders",
    activeCount: "active",
    noOrdersYet: "No orders yet",
    statusPending: "Pending",
    statusClaimed: "Claimed",
    statusDone: "Done",
    claimOrderBtn: "Claim Order",
    markDone: "✓ Mark as done",
    wrongPin: "Wrong PIN",
    networkError: "Network error",
    error: "Error",
    thisTableBelongsTo: (name: string) => `This table belongs to ${name}`,
    transferToHint: (n: number) =>
      `Select destination table (move T${n} TO...)`,
    mergeSecondHint: (n: number) =>
      `Select second table to merge T${n} with...`,
    receiptTagline: "Receipt",
    waiter: "Waiter",
    round: "Round",
    orderNum: "Order",
    openedAt: "Opened at",
    duration: "Duration",
    itemsLabel: "Items",
    pcs: "pcs",
    opened: "Opened:",
    closed: "Closed:",
    thanks: "Thank you for your visit!",
    cash: "Cash",
    card: "Card",
    paid: "Paid",
    porosiLabel: "ORDER",
    sendKitchen: "Send to Kitchen",
    kitchenSent: "Sent!",
  },
  al: {
    addItems: "SHTO",
    orderScreen: "POROSI",
    printerConnected: "Printer i lidhur — kliko për të shkëputur",
    connectPrinter: "Lidhu me printer termik",
    transferTable: "Transfero Tavolinën",
    mergeTables: "Bashko Tavolinat",
    sections: "Seksione",
    allSections: "Të gjitha",
    totalOpen: "TOTAL I HAPUR",
    orderDot: "Porosi",
    persons: "PERSONAT",
    newBtn: "Krijo",
    noActivePersons: "Nuk ka persona aktiv",
    activeLabel: "AKTIV",
    pay: "Paguaj",
    paidBtn: "✓ Paguar",
    paidCheck: "Paguar ✓",
    cancel: "Anulo",
    splitBill: "Ndaj Faturën",
    addPerson: "Shto Person",
    assignItems: "CAKTO ÇDO ARTIKULL",
    checkout: "ARKË",
    unassigned: "Pa caktuar:",
    nothingAssigned: "Asgjë e caktuar",
    allPaid: "Të gjithë paguan!",
    tableCleared: "Tavolina u pastrua",
    transferTitle: "Transfero Tavolinën",
    transferFromHint: "Zgjidhni tabelën burimore (lëvize NGA)",
    mergeTitle: "Bashko Tavolinat",
    mergeFirstHint: "Zgjidhni tabelën e parë për t'u bashkuar",
    tableSections: "Seksionet e Tavolinave",
    assignTablesHint: "Zgjidhni seksionin, pastaj shtypni tavolinat",
    unassignedLabel: "PA SEKSION",
    saveSections: "Ruaj seksionet",
    newPersonTitle: "Person i Ri",
    enterNameHint: "Shkruaj emrin e personit",
    namePlaceholder: "p.sh. Besart, Mirem, Person1…",
    create: "Krijo",
    enterPinContinue: "Futni PIN-in tuaj për të vazhduar",
    enterPinClaim: "Futni PIN-in tuaj për të marrë tavolinën",
    pinPlaceholder: "PIN 3-shifror",
    enterBtn: "Hyr",
    newOrder: "Porosi e Re",
    orderLabel: "Porosi",
    tableTag: "TAVOLINA",
    claimOrder: "Merr Porosinë",
    confirmClaim: "Konfirmo dhe Merr Porosinë",
    confirm: "Konfirmo",
    enterYourPin: "FUTNI PIN-IN TUAJ",
    cashBill: "Faturë Kesh",
    cardBill: "Faturë Kartë",
    needHelp: "Keni nevojë",
    ordersTitle: "Porositë",
    activeCount: "aktive",
    noOrdersYet: "Nuk ka porosi ende",
    statusPending: "Pret",
    statusClaimed: "Marrë",
    statusDone: "Kryer",
    claimOrderBtn: "Merr Porosinë",
    markDone: "✓ Shëno si të kryer",
    wrongPin: "PIN i gabuar",
    networkError: "Gabim rrjeti",
    error: "Gabim",
    thisTableBelongsTo: (name: string) => `Kjo tryezë i takon ${name}`,
    transferToHint: (n: number) => `Zgjidhni destinacionin (Lëviz T${n} TE...)`,
    mergeSecondHint: (n: number) =>
      `Zgjidhni tabelën e dytë (Bashko T${n} me...)`,
    receiptTagline: "Faturë",
    waiter: "Kamarier",
    round: "Rund",
    orderNum: "Porosi",
    openedAt: "Hapur në",
    duration: "Kohëzgjatja",
    itemsLabel: "Artikujt",
    pcs: "copë",
    opened: "Hapur:",
    closed: "Mbyllur:",
    thanks: "Faleminderit për vizitën!",
    cash: "Kesh",
    card: "Kartë",
    paid: "Paguar",
    porosiLabel: "POROSI",
    sendKitchen: "Dërgo në Kuzhinë",
    kitchenSent: "Dërguar!",
  },
  mk: {
    addItems: "ДОДАЈ",
    orderScreen: "НАРАЧКА",
    printerConnected: "Принтер поврзан — клик за исклучување",
    connectPrinter: "Поврзи термален принтер",
    transferTable: "Префрли маса",
    mergeTables: "Спои маси",
    sections: "Секции",
    allSections: "Сите",
    totalOpen: "ВКУПНО ОТВОРЕНО",
    orderDot: "Нарачка",
    persons: "ЛИЦА",
    newBtn: "Ново",
    noActivePersons: "Нема активни лица",
    activeLabel: "АКТИВНИ",
    pay: "Плати",
    paidBtn: "✓ Платено",
    paidCheck: "Платено ✓",
    cancel: "Откажи",
    splitBill: "Сплит",
    addPerson: "Додај лице",
    assignItems: "ДОДЕЛИ СЕКОЈА СТАВКА НА ЛИЦЕ",
    checkout: "КАСА",
    unassigned: "Недоделено:",
    nothingAssigned: "Ништо доделено",
    allPaid: "Сите платиле!",
    tableCleared: "Масата е исчистена",
    transferTitle: "Префрли маса",
    transferFromHint: "Изберете изворна маса (маса за преместување ОД)",
    mergeTitle: "Спои маси",
    mergeFirstHint: "Изберете прва маса за спојување",
    tableSections: "Секции на маси",
    assignTablesHint: "Изберете секција, потоа допрете маси за доделување",
    unassignedLabel: "НЕДОДЕЛЕНО",
    saveSections: "Зачувај секции",
    newPersonTitle: "Ново лице",
    enterNameHint: "Внеси го името",
    namePlaceholder: "пр. Бесарт, Мирем, Лице1…",
    create: "Креирај",
    enterPinContinue: "Внесете PIN за да продолжите",
    enterPinClaim: "Внесете PIN за да ја земете масата",
    pinPlaceholder: "PIN 3 цифри",
    enterBtn: "Влези",
    newOrder: "Нова нарачка",
    orderLabel: "Нарачка",
    tableTag: "МАСА",
    claimOrder: "Земи нарачка",
    confirmClaim: "Потврди и земи нарачка",
    confirm: "Потврди",
    enterYourPin: "ВНЕСЕТЕ ВАШ PIN",
    cashBill: "Сметка готовина",
    cardBill: "Сметка картичка",
    needHelp: "Потребна помош",
    ordersTitle: "Нарачки",
    activeCount: "активни",
    noOrdersYet: "Сè уште нема нарачки",
    statusPending: "Чека",
    statusClaimed: "Земена",
    statusDone: "Готова",
    claimOrderBtn: "Земи нарачка",
    markDone: "✓ Означи завршена",
    wrongPin: "Погрешен PIN",
    networkError: "Мрежна грешка",
    error: "Грешка",
    thisTableBelongsTo: (name: string) => `Оваа маса му припаѓа на ${name}`,
    transferToHint: (n: number) => `Изберете одредиште (помести T${n} КОН...)`,
    mergeSecondHint: (n: number) =>
      `Изберете втора маса за спојување со T${n}...`,
    receiptTagline: "Сметка",
    waiter: "Официант",
    round: "Рунда",
    orderNum: "Нарачка",
    openedAt: "Отворено во",
    duration: "Траење",
    itemsLabel: "Ставки",
    pcs: "ком",
    opened: "Отворено:",
    closed: "Затворено:",
    thanks: "Ви благодариме за посетата!",
    cash: "Готовина",
    card: "Картичка",
    paid: "Платено",
    porosiLabel: "НАРАЧКА",
    sendKitchen: "Испрати во Кујна",
    kitchenSent: "Испратено!",
  },
};
type PosLang = keyof typeof posTranslations;

const localName = (
  item: { name: string; nameAl?: string | null; nameMk?: string | null },
  lang: PosLang,
): string =>
  (lang === "al" ? item.nameAl : lang === "mk" ? item.nameMk : undefined) ||
  item.name;

// ─── ESC/POS Printer ──────────────────────────────────────────────────────────
function buildEscPosBytes({
  restaurantName,
  tableLabel,
  items,
  payMethod,
  lang,
}: {
  restaurantName: string;
  tableLabel: string;
  items: OrderItem[];
  payMethod?: "cash" | "card";
  lang?: PosLang;
}): Uint8Array {
  const COL = 42;
  const enc = new TextEncoder();
  const bytes: number[] = [];
  const push = (...vals: number[]) => bytes.push(...vals);
  const text = (s: string) => bytes.push(...enc.encode(s));
  const lf = () => bytes.push(0x0a);
  const dashes = () => {
    text("-".repeat(COL));
    lf();
  };
  const cols = (left: string, right: string) => {
    const max = COL - right.length - 1;
    const l = left.length > max ? left.slice(0, max - 1) + "…" : left;
    text(l + " ".repeat(COL - l.length - right.length) + right);
    lf();
  };
  push(0x1b, 0x40);
  push(0x1b, 0x61, 0x01);
  push(0x1b, 0x45, 0x01);
  push(0x1d, 0x21, 0x01);
  text(restaurantName);
  lf();
  push(0x1d, 0x21, 0x00);
  push(0x1b, 0x45, 0x00);
  push(0x1b, 0x61, 0x00);
  lf();
  dashes();
  const now = new Date();
  const dateStr = now.toLocaleDateString("sq-MK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("sq-MK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  cols(`${dateStr}  ${timeStr}`, tableLabel);
  dashes();
  const itemName = (item: OrderItem) =>
    (lang === "al" ? item.nameAl : lang === "mk" ? item.nameMk : undefined) ||
    item.name;
  for (const item of items) {
    const linePrice = ep(item) * item.qty;
    cols(
      `${item.qty}x ${itemName(item)}${item.discount ? ` (-${item.discount}%)` : ""}`,
      `${linePrice.toFixed(0)} DEN`,
    );
  }
  dashes();
  push(0x1b, 0x45, 0x01);
  const total = items.reduce((s, i) => s + ep(i) * i.qty, 0);
  cols("TOTAL", `${total.toFixed(0)} DEN`);
  push(0x1b, 0x45, 0x00);
  const rl = posTranslations[(lang as PosLang) || "en"];
  const methodLabel =
    payMethod === "cash" ? rl.cash : payMethod === "card" ? rl.card : rl.paid;
  text(methodLabel);
  lf();
  dashes();
  push(0x1b, 0x61, 0x01);
  text(rl.thanks);
  lf();
  lf();
  lf();
  lf();
  push(0x1d, 0x56, 0x42, 0x03);
  return new Uint8Array(bytes);
}

async function sendToUsbPrinter(
  device: USBDevice,
  data: Uint8Array,
): Promise<void> {
  try {
    await device.open();
  } catch {}
  if (device.configuration === null) await device.selectConfiguration(1);
  let interfaceNum = -1;
  let endpointNum = -1;
  for (const iface of device.configuration!.interfaces) {
    for (const ep of iface.alternate.endpoints) {
      if (ep.type === "bulk" && ep.direction === "out") {
        interfaceNum = iface.interfaceNumber;
        endpointNum = ep.endpointNumber;
        break;
      }
    }
    if (interfaceNum !== -1) break;
  }
  if (interfaceNum === -1) throw new Error("No bulk OUT endpoint found");
  try {
    await device.claimInterface(interfaceNum);
  } catch {}
  await device.transferOut(endpointNum, data.buffer as ArrayBuffer);
}

function printReceiptWindow({
  restaurantName,
  tableLabel,
  items,
  payMethod,
  waiterName,
  sectionName,
  roundNumber,
  startedAt,
  lang,
}: {
  restaurantName: string;
  tableLabel: string;
  items: OrderItem[];
  payMethod?: "cash" | "card";
  waiterName?: string;
  sectionName?: string;
  roundNumber?: number;
  startedAt?: Date | null;
  lang?: PosLang;
}) {
  const win = window.open(
    "",
    "_blank",
    "width=340,height=800,toolbar=0,scrollbars=0,status=0,menubar=0",
  );
  if (!win) return;
  const total = items.reduce((sum, item) => sum + ep(item) * item.qty, 0);
  const now = new Date();
  const dateStr = now.toLocaleDateString("sq-MK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("sq-MK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const rl2 = posTranslations[(lang as PosLang) || "en"];
  const methodLabel =
    payMethod === "cash"
      ? rl2.cash
      : payMethod === "card"
        ? rl2.card
        : rl2.paid;
  let durationStr = "";
  if (startedAt) {
    const mins = Math.floor(
      (now.getTime() - new Date(startedAt).getTime()) / 60000,
    );
    durationStr =
      mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
  const openedStr = startedAt
    ? new Date(startedAt).toLocaleTimeString("sq-MK", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const getItemName = (item: OrderItem) =>
    (lang === "al" ? item.nameAl : lang === "mk" ? item.nameMk : undefined) ||
    item.name;
  const rows = items
    .map(
      (item) =>
        `<tr><td class="item-qty">${item.qty}×</td><td class="item-name">${getItemName(item)}${item.discount ? ` <span style="color:#ef4444;font-size:10px">-${item.discount}%</span>` : ""}</td><td class="item-price">${(ep(item) * item.qty).toLocaleString()} DEN</td></tr>`,
    )
    .join("");

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Inter','Helvetica Neue',sans-serif;font-size:13px;font-weight:700;width:80mm;background:#fff;color:#000;-webkit-print-color-adjust:exact;}
.header{padding:20px 16px 14px;text-align:center;border-bottom:3px solid #000;}
.brand{font-size:26px;font-weight:900;letter-spacing:4px;text-transform:uppercase;margin-bottom:3px;}
.tagline{font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;}
.meta-strip{padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px dashed #000;}
.table-section{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:2px;}
.table-info{font-size:16px;font-weight:900;}
.datetime{text-align:right;font-size:11px;font-weight:700;line-height:1.7;}
.info-block{padding:10px 16px;border-bottom:1.5px dashed #000;display:flex;flex-direction:column;gap:5px;}
.info-row{display:flex;justify-content:space-between;font-size:11px;font-weight:700;}
.items-section{padding:12px 16px 8px;}
.items-label{font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #000;}
table{width:100%;border-collapse:collapse;}
.item-qty{width:22px;font-weight:700;vertical-align:top;padding:4px 0;font-size:12px;}
.item-name{padding:4px 8px 4px 2px;font-weight:700;vertical-align:top;font-size:12px;line-height:1.4;}
.item-price{text-align:right;white-space:nowrap;font-weight:800;vertical-align:top;padding:4px 0;font-size:12px;}
.total-block{margin:10px 16px;padding:12px 0;border-top:3px solid #000;border-bottom:3px solid #000;display:flex;justify-content:space-between;align-items:center;}
.total-label{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;}
.total-count{font-size:10px;font-weight:700;margin-top:3px;}
.total-amount{font-size:28px;font-weight:900;letter-spacing:-1px;}
.total-currency{font-size:13px;font-weight:700;margin-left:3px;}
.duration-row{margin:0 16px 10px;display:flex;justify-content:space-between;font-size:10px;font-weight:700;letter-spacing:0.5px;}
.footer{padding:14px 16px 20px;text-align:center;border-top:1.5px dashed #000;}
.thanks{font-size:14px;font-weight:900;letter-spacing:0.5px;margin-bottom:5px;}
.sub-footer{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;}
@media print{body{width:auto;max-width:80mm;margin:0 auto;}@page{size:auto;margin:8mm;}}
</style></head><body>
<div class="header"><div class="brand">${restaurantName}</div><div class="tagline">${rl2.receiptTagline}</div></div>
<div class="meta-strip">
  <div>${sectionName ? `<div class="table-section">${sectionName}</div>` : ""}<div class="table-info">${tableLabel}</div></div>
  <div class="datetime"><div>${dateStr}</div><div>${timeStr}</div></div>
</div>
<div class="info-block">
  ${waiterName ? `<div class="info-row"><span>${rl2.waiter}</span><span>${waiterName}</span></div>` : ""}
  ${roundNumber && roundNumber > 1 ? `<div class="info-row"><span>${rl2.round}</span><span>${rl2.orderNum} #${roundNumber}</span></div>` : ""}
  ${openedStr ? `<div class="info-row"><span>${rl2.openedAt}</span><span>${openedStr}</span></div>` : ""}
  ${durationStr ? `<div class="info-row"><span>${rl2.duration}</span><span>${durationStr}</span></div>` : ""}
</div>
<div class="items-section">
  <div class="items-label">${rl2.itemsLabel} · ${items.reduce((s, i) => s + i.qty, 0)} ${rl2.pcs}</div>
  <table>${rows}</table>
</div>
<div class="total-block">
  <div><div class="total-label">Total</div><div class="total-count">${items.reduce((s, i) => s + i.qty, 0)} ${rl2.itemsLabel}</div></div>
  <div><span class="total-amount">${total.toLocaleString()}</span><span class="total-currency">DEN</span></div>
</div>
${openedStr && durationStr ? `<div class="duration-row"><span>${rl2.opened} ${openedStr}</span><span>⏱ ${durationStr}</span><span>${rl2.closed} ${timeStr}</span></div>` : ""}
<div class="footer"><div class="thanks">${rl2.thanks}</div><div class="sub-footer">${rl2.receiptTagline}</div></div>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.onafterprint = () => win.close();
    setTimeout(() => win.close(), 4000);
  }, 400);
}

// ─── Waiter chime (3 distinct tones) ─────────────────────────────────────────
function playWaiterChime(type: WaiterSignal["type"]) {
  try {
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.55, ctx.currentTime);
    master.connect(ctx.destination);
    const notes: [number, number, number][] =
      type === "help"
        ? [
            [880, 0, 0.18],
            [660, 0.2, 0.28],
            [660, 0.42, 0.28],
          ]
        : type === "bill-cash"
          ? [
              [660, 0, 0.16],
              [880, 0.18, 0.16],
              [1108, 0.36, 0.28],
            ]
          : [
              [660, 0, 0.16],
              [990, 0.18, 0.16],
              [1320, 0.36, 0.28],
            ];
    notes.forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + dur,
      );
      osc.connect(gain);
      gain.connect(master);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

// ─── Incoming order chime ─────────────────────────────────────────────────────
function playIncomingChime() {
  try {
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Soft hotel front-desk bell: warm sine + gentle overtone, long natural decay
    function softDing(startTime: number) {
      const pairs: [number, number][] = [
        [784, 0.45], // G5 — warm fundamental
        [1568, 0.1], // G6 — subtle octave overtone
      ];
      pairs.forEach(([freq, vol]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 3.0);
      });
    }

    // 3 gentle dings spaced 1.2 seconds apart
    softDing(now + 0.0);
    softDing(now + 1.2);
    softDing(now + 2.4);

    setTimeout(() => ctx.close(), 6000);
  } catch {}
}
// ─── Waiter chime — 3 distinct tones for help / cash bill / card bill ─────────
// ─── Waiter chime — 3 distinct tones for help / cash bill / card bill ─────────

// ─── safeParseCart ────────────────────────────────────────────────────────────
function safeParseCart(cart: any): any[] {
  if (Array.isArray(cart)) return cart;
  if (typeof cart === "string") {
    try {
      return JSON.parse(cart);
    } catch {
      return [];
    }
  }
  return [];
}

// ─── Radial Quick-Add Menu ────────────────────────────────────────────────────
interface RadialMenuProps {
  x: number;
  y: number;
  onSelect: (qty: number) => void;
  onClose: () => void;
  isLight: boolean;
}

function RadialMenu({ x, y, onSelect, onClose, isLight }: RadialMenuProps) {
  const options = [1, 2, 3, 4];
  const positions = [
    { dx: 0, dy: -70 },
    { dx: -70, dy: 0 },
    { dx: 70, dy: 0 },
    { dx: 0, dy: 70 },
  ];
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <>
      <div
        className="fixed inset-0 z-[200]"
        style={{ backdropFilter: "blur(2px)" }}
        onPointerMove={(e) => {
          const dx = e.clientX - x;
          const dy = e.clientY - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 22) {
            setHovered(null);
            return;
          }
          let best = 0,
            bestDist = 9999;
          positions.forEach(({ dx: px, dy: py }, i) => {
            const d = Math.sqrt(
              (e.clientX - (x + px)) ** 2 + (e.clientY - (y + py)) ** 2,
            );
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          });
          setHovered(best);
        }}
        onPointerUp={() => {
          if (hovered !== null) onSelect(options[hovered]);
          else onClose();
        }}
        onPointerLeave={onClose}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div
        className="fixed z-[201] pointer-events-none"
        style={{ left: x, top: y }}
      >
        <svg
          className="absolute"
          style={{
            left: -80,
            top: -80,
            width: 160,
            height: 160,
            overflow: "visible",
          }}
        >
          {positions.map(({ dx, dy }, i) => (
            <line
              key={i}
              x1={80}
              y1={80}
              x2={80 + dx}
              y2={80 + dy}
              stroke={hovered === i ? "#f59e0b" : "rgba(245,158,11,0.15)"}
              strokeWidth={hovered === i ? 2 : 1}
              strokeDasharray={hovered === i ? "none" : "4 4"}
              style={{ transition: "stroke 0.1s, stroke-width 0.1s" }}
            />
          ))}
        </svg>
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400"
          style={{
            left: 0,
            top: 0,
            width: 36,
            height: 36,
            background: isLight
              ? "rgba(255,255,255,0.9)"
              : "rgba(15,15,15,0.9)",
            boxShadow:
              "0 0 0 4px rgba(245,158,11,0.15), 0 8px 32px rgba(0,0,0,0.4)",
          }}
        />
        {options.map((qty, i) => {
          const { dx, dy } = positions[i];
          const active = hovered === i;
          return (
            <div
              key={qty}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-2xl"
              style={{
                left: dx,
                top: dy,
                width: active ? 56 : 48,
                height: active ? 56 : 48,
                background: active
                  ? "linear-gradient(135deg, #f59e0b, #b45309)"
                  : isLight
                    ? "rgba(255,255,255,0.97)"
                    : "rgba(22,20,18,0.97)",
                border: active
                  ? "2px solid rgba(245,158,11,0.8)"
                  : "1px solid rgba(245,158,11,0.25)",
                boxShadow: active
                  ? "0 8px 30px rgba(245,158,11,0.5), 0 0 0 3px rgba(245,158,11,0.15)"
                  : "0 4px 20px rgba(0,0,0,0.35)",
                transition: "all 0.12s cubic-bezier(0.34,1.56,0.64,1)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div style={{ textAlign: "center", lineHeight: 1 }}>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: active ? 16 : 14,
                    fontWeight: 700,
                    color: active ? "#000" : isLight ? "#1a1a1a" : "#fff",
                    transition: "all 0.12s",
                  }}
                >
                  ×{qty}
                </div>
                {active && (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: "rgba(0,0,0,0.5)",
                      fontFamily: "'DM Sans', sans-serif",
                      marginTop: 2,
                      letterSpacing: "0.05em",
                    }}
                  >
                    ADD
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Main POS Component ───────────────────────────────────────────────────────
export default function POS({ slug }: POSProps) {
  const RESTAURANT_SLUG = slug;
  const TABLES_KEY = `pos-${slug}-tables-v3`;
  const PERSONS_KEY = `pos-${slug}-persons-v1`;
  const SECTIONS_KEY = `pos-${slug}-sections-v1`;

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["pos-restaurant"],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants?slug=${RESTAURANT_SLUG}`);
      if (!res.ok) throw new Error("Restaurant not found");
      return res.json() as Promise<Restaurant>;
    },
    retry: false,
  });

  const TABLE_COUNT = restaurant?.tableCount || 6;

  const [sections, setSections] = useState<TableSection[]>(() => {
    try {
      const saved = localStorage.getItem(SECTIONS_KEY);
      if (saved) return JSON.parse(saved) as TableSection[];
    } catch {}
    return defaultSections;
  });

  const [draftSections, setDraftSections] = useState<TableSection[]>([]);
  const [activeDraftSection, setActiveDraftSection] =
    useState<string>("Indoor");
  const [discountItemId, setDiscountItemId] = useState<number | null>(null);
  const [discountInput, setDiscountInput] = useState("");

  const [tables, setTables] = useState<TableOrder[]>(() => {
    try {
      const saved = localStorage.getItem(TABLES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TableOrder[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return Array.from({ length: TABLE_COUNT }, emptyTable);
  });
  const tablesRef = useRef(tables);
  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  // ─── Live sync: stable per-tab device identity ────────────────────────────
  const deviceId = useRef<string>(() => {
    let id = sessionStorage.getItem("pos-device-id");
    if (!id) {
      id = Math.random().toString(36).slice(2);
      sessionStorage.setItem("pos-device-id", id);
    }
    return id;
  }).current as unknown as string;
  // Resolved lazily so sessionStorage is only read once on mount
  const deviceIdRef = useRef<string>("");
  useEffect(() => {
    let id = sessionStorage.getItem("pos-device-id");
    if (!id) {
      id = Math.random().toString(36).slice(2);
      sessionStorage.setItem("pos-device-id", id);
    }
    deviceIdRef.current = id;
  }, []);

  // Set to true while applying a remote Pusher update → prevents echo back to server
  const isSyncingFromRemote = useRef(false);
  // Only start broadcasting after initial server state has been loaded
  const serverSyncReady = useRef(false);
  // Debounce timer ref for server sync
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track last synced snapshot per table to avoid redundant requests
  const lastSyncedRef = useRef<string[]>([]);

  // Dedup ref — never merge  if (!dbOrders ||the same DB order twice
  const processedOrderIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    setTables((prev) => {
      if (prev.length === TABLE_COUNT) return prev;
      if (prev.length < TABLE_COUNT)
        return [
          ...prev,
          ...Array.from({ length: TABLE_COUNT - prev.length }, emptyTable),
        ];
      return prev.slice(0, TABLE_COUNT);
    });
  }, [TABLE_COUNT]);

  const [personTabs, setPersonTabs] = useState<PersonTab[]>(() => {
    try {
      const saved = localStorage.getItem(PERSONS_KEY);
      if (saved) return JSON.parse(saved) as PersonTab[];
    } catch {}
    return [];
  });

  const [incomingBanner, setIncomingBanner] = useState<IncomingOrder | null>(
    null,
  );
  const [readyBanners, setReadyBanners] = useState<
    { id: string; tableNumber: number }[]
  >([]);
  const [waiterSignals, setWaiterSignals] = useState<WaiterSignal[]>([]);
  const [tableFlash, setTableFlash] = useState<number | null>(null);
  const [waiterFlashTables, setWaiterFlashTables] = useState<
    Map<number, WaiterSignal["type"]>
  >(new Map());
  const [showOrdersPanel, setShowOrdersPanel] = useState(false);
  const [claimTarget, setClaimTarget] = useState<number | null>(null);
  const [pinDigits, setPinDigits] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimModalOrder, setClaimModalOrder] = useState<any>(null);

  const [showTablePinModal, setShowTablePinModal] = useState(false);
  const [tablePinSlot, setTablePinSlot] = useState<ActiveSlot>(null);
  const [tablePinDigits, setTablePinDigits] = useState("");
  const [tablePinError, setTablePinError] = useState("");
  const [tablePinLoading, setTablePinLoading] = useState(false);

  const restaurantId = restaurant?.id;
  const waitersQuery = useQuery({
    queryKey: ["/api/admin/waiters", restaurantId],
    queryFn: async () => {
      if (!restaurantId)
        return [] as { id: number; name: string; pinCode: string }[];
      const res = await fetch(
        `/api/admin/waiters?action=list&restaurantId=${restaurantId}`,
      );
      if (!res.ok) return [] as { id: number; name: string; pinCode: string }[];
      return res.json() as Promise<
        { id: number; name: string; pinCode: string }[]
      >;
    },
    enabled: !!restaurantId,
    staleTime: 60_000,
  });

  // Public check — works even when POS is not logged in
  const hasWaitersQuery = useQuery({
    queryKey: ["/api/waiters/check", RESTAURANT_SLUG],
    queryFn: async () => {
      const res = await fetch(`/api/waiters/check?slug=${RESTAURANT_SLUG}`);
      if (!res.ok) return { hasWaiters: false };
      return res.json() as Promise<{ hasWaiters: boolean }>;
    },
    enabled: !!RESTAURANT_SLUG,
    staleTime: 60_000,
  });

  const waiters = waitersQuery.data ?? [];
  const waitersFetched = hasWaitersQuery.isSuccess;
  const hasWaiters = hasWaitersQuery.data?.hasWaiters ?? false;

  const { data: dbOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["/api/orders", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const res = await fetch(`/api/orders?restaurantId=${restaurantId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  const { data: tableAssignmentsData = [], refetch: refetchAssignments } =
    useQuery({
      queryKey: ["/api/pos/table-assignments", restaurantId],
      queryFn: async () => {
        if (!restaurantId)
          return [] as {
            tableNumber: number;
            waiterId: number;
            waiterName: string;
          }[];
        const res = await fetch(
          `/api/pos/table-assignments?restaurantId=${restaurantId}`,
        );
        if (!res.ok)
          return [] as {
            tableNumber: number;
            waiterId: number;
            waiterName: string;
          }[];
        return res.json() as Promise<
          { tableNumber: number; waiterId: number; waiterName: string }[]
        >;
      },
      enabled: !!restaurantId,
      staleTime: 30_000,
    });

  const pendingCount = dbOrders.filter(
    (o: any) => o.status === "pending",
  ).length;
  // ─── Unlock audio on first user interaction ───────────────────────────────
  useEffect(() => {
    const unlock = () => {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      ctx.resume().then(() => ctx.close());
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
  // Hydrate table assignments from DB on load (so waiter claims survive refresh)
  useEffect(() => {
    if (!tableAssignmentsData.length) return;
    setTables((prev) => {
      let changed = false;
      const next = [...prev];
      tableAssignmentsData.forEach(({ tableNumber, waiterId, waiterName }) => {
        const idx = tableNumber - 1;
        if (idx < 0 || idx >= next.length) return;
        if (next[idx].waiterId !== waiterId) {
          next[idx] = { ...next[idx], waiterId, waiterName };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [tableAssignmentsData]);

  // Sync customerNote from DB orders → table state (so notes survive refresh)
  useEffect(() => {
    if (!dbOrders) return;
    (dbOrders as any[])
      .filter((o: any) => o.status === "pending" || o.status === "claimed")
      .forEach((order: any) => {
        const tableDigits = parseInt(
          String(order.tableNumber).replace(/\D/g, ""),
          10,
        );
        const tableIdx = tableDigits - 1;
        if (tableIdx < 0) return;
        const note = order.customerNote ?? null;
        setTables((prev) => {
          if (prev[tableIdx]?.customerNote === note) return prev;
          const next = [...prev];
          next[tableIdx] = {
            ...next[tableIdx],
            customerNote: note,
          };
          return next;
        });
      });
  }, [dbOrders]);

  // Sync DB orders → table grid (poll-based fallback, deduped)
  useEffect(() => {
    if (!dbOrders || dbOrders.length === 0) return;

    (dbOrders as any[])
      .filter(
        (o) =>
          o.status === "pending" && !processedOrderIdsRef.current.has(o.id),
      )
      .forEach((order: any) => {
        // Mark immediately so nothing else processes it
        processedOrderIdsRef.current.add(order.id);

        // Auto-claim if table already has a waiter
        const tableDigits = parseInt(
          String(order.tableNumber).replace(/\D/g, ""),
          10,
        );
        const tableIdx = tableDigits - 1;
        const existingWaiterId = tablesRef.current[tableIdx]?.waiterId;
        const existingWaiterPin = waiters.find(
          (w) => w.id === existingWaiterId,
        )?.pinCode;
        if (!existingWaiterId || !existingWaiterPin) return;

        fetch(`/api/orders/${order.id}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinCode: existingWaiterPin, restaurantId }),
        })
          .then(() => refetchOrders())
          .catch(() => {});
      });
  }, [dbOrders]);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSectionsModal, setShowSectionsModal] = useState(false);
  const [transferSource, setTransferSource] = useState<number | null>(null);
  const [mergeSource, setMergeSource] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("all");

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitTableIdx, setSplitTableIdx] = useState<number | null>(null);
  const [splitPersons, setSplitPersons] = useState<SplitPerson[]>([]);
  const [itemAssignments, setItemAssignments] = useState<(number | null)[]>([]);

  const THEME_KEY = `pos-${slug}-theme`;
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return "dark";
  });
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);
  const isLight = theme === "light";

  const [lang, setLang] = useState<PosLang>(() => {
    try {
      return (localStorage.getItem("hajdeha-lang") as PosLang) || "en";
    } catch {
      return "en";
    }
  });
  const handleLangChange = (newLang: PosLang) => {
    setLang(newLang);
    try {
      localStorage.setItem("hajdeha-lang", newLang);
    } catch {}
  };
  const tr = posTranslations[lang];

  const [usbDevice, setUsbDevice] = useState<USBDevice | null>(null);
  const [printerStatus, setPrinterStatus] = useState<
    "idle" | "printing" | "error"
  >("idle");
  const [radialMenu, setRadialMenu] = useState<{
    item: MenuItem;
    x: number;
    y: number;
  } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!("usb" in navigator)) return;
    (navigator as any).usb
      .getDevices()
      .then((devices: USBDevice[]) => {
        if (devices.length > 0) setUsbDevice(devices[0]);
      })
      .catch(() => {});
  }, []);

  const connectPrinter = async () => {
    if (!("usb" in navigator)) {
      alert("WebUSB not supported. Use Chrome or Edge.");
      return;
    }
    try {
      const device = await (navigator as any).usb.requestDevice({
        filters: [],
      });
      setUsbDevice(device);
    } catch (err: any) {
      if (err.name !== "NotFoundError")
        alert("Could not connect to printer. Try again.");
    }
  };

  const handlePrint = async (data: {
    restaurantName: string;
    tableLabel: string;
    items: OrderItem[];
    payMethod?: "cash" | "card";
    waiterName?: string;
    sectionName?: string;
    roundNumber?: number;
    startedAt?: Date | null;
  }) => {
    if (data.items.length === 0) return;
    if (usbDevice) {
      try {
        setPrinterStatus("printing");
        const bytes = buildEscPosBytes({ ...data, lang });
        await sendToUsbPrinter(usbDevice, bytes);
        setPrinterStatus("idle");
        return;
      } catch (err) {
        console.error("USB print failed, falling back:", err);
        setUsbDevice(null);
        setPrinterStatus("error");
        setTimeout(() => setPrinterStatus("idle"), 3000);
      }
    }
    printReceiptWindow({ ...data, lang });
  };

  // ─── Theme tokens ───────────────────────────────────────────────────────────
  const t = isLight
    ? {
        appBg: "bg-[#FAFAF9]",
        panelBg: "bg-white",
        text: "text-[#1A1A1A]",
        textSoft: "text-[#3A3A3A]",
        textMuted: "text-[#7A7A7A]",
        textFaint: "text-[#A8A8A8]",
        textDim: "text-[#BFBDB9]",
        border: "border-[#E8E6E3]",
        borderSoft: "border-[#EFEDEA]",
        borderDashed: "border-[#D8D4CF]",
        surface: "bg-[#F4F2EF]",
        surfaceSoft: "bg-[#EDEAE5]",
        surfaceHover: "hover:bg-[#ECE9E5]",
        chipInactive:
          "bg-[#EDEAE5] text-[#5A5A5A] hover:bg-[#E2DED9] hover:text-[#1A1A1A]",
        cartItemActive: "bg-amber-100 border-amber-400",
        cartItemInactive:
          "bg-[#F4F2EF] border-[#E8E6E3] hover:bg-[#EDEAE5] hover:border-[#D8D4CF]",
        backBtn: "bg-[#EDEAE5] hover:bg-[#E2DED9] text-[#1A1A1A]",
        modalBg: "bg-white",
        modalOverlay: "bg-black/50",
        inputBgStyle: "#F4F2EF",
        inputTextStyle: "#1A1A1A",
        inputBorder: "border-[#E0DDD8]",
        cancelBtn: "bg-[#EDEAE5] text-[#7A7A7A] hover:bg-[#E2DED9]",
        deletePersonBtn: "bg-[#EDEAE5] hover:bg-red-100 text-[#7A7A7A]",
        personIconEmpty: "bg-[#EDEAE5] text-[#A8A8A8]",
        qtyControlBg: "bg-[#EDEAE5]",
        qtyBtnText: "text-[#5A5A5A] hover:bg-[#D8D4CF]",
        actionBtn: "bg-blue-50 text-blue-600 hover:bg-blue-100",
        actionBtnAlt: "bg-purple-50 text-purple-600 hover:bg-purple-100",
      }
    : {
        appBg: "bg-[#0F0F0F]",
        panelBg: "bg-[#0B0B0B]",
        text: "text-white",
        textSoft: "text-white/85",
        textMuted: "text-white/40",
        textFaint: "text-white/25",
        textDim: "text-white/30",
        border: "border-white/10",
        borderSoft: "border-white/5",
        borderDashed: "border-white/10",
        surface: "bg-white/[0.04]",
        surfaceSoft: "bg-white/[0.08]",
        surfaceHover: "hover:bg-white/[0.06]",
        chipInactive:
          "bg-white/[0.06] text-white/40 hover:bg-white/[0.10] hover:text-white/60",
        cartItemActive: "bg-amber-500/15 border-amber-500/50",
        cartItemInactive:
          "bg-white/[0.04] border-white/10 hover:bg-white/[0.06] hover:border-white/15",
        backBtn: "bg-white/[0.08] hover:bg-white/[0.12] text-white",
        modalBg: "bg-[#1A1A1A]",
        modalOverlay: "bg-black/70",
        inputBgStyle: "#2A2A2A",
        inputTextStyle: "#FFFFFF",
        inputBorder: "border-white/12",
        cancelBtn: "bg-white/[0.08] text-white/50 hover:bg-white/[0.12]",
        deletePersonBtn: "bg-white/[0.06] hover:bg-red-500/20 text-white/30",
        personIconEmpty: "bg-white/[0.06] text-white/30",
        qtyControlBg: "bg-white/[0.06]",
        qtyBtnText:
          "text-white/50 hover:bg-white/[0.10] active:bg-white/[0.10]",
        actionBtn: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30",
        actionBtnAlt: "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30",
      };

  const statusColorsLight = {
    empty: {
      bg: "bg-[#F4F2EF]",
      border: "border-[#E8E6E3]",
      dot: "",
      text: "text-[#A8A8A8]",
      time: "text-[#A8A8A8]",
    },
    fresh: {
      bg: "bg-emerald-50",
      border: "border-emerald-300",
      dot: "bg-emerald-500",
      text: "text-[#1A1A1A]",
      time: "text-emerald-600",
    },
    mid: {
      bg: "bg-amber-50",
      border: "border-amber-300",
      dot: "bg-amber-500",
      text: "text-[#1A1A1A]",
      time: "text-amber-600",
    },
    late: {
      bg: "bg-red-50",
      border: "border-red-300",
      dot: "bg-red-500",
      text: "text-[#1A1A1A]",
      time: "text-red-600",
    },
    unclaimed: {
      bg: "bg-sky-50",
      border: "border-sky-300",
      dot: "bg-sky-500",
      text: "text-[#1A1A1A]",
      time: "text-sky-600",
    },
  };
  const statusColorsDark = {
    empty: {
      bg: "bg-white/[0.04]",
      border: "border-white/10",
      dot: "",
      text: "text-white/25",
      time: "text-white/20",
    },
    fresh: {
      bg: "bg-emerald-500/12",
      border: "border-emerald-500/35",
      dot: "bg-emerald-400",
      text: "text-white",
      time: "text-emerald-400",
    },
    mid: {
      bg: "bg-amber-500/15",
      border: "border-amber-400/45",
      dot: "bg-amber-400",
      text: "text-white",
      time: "text-amber-400",
    },
    late: {
      bg: "bg-red-500/15",
      border: "border-red-400/50",
      dot: "bg-red-400",
      text: "text-white",
      time: "text-red-400",
    },
    unclaimed: {
      bg: "bg-sky-500/15",
      border: "border-sky-400/50",
      dot: "bg-sky-400",
      text: "text-white",
      time: "text-sky-400",
    },
  };
  const dotColors = isLight
    ? {
        fresh: "bg-emerald-500",
        mid: "bg-amber-500",
        late: "bg-red-500",
        unclaimed: "bg-sky-500",
      }
    : {
        fresh: "bg-emerald-400",
        mid: "bg-amber-400",
        late: "bg-red-400",
        unclaimed: "bg-sky-400",
      };

  const [active, setActive] = useState<ActiveSlot>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [menuSearch, setMenuSearch] = useState("");
  const [screen, setScreen] = useState<Screen>("tables");
  const [payConfirm, setPayConfirm] = useState(false);
  const KITCHEN_KEY = `pos-${slug}-kitchen-snapshots-v1`;
  const [kitchenSentSnapshots, setKitchenSentSnapshots] = useState<
    Map<number, string>
  >(() => {
    try {
      const saved = localStorage.getItem(KITCHEN_KEY);
      if (saved) return new Map(JSON.parse(saved));
    } catch {}
    return new Map();
  });
  const [justPaid, setJustPaid] = useState<ActiveSlot>(null);
  const [pendingWaiter, setPendingWaiter] = useState<{
    id: number;
    name: string;
    tableIdx: number;
  } | null>(null);
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [, forceUpdate] = useState(0);

  const menuItems: MenuItem[] = useMemo(
    () => (restaurant?.menuItems || []).filter((i: MenuItem) => i.active),
    [restaurant],
  );
  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map((i) => i.category)));
    return ["All", ...cats];
  }, [menuItems]);
  const filteredItems = useMemo(() => {
    const byCategory =
      activeCategory === "All"
        ? menuItems
        : menuItems.filter((i) => i.category === activeCategory);
    if (!menuSearch.trim()) return byCategory;
    const q = menuSearch.trim().toLowerCase();
    return byCategory.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.nameAl ?? "").toLowerCase().includes(q) ||
        (i.nameMk ?? "").toLowerCase().includes(q),
    );
  }, [menuItems, activeCategory, menuSearch]);

  const currentOrder: TableOrder | PersonTab | null = useMemo(() => {
    if (!active) return null;
    if (active.kind === "table") return tables[active.idx] ?? null;
    return personTabs[active.idx] ?? null;
  }, [active, tables, personTabs]);

  const orderTotal = (o: TableOrder | PersonTab) =>
    o.items.reduce((s, i) => s + ep(i) * i.qty, 0);
  const orderCount = (o: TableOrder | PersonTab) =>
    o.items.reduce((s, i) => s + i.qty, 0);

  const elapsed = (o: TableOrder | PersonTab) => {
    if (!o.startedAt) return null;
    const mins = Math.floor(
      (Date.now() - new Date(o.startedAt).getTime()) / 60000,
    );
    if (mins < 1) return "< 1 min";
    if (mins < 60) return `${mins}min`;
    return `${Math.floor(mins / 60)}h${mins % 60}m`;
  };

  const handleTransfer = (sourceIdx: number, targetIdx: number) => {
    if (sourceIdx === targetIdx) return;
    setTables((prev) => {
      const next = [...prev];
      next[targetIdx] = {
        ...next[targetIdx],
        items: [...next[targetIdx].items, ...next[sourceIdx].items],
        startedAt: next[targetIdx].startedAt || next[sourceIdx].startedAt,
      };
      next[sourceIdx] = emptyTable();
      return next;
    });
    if (restaurantId)
      fetch("/api/pos/table-state/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableNumber: sourceIdx + 1,
          slug: RESTAURANT_SLUG,
          deviceId: deviceIdRef.current,
        }),
      }).catch(() => {});
    setShowTransferModal(false);
    setTransferSource(null);
    setTableFlash(targetIdx);
    setTimeout(() => setTableFlash(null), 2000);
  };

  const handleMerge = (sourceIdx: number, targetIdx: number) => {
    if (sourceIdx === targetIdx) return;
    setTables((prev) => {
      const next = [...prev];
      const merged = [...next[targetIdx].items];
      next[sourceIdx].items.forEach((si) => {
        const ex = merged.find((i) => i.id === si.id);
        if (ex) ex.qty += si.qty;
        else merged.push({ ...si });
      });
      next[targetIdx] = {
        ...next[targetIdx],
        items: merged,
        startedAt: next[targetIdx].startedAt || next[sourceIdx].startedAt,
      };
      next[sourceIdx] = emptyTable();
      return next;
    });
    if (restaurantId)
      fetch("/api/pos/table-state/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableNumber: sourceIdx + 1,
          slug: RESTAURANT_SLUG,
          deviceId: deviceIdRef.current,
        }),
      }).catch(() => {});
    setShowMergeModal(false);
    setMergeSource(null);
    setTableFlash(targetIdx);
    setTimeout(() => setTableFlash(null), 2000);
  };

  const getTableSection = (tableIdx: number): string => {
    const section = sections.find((s) => s.tables.includes(tableIdx));
    return section?.name || tr.tableTag;
  };

  const visibleTables = useMemo(() => {
    if (selectedSection === "all") return tables.map((_, idx) => idx);
    const section = sections.find((s) => s.name === selectedSection);
    return section?.tables || [];
  }, [selectedSection, sections, tables]);

  const addItem = (item: MenuItem) => {
    if (!active) return;
    const add = (order: TableOrder | PersonTab): TableOrder | PersonTab => {
      const items = [...order.items];
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + 1 };
      else
        items.push({
          id: item.id,
          name: item.name,
          nameAl: item.nameAl ?? undefined,
          nameMk: item.nameMk ?? undefined,
          price: getMenuItemSpecialPrice(item) ?? parsePrice(item.price),
          qty: 1,
        });
      return { ...order, items, startedAt: order.startedAt ?? new Date() };
    };
    if (active.kind === "table") {
      const wasEmpty = tables[active.idx].items.length === 0;
      setTables((prev) => {
        const next = [...prev];
        next[active.idx] = add(next[active.idx]) as TableOrder;
        if (
          wasEmpty &&
          pendingWaiter &&
          pendingWaiter.tableIdx === active.idx
        ) {
          next[active.idx] = {
            ...next[active.idx],
            waiterId: pendingWaiter.id,
            waiterName: pendingWaiter.name,
          };
        }
        return next;
      });
      if (
        wasEmpty &&
        pendingWaiter &&
        pendingWaiter.tableIdx === active.idx &&
        restaurantId
      ) {
        fetch("/api/pos/assign-table", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId,
            tableNumber: active.idx + 1,
            waiterId: pendingWaiter.id,
          }),
        }).catch(() => {});
        setPendingWaiter(null);
      }
    } else {
      setPersonTabs((prev) => {
        const next = [...prev];
        next[active.idx] = add(next[active.idx]) as PersonTab;
        return next;
      });
    }
  };

  const updateQty = (itemId: number, delta: number) => {
    if (!active) return;
    const upd = (order: TableOrder | PersonTab): TableOrder | PersonTab => {
      const items = order.items
        .map((i) => (i.id === itemId ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0);
      return {
        ...order,
        items,
        startedAt: items.length ? order.startedAt : null,
      };
    };
    if (active.kind === "table") {
      setTables((prev) => {
        const next = [...prev];
        next[active.idx] = upd(next[active.idx]) as TableOrder;
        return next;
      });
    } else {
      setPersonTabs((prev) => {
        const next = [...prev];
        next[active.idx] = upd(next[active.idx]) as PersonTab;
        return next;
      });
    }
  };

  const applyDiscount = (itemId: number, discount: number | undefined) => {
    if (!active) return;
    const upd = (order: TableOrder | PersonTab): TableOrder | PersonTab => ({
      ...order,
      items: order.items.map((i) => (i.id === itemId ? { ...i, discount } : i)),
    });
    if (active.kind === "table") {
      setTables((prev) => {
        const next = [...prev];
        next[active.idx] = upd(next[active.idx]) as TableOrder;
        return next;
      });
    } else {
      setPersonTabs((prev) => {
        const next = [...prev];
        next[active.idx] = upd(next[active.idx]) as PersonTab;
        return next;
      });
    }
  };

  const openSplitBill = (tableIdx: number) => {
    setSplitTableIdx(tableIdx);
    setSplitPersons([
      { name: "Person 1", colorIdx: 0, paid: false, payMethod: null },
      { name: "Person 2", colorIdx: 1, paid: false, payMethod: null },
    ]);
    setItemAssignments(tables[tableIdx].items.map(() => null));
    setShowSplitModal(true);
  };

  const addSplitPerson = () => {
    setSplitPersons((prev) => [
      ...prev,
      {
        name: `Person ${prev.length + 1}`,
        colorIdx: prev.length % SPLIT_COLORS.length,
        paid: false,
        payMethod: null,
      },
    ]);
  };

  const assignItem = (itemIdx: number, personIdx: number | null) => {
    setItemAssignments((prev) => {
      const next = [...prev];
      next[itemIdx] = personIdx;
      return next;
    });
  };

  const personTotal = (personIdx: number): number => {
    if (splitTableIdx === null) return 0;
    return tables[splitTableIdx].items.reduce(
      (sum, item, i) =>
        itemAssignments[i] === personIdx ? sum + ep(item) * item.qty : sum,
      0,
    );
  };

  const unassignedItems = (): { item: OrderItem; idx: number }[] => {
    if (splitTableIdx === null) return [];
    return tables[splitTableIdx].items
      .map((item, idx) => ({ item, idx }))
      .filter(({ idx }) => itemAssignments[idx] === null);
  };

  const unassignedTotal = (): number =>
    unassignedItems().reduce((s, { item }) => s + ep(item) * item.qty, 0);

  const markPaid = (personIdx: number, method: "cash" | "card") => {
    if (splitTableIdx !== null) {
      const personItems = tables[splitTableIdx].items.filter(
        (_, i) => itemAssignments[i] === personIdx,
      );
      const person = splitPersons[personIdx];
      if (personItems.length > 0) {
        handlePrint({
          restaurantName: restaurant?.name ?? "Restaurant",
          tableLabel: `Table ${splitTableIdx + 1} — ${person.name}`,
          items: personItems,
          payMethod: method,
          waiterName: tables[splitTableIdx].waiterName,
          sectionName: getTableSection(splitTableIdx),
          startedAt: tables[splitTableIdx].startedAt,
        });
      }
    }
    setSplitPersons((prev) => {
      const next = prev.map((p, i) =>
        i === personIdx ? { ...p, paid: true, payMethod: method } : p,
      );
      const allPaid = next.every((p) => p.paid);
      if (allPaid && splitTableIdx !== null) {
        const allItems = tables[splitTableIdx].items;
        const tableWaiterId = tables[splitTableIdx].waiterId ?? null;
        if (restaurantId) {
          fetch("/api/pos/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              restaurantId,
              tableNumber: splitTableIdx + 1,
              items: allItems,
              waiterId: tableWaiterId,
            }),
          }).catch(() => {});
        }
        setTables((t) => {
          const updated = [...t];
          updated[splitTableIdx] = emptyTable();
          return updated;
        });
        setKitchenSentSnapshots((prev) => {
          const next = new Map(prev);
          next.delete(splitTableIdx);
          return next;
        });
        fetch("/api/table/cart-cleared", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: `table-${RESTAURANT_SLUG}-${splitTableIdx + 1}`,
          }),
        }).catch(() => {});
        if (restaurantId)
          fetch("/api/pos/table-state/clear", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              restaurantId,
              tableNumber: splitTableIdx + 1,
              slug: RESTAURANT_SLUG,
              deviceId: deviceIdRef.current,
            }),
          }).catch(() => {});
        if (restaurantId) {
          fetch("/api/pos/assign-table", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              restaurantId,
              tableNumber: splitTableIdx + 1,
            }),
          }).catch(() => {});
        }
        setJustPaid({ kind: "table", idx: splitTableIdx });
        setTimeout(() => setJustPaid(null), 2500);
        setShowSplitModal(false);
        setActive(null);
        setScreen("tables");
      }
      return next;
    });
  };

  const payOrder = () => {
    if (!active) return;
    const slot = active;
    const receiptItems =
      slot.kind === "table"
        ? tables[slot.idx].items
        : personTabs[slot.idx].items;
    const tableLabel =
      slot.kind === "table"
        ? `Table ${slot.idx + 1}`
        : (personTabs[slot.idx]?.name ?? "Tab");
    if (receiptItems.length > 0) {
      handlePrint({
        restaurantName: restaurant?.name ?? "Restaurant",
        tableLabel,
        items: receiptItems,
        waiterName:
          slot.kind === "table" ? tables[slot.idx].waiterName : undefined,
        sectionName:
          slot.kind === "table" ? getTableSection(slot.idx) : undefined,
        roundNumber:
          slot.kind === "table"
            ? (tables[slot.idx].rounds?.length ?? 1)
            : undefined,
        startedAt:
          slot.kind === "table"
            ? tables[slot.idx].startedAt
            : personTabs[slot.idx]?.startedAt,
      });
    }
    // Always call checkout for table payments so all open DB orders get marked
    // completed — prevents the 8-second poll from re-stamping stale notes
    if (slot.kind === "table" && restaurantId) {
      fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableNumber: slot.idx + 1,
          items: receiptItems,
          waiterId: tables[slot.idx].waiterId ?? null,
        }),
      }).catch(() => {});
    }
    if (slot.kind === "table") {
      setTables((prev) => {
        const next = [...prev];
        next[slot.idx] = emptyTable();
        return next;
      });
      setKitchenSentSnapshots((prev) => {
        const next = new Map(prev);
        next.delete(slot.idx);
        return next;
      });
      fetch("/api/table/cart-cleared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: `table-${RESTAURANT_SLUG}-${slot.idx + 1}`,
        }),
      }).catch(() => {});
      if (restaurantId)
        fetch("/api/pos/table-state/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId,
            tableNumber: slot.idx + 1,
            slug: RESTAURANT_SLUG,
            deviceId: deviceIdRef.current,
          }),
        }).catch(() => {});
      if (restaurantId) {
        fetch("/api/pos/assign-table", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId, tableNumber: slot.idx + 1 }),
        }).catch(() => {});
      }
    } else {
      setPersonTabs((prev) => prev.filter((_, i) => i !== slot.idx));
    }
    setJustPaid(slot);
    setPayConfirm(false);
    setActive(null);
    setScreen("tables");
    setTimeout(() => setJustPaid(null), 2500);
  };

  const deletePersonTab = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPersonTabs((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── openSlot: shows PIN modal only if restaurant has waiters ────────────
  const openSlot = (slot: ActiveSlot) => {
    if (slot?.kind === "table" && waitersFetched && hasWaiters) {
      setTablePinSlot(slot);
      setTablePinDigits("");
      setTablePinError("");
      setShowTablePinModal(true);
      return;
    }
    setActive(slot);
    setScreen("menu");
    setActiveCategory("All");
  };

  const openIncomingClaim = (order: any) => {
    setClaimModalOrder(order);
    setClaimTarget(order.id);
    setPinDigits("");
    setClaimError("");
    setShowClaimModal(true);
  };

  const confirmTablePin = async () => {
    if (!tablePinSlot || tablePinSlot.kind !== "table") return;
    setTablePinLoading(true);
    setTablePinError("");
    try {
      const res = await fetch("/api/pos/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinCode: tablePinDigits, restaurantId }),
      });
      if (!res.ok) {
        const d = await res.json();
        setTablePinError(d.message || tr.wrongPin);
        return;
      }
      const waiter: { id: number; name: string } = await res.json();
      const tableIdx = tablePinSlot.idx;
      const existingWaiterId = tables[tableIdx].waiterId;

      // If table already belongs to a different waiter, block access
      if (existingWaiterId && existingWaiterId !== waiter.id) {
        setTablePinError(
          tr.thisTableBelongsTo(tables[tableIdx].waiterName || ""),
        );
        return;
      }

      // Always assign waiter to this table (empty or not)
      const tableIsEmpty = tables[tableIdx].items.length === 0;

      if (!tableIsEmpty) {
        setTables((prev) => {
          const next = [...prev];
          next[tableIdx] = {
            ...next[tableIdx],
            waiterId: waiter.id,
            waiterName: waiter.name,
          };
          return next;
        });

        if (restaurantId) {
          await fetch("/api/pos/assign-table", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              restaurantId,
              tableNumber: tableIdx + 1,
              waiterId: waiter.id,
            }),
          }).catch(() => {});
          refetchAssignments();
        }

        const pendingOrder = (dbOrders as any[]).find(
          (o) =>
            o.status === "pending" && Number(o.tableNumber) === tableIdx + 1,
        );
        if (pendingOrder) {
          await fetch(`/api/orders/${pendingOrder.id}/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pinCode: tablePinDigits, restaurantId }),
          }).catch(() => {});
          refetchOrders();
        }
      } else {
        setPendingWaiter({ id: waiter.id, name: waiter.name, tableIdx });
      }

      setShowTablePinModal(false);
      setTablePinDigits("");
      setTablePinError("");
      setActive(tablePinSlot);
      setScreen("menu");
      setActiveCategory("All");
    } catch {
      setTablePinError(tr.networkError);
    } finally {
      setTablePinLoading(false);
    }
  };
  const handleCreatePerson = () => {
    const trimmed = newPersonName.trim();
    if (!trimmed) return;
    setPersonTabs((prev) => {
      const newIdx = prev.length;
      const newTab: PersonTab = { name: trimmed, items: [], startedAt: null };
      const next = [...prev, newTab];
      setTimeout(() => {
        setActive({ kind: "person", idx: newIdx });
        setScreen("menu");
        setActiveCategory("All");
      }, 50);
      return next;
    });
    setNewPersonName("");
    setShowNewPerson(false);
  };

  useEffect(() => {
    const link = document.querySelector(
      'link[rel="manifest"]',
    ) as HTMLLinkElement;
    if (link) link.href = "/pos-manifest.json";
    return () => {
      if (link) link.href = "/manifest.json";
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TABLES_KEY, JSON.stringify(tables));
    } catch {}
  }, [tables, TABLES_KEY]);
  useEffect(() => {
    try {
      localStorage.setItem(PERSONS_KEY, JSON.stringify(personTabs));
    } catch {}
  }, [personTabs, PERSONS_KEY]);
  useEffect(() => {
    try {
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
    } catch {}
  }, [sections, SECTIONS_KEY]);
  useEffect(() => {
    try {
      localStorage.setItem(
        KITCHEN_KEY,
        JSON.stringify([...kitchenSentSnapshots]),
      );
    } catch {}
  }, [kitchenSentSnapshots, KITCHEN_KEY]);
  useEffect(() => {
    if (showNewPerson) setTimeout(() => nameInputRef.current?.focus(), 80);
  }, [showNewPerson]);

  // ─── Apply server rows to tables state (shared by initial load + polling) ────
  const applyServerRows = useCallback(
    (rows: { tableNumber: number; stateJson: string }[], isInitial = false) => {
      if (!Array.isArray(rows) || rows.length === 0) {
        if (isInitial) {
          setTables((prev) => {
            lastSyncedRef.current = prev.map((t) => JSON.stringify(t));
            return prev;
          });
          serverSyncReady.current = true;
        }
        return;
      }
      isSyncingFromRemote.current = true;
      setTables((prev) => {
        const next = [...prev];
        let changed = false;
        rows.forEach(({ tableNumber, stateJson }) => {
          const idx = tableNumber - 1;
          if (idx < 0 || idx >= next.length) return;
          try {
            const serverState = JSON.parse(stateJson);
            const hasServerItems =
              serverState.items && serverState.items.length > 0;

            if (isInitial) {
              // On initial load: server wins only if it has items
              if (hasServerItems) {
                next[idx] = serverState;
                changed = true;
              }
            } else {
              // On polling: ONLY apply if server has items AND local has no pending changes
              // "pending changes" = local state differs from what was last synced to server
              if (!hasServerItems) return; // never wipe a table via polling
              const localStr = JSON.stringify(next[idx]);
              const lastSyncedStr = lastSyncedRef.current[idx];
              const hasPendingLocal = localStr !== lastSyncedStr;
              if (hasPendingLocal) return; // waiter is mid-order — don't touch it
              if (stateJson === lastSyncedStr) return; // no change from another device
              next[idx] = serverState;
              changed = true;
            }
          } catch {}
        });
        if (changed || isInitial) {
          lastSyncedRef.current = next.map((t) => JSON.stringify(t));
        }
        return next;
      });
      setTimeout(() => {
        isSyncingFromRemote.current = false;
        if (isInitial) serverSyncReady.current = true;
      }, 100);
    },
    [],
  );

  // ─── Load initial table state from server (source of truth for all devices) ─
  useEffect(() => {
    if (!restaurantId) return;
    fetch(`/api/pos/table-state?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((rows) => applyServerRows(rows, true))
      .catch(() => {
        serverSyncReady.current = true;
      });
  }, [restaurantId, applyServerRows]);

  // ─── Polling fallback: re-sync every 10s in case a Pusher event was missed ──
  useEffect(() => {
    if (!restaurantId) return;
    const interval = setInterval(() => {
      if (isSyncingFromRemote.current) return;
      fetch(`/api/pos/table-state?restaurantId=${restaurantId}`)
        .then((r) => r.json())
        .then((rows) => applyServerRows(rows, false))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [restaurantId, applyServerRows]);

  // ─── Debounced sync: broadcast table changes to all other POS devices ────────
  useEffect(() => {
    if (
      !serverSyncReady.current ||
      !restaurantId ||
      isSyncingFromRemote.current
    )
      return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const slug = RESTAURANT_SLUG;
      const devId = deviceIdRef.current;
      tables.forEach((table, idx) => {
        // Never sync empty tables — only tables with actual items are broadcast
        if (!table.items || table.items.length === 0) return;
        const serialized = JSON.stringify(table);
        if (lastSyncedRef.current[idx] === serialized) return; // no change
        lastSyncedRef.current[idx] = serialized;
        fetch("/api/pos/table-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId,
            tableNumber: idx + 1,
            stateJson: serialized,
            slug,
            deviceId: devId,
          }),
        }).catch(() => {});
      });
    }, 700);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [tables, restaurantId, RESTAURANT_SLUG]);

  // ─── Pusher realtime ────────────────────────────────────────────────────────
  useEffect(() => {
    let pusher: Pusher | null = null;
    let cancelled = false;

    const handleIncoming = (data: any) => {
      const cart: OrderItem[] = data.cart || [];
      const tableNumber = data.tableNumber;
      const tableDigits = parseInt(String(tableNumber).replace(/\D/g, ""), 10);
      const tableIdx = tableDigits - 1;
      const existingRounds =
        tableIdx >= 0 && tableIdx < TABLE_COUNT
          ? (tablesRef.current[tableIdx]?.rounds ?? [])
          : [];
      const roundNumber = existingRounds.length + 1;

      if (tableIdx >= 0 && tableIdx < TABLE_COUNT) {
        setTables((prev) => {
          const next = [...prev];
          const merged = [...next[tableIdx].items];
          cart.forEach((it) => {
            const ex = merged.find((m) => m.id === it.id);
            if (ex) ex.qty += it.qty;
            else merged.push({ ...it });
          });
          const prevRounds = next[tableIdx].rounds ?? [];
          next[tableIdx] = {
            items: merged,
            rounds: [...prevRounds, { items: cart, sentAt: Date.now() }],
            startedAt: next[tableIdx].startedAt ?? new Date(),
            section: next[tableIdx].section,
            waiterId: next[tableIdx].waiterId,
            waiterName: next[tableIdx].waiterName,
            customerNote: data.customerNote || null,
          };
          return next;
        });
        setTableFlash(tableIdx);
        setTimeout(() => setTableFlash(null), 4000);
      }

      // Refetch then immediately mark all orders for this table as processed
      // so the DB sync useEffect never double-adds them
      refetchOrders().then(() => {});

      setIncomingBanner({
        id: `${Date.now()}-${Math.random()}`,
        tableNumber,
        cart,
        timestamp: data.timestamp || Date.now(),
        roundNumber,
      });
      playIncomingChime();
      if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
      setTimeout(
        () =>
          setIncomingBanner((b) =>
            b && b.tableNumber === tableNumber ? null : b,
          ),
        12000,
      );
    };
    (async () => {
      try {
        const res = await fetch("/api/config/pusher");
        const cfg = await res.json();
        console.log("1. Pusher config:", cfg);
        if (cancelled || !cfg.key || !cfg.cluster) {
          console.log("2. STOPPING — no key/cluster");
          return;
        }
        pusher = new Pusher(cfg.key, { cluster: cfg.cluster });
        pusher.connection.bind("connected", () =>
          console.log("3. Pusher CONNECTED"),
        );
        pusher.connection.bind("error", (e: any) =>
          console.log("3. Pusher ERROR:", e),
        );
        const channel = pusher.subscribe(`pos-${RESTAURANT_SLUG}`);
        channel.bind("pusher:subscription_succeeded", () =>
          console.log("4. Subscribed to: pos-" + RESTAURANT_SLUG),
        );
        channel.bind("incoming-order", (data: any) => {
          console.log("5. incoming-order received:", data);
          handleIncoming(data);
        });
        channel.bind(
          "table-assigned",
          (data: {
            tableNumber: number;
            waiterId: number;
            waiterName: string;
          }) => {
            setTables((prev) => {
              const idx = data.tableNumber - 1;
              if (idx < 0 || idx >= prev.length) return prev;
              if (prev[idx].waiterId === data.waiterId) return prev;
              const next = [...prev];
              next[idx] = {
                ...next[idx],
                waiterId: data.waiterId,
                waiterName: data.waiterName,
              };
              return next;
            });
            refetchAssignments();
          },
        );
        channel.bind("table-released", (data: { tableNumber: number }) => {
          refetchAssignments();
        });
        channel.bind("order-ready", (data: { tableNumber: number }) => {
          console.log("[POS] order-ready received:", data);
          const id = `${Date.now()}-${Math.random()}`;
          setReadyBanners((prev) => [
            ...prev,
            { id, tableNumber: data.tableNumber },
          ]);
          // play a gentle "ding" sound
          try {
            const ctx = new (window.AudioContext ||
              (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.35, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(
              0.001,
              ctx.currentTime + 0.6,
            );
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.6);
          } catch {}
          setTimeout(
            () => setReadyBanners((prev) => prev.filter((b) => b.id !== id)),
            8000,
          );
        });
        channel.bind(
          "waiter-request",
          (data: { tableNumber: number | string; type: string }) => {
            console.log("5. waiter-request received:", data);
            const signal: WaiterSignal = {
              id: `${Date.now()}-${Math.random()}`,
              tableNumber: data.tableNumber,
              type: data.type as WaiterSignal["type"],
              timestamp: Date.now(),
            };
            setWaiterSignals((prev) => [...prev, signal]);
            setTimeout(() => {
              setWaiterSignals((prev) =>
                prev.filter((s) => s.id !== signal.id),
              );
              const wtn = parseInt(
                String(data.tableNumber).replace(/\D/g, ""),
                10,
              );
              setWaiterFlashTables((prev) => {
                const m = new Map(prev);
                m.delete(wtn - 1);
                return m;
              });
            }, 30000);
            playWaiterChime(data.type as WaiterSignal["type"]);
            const waiterTableNum = parseInt(
              String(data.tableNumber).replace(/\D/g, ""),
              10,
            );
            const waiterTableIdx = waiterTableNum - 1;
            if (waiterTableIdx >= 0 && waiterTableIdx < TABLE_COUNT) {
              setWaiterFlashTables((prev) =>
                new Map(prev).set(
                  waiterTableIdx,
                  data.type as WaiterSignal["type"],
                ),
              );
            }
          },
        );

        // ── Table cleared by another device (payment/transfer/merge) ─────
        channel.bind(
          "table-state-cleared",
          (data: { tableNumber: number; deviceId: string | null }) => {
            if (data.deviceId && data.deviceId === deviceIdRef.current) return;
            const idx = data.tableNumber - 1;
            if (idx < 0) return;
            isSyncingFromRemote.current = true;
            setTables((prev) => {
              if (idx >= prev.length) return prev;
              const next = [...prev];
              next[idx] = emptyTable();
              lastSyncedRef.current[idx] = JSON.stringify(next[idx]);
              return next;
            });
            setTimeout(() => {
              isSyncingFromRemote.current = false;
            }, 150);
          },
        );

        // ── Live table-state sync from other devices ───────────────────────
        channel.bind(
          "table-state-updated",
          (data: {
            tableNumber: number;
            stateJson: string;
            deviceId: string | null;
          }) => {
            // Ignore updates originating from this same browser tab
            if (data.deviceId && data.deviceId === deviceIdRef.current) return;
            const idx = data.tableNumber - 1;
            if (idx < 0) return;
            try {
              const remoteState = JSON.parse(data.stateJson);
              isSyncingFromRemote.current = true;
              setTables((prev) => {
                if (idx >= prev.length) return prev;
                const next = [...prev];
                next[idx] = remoteState;
                lastSyncedRef.current[idx] = data.stateJson;
                return next;
              });
              setTimeout(() => {
                isSyncingFromRemote.current = false;
              }, 150);
            } catch {}
          },
        );
      } catch (e) {
        console.error("Pusher setup failed:", e);
      }
    })();

    return () => {
      cancelled = true;
      try {
        pusher?.unsubscribe(`pos-${RESTAURANT_SLUG}`);
        pusher?.disconnect();
      } catch {}
    };
  }, [RESTAURANT_SLUG, TABLE_COUNT]);

  const tableStatus = (
    o: TableOrder,
  ): "empty" | "unclaimed" | "fresh" | "mid" | "late" => {
    if (!o.startedAt || o.items.length === 0) return "empty";
    if (!o.waiterId) return "unclaimed";
    const mins = Math.floor(
      (Date.now() - new Date(o.startedAt).getTime()) / 60000,
    );
    if (mins < 15) return "fresh";
    if (mins < 30) return "mid";
    return "late";
  };

  const personStatus = (o: PersonTab): "empty" | "fresh" | "mid" | "late" => {
    if (!o.startedAt || o.items.length === 0) return "empty";
    const mins = Math.floor(
      (Date.now() - new Date(o.startedAt).getTime()) / 60000,
    );
    if (mins < 15) return "fresh";
    if (mins < 30) return "mid";
    return "late";
  };

  const statusColors = isLight ? statusColorsLight : statusColorsDark;

  const activeLabel =
    active === null
      ? null
      : active.kind === "table"
        ? `T${active.idx + 1}`
        : (personTabs[active.idx]?.name ?? "—");

  const allTotal =
    tables.reduce((s, t) => s + orderTotal(t), 0) +
    personTabs.reduce((s, p) => s + orderTotal(p), 0);
  const allActive =
    tables.filter((t) => t.items.length > 0).length +
    personTabs.filter((p) => p.items.length > 0).length;

  return (
    <div
      className={`h-[100dvh] w-screen ${t.appBg} ${t.text} flex flex-col overflow-hidden transition-colors`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Header ── */}
      <div
        className={`flex-shrink-0 flex items-center gap-3 px-4 lg:px-6 py-3 lg:py-4 border-b ${t.border}`}
        style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
      >
        {screen !== "tables" && (
          <button
            onClick={() => {
              if (screen === "menu") setPendingWaiter(null);
              setScreen(screen === "order" ? "menu" : "tables");
            }}
            className={`h-8 w-8 lg:h-10 lg:w-10 rounded-full ${t.backBtn} flex items-center justify-center flex-shrink-0 transition-colors`}
          >
            <ChevronLeft className="h-4 w-4 lg:h-5 lg:w-5" />
          </button>
        )}
        <div className="h-7 w-7 lg:h-9 lg:w-9 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
          <Coffee className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm lg:text-base font-semibold leading-none truncate">
            {restaurant?.name || "POS"}
            {activeLabel && (
              <span className="text-amber-400"> · {activeLabel}</span>
            )}
          </p>
          <p
            className={`text-[10px] lg:text-[11px] ${t.textDim} mt-0.5`}
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            {screen === "tables"
              ? `${allActive} ${tr.activeLabel}`
              : screen === "menu"
                ? tr.addItems
                : tr.orderScreen}
          </p>
        </div>
        {/* Printer */}
        <button
          onClick={usbDevice ? () => setUsbDevice(null) : connectPrinter}
          title={usbDevice ? tr.printerConnected : tr.connectPrinter}
          className={`h-8 w-8 lg:h-10 lg:w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors relative ${t.backBtn}`}
        >
          <Printer
            className={`h-4 w-4 lg:h-5 lg:w-5 ${printerStatus === "error" ? "text-red-400" : usbDevice ? "text-emerald-400" : ""}`}
          />
          {usbDevice && printerStatus === "idle" && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-400" />
          )}
          {printerStatus === "printing" && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
        {/* Language switcher */}
        <div className={`flex rounded-xl border ${t.border} p-0.5 gap-0.5`}>
          {(["en", "al", "mk"] as PosLang[]).map((l) => (
            <button
              key={l}
              onClick={() => handleLangChange(l)}
              className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${lang === l ? "bg-amber-500 text-black" : `${t.textDim} hover:${t.textMuted}`}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isLight ? "dark" : "light")}
          className={`h-8 w-8 lg:h-10 lg:w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${t.backBtn}`}
        >
          {isLight ? (
            <Moon className="h-4 w-4 lg:h-5 lg:w-5" />
          ) : (
            <Sun className="h-4 w-4 lg:h-5 lg:w-5 text-amber-400" />
          )}
        </button>
        {/* Orders panel button */}
      </div>

      {/* ── Waiter signal banners ── */}
      <AnimatePresence>
        {waiterSignals.length > 0 && (
          <div
            className="fixed left-3 right-3 z-[60] flex flex-col gap-2"
            style={{ top: 72 }}
          >
            {waiterSignals.map((signal, i) => {
              const cfg =
                signal.type === "bill-cash"
                  ? {
                      grad: "from-emerald-600 to-emerald-500",
                      icon: "💵",
                      label: `${tr.cashBill} — Table ${signal.tableNumber}`,
                    }
                  : signal.type === "bill-card"
                    ? {
                        grad: "from-blue-600 to-blue-500",
                        icon: "💳",
                        label: `${tr.cardBill} — Table ${signal.tableNumber}`,
                      }
                    : {
                        grad: "from-amber-500 to-amber-400",
                        icon: "🔔",
                        label: `${tr.needHelp} — Table ${signal.tableNumber}`,
                      };
              return (
                <motion.button
                  key={signal.id}
                  initial={{ y: -60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -60, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 28,
                    delay: i * 0.05,
                  }}
                  onClick={() => {
                    setWaiterSignals((prev) =>
                      prev.filter((s) => s.id !== signal.id),
                    );
                    const wtn = parseInt(
                      String(signal.tableNumber).replace(/\D/g, ""),
                      10,
                    );
                    setWaiterFlashTables((prev) => {
                      const m = new Map(prev);
                      m.delete(wtn - 1);
                      return m;
                    });
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r ${cfg.grad} text-white shadow-2xl`}
                >
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    className="text-xl flex-shrink-0"
                  >
                    {cfg.icon}
                  </motion.span>
                  <p className="flex-1 text-sm font-bold text-left leading-tight">
                    {cfg.label}
                  </p>
                  <span
                    className="text-[10px] font-bold opacity-70 flex-shrink-0"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    TAP ✕
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* ── Incoming order banner ── */}
      <AnimatePresence>
        {incomingBanner && (
          <motion.button
            key={incomingBanner.id}
            onClick={() => {
              const tableNum = parseInt(
                String(incomingBanner.tableNumber).replace(/\D/g, ""),
                10,
              );
              const pendingOrder = [...dbOrders].find(
                (o: any) =>
                  o.status === "pending" && Number(o.tableNumber) === tableNum,
              );
              if (pendingOrder && waiters.length > 0)
                openIncomingClaim(pendingOrder);
              else {
                const idx = tableNum - 1;
                if (idx >= 0 && idx < TABLE_COUNT)
                  openSlot({ kind: "table", idx });
              }
              setIncomingBanner(null);
            }}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="absolute top-[60px] left-3 right-3 z-[60] flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-2xl"
            style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
          >
            <motion.div
              animate={{ scale: [1, 1.18, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            >
              <Bell className="h-5 w-5" />
            </motion.div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-bold leading-tight">
                {incomingBanner.roundNumber > 1
                  ? `⚡ ${tr.orderNum} ${incomingBanner.roundNumber} — Table ${incomingBanner.tableNumber}`
                  : `${tr.newOrder} — Table ${incomingBanner.tableNumber}`}
              </p>
              <p
                className="text-[11px] font-semibold opacity-80 truncate"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {incomingBanner.cart.reduce((s, i) => s + i.qty, 0)}{" "}
                {tr.itemsLabel} ·{" "}
                {incomingBanner.cart.reduce((s, i) => s + i.price * i.qty, 0)}{" "}
                DEN
              </p>
            </div>
            <span
              className="text-[10px] font-bold opacity-70"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {waiters.length > 0 ? `${tr.claimOrder} →` : "→"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Kitchen ready banners ── */}
      <div className="absolute top-[60px] left-3 right-3 z-[60] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {readyBanners.map((b) => (
            <motion.div
              key={b.id}
              initial={{ y: -60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -60, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
              style={{
                background:
                  "linear-gradient(90deg, hsl(150 60% 30%), hsl(150 55% 38%))",
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.7, repeat: 2 }}
              >
                <CheckCircle className="h-5 w-5 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white leading-tight">
                  🍽️ Order Ready — Table {b.tableNumber}
                </p>
                <p className="text-[11px] text-white/70 font-medium">
                  Kitchen marked this order as done
                </p>
              </div>
              <button
                onClick={() =>
                  setReadyBanners((prev) => prev.filter((x) => x.id !== b.id))
                }
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SCREEN: TABLES
      ═ ��════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {screen === "tables" && (
          <motion.div
            key="tables"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
            className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8 space-y-4 lg:space-y-6 max-w-[1400px] w-full mx-auto"
          >
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowTransferModal(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${t.actionBtn} transition-colors`}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                {tr.transferTable}
              </button>
              <button
                onClick={() => setShowMergeModal(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${t.actionBtn} transition-colors`}
              >
                <Merge className="h-3.5 w-3.5" />
                {tr.mergeTables}
              </button>
              <button
                onClick={() => {
                  setDraftSections(JSON.parse(JSON.stringify(sections)));
                  setActiveDraftSection(sections[0]?.name || "Indoor");
                  setShowSectionsModal(true);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${t.actionBtnAlt} transition-colors`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {tr.sections}
              </button>
            </div>

            {/* Section filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedSection("all")}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedSection === "all" ? "bg-amber-500 text-black" : t.chipInactive}`}
              >
                {tr.allSections}
              </button>
              {sections.map((section) => (
                <button
                  key={section.name}
                  onClick={() => setSelectedSection(section.name)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedSection === section.name ? "bg-amber-500 text-black" : t.chipInactive}`}
                >
                  {section.name} ({section.tables.length})
                </button>
              ))}
            </div>

            {/* Tables grid */}
            <div>
              <p
                className={`text-[10px] lg:text-[11px] ${t.textFaint} mb-2 lg:mb-3 px-0.5`}
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {selectedSection === "all"
                  ? `ALL TABLES (${TABLE_COUNT})`
                  : selectedSection.toUpperCase()}
              </p>
              <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-10 gap-2">
                {visibleTables.map((idx) => {
                  const table = tables[idx];
                  const status = tableStatus(table);
                  const c = statusColors[status];
                  const wasJustPaid =
                    justPaid?.kind === "table" && justPaid.idx === idx;
                  const sectionName = getTableSection(idx);
                  return (
                    <motion.button
                      key={idx}
                      onClick={() => openSlot({ kind: "table", idx })}
                      whileTap={{ scale: 0.92 }}
                      animate={
                        waiterFlashTables.has(idx)
                          ? { scale: [1, 1.06, 1, 1.06, 1] }
                          : tableFlash === idx
                            ? { scale: [1, 1.08, 1, 1.08, 1] }
                            : { scale: 1 }
                      }
                      transition={{
                        duration: waiterFlashTables.has(idx) ? 0.9 : 1.6,
                        repeat: waiterFlashTables.has(idx)
                          ? Infinity
                          : tableFlash === idx
                            ? 2
                            : 0,
                      }}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border relative transition-all duration-500 ${
                        wasJustPaid
                          ? "bg-emerald-500/20 border-emerald-500/40"
                          : waiterFlashTables.has(idx)
                            ? waiterFlashTables.get(idx) === "bill-cash"
                              ? "bg-emerald-500/25 border-emerald-400 ring-2 ring-emerald-400/60"
                              : waiterFlashTables.get(idx) === "bill-card"
                                ? "bg-blue-500/25 border-blue-400 ring-2 ring-blue-400/60"
                                : "bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/60"
                            : tableFlash === idx
                              ? "bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/60"
                              : `${c.bg} ${c.border}`
                      }`}
                    >
                      {wasJustPaid ? (
                        <CheckCircle className="h-6 w-6 text-emerald-400" />
                      ) : (
                        <>
                          <span
                            className={`text-sm font-bold font-['DM_Mono'] ${c.text}`}
                          >
                            T{idx + 1}
                          </span>
                          {selectedSection === "all" && (
                            <span
                              className={`text-[9px] font-['DM_Mono'] ${t.textFaint}`}
                            >
                              {sectionName}
                            </span>
                          )}
                          {table.items.length > 0 && (
                            <>
                              {status === "unclaimed" && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/30 text-sky-400">
                                  {tr.claimOrder}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold font-['DM_Mono'] ${c.time}`}
                              >
                                {orderTotal(table)}
                              </span>
                              {table.startedAt && (
                                <span
                                  className={`text-[9px] font-['DM_Mono'] ${c.time}`}
                                >
                                  {elapsed(table)}
                                </span>
                              )}
                              {table.waiterName && (
                                <span
                                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-400 max-w-[90%] truncate"
                                  style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                  }}
                                >
                                  {table.waiterName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </span>
                              )}
                              <motion.div
                                animate={
                                  status === "late"
                                    ? { scale: [1, 1.4, 1] }
                                    : {}
                                }
                                transition={{ duration: 1.2, repeat: Infinity }}
                                className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${c.dot}`}
                              />
                              {/* Claim button on unclaimed tables — always opens PIN directly */}
                              {status === "unclaimed" && (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  data-testid={`button-claim-table-${idx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTablePinSlot({ kind: "table", idx });
                                    setTablePinDigits("");
                                    setTablePinError("");
                                    setShowTablePinModal(true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.stopPropagation();
                                      setTablePinSlot({ kind: "table", idx });
                                      setTablePinDigits("");
                                      setTablePinError("");
                                      setShowTablePinModal(true);
                                    }
                                  }}
                                  className="absolute bottom-1.5 left-1.5 right-1.5 h-5 rounded-lg bg-sky-500 text-white text-[8px] font-bold flex items-center justify-center gap-0.5 active:bg-sky-600 cursor-pointer"
                                >
                                  <KeyRound className="h-2.5 w-2.5" />
                                  {tr.claimOrder}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Person tabs */}
            <div>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <p
                  className={`text-[10px] ${t.textFaint}`}
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  {tr.persons}
                </p>
                <button
                  onClick={() => setShowNewPerson(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold active:bg-amber-500/25"
                >
                  <UserPlus className="h-3 w-3" />
                  {tr.newBtn}
                </button>
              </div>
              {personTabs.length === 0 ? (
                <div
                  className={`rounded-2xl border border-dashed ${t.borderDashed} flex items-center justify-center py-6 lg:py-10`}
                >
                  <p className={`${t.textFaint} text-xs lg:text-sm`}>
                    {tr.noActivePersons}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:space-y-0">
                  {personTabs.map((person, idx) => {
                    const status = personStatus(person);
                    const c = statusColors[status];
                    const wasJustPaid =
                      justPaid?.kind === "person" && justPaid.idx === idx;
                    const occupied = person.items.length > 0;
                    return (
                      <motion.button
                        key={idx}
                        onClick={() => openSlot({ kind: "person", idx })}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border relative transition-all duration-500 ${wasJustPaid ? "bg-emerald-500/20 border-emerald-500/40" : `${c.bg} ${c.border}`}`}
                      >
                        {wasJustPaid ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                            <span className="text-sm text-emerald-400 font-semibold">
                              {tr.paidCheck}
                            </span>
                          </>
                        ) : (
                          <>
                            <div
                              className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${occupied ? "bg-amber-500/20" : t.surfaceSoft}`}
                            >
                              <User
                                className={`h-4 w-4 ${occupied ? "text-amber-400" : t.textDim}`}
                              />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p
                                className={`text-sm font-semibold ${c.text} truncate`}
                              >
                                {person.name}
                              </p>
                              {occupied ? (
                                <p
                                  className={`text-xs font-bold mt-0.5 ${c.time}`}
                                  style={{ fontFamily: "'DM Mono', monospace" }}
                                >
                                  {orderTotal(person)} DEN
                                  {person.startedAt && (
                                    <span
                                      className={`font-normal ${t.textFaint} ml-2`}
                                    >
                                      {elapsed(person)}
                                    </span>
                                  )}
                                </p>
                              ) : (
                                <p className={`text-xs ${t.textFaint} mt-0.5`}>
                                  Empty
                                </p>
                              )}
                            </div>
                            {occupied && status !== "empty" && (
                              <motion.div
                                animate={
                                  status === "late"
                                    ? { scale: [1, 1.4, 1] }
                                    : {}
                                }
                                transition={{ duration: 1.2, repeat: Infinity }}
                                className={`h-2 w-2 rounded-full flex-shrink-0 ${c.dot}`}
                              />
                            )}
                            {!occupied && (
                              <button
                                onClick={(e) => deletePersonTab(idx, e)}
                                className={`h-6 w-6 rounded-full ${t.surfaceSoft} flex items-center justify-center flex-shrink-0 active:bg-red-500/20`}
                              >
                                <X className={`h-3 w-3 ${t.textDim}`} />
                              </button>
                            )}
                          </>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-1 flex-wrap">
              {[
                { dot: dotColors.fresh, label: "< 15min" },
                { dot: dotColors.mid, label: "15–30min" },
                { dot: dotColors.late, label: "30min+" },
                { dot: dotColors.unclaimed, label: "Unclaimed" },
              ].map(({ dot, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${dot}`} />
                  <span
                    className={`text-[10px] ${t.textDim}`}
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Summary bar */}
            <div
              className={`p-4 lg:p-5 rounded-2xl ${t.surface} border ${t.border} flex items-center justify-between`}
            >
              <div>
                <p
                  className={`text-[10px] ${t.textDim}`}
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  {tr.totalOpen}
                </p>
                <p
                  className="text-xl font-bold text-amber-400"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  {allTotal} <span className={`text-sm ${t.textDim}`}>DEN</span>
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-[10px] ${t.textDim}`}
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  {tr.activeLabel}
                </p>
                <p
                  className={`text-xl font-bold ${t.text}`}
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  {allActive}
                  <span className={`text-sm ${t.textDim}`}>
                    /{TABLE_COUNT + personTabs.length}
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SCREEN: MENU + ORDER
        ══════════════════════════════════════════════════════════════════════ */}
        {(screen === "menu" || screen === "order") &&
          active !== null &&
          currentOrder && (
            <motion.div
              key="menu-order"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex overflow-hidden"
            >
              {/* Menu panel */}
              <div
                className={`flex-1 flex-col overflow-hidden ${screen === "order" ? "hidden lg:flex" : "flex"}`}
              >
                {/* Search box */}
                <div className={`flex-shrink-0 px-4 lg:px-6 pt-2.5 pb-2`}>
                  <div
                    className={`flex items-center gap-2 rounded-xl border ${t.border} ${t.surface} px-3 py-2`}
                  >
                    <svg
                      className={`h-3.5 w-3.5 flex-shrink-0 ${t.textDim}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && filteredItems.length > 0) {
                          addItem(filteredItems[0]);
                          setMenuSearch("");
                        }
                      }}
                      placeholder="Search items…"
                      className={`flex-1 bg-transparent text-xs lg:text-sm outline-none ${t.textSoft} placeholder:${t.textFaint}`}
                    />
                    {menuSearch && (
                      <button
                        onClick={() => setMenuSearch("")}
                        className={`${t.textDim} hover:${t.textMuted} transition-colors`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Category chips */}
                <div
                  className={`flex-shrink-0 flex gap-2 px-4 lg:px-6 py-2 overflow-x-auto border-b ${t.borderSoft}`}
                >
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`flex-shrink-0 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-semibold transition-all ${activeCategory === cat ? "bg-amber-500 text-black" : t.chipInactive}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-3 lg:p-5">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Coffee className="h-7 w-7 text-amber-500" />
                      </motion.div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-3">
                      {filteredItems.map((item) => {
                        const inCart = currentOrder.items.find(
                          (i) => i.id === item.id,
                        );
                        return (
                          <motion.button
                            key={item.id}
                            onPointerDown={(e) => {
                              const rect = (
                                e.currentTarget as HTMLElement
                              ).getBoundingClientRect();
                              longPressTimer.current = setTimeout(() => {
                                if (navigator.vibrate) navigator.vibrate(40);
                                setRadialMenu({
                                  item,
                                  x: rect.left + rect.width / 2,
                                  y: rect.top + rect.height / 2,
                                });
                              }, 400);
                            }}
                            onPointerUp={() => {
                              if (longPressTimer.current) {
                                clearTimeout(longPressTimer.current);
                                if (!radialMenu) addItem(item);
                                longPressTimer.current = null;
                              }
                            }}
                            onPointerLeave={() => {
                              if (longPressTimer.current) {
                                clearTimeout(longPressTimer.current);
                                longPressTimer.current = null;
                              }
                            }}
                            onContextMenu={(e) => e.preventDefault()}
                            whileTap={{ scale: 0.95 }}
                            className={`relative p-3 lg:p-4 rounded-xl text-left border transition-all select-none ${inCart ? "bg-amber-500/15 border-amber-500/50" : t.cartItemInactive}`}
                          >
                            {inCart && (
                              <div className="absolute top-2 right-2 h-5 w-5 lg:h-6 lg:w-6 rounded-full bg-amber-500 flex items-center justify-center">
                                <span className="text-[10px] lg:text-xs font-bold text-black">
                                  {inCart.qty}
                                </span>
                              </div>
                            )}
                            <p
                              className={`text-xs lg:text-sm font-semibold ${t.textSoft} leading-snug pr-6 line-clamp-2`}
                            >
                              {localName(item, lang)}
                            </p>
                            {item.specialDiscount && item.specialType ? (
                              <div className="mt-1.5 space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-bold bg-amber-500 text-white px-1 py-0.5 rounded-full leading-none">
                                    ⭐
                                  </span>
                                  <span
                                    className={`text-[9px] line-through ${t.textFaint}`}
                                  >
                                    {parsePrice(item.price)}
                                  </span>
                                </div>
                                <p
                                  className="text-xs lg:text-sm font-bold text-amber-400"
                                  style={{ fontFamily: "'DM Mono', monospace" }}
                                >
                                  {getMenuItemSpecialPrice(item)}{" "}
                                  <span
                                    className={`text-[9px] lg:text-[10px] ${t.textFaint}`}
                                  >
                                    DEN
                                  </span>
                                </p>
                              </div>
                            ) : (
                              <p
                                className="text-xs lg:text-sm font-bold text-amber-400 mt-1.5"
                                style={{ fontFamily: "'DM Mono', monospace" }}
                              >
                                {parsePrice(item.price)}{" "}
                                <span
                                  className={`text-[9px] lg:text-[10px] ${t.textFaint}`}
                                >
                                  DEN
                                </span>
                              </p>
                            )}
                            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-20">
                              <div className="h-0.5 w-0.5 rounded-full bg-current" />
                              <div className="h-0.5 w-0.5 rounded-full bg-current" />
                              <div className="h-0.5 w-0.5 rounded-full bg-current" />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {screen === "menu" && currentOrder.items.length > 0 && (
                <button
                  onClick={() => setScreen("order")}
                  className="lg:hidden fixed bottom-6 right-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-amber-500 text-black font-bold text-sm shadow-2xl active:scale-95 transition-transform"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>{orderTotal(currentOrder)} DEN</span>
                  <span className="opacity-60">·</span>
                  <span className="h-5 w-5 rounded-full bg-black/20 flex items-center justify-center text-[11px] font-bold">
                    {orderCount(currentOrder)}
                  </span>
                </button>
              )}

              <div
                className={`flex-col overflow-hidden ${t.panelBg} lg:border-l lg:${t.border} lg:w-[380px] xl:w-[440px] ${screen === "menu" ? "hidden lg:flex" : "flex flex-1 lg:flex-none"}`}
              >
                <div
                  className={`hidden lg:flex flex-shrink-0 items-center gap-2 px-5 py-4 border-b ${t.border}`}
                >
                  <ShoppingBag className="h-4 w-4 text-amber-400" />
                  <p className="text-sm font-bold">
                    {tr.orderDot} ·{" "}
                    <span className="text-amber-400">{activeLabel}</span>
                  </p>
                  <span
                    className={`ml-auto text-[10px] ${t.textDim}`}
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {orderCount(currentOrder)} ITEMS
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 lg:p-5">
                  {currentOrder.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-12">
                      <ShoppingBag className={`h-8 w-8 ${t.textFaint}`} />
                      <p className={`${t.textFaint} text-sm`}>No items yet</p>
                    </div>
                  ) : (
                    (() => {
                      const rounds: OrderRound[] =
                        (currentOrder as TableOrder).rounds ?? [];
                      const itemCard = (item: OrderItem, isNew: boolean) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border mb-2 transition-colors ${isNew ? "bg-amber-500/5 border-amber-500/25" : `${t.surface} ${t.border}`}`}
                        >
                          <div className="flex items-center gap-3">
                            {isNew && (
                              <div className="w-0.5 self-stretch rounded-full bg-amber-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-semibold ${t.textSoft} truncate`}
                              >
                                {localName(item, lang)}
                              </p>
                              <p
                                className="text-xs text-amber-400 mt-0.5"
                                style={{ fontFamily: "'DM Mono', monospace" }}
                              >
                                {item.discount ? (
                                  <>
                                    <span className="line-through opacity-50">
                                      {item.price}
                                    </span>{" "}
                                    <span className="text-red-400">
                                      -{item.discount}%
                                    </span>{" "}
                                    {ep(item)} × {item.qty} ={" "}
                                    {ep(item) * item.qty} DEN
                                  </>
                                ) : (
                                  <>
                                    {item.price} × {item.qty} ={" "}
                                    {item.price * item.qty} DEN
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (discountItemId === item.id) {
                                    setDiscountItemId(null);
                                    setDiscountInput("");
                                  } else {
                                    setDiscountItemId(item.id);
                                    setDiscountInput(
                                      item.discount
                                        ? String(item.discount)
                                        : "",
                                    );
                                  }
                                }}
                                className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-colors ${item.discount ? "bg-red-500/20 border-red-500/50 text-red-400" : `${t.surfaceSoft} border-transparent ${t.textMuted} hover:bg-white/10`}`}
                              >
                                %
                              </button>
                              <div
                                className={`flex items-center gap-2 ${t.surfaceSoft} rounded-xl px-2 py-1.5`}
                              >
                                <button
                                  onClick={() => updateQty(item.id, -1)}
                                  className={`h-6 w-6 lg:h-7 lg:w-7 rounded-lg flex items-center justify-center ${t.textMuted} active:bg-white/10 hover:bg-white/10`}
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span
                                  className="text-sm font-bold text-amber-400 w-5 text-center"
                                  style={{ fontFamily: "'DM Mono', monospace" }}
                                >
                                  {item.qty}
                                </span>
                                <button
                                  onClick={() => updateQty(item.id, 1)}
                                  className={`h-6 w-6 lg:h-7 lg:w-7 rounded-lg flex items-center justify-center ${t.textMuted} active:bg-white/10 hover:bg-white/10`}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          {discountItemId === item.id && (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="100"
                                placeholder="Discount %"
                                value={discountInput}
                                onChange={(e) =>
                                  setDiscountInput(e.target.value)
                                }
                                className={`flex-1 h-8 rounded-lg px-2 text-sm font-mono border ${t.surface} ${t.border} ${t.text} bg-transparent outline-none focus:border-amber-400`}
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  const val = parseInt(discountInput);
                                  if (val > 0 && val <= 100)
                                    applyDiscount(item.id, val);
                                  else applyDiscount(item.id, undefined);
                                  setDiscountItemId(null);
                                  setDiscountInput("");
                                }}
                                className="h-8 px-3 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/30"
                              >
                                Apply
                              </button>
                              {item.discount && (
                                <button
                                  onClick={() => {
                                    applyDiscount(item.id, undefined);
                                    setDiscountItemId(null);
                                    setDiscountInput("");
                                  }}
                                  className={`h-8 px-2 rounded-lg text-xs font-bold ${t.surfaceSoft} ${t.textMuted} hover:bg-white/10`}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );

                      if (rounds.length <= 1)
                        return (
                          <>
                            {currentOrder.items.map((item) =>
                              itemCard(item, false),
                            )}
                          </>
                        );

                      const itemFirstRound = (id: number): number => {
                        for (let i = 0; i < rounds.length; i++) {
                          if (rounds[i].items.some((ri) => ri.id === id))
                            return i;
                        }
                        return -1;
                      };
                      const groups = new Map<number, OrderItem[]>();
                      for (const item of currentOrder.items) {
                        const r = itemFirstRound(item.id);
                        const arr = groups.get(r) ?? [];
                        arr.push(item);
                        groups.set(r, arr);
                      }

                      return (
                        <>
                          {(groups.get(-1) ?? []).map((item) =>
                            itemCard(item, false),
                          )}
                          {rounds.map((round, rIdx) => {
                            const items = groups.get(rIdx) ?? [];
                            if (items.length === 0) return null;
                            const isNew = rIdx > 0;
                            const roundTime = new Date(
                              round.sentAt,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            return (
                              <div key={rIdx}>
                                <div className="flex items-center gap-2 py-2 px-0.5 mb-1">
                                  <div
                                    className={`h-px flex-1 ${t.borderSoft}`}
                                  />
                                  <span
                                    className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${isNew ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : `${t.surfaceSoft} ${t.textDim}`}`}
                                    style={{
                                      fontFamily: "'DM Mono', monospace",
                                    }}
                                  >
                                    {isNew && (
                                      <motion.span
                                        animate={{ opacity: [1, 0.4, 1] }}
                                        transition={{
                                          duration: 1.4,
                                          repeat: Infinity,
                                        }}
                                      >
                                        ⚡
                                      </motion.span>
                                    )}
                                    {isNew
                                      ? `${tr.porosiLabel} ${rIdx + 1}`
                                      : `${tr.porosiLabel} 1`}
                                    <span className="font-normal opacity-60 ml-1">
                                      {roundTime}
                                    </span>
                                  </span>
                                  <div
                                    className={`h-px flex-1 ${t.borderSoft}`}
                                  />
                                </div>
                                {items.map((item) => itemCard(item, isNew))}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()
                  )}
                </div>
                {(currentOrder as TableOrder).customerNote && (
                  <div
                    className={`flex-shrink-0 mx-4 mb-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2`}
                  >
                    <span className="text-amber-400 text-sm flex-shrink-0">
                      📝
                    </span>
                    <p
                      className={`text-xs leading-snug ${isLight ? "text-amber-700" : "text-amber-300"}`}
                    >
                      {(currentOrder as TableOrder).customerNote}
                    </p>
                  </div>
                )}
                {currentOrder.items.length > 0 && (
                  <div
                    className={`flex-shrink-0 p-4 lg:p-5 border-t ${t.border} space-y-3`}
                    style={{
                      paddingBottom:
                        "max(16px, env(safe-area-inset-bottom, 16px))",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex items-center gap-2 ${t.textMuted} text-xs`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {currentOrder.startedAt ? elapsed(currentOrder) : "—"}
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-[10px] ${t.textDim}`}
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        >
                          TOTAL
                        </p>
                        <p
                          className={`text-2xl lg:text-3xl font-bold ${t.text}`}
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        >
                          {orderTotal(currentOrder)}{" "}
                          <span className={`text-sm ${t.textDim}`}>DEN</span>
                        </p>
                      </div>
                    </div>
                    {payConfirm ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPayConfirm(false)}
                          className={`flex-1 h-12 rounded-2xl ${t.surfaceSoft} text-sm ${t.textMuted} font-semibold hover:bg-white/12`}
                        >
                          {tr.cancel}
                        </button>
                        <button
                          onClick={payOrder}
                          className="flex-1 h-12 rounded-2xl bg-emerald-500 text-sm font-bold text-white hover:bg-emerald-400"
                        >
                          {tr.paidBtn}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {active?.kind === "table" && (
                          <button
                            onClick={() => openSplitBill(active.idx)}
                            className={`w-full h-11 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold border ${t.border} ${t.surfaceSoft} ${t.textSoft} hover:border-amber-500/40 transition-colors`}
                          >
                            <Divide className="h-4 w-4" />
                            {tr.splitBill}
                          </button>
                        )}
                        {(() => {
                          // Compute delta once — items added or qty-increased since last send
                          const sentMap = new Map<number, number>();
                          if (active?.kind === "table") {
                            const rounds =
                              (currentOrder as TableOrder).rounds ?? [];
                            for (const round of rounds) {
                              for (const item of round.items) {
                                sentMap.set(
                                  item.id,
                                  (sentMap.get(item.id) ?? 0) + item.qty,
                                );
                              }
                            }
                          }
                          const deltaCart = currentOrder
                            ? currentOrder.items
                                .map((item) => {
                                  const newQty =
                                    item.qty - (sentMap.get(item.id) ?? 0);
                                  return newQty > 0
                                    ? {
                                        ...item,
                                        name: localName(item, lang),
                                        qty: newQty,
                                      }
                                    : null;
                                })
                                .filter(Boolean)
                            : [];
                          const allSent = deltaCart.length === 0;

                          return (
                            <button
                              disabled={allSent}
                              onClick={() => {
                                if (!active || allSent) return;
                                const tableNum =
                                  active.kind === "table" ? active.idx + 1 : 0;
                                fetch("/api/pos/send-to-kitchen", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    slug: RESTAURANT_SLUG,
                                    tableNumber: tableNum,
                                    cart: deltaCart,
                                  }),
                                }).catch(() => {});
                                // Add a new round to the table so the sent items are tracked
                                setTables((prev) => {
                                  const next = [...prev];
                                  const t = next[active.idx];
                                  next[active.idx] = {
                                    ...t,
                                    rounds: [
                                      ...(t.rounds ?? []),
                                      {
                                        items: deltaCart as OrderItem[],
                                        sentAt: Date.now(),
                                      },
                                    ],
                                  };
                                  return next;
                                });
                              }}
                              className={`w-full h-11 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                                allSent
                                  ? "bg-emerald-600 text-white opacity-80 cursor-not-allowed"
                                  : `border ${t.border} ${t.surfaceSoft} ${t.textSoft} hover:border-orange-500/40`
                              }`}
                            >
                              {allSent ? (
                                <>
                                  <CheckCircle className="h-4 w-4" />
                                  {tr.kitchenSent}
                                </>
                              ) : (
                                <>
                                  <ChefHat className="h-4 w-4" />
                                  {tr.sendKitchen}
                                </>
                              )}
                            </button>
                          );
                        })()}
                        <button
                          onClick={() => setPayConfirm(true)}
                          className="w-full h-14 rounded-2xl bg-amber-500 text-sm font-bold text-black flex items-center justify-center gap-2 active:bg-amber-400 hover:bg-amber-400"
                        >
                          <Receipt className="h-4 w-4" />
                          {tr.pay} {orderTotal(currentOrder)} DEN
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* ══════════════════════════ MODALS ══════════════════════════════════ */}

      {/* Split Bill Modal */}
      <AnimatePresence>
        {showSplitModal &&
          splitTableIdx !== null &&
          (() => {
            const order = tables[splitTableIdx];
            const allPersonsPaid =
              splitPersons.length > 0 && splitPersons.every((p) => p.paid);
            const unassigned = unassignedItems();
            const totalUnassigned = unassignedTotal();
            return (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`fixed inset-0 ${t.modalOverlay} z-40`}
                  onClick={() => setShowSplitModal(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 24 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 24 }}
                  transition={{ duration: 0.2 }}
                  className={`fixed left-3 right-3 top-14 bottom-4 z-50 ${t.modalBg} rounded-3xl border ${t.border} shadow-2xl flex flex-col overflow-hidden`}
                >
                  <div
                    className={`flex-shrink-0 flex items-center justify-between px-5 py-4 border-b ${t.border}`}
                  >
                    <div>
                      <p className="text-base font-bold flex items-center gap-2">
                        <Divide className="h-4 w-4 text-amber-400" />
                        Split Bill · T{splitTableIdx + 1}
                      </p>
                      <p
                        className={`text-[10px] ${t.textDim} mt-0.5`}
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        {order.items.reduce((s, i) => s + i.qty, 0)} ITEMS ·{" "}
                        {orderTotal(order)} DEN TOTAL
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={addSplitPerson}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${t.actionBtn} transition-colors`}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {tr.addPerson}
                      </button>
                      <button
                        onClick={() => setShowSplitModal(false)}
                        className={`h-8 w-8 rounded-full ${t.backBtn} flex items-center justify-center`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 flex overflow-hidden min-h-0">
                    <div
                      className={`flex-1 overflow-y-auto p-4 space-y-2 border-r ${t.border}`}
                    >
                      <p
                        className={`text-[10px] ${t.textFaint} mb-3`}
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        {tr.assignItems}
                      </p>
                      {order.items.map((item, itemIdx) => {
                        const assignedPerson = itemAssignments[itemIdx];
                        const pc =
                          assignedPerson !== null
                            ? SPLIT_COLORS[
                                splitPersons[assignedPerson]?.colorIdx %
                                  SPLIT_COLORS.length
                              ]
                            : null;
                        return (
                          <div
                            key={`${item.id}-${itemIdx}`}
                            className={`rounded-xl border p-3 transition-all ${pc ? `${pc.bg} ${pc.border}` : `${t.surface} ${t.border}`}`}
                          >
                            <div className="flex items-center justify-between mb-2.5">
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-semibold ${t.textSoft} truncate`}
                                >
                                  {localName(item, lang)}
                                </p>
                                <p
                                  className={`text-xs mt-0.5 ${pc ? pc.text : t.textFaint}`}
                                  style={{ fontFamily: "'DM Mono', monospace" }}
                                >
                                  {item.discount ? (
                                    <>
                                      {ep(item)} × {item.qty} ={" "}
                                      <span className="font-bold">
                                        {ep(item) * item.qty}
                                      </span>{" "}
                                      DEN{" "}
                                      <span className="text-red-400">
                                        (-{item.discount}%)
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      {item.price} × {item.qty} ={" "}
                                      <span className="font-bold">
                                        {item.price * item.qty}
                                      </span>{" "}
                                      DEN
                                    </>
                                  )}
                                </p>
                              </div>
                              {assignedPerson !== null && pc && (
                                <div
                                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ml-2 ${pc.dot}`}
                                >
                                  {assignedPerson + 1}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                onClick={() => assignItem(itemIdx, null)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${assignedPerson === null ? "bg-amber-500 text-black" : `${t.surfaceSoft} ${t.textMuted}`}`}
                              >
                                —
                              </button>
                              {splitPersons.map((person, pIdx) => {
                                const pColor =
                                  SPLIT_COLORS[
                                    person.colorIdx % SPLIT_COLORS.length
                                  ];
                                const isSelected = assignedPerson === pIdx;
                                return (
                                  <button
                                    key={pIdx}
                                    onClick={() => assignItem(itemIdx, pIdx)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${isSelected ? `${pColor.bg} ${pColor.border} ${pColor.text}` : `${t.surfaceSoft} ${t.border} ${t.textMuted}`}`}
                                  >
                                    {person.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {totalUnassigned > 0 && (
                        <div
                          className={`rounded-xl border border-dashed ${t.borderDashed} p-3 text-center`}
                        >
                          <p className={`text-xs ${t.textFaint}`}>
                            {tr.unassigned}{" "}
                            <span className="text-amber-400 font-bold">
                              {totalUnassigned} DEN
                            </span>{" "}
                            ({unassigned.length} item
                            {unassigned.length !== 1 ? "s" : ""})
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="w-48 lg:w-56 flex-shrink-0 overflow-y-auto p-3 space-y-2">
                      <p
                        className={`text-[10px] ${t.textFaint} mb-3`}
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        {tr.checkout}
                      </p>
                      {splitPersons.map((person, pIdx) => {
                        const pc =
                          SPLIT_COLORS[person.colorIdx % SPLIT_COLORS.length];
                        const total = personTotal(pIdx);
                        return (
                          <div
                            key={pIdx}
                            className={`rounded-xl border p-3 transition-all ${person.paid ? "bg-emerald-500/15 border-emerald-500/40" : `${pc.bg} ${pc.border}`}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${pc.dot}`}
                              >
                                {pIdx + 1}
                              </div>
                              <p
                                className={`text-xs font-semibold ${t.textSoft} flex-1 truncate`}
                              >
                                {person.name}
                              </p>
                            </div>
                            <p
                              className={`text-lg font-bold mb-2 ${person.paid ? "text-emerald-400" : t.text}`}
                              style={{ fontFamily: "'DM Mono', monospace" }}
                            >
                              {total}{" "}
                              <span
                                className={`text-xs ${t.textDim} font-normal`}
                              >
                                DEN
                              </span>
                            </p>
                            {person.paid ? (
                              <div className="flex items-center gap-1.5 text-emerald-400">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span className="text-xs font-semibold">
                                  {person.payMethod === "cash"
                                    ? `${tr.cash} ✓`
                                    : `${tr.card} ✓`}
                                </span>
                              </div>
                            ) : total > 0 ? (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => markPaid(pIdx, "cash")}
                                  className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/30 transition-colors"
                                >
                                  CASH
                                </button>
                                <button
                                  onClick={() => markPaid(pIdx, "card")}
                                  className="flex-1 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[10px] font-bold hover:bg-blue-500/30 transition-colors"
                                >
                                  CARD
                                </button>
                              </div>
                            ) : (
                              <p className={`text-[10px] ${t.textFaint}`}>
                                {tr.nothingAssigned}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {allPersonsPaid && (
                        <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-3 text-center">
                          <CheckCircle className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                          <p className="text-xs font-bold text-emerald-400">
                            {tr.allPaid}
                          </p>
                          <p className={`text-[10px] ${t.textFaint} mt-0.5`}>
                            {tr.tableCleared}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </>
            );
          })()}
      </AnimatePresence>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 ${t.modalOverlay} z-40`}
              onClick={() => {
                setShowTransferModal(false);
                setTransferSource(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.18 }}
              className={`fixed left-4 right-4 top-1/4 z-50 ${t.modalBg} rounded-3xl p-6 border ${t.border} shadow-2xl max-h-[60vh] overflow-y-auto`}
            >
              <div className="flex items-center gap-2 mb-4">
                <ArrowRightLeft className="h-5 w-5 text-blue-400" />
                <p className="text-base font-bold">{tr.transferTitle}</p>
              </div>
              <p className={`text-xs ${t.textDim} mb-4`}>
                {transferSource === null
                  ? tr.transferFromHint
                  : tr.transferToHint(transferSource + 1)}
              </p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {tables.map((table, idx) => {
                  const hasItems = table.items.length > 0;
                  const isSource = transferSource === idx;
                  const canSelect =
                    transferSource === null ? hasItems : transferSource !== idx;
                  return (
                    <button
                      key={idx}
                      disabled={!canSelect}
                      onClick={() => {
                        if (transferSource === null) setTransferSource(idx);
                        else handleTransfer(transferSource, idx);
                      }}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${isSource ? "bg-blue-500/20 border-blue-500/50" : !canSelect ? `${t.surface} ${t.border} opacity-30` : `${t.surface} ${t.border} hover:bg-blue-500/10`}`}
                    >
                      <span className="text-sm font-bold">T{idx + 1}</span>
                      {hasItems && (
                        <span className="text-[10px] text-amber-400">
                          {orderTotal(table)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferSource(null);
                }}
                className={`w-full h-11 rounded-2xl ${t.cancelBtn} text-sm font-semibold`}
              >
                {tr.cancel}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Merge Modal */}
      <AnimatePresence>
        {showMergeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 ${t.modalOverlay} z-40`}
              onClick={() => {
                setShowMergeModal(false);
                setMergeSource(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.18 }}
              className={`fixed left-4 right-4 top-1/4 z-50 ${t.modalBg} rounded-3xl p-6 border ${t.border} shadow-2xl max-h-[60vh] overflow-y-auto`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Merge className="h-5 w-5 text-blue-400" />
                <p className="text-base font-bold">{tr.mergeTitle}</p>
              </div>
              <p className={`text-xs ${t.textDim} mb-4`}>
                {mergeSource === null
                  ? tr.mergeFirstHint
                  : tr.mergeSecondHint(mergeSource + 1)}
              </p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {tables.map((table, idx) => {
                  const hasItems = table.items.length > 0;
                  const isSource = mergeSource === idx;
                  const canSelect =
                    mergeSource === null ? hasItems : mergeSource !== idx;
                  return (
                    <button
                      key={idx}
                      disabled={!canSelect}
                      onClick={() => {
                        if (mergeSource === null) setMergeSource(idx);
                        else handleMerge(mergeSource, idx);
                      }}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${isSource ? "bg-purple-500/20 border-purple-500/50" : !canSelect ? `${t.surface} ${t.border} opacity-30` : `${t.surface} ${t.border} hover:bg-purple-500/10`}`}
                    >
                      <span className="text-sm font-bold">T{idx + 1}</span>
                      {hasItems && (
                        <span className="text-[10px] text-amber-400">
                          {orderTotal(table)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setMergeSource(null);
                }}
                className={`w-full h-11 rounded-2xl ${t.cancelBtn} text-sm font-semibold`}
              >
                {tr.cancel}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sections Modal */}
      <AnimatePresence>
        {showSectionsModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 ${t.modalOverlay} z-40`}
              onClick={() => setShowSectionsModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.18 }}
              className={`fixed left-4 right-4 top-16 z-50 ${t.modalBg} rounded-3xl p-6 border ${t.border} shadow-2xl max-h-[75vh] overflow-y-auto`}
            >
              <div className="flex items-center gap-2 mb-1">
                <LayoutGrid className="h-5 w-5 text-purple-400" />
                <p className="text-base font-bold">{tr.tableSections}</p>
              </div>
              <p className={`text-xs ${t.textDim} mb-4`}>
                {tr.assignTablesHint}
              </p>
              <div className="flex gap-2 mb-4">
                {draftSections.map((section) => (
                  <button
                    key={section.name}
                    onClick={() => setActiveDraftSection(section.name)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${
                      activeDraftSection === section.name
                        ? section.name === "Indoor"
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                          : section.name === "Outdoor"
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                            : "bg-purple-500/20 border-purple-500/50 text-purple-400"
                        : `${t.surface} ${t.border} ${t.textMuted}`
                    }`}
                  >
                    {section.name}
                    <span className="ml-1 opacity-60">
                      ({section.tables.length})
                    </span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2 mb-5">
                {Array.from({ length: TABLE_COUNT }, (_, idx) => {
                  const ownerSection = draftSections.find((s) =>
                    s.tables.includes(idx),
                  );
                  const isAssignedHere =
                    ownerSection?.name === activeDraftSection;
                  const isAssignedElsewhere =
                    ownerSection && ownerSection.name !== activeDraftSection;
                  const sectionColor =
                    activeDraftSection === "Indoor"
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                      : activeDraftSection === "Outdoor"
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : "bg-purple-500/20 border-purple-500/50 text-purple-400";
                  const elseColor =
                    ownerSection?.name === "Indoor"
                      ? "border-blue-500/30 text-blue-400/50"
                      : ownerSection?.name === "Outdoor"
                        ? "border-emerald-500/30 text-emerald-400/50"
                        : "border-purple-500/30 text-purple-400/50";
                  return (
                    <button
                      key={idx}
                      onClick={() =>
                        setDraftSections((prev) =>
                          prev.map((s) => {
                            if (s.name === activeDraftSection)
                              return isAssignedHere
                                ? {
                                    ...s,
                                    tables: s.tables.filter((t) => t !== idx),
                                  }
                                : {
                                    ...s,
                                    tables: [...s.tables, idx].sort(
                                      (a, b) => a - b,
                                    ),
                                  };
                            return {
                              ...s,
                              tables: s.tables.filter((t) => t !== idx),
                            };
                          }),
                        )
                      }
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all text-xs font-bold ${isAssignedHere ? sectionColor : isAssignedElsewhere ? `${t.surface} ${elseColor} opacity-50` : `${t.surface} ${t.border} ${t.textMuted}`}`}
                    >
                      T{idx + 1}
                      {isAssignedElsewhere && (
                        <span className="text-[9px] font-normal mt-0.5 opacity-70">
                          {ownerSection.name.slice(0, 3)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 mb-5 flex-wrap">
                {draftSections.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div
                      className={`h-2 w-2 rounded-full ${s.name === "Indoor" ? "bg-blue-400" : s.name === "Outdoor" ? "bg-emerald-400" : "bg-purple-400"}`}
                    />
                    <span
                      className={`text-[10px] ${t.textDim}`}
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                      {s.name.toUpperCase()} · {s.tables.length}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                  <div
                    className={`h-2 w-2 rounded-full ${t.surfaceSoft} border ${t.border}`}
                  />
                  <span
                    className={`text-[10px] ${t.textDim}`}
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {tr.unassignedLabel} ·{" "}
                    {TABLE_COUNT -
                      draftSections.reduce(
                        (sum, s) => sum + s.tables.length,
                        0,
                      )}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSectionsModal(false)}
                  className={`flex-1 h-11 rounded-2xl ${t.cancelBtn} text-sm font-semibold`}
                >
                  {tr.cancel}
                </button>
                <button
                  onClick={() => {
                    setSections(draftSections);
                    setShowSectionsModal(false);
                  }}
                  className="flex-1 h-11 rounded-2xl bg-amber-500 text-sm font-bold text-black"
                >
                  {tr.saveSections}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Person Modal */}
      <AnimatePresence>
        {showNewPerson && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 ${t.modalOverlay} z-40`}
              onClick={() => {
                setShowNewPerson(false);
                setNewPersonName("");
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.18 }}
              className={`fixed left-4 right-4 bottom-1/3 z-50 ${t.modalBg} rounded-3xl p-6 border ${t.borderDashed} shadow-2xl`}
            >
              <p className={`text-base font-bold ${t.text} mb-1`}>
                {tr.newPersonTitle}
              </p>
              <p className={`text-xs ${t.textDim} mb-4`}>{tr.enterNameHint}</p>
              <input
                ref={nameInputRef}
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreatePerson();
                }}
                placeholder={tr.namePlaceholder}
                className={`w-full h-12 rounded-xl border ${t.inputBorder} px-4 text-sm outline-none focus:border-amber-500/50 mb-4`}
                style={{ background: t.inputBgStyle, color: t.inputTextStyle }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowNewPerson(false);
                    setNewPersonName("");
                  }}
                  className={`flex-1 h-11 rounded-2xl ${t.surfaceSoft} text-sm ${t.textMuted} font-semibold`}
                >
                  {tr.cancel}
                </button>
                <button
                  onClick={handleCreatePerson}
                  disabled={!newPersonName.trim()}
                  className="flex-1 h-11 rounded-2xl bg-amber-500 text-sm font-bold text-black disabled:opacity-40"
                >
                  {tr.create}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Table PIN Modal */}
      <AnimatePresence>
        {showTablePinModal && tablePinSlot?.kind === "table" && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 ${t.modalOverlay} z-40`}
              onClick={() => {
                setShowTablePinModal(false);
                setTablePinDigits("");
                setTablePinError("");
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.18 }}
              className={`fixed left-4 right-4 bottom-1/3 z-50 ${t.modalBg} rounded-3xl p-6 border ${t.border} shadow-2xl`}
            >
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="h-4 w-4 text-amber-400" />
                <p className={`text-base font-bold ${t.text}`}>
                  Table {tablePinSlot.idx + 1}
                  {tables[tablePinSlot.idx].waiterName && (
                    <span className="text-amber-400">
                      {" "}
                      · {tables[tablePinSlot.idx].waiterName}
                    </span>
                  )}
                </p>
              </div>
              <p className={`text-xs ${t.textDim} mb-4`}>
                {tables[tablePinSlot.idx].items.length > 0
                  ? tr.enterPinContinue
                  : tr.enterPinClaim}
              </p>
              <input
                type="number"
                inputMode="numeric"
                maxLength={3}
                placeholder={tr.pinPlaceholder}
                value={tablePinDigits}
                autoFocus
                onChange={(e) => {
                  setTablePinDigits(e.target.value.slice(0, 3));
                  setTablePinError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tablePinDigits.length === 3)
                    confirmTablePin();
                }}
                className={`w-full h-12 rounded-xl border ${t.inputBorder} px-4 text-sm outline-none focus:border-amber-500/50 mb-2`}
                style={{ background: t.inputBgStyle, color: t.inputTextStyle }}
                data-testid="input-table-pin"
              />
              {tablePinError && (
                <p className="text-xs text-red-400 mb-3">{tablePinError}</p>
              )}
              {!tablePinError && <div className="mb-3" />}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowTablePinModal(false);
                    setTablePinDigits("");
                    setTablePinError("");
                  }}
                  className={`flex-1 h-11 rounded-2xl ${t.surfaceSoft} text-sm ${t.textMuted} font-semibold`}
                >
                  {tr.cancel}
                </button>
                <button
                  onClick={confirmTablePin}
                  disabled={tablePinDigits.length !== 3 || tablePinLoading}
                  className="flex-1 h-11 rounded-2xl bg-amber-500 text-sm font-bold text-black disabled:opacity-40"
                  data-testid="button-confirm-table-pin"
                >
                  {tablePinLoading ? "…" : tr.enterBtn}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Incoming Order Claim Modal (full-screen numpad) */}
      <AnimatePresence>
        {showClaimModal &&
          claimModalOrder &&
          (() => {
            const order = claimModalOrder;
            const cartTotal = safeParseCart(order.cart).reduce(
              (s: number, i: any) => s + i.price * i.qty,
              0,
            );
            const tableNum = Number(order.tableNumber);
            const numpadKeys = [
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "",
              "0",
              "⌫",
            ];
            const handleNumpad = (key: string) => {
              if (key === "⌫") {
                setPinDigits((prev) => prev.slice(0, -1));
                setClaimError("");
              } else if (key !== "" && pinDigits.length < 3) {
                setPinDigits((prev) => prev + key);
                setClaimError("");
              }
            };
            const handleConfirmClaim = async () => {
              if (pinDigits.length !== 3 || claimLoading) return;
              setClaimLoading(true);
              setClaimError("");
              try {
                const res = await fetch(`/api/orders/${order.id}/claim`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pinCode: pinDigits, restaurantId }),
                });
                if (res.ok) {
                  const claimed = await res.json();
                  const tableIdx = tableNum - 1;
                  if (tableIdx >= 0 && tableIdx < TABLE_COUNT) {
                    setTables((prev) => {
                      const next = [...prev];
                      next[tableIdx] = {
                        ...next[tableIdx],
                        waiterId: claimed.waiterId,
                        waiterName: claimed.waiterName,
                      };
                      return next;
                    });
                  }
                  setShowClaimModal(false);
                  setClaimModalOrder(null);
                  setClaimTarget(null);
                  setPinDigits("");
                  refetchOrders();
                  if (tableIdx >= 0 && tableIdx < TABLE_COUNT) {
                    setActive({ kind: "table", idx: tableIdx });
                    setScreen("menu");
                    setActiveCategory("All");
                  }
                } else {
                  const d = await res.json();
                  setClaimError(d.message || tr.wrongPin);
                }
              } catch {
                setClaimError(tr.networkError);
              } finally {
                setClaimLoading(false);
              }
            };
            return (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`fixed inset-0 ${t.modalOverlay} z-50`}
                  onClick={() => {
                    setShowClaimModal(false);
                    setClaimModalOrder(null);
                    setPinDigits("");
                    setClaimError("");
                  }}
                />
                <motion.div
                  initial={{ opacity: 0, y: "100%" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: "100%" }}
                  transition={{ type: "spring", stiffness: 340, damping: 34 }}
                  className={`fixed left-0 right-0 bottom-0 z-50 ${t.modalBg} rounded-t-3xl border-t border-l border-r ${t.border} shadow-2xl overflow-hidden`}
                  style={{
                    paddingBottom:
                      "max(20px, env(safe-area-inset-bottom, 20px))",
                  }}
                >
                  <div
                    className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <Bell className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${t.text}`}>
                          {tr.claimOrder}
                        </p>
                        <p
                          className={`text-[11px] ${t.textMuted}`}
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        >
                          {tr.tableTag} {tableNum} · {cartTotal} DEN
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowClaimModal(false);
                        setClaimModalOrder(null);
                        setPinDigits("");
                        setClaimError("");
                      }}
                      className={`h-8 w-8 rounded-full ${t.backBtn} flex items-center justify-center`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div
                    className={`mx-4 mt-3 rounded-2xl ${t.surface} border ${t.border} px-4 py-3 max-h-28 overflow-y-auto`}
                  >
                    {safeParseCart(order.cart).map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between text-xs py-0.5"
                      >
                        <span className={t.textMuted}>
                          {item.qty}× {localName(item, lang)}
                        </span>
                        <span className={`font-semibold ${t.text}`}>
                          {item.price * item.qty} DEN
                        </span>
                      </div>
                    ))}
                  </div>
                  {order.customerNote && (
                    <div className="mx-4 mt-2 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                      <span className="text-amber-400 text-sm flex-shrink-0">
                        📝
                      </span>
                      <p className="text-xs text-amber-300 leading-snug">
                        {order.customerNote}
                      </p>
                    </div>
                  )}
                  <div className="px-5 pt-4 pb-2">
                    <p
                      className={`text-[10px] font-bold ${t.textDim} mb-2 text-center`}
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                      {tr.enterYourPin}
                    </p>
                    <div className="flex items-center justify-center gap-4 mb-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={`h-12 w-12 rounded-2xl border-2 flex items-center justify-center text-xl font-bold transition-all ${pinDigits.length > i ? "border-amber-500 bg-amber-500/15 text-amber-400" : `${t.border} ${t.surface} ${t.textFaint}`}`}
                        >
                          {pinDigits.length > i ? "●" : ""}
                        </div>
                      ))}
                    </div>
                    {claimError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-400 text-center mb-1"
                      >
                        {claimError}
                      </motion.p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 px-5 pb-1">
                    {numpadKeys.map((key, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleNumpad(key)}
                        disabled={key === ""}
                        className={`h-14 rounded-2xl text-xl font-bold transition-all select-none ${key === "" ? "opacity-0 pointer-events-none" : key === "⌫" ? `${t.surfaceSoft} ${t.textMuted} active:scale-95` : `${t.surface} ${t.text} active:bg-amber-500/20 active:scale-95`}`}
                        style={{
                          fontFamily:
                            key === "⌫" ? "system-ui" : "'DM Mono', monospace",
                        }}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                  <div className="px-5 pt-2">
                    <button
                      onClick={handleConfirmClaim}
                      disabled={pinDigits.length !== 3 || claimLoading}
                      className="w-full h-14 rounded-2xl bg-amber-500 text-black font-bold text-sm disabled:opacity-40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      data-testid="button-confirm-incoming-claim"
                    >
                      {claimLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <Coffee className="h-4 w-4" />
                        </motion.div>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4" />
                          {tr.confirmClaim}
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </>
            );
          })()}
      </AnimatePresence>

      {/* Orders Panel *
      <AnimatePresence>
        {showOrdersPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/60"
              onClick={() => {
                setShowOrdersPanel(false);
                setClaimTarget(null);
                setPinDigits("");
                setClaimError("");
              }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute inset-y-0 right-0 z-50 w-full max-w-sm flex flex-col"
              style={{ background: isLight ? "#fff" : "#1c1917" }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: isLight ? "#e5e7eb" : "#292524" }}
              >
                <div>
                  <h2 className={`text-base font-bold ${t.text}`}>
                    {tr.ordersTitle}
                  </h2>
                  <p className={`text-xs ${t.textMuted}`}>
                    {
                      dbOrders.filter((o: any) => o.status !== "completed")
                        .length
                    }{" "}
                    {tr.activeCount}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowOrdersPanel(false);
                    setClaimTarget(null);
                    setPinDigits("");
                    setClaimError("");
                  }}
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${t.backBtn}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {dbOrders.length === 0 && (
                  <div className={`text-center py-12 ${t.textMuted} text-sm`}>
                    {tr.noOrdersYet}
                  </div>
                )}
                {[...dbOrders]
                  .filter((o: any) => o.status !== "completed")
                  .sort(
                    (a: any, b: any) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime(),
                  )
                  .map((order: any) => {
                    const total = safeParseCart(order.cart).reduce(
                      (s: number, i: any) => s + i.price * i.qty,
                      0,
                    );
                    const statusCfg =
                      order.status === "pending"
                        ? {
                            label: tr.statusPending,
                            color: "bg-amber-500/20 text-amber-500",
                          }
                        : order.status === "claimed"
                          ? {
                              label: tr.statusClaimed,
                              color: "bg-blue-500/20 text-blue-400",
                            }
                          : {
                              label: tr.statusDone,
                              color: "bg-emerald-500/20 text-emerald-400",
                            };
                    return (
                      <div
                        key={order.id}
                        className={`rounded-2xl border p-4 space-y-3 ${isLight ? "border-gray-200 bg-gray-50" : "border-stone-700 bg-stone-800/60"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`font-bold text-sm ${t.text}`}>
                              Table {order.tableNumber}
                            </p>
                            <p className={`text-xs ${t.textMuted}`}>
                              {new Date(order.createdAt).toLocaleTimeString(
                                "sq",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </p>
                            {order.waiterName && (
                              <p className={`text-xs mt-0.5 ${t.textMuted}`}>
                                👤 {order.waiterName}
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.color}`}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {safeParseCart(order.cart).map(
                            (item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between text-xs"
                              >
                                <span className={t.textMuted}>
                                  {item.qty}× {localName(item, lang)}
                                </span>
                                <span className={`font-semibold ${t.text}`}>
                                  {item.price * item.qty} DEN
                                </span>
                              </div>
                            ),
                          )}
                          <div
                            className={`flex justify-between text-xs font-bold pt-1 border-t ${isLight ? "border-gray-200" : "border-stone-700"}`}
                          >
                            <span className={t.text}>Total</span>
                            <span className="text-amber-500">{total} DEN</span>
                          </div>
                        </div>
                        {order.customerNote && (
                          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                            <span className="text-amber-400 text-sm flex-shrink-0">📝</span>
                            <p className={`text-xs leading-snug ${isLight ? "text-amber-700" : "text-amber-300"}`}>{order.customerNote}</p>
                          </div>
                        )}
                        {order.status === "pending" &&
                          (claimTarget === order.id ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <KeyRound
                                  className={`h-4 w-4 flex-shrink-0 ${t.textMuted}`}
                                />
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  maxLength={3}
                                  placeholder={tr.pinPlaceholder}
                                  value={pinDigits}
                                  onChange={(e) => {
                                    setPinDigits(e.target.value.slice(0, 3));
                                    setClaimError("");
                                  }}
                                  className={`flex-1 h-9 rounded-xl border px-3 text-sm outline-none focus:border-amber-500/60 ${isLight ? "border-gray-300 bg-white text-gray-900" : "border-stone-600 bg-stone-900 text-white"}`}
                                  autoFocus
                                  data-testid="input-pin"
                                />
                              </div>
                              {claimError && (
                                <p className="text-xs text-red-400">
                                  {claimError}
                                </p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setClaimTarget(null);
                                    setPinDigits("");
                                    setClaimError("");
                                  }}
                                  className={`flex-1 h-9 rounded-xl text-xs font-semibold ${t.surfaceSoft} ${t.textMuted}`}
                                >
                                  {tr.cancel}
                                </button>
                                <button
                                  disabled={
                                    pinDigits.length !== 3 || claimLoading
                                  }
                                  onClick={async () => {
                                    setClaimLoading(true);
                                    setClaimError("");
                                    try {
                                      const res = await fetch(
                                        `/api/orders/${order.id}/claim`,
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            pinCode: pinDigits,
                                            restaurantId,
                                          }),
                                        },
                                      );
                                      if (res.ok) {
                                        const claimed = await res.json();
                                        const tableIdx =
                                          Number(order.tableNumber) - 1;
                                        if (
                                          tableIdx >= 0 &&
                                          tableIdx < TABLE_COUNT
                                        ) {
                                          setTables((prev) => {
                                            const next = [...prev];
                                            next[tableIdx] = {
                                              ...next[tableIdx],
                                              waiterId: claimed.waiterId,
                                              waiterName: claimed.waiterName,
                                            };
                                            return next;
                                          });
                                        }
                                        setClaimTarget(null);
                                        setPinDigits("");
                                        refetchOrders();
                                        if (
                                          tableIdx >= 0 &&
                                          tableIdx < TABLE_COUNT
                                        ) {
                                          setShowOrdersPanel(false);
                                          setActive({
                                            kind: "table",
                                            idx: tableIdx,
                                          });
                                          setScreen("menu");
                                          setActiveCategory("All");
                                        }
                                      } else {
                                        const d = await res.json();
                                        setClaimError(d.message || tr.error);
                                      }
                                    } catch {
                                      setClaimError(tr.networkError);
                                    } finally {
                                      setClaimLoading(false);
                                    }
                                  }}
                                  className="flex-1 h-9 rounded-xl bg-amber-500 text-black text-xs font-bold disabled:opacity-40"
                                  data-testid="button-confirm-claim"
                                >
                                  {claimLoading ? "…" : tr.confirm}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setClaimTarget(order.id);
                                setPinDigits("");
                                setClaimError("");
                              }}
                              className="w-full h-9 rounded-xl bg-amber-500 text-black text-xs font-bold"
                              data-testid={`button-take-order-${order.id}`}
                            >
                              {tr.claimOrderBtn}
                            </button>
                          ))}
                        {order.status === "claimed" && (
                          <button
                            onClick={async () => {
                              await fetch(`/api/orders/${order.id}/complete`, {
                                method: "POST",
                              });
                              refetchOrders();
                            }}
                            className="w-full h-9 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                            data-testid={`button-complete-order-${order.id}`}
                          >
                            {tr.markDone}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Radial Quick-Add Menu */}
      {radialMenu && (
        <RadialMenu
          x={radialMenu.x}
          y={radialMenu.y}
          isLight={isLight}
          onClose={() => setRadialMenu(null)}
          onSelect={(qty) => {
            for (let i = 0; i < qty; i++) addItem(radialMenu.item);
            setRadialMenu(null);
          }}
        />
      )}
    </div>
  );
}
