import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { TrendingUp } from "lucide-react";
import { Search } from "lucide-react";
import {
  Loader2,
  UtensilsCrossed,
  Globe,
  Phone,
  MapPin,
  Plus,
  Minus,
  ShoppingBag,
  X,
  Leaf,
  WheatOff,
  Clock,
  CheckCircle2,
  Mic,
  Share2,
  Facebook,
  Twitter,
  Link as LinkIcon,
  Copy,
  Check,
  Sparkles,
  Bot,
  Send,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type MenuItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDarkMode } from "@/hooks/useDarkMode";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

// ─── Constants ────────────────────────────────────────────────────────────────

const LANG_KEY = "hajdeha-lang" as const;
const DEFAULT_COORDS: [number, number] = [42.01, 20.97];
const LEAFLET_CDN = "https://unpkg.com/leaflet@1.7.1/dist/images";

// ─── Category name translations ───────────────────────────────────────────────

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
  juices: { al: "Lëngje", mk: "Сокови" },
  juice: { al: "Lëng", mk: "Сок" },
  tea: { al: "Çaj", mk: "Чај" },
  water: { al: "Ujë", mk: "Вода" },
  extra: { al: "Ekstra", mk: "Екстра" },
  extras: { al: "Ekstra", mk: "Екстра" },
  "hot drinks": { al: "Pije të nxehta", mk: "Топли пијалоци" },
  "hot drink": { al: "Pije e nxehtë", mk: "Топол пијалок" },
  "cold drinks": { al: "Pije të ftohta", mk: "Ладни пијалоци" },
  "soft drinks": { al: "Pije freskuese", mk: "Безалкохолни пијалоци" },
  appetizers: { al: "Antipastet", mk: "Предјадења" },
  appetizer: { al: "Antipaste", mk: "Предјадење" },
  wraps: { al: "Rolat", mk: "Ролати" },
  wrap: { al: "Rolat", mk: "Ролат" },
  sushi: { al: "Sushi", mk: "Суши" },
  tacos: { al: "Takos", mk: "Такос" },
};

function getCategoryDisplay(cat: string, lang: "en" | "al" | "mk"): string {
  if (lang === "en") return cat;
  const entry = CATEGORY_NAMES[cat.toLowerCase().trim()];
  if (entry) return entry[lang];
  return cat;
}

// ─── Translations ─────────────────────────────────────────────────────────────

const translations: Record<string, any> = {
  en: {
    orderOnWhatsapp: "Order on WhatsApp",
    newOrder: "New Order",
    total: "Total",
    loading: "Loading Menu...",
    notFound: "Restaurant Not Found",
    notFoundDesc:
      "We couldn't find the menu you're looking for. Please check the URL and try again.",
    openNow: "Open Now",
    closed: "Closed",
    reserve: "Reserve Table",
    website: "Website",
    viewOrder: "View Order",
    orderSummary: "Order Summary",
    quantity: "Qty",
    item: "Item",
    price: "Price",
    totalBill: "Total Bill",
    clear: "Clear",
    callToOrder: "Call to Order",
    about: "About",
    ourLocation: "Our Location",
    poweredBy: "Powered by HAJDE HA",
    allCategories: "All Categories",
    allDietary: "All Dietary",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    glutenFree: "Gluten-Free",
    spicy: "Spicy",
    containsNuts: "Contains Nuts",
    yourName: "Your Name",
    enterYourName: "Enter your name",
    pleaseEnterName: "Please enter your name",
    customerName: "Name",
    orderType: "Order Type",
    dineIn: "Dine In",
    takeaway: "Takeaway",
    deliveryTime: "Delivery Time",
    asap: "ASAP",
    customTime: "Custom Time",
    voiceSearch: "Voice Search",
    listening: "Listening...",
    tapToSpeak: "Tap to speak",
    voiceNotSupported: "Voice search not supported",
    aiSearching: "Finding best matches...",
    foundMatches: "Found {count} matches for",
    noVoiceMatches: "No items match your search. Try different words.",
    shareItem: "Share Item",
    shareOn: "Share on",
    copyLink: "Copy Link",
    linkCopied: "Link copied!",
    searchPlaceholder: "  Search menu items...",
    restaurantClosed: "Restaurant is currently closed",
    closedAsapWarning:
      "The restaurant is closed. ASAP orders are not available right now.",
    scheduleForLater: "Schedule for later",
    outsideHours: "Selected time is outside working hours",
    selectWithinHours: "Please select a time within opening hours",
    peopleAlsoOrdered: "People Also Ordered",
  },
  al: {
    orderOnWhatsapp: "Porosit në WhatsApp",
    newOrder: "Porosi e re",
    total: "Totali",
    loading: "Duke ngarkuar menunë...",
    notFound: "Restoranti nuk u gjet",
    notFoundDesc:
      "Nuk mundëm ta gjenim menunë që kërkoni. Ju lutemi kontrolloni URL-në dhe provoni përsëri.",
    openNow: "Hapur tani",
    closed: "Mbyllur",
    reserve: "Rezervoni tavolinë",
    website: "Uebfaqja",
    viewOrder: "Shiko porosinë",
    orderSummary: "Përmbledhja e porosisë",
    quantity: "Sasia",
    item: "Artikulli",
    price: "Çmimi",
    totalBill: "Fatura totale",
    clear: "Pastro",
    callToOrder: "Telefono për porosi",
    about: "Rreth",
    ourLocation: "Lokacioni ynë",
    poweredBy: "Mundësuar nga HAJDE HA",
    allCategories: "Të gjitha kategoritë",
    allDietary: "Të gjitha dietat",
    vegetarian: "Vegjetariane",
    vegan: "Vegane",
    glutenFree: "Pa gluten",
    spicy: "Djegëse",
    containsNuts: "Përmban arra",
    yourName: "Emri juaj",
    enterYourName: "Shkruani emrin tuaj",
    pleaseEnterName: "Ju lutemi shkruani emrin tuaj",
    customerName: "Emri",
    orderType: "Lloji i porosisë",
    dineIn: "Hani këtu",
    takeaway: "Për me vete",
    deliveryTime: "Koha e dorëzimit",
    asap: "Sa më shpejt",
    customTime: "Kohë custom",
    voiceSearch: "Kërkim me zë",
    listening: "Duke dëgjuar...",
    tapToSpeak: "Kliko për të folur",
    voiceNotSupported: "Kërkimi me zë nuk mbështetet",
    aiSearching: "Duke gjetur përputhjet më të mira...",
    foundMatches: "U gjetën {count} përputhje për",
    noVoiceMatches: "Nuk ka artikuj që përputhen. Provo fjalë të tjera.",
    shareItem: "Ndaj artikullin",
    shareOn: "Ndaj në",
    copyLink: "Kopjo lidhjen",
    linkCopied: "Lidhja u kopjua!",
    searchPlaceholder: "  Kërko në menu...",
    restaurantClosed: "Restoranti aktualisht është i mbyllur",
    closedAsapWarning:
      "Restoranti është i mbyllur. Porositë menjëherë nuk janë të disponueshme.",
    scheduleForLater: "Planifiko për më vonë",
    outsideHours: "Koha e zgjedhur është jashtë orarit të punës",
    selectWithinHours: "Ju lutemi zgjidhni një kohë brenda orarit të hapjes",
    peopleAlsoOrdered: "Të tjerë porositen edhe",
  },
  mk: {
    orderOnWhatsapp: "Нарачај на WhatsApp",
    newOrder: "Нова нарачка",
    total: "Вкупно",
    loading: "Се вчитува менито...",
    notFound: "Ресторанот не е пронајден",
    notFoundDesc:
      "Не можевме да го најдеме менито што го барате. Ве молиме проверете ја URL-адресата и обидете се повторно.",
    openNow: "Отворено сега",
    closed: "Затворено",
    reserve: "Резервирај маса",
    website: "Веб-страница",
    viewOrder: "Види нарачка",
    orderSummary: "Преглед на нарачката",
    quantity: "Количина",
    item: "Производ",
    price: "Цена",
    totalBill: "Вкупна сметка",
    clear: "Исчисти",
    callToOrder: "Повикај за нарачка",
    about: "За",
    ourLocation: "Нашата локација",
    poweredBy: "Овозможено од HAJDE HA",
    allCategories: "Сите категории",
    allDietary: "Сите диети",
    vegetarian: "Вегетаријанско",
    vegan: "Веганско",
    glutenFree: "Без глутен",
    spicy: "Луто",
    containsNuts: "Содржи јаткасти плодови",
    yourName: "Вашето име",
    enterYourName: "Внесете го вашето ime",
    pleaseEnterName: "Ве молиме внесете го вашето ime",
    customerName: "Ime",
    orderType: "Тип на нарачка",
    dineIn: "Јадење тука",
    takeaway: "За понесување",
    deliveryTime: "Време на достава",
    asap: "Што побрзо",
    customTime: "Прилагодено време",
    voiceSearch: "Гласовно пребарување",
    listening: "Слушам...",
    tapToSpeak: "Допрете за да зборувате",
    voiceNotSupported: "Гласовното пребарување не е поддржано",
    aiSearching: "Се бара најдобри совпаѓања...",
    foundMatches: "Пронајдени {count} совпаѓања за",
    noVoiceMatches: "Нема ставки што одговараат. Обидете се со други зборови.",
    shareItem: "Сподели производ",
    shareOn: "Сподели на",
    copyLink: "Копирај линк",
    linkCopied: "Линкот е копиран!",
    searchPlaceholder: "  Пребарај во менито...",
    restaurantClosed: "Ресторанот е тековно затворен",
    closedAsapWarning:
      "Ресторанот е затворен. Нарачките веднаш не се достапни.",
    scheduleForLater: "Закажи за подоцна",
    outsideHours: "Избраното време е надвор од работното време",
    selectWithinHours: "Изберете време во рамките на работното време",
    peopleAlsoOrdered: "Другите нарачале и",
  },
};

const leafletStyles = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .leaflet-container {
    width: 100%;
    height: 100%;
    border-radius: 1rem;
    z-index: 10;
  }
`;

// ─── Animation Variants ───────────────────────────────────────────────────────

const heroVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 24 },
  },
};

const EASE_OUT_QUART = [0.25, 0.46, 0.45, 0.94] as const;

// ─── Debounce Hook ────────────────────────────────────────────────────────────

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  let wordMatches = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        wordMatches++;
        break;
      }
    }
  }
  const wordScore = wordMatches / Math.max(words1.length, words2.length);
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  const distanceScore = 1 - distance / maxLen;
  return Math.max(wordScore, distanceScore);
}

function findBestMatches(
  query: string,
  items: MenuItem[],
  lang: "en" | "al" | "mk",
  threshold: number = 0.3,
): MenuItem[] {
  const scoredItems = items.map((item) => {
    const name =
      lang === "al" && item.nameAl
        ? item.nameAl
        : lang === "mk" && item.nameMk
          ? item.nameMk
          : item.name;
    const description =
      lang === "al" && item.descriptionAl
        ? item.descriptionAl
        : lang === "mk" && item.descriptionMk
          ? item.descriptionMk
          : item.description;
    const nameScore = calculateSimilarity(query, name);
    const descScore = description
      ? calculateSimilarity(query, description) * 0.7
      : 0;
    const categoryScore = calculateSimilarity(query, item.category) * 0.5;
    return { item, score: Math.max(nameScore, descScore, categoryScore) };
  });
  return scoredItems
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
}

function IsOpen(openingTime?: string, closingTime?: string): boolean {
  if (!openingTime || !closingTime) return true;
  const d = new Date();
  const currentTime = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  if (closingTime <= openingTime) {
    return currentTime >= openingTime || currentTime <= closingTime;
  }
  return currentTime >= openingTime && currentTime <= closingTime;
}

function getSchedulingConstraints(
  openingTime?: string,
  closingTime?: string,
): { minDateTime: string; openingTime: string; closingTime: string } {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const now = new Date();
  const open = openingTime || "08:00";
  const close = closingTime || "23:00";
  const isCurrentlyOpen = IsOpen(openingTime, closingTime);
  let baseDate: Date;
  if (isCurrentlyOpen) {
    baseDate = now;
  } else {
    baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() + 1);
  }
  const dateStr = `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())}`;
  const minDateTime = isCurrentlyOpen
    ? `${dateStr}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    : `${dateStr}T${open}`;
  return { minDateTime, openingTime: open, closingTime: close };
}

function isWithinOpeningHours(
  dateTimeStr: string,
  openingTime: string,
  closingTime: string,
): boolean {
  if (!dateTimeStr) return false;
  const chosen = new Date(dateTimeStr);
  const h = chosen.getHours();
  const m = chosen.getMinutes();
  const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  if (closingTime <= openingTime) {
    return timeStr >= openingTime || timeStr <= closingTime;
  }
  return timeStr >= openingTime && timeStr <= closingTime;
}

// ─── Voice Search Hook ─────────────────────────────────────────────────────────

function useVoiceSearch(
  onResult: (text: string, matches: MenuItem[]) => void,
  allItems: MenuItem[],
  lang: "en" | "al" | "mk",
) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  // ✅ Fixed: useRef instead of useState — instance persists across renders
  const recognitionRef = useRef<any>(null);
  // Keep latest onResult/allItems accessible without re-creating recognition
  const onResultRef = useRef(onResult);
  const allItemsRef = useRef(allItems);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  useEffect(() => {
    allItemsRef.current = allItems;
  }, [allItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang =
      { en: "en-US", al: "sq-AL", mk: "mk-MK" }[lang] ?? "en-US";
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResultRef.current(
        transcript,
        findBestMatches(transcript, allItemsRef.current, lang),
      );
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.abort(); // ✅ cleanup on lang change
    };
  }, [lang]); // only re-init when lang changes

  return {
    isListening,
    isSupported,
    startListening: () => {
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    },
    stopListening: () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    },
  };
}

// ─── Share Dialog ──────────────────────────────────────────────────────────────

function ShareDialog({
  item,
  restaurantSlug,
  lang,
}: {
  item: MenuItem;
  restaurantSlug: string;
  lang: "en" | "al" | "mk";
}) {
  const t = translations[lang];
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const itemUrl = `${window.location.origin}/restaurant/${restaurantSlug}#item-${item.id}`;
  const shareText = `Check out ${item.name} at ${item.price}!`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(itemUrl);
      setCopied(true);
      toast({ title: t.linkCopied });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error(err);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-primary/10 flex-shrink-0"
        >
          <Share2 className="h-3.5 w-3.5 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white dark:bg-stone-800 mx-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="dark:text-stone-100">
            {t.shareItem}
          </DialogTitle>
          <DialogDescription className="dark:text-stone-400">
            {item.name} - {item.price}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2 text-sm"
              onClick={() =>
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(itemUrl)}`,
                  "_blank",
                )
              }
            >
              <Facebook className="h-4 w-4 text-blue-600" />
              Facebook
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 text-sm"
              onClick={() =>
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(itemUrl)}`,
                  "_blank",
                )
              }
            >
              <Twitter className="h-4 w-4 text-sky-500" />
              Twitter
            </Button>
          </div>
          {"share" in navigator && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={async () => {
                try {
                  await navigator.share({
                    title: item.name,
                    text: shareText,
                    url: itemUrl,
                  });
                } catch {}
              }}
            >
              <Share2 className="h-4 w-4" />
              {t.shareOn}...
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={itemUrl}
              className="flex-1 bg-stone-50 dark:bg-stone-700 dark:text-stone-100 text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyLink}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── People Also Ordered ───────────────────────────────────────────────────────

function PeopleAlsoOrdered({
  currentItemId,
  allItems,
  onAddToCart,
  lang,
}: {
  currentItemId: number;
  allItems: MenuItem[];
  onAddToCart: (itemId: number) => void;
  lang: "en" | "al" | "mk";
}) {
  const t = translations[lang];
  const currentItem = allItems.find((item) => item.id === currentItemId);
  // ✅ Fixed: stable shuffle seed so suggestions don't change on every render
  const shuffleSeed = useRef(Math.random());

  const suggestions = useMemo(() => {
    if (!currentItem) return [];
    return allItems
      .filter(
        (i) =>
          i.id !== currentItemId &&
          i.category === currentItem.category &&
          i.active,
      )
      .sort(
        (a, b) =>
          ((a.id * shuffleSeed.current) % 1) -
          ((b.id * shuffleSeed.current) % 1),
      )
      .slice(0, 3);
  }, [currentItemId, allItems, currentItem]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
          {t.peopleAlsoOrdered}
        </h4>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-700/50 border border-stone-100 dark:border-stone-600"
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-stone-900 dark:text-stone-100 truncate">
                {item.name}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                {item.description}
              </p>
              <p className="text-sm font-bold text-primary mt-0.5">
                {item.price}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full flex-shrink-0 hover:bg-primary/10"
              onClick={() => onAddToCart(item.id)}
            >
              <Plus className="h-4 w-4 text-primary" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared Leaflet loader (cached promise so CSS only imports once) ───────────
let leafletPromise: Promise<any> | null = null;
function loadLeaflet() {
  if (!leafletPromise) {
    leafletPromise = import("leaflet").then(async (L) => {
      await import("leaflet/dist/leaflet.css");
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: `${LEAFLET_CDN}/marker-icon-2x.png`,
        iconUrl: `${LEAFLET_CDN}/marker-icon.png`,
        shadowUrl: `${LEAFLET_CDN}/marker-shadow.png`,
      });
      return L;
    });
  }
  return leafletPromise;
}

// ─── Inline Map ────────────────────────────────────────────────────────────────

function InlineMap({
  latitude,
  longitude,
  name,
}: {
  latitude?: string | null;
  longitude?: string | null;
  name: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const initedRef = useRef(false); // ← prevents double-init in StrictMode
  const [isReady, setIsReady] = useState(false);

  const position: [number, number] = useMemo(
    () =>
      latitude && longitude && !isNaN(+latitude) && !isNaN(+longitude)
        ? [+latitude, +longitude]
        : DEFAULT_COORDS,
    [latitude, longitude],
  );

  useEffect(() => {
    // Guard: only ever init once per mount
    if (initedRef.current) return;
    initedRef.current = true;

    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;
        const map = L.map(containerRef.current).setView(position, 15);
        mapRef.current = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
        }).addTo(map);
        L.marker(position).addTo(map).bindPopup(name).openPopup();
        if (!cancelled) setIsReady(true);
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") console.error(err);
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      // Reset so a future remount (real unmount/remount) re-inits correctly
      initedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty — init once; position/name are stable on first render

  return (
    <div className="w-full h-40 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-600 mt-2 relative">
      <style>{leafletStyles}</style>
      <AnimatePresence>
        {!isReady && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-100 dark:bg-stone-700 rounded-xl flex items-center justify-center text-stone-400 text-xs z-10"
          >
            Loading map...
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

// ─── Restaurant Map ────────────────────────────────────────────────────────────

function RestaurantMap({
  name,
  latitude,
  longitude,
}: {
  location: string;
  name: string;
  latitude?: string | null;
  longitude?: string | null;
}) {
  const { slug } = useParams<{ slug: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const initedRef = useRef(false); // ← prevents double-init in StrictMode
  const watchIdRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [slug]);

  const position: [number, number] = useMemo(
    () =>
      latitude && longitude && !isNaN(+latitude) && !isNaN(+longitude)
        ? [+latitude, +longitude]
        : DEFAULT_COORDS,
    [latitude, longitude],
  );

  useEffect(() => {
    // Guard: only ever init once per mount
    if (initedRef.current) return;
    initedRef.current = true;

    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        const map = L.map(containerRef.current).setView(position, 15);
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        L.marker(position).addTo(map).bindPopup(name).openPopup();

        let userMarker: any = null;
        if (navigator.geolocation) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              if (cancelled) return;
              const userPos: [number, number] = [
                pos.coords.latitude,
                pos.coords.longitude,
              ];
              const userIcon = L.divIcon({
                html: `<div style="width:16px;height:16px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(37,99,235,0.25);"></div>`,
                className: "",
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              });
              if (!userMarker) {
                userMarker = L.marker(userPos, { icon: userIcon })
                  .addTo(map)
                  .bindPopup("Your Location");
                map.fitBounds(L.latLngBounds([position, userPos]), {
                  padding: [40, 40],
                });
              } else {
                userMarker.setLatLng(userPos);
              }
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 },
          );
        }

        if (!cancelled) setIsReady(true);
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") console.error(err);
      });

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      mapRef.current?.remove();
      mapRef.current = null;
      // Reset so a future real remount re-inits correctly
      initedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty — init once; position/name stable on first render

  return (
    <div className="w-full h-64 sm:h-80 relative rounded-2xl overflow-hidden shadow-lg border border-stone-200 dark:border-stone-700">
      <style>{leafletStyles}</style>
      <AnimatePresence>
        {!isReady && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-100 dark:bg-stone-800 animate-pulse rounded-2xl flex items-center justify-center text-stone-400 dark:text-stone-500 z-10"
          >
            Loading Map...
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

// ─── Group items ───────────────────────────────────────────────────────────────

const groupItems = (items: MenuItem[]) => {
  const groups: Record<string, MenuItem[]> = {};
  const order = ["Starters", "Mains", "Sides", "Desserts", "Drinks"];
  items.forEach((item) => {
    if (!item.active) return;
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  });
  return Object.entries(groups).sort(([a], [b]) => {
    const idxA = order.indexOf(a),
      idxB = order.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
};

// ─── Order Form (shared between mobile & desktop) ─────────────────────────────

interface OrderFormContentProps {
  cart: Record<number, number>;
  menuItems: MenuItem[];
  customerName: string;
  setCustomerName: (v: string) => void;
  orderType: "dineIn" | "takeaway";
  setOrderType: (v: "dineIn" | "takeaway") => void;
  deliveryTime: "asap" | "custom";
  setDeliveryTime: (v: "asap" | "custom") => void;
  customDateTime: string;
  setCustomDateTime: (v: string) => void;
  isOpen: boolean;
  scheduling: { minDateTime: string; openingTime: string; closingTime: string };
  openingTime?: string;
  closingTime?: string;
  cartTotal: number;
  t: any;
  isDark: boolean;
  updateCart: (itemId: number, delta: number) => void;
}

function OrderFormContent({
  cart,
  menuItems,
  customerName,
  setCustomerName,
  orderType,
  setOrderType,
  deliveryTime,
  setDeliveryTime,
  customDateTime,
  setCustomDateTime,
  isOpen,
  scheduling,
  openingTime,
  closingTime,
  cartTotal,
  t,
  isDark,
  updateCart,
}: OrderFormContentProps) {
  return (
    <div className="space-y-4">
      {/* Closed restaurant banner */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 overflow-hidden"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                {t.restaurantClosed}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                {openingTime} – {closingTime}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                {t.scheduleForLater}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          {t.yourName} *
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={t.enterYourName}
          className="w-full px-4 py-2 text-base rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      {/* Order type */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          {t.orderType} *
        </label>
        <div className="flex gap-2">
          {(["dineIn", "takeaway"] as const).map((type) => (
            <Button
              key={type}
              type="button"
              variant={orderType === type ? "default" : "outline"}
              className="flex-1 h-10 rounded-xl text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!isOpen && !customDateTime}
              onClick={() => setOrderType(type)}
            >
              {t[type]}
            </Button>
          ))}
        </div>
      </div>

      {/* Delivery time */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          {t.deliveryTime}
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={deliveryTime === "asap" ? "default" : "outline"}
            className="flex-1 h-10 rounded-xl text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!isOpen}
            onClick={() => setDeliveryTime("asap")}
          >
            {t.asap}
          </Button>
          <Button
            type="button"
            variant={deliveryTime === "custom" ? "default" : "outline"}
            className="flex-1 h-10 rounded-xl text-xs"
            onClick={() => setDeliveryTime("custom")}
          >
            {t.customTime}
          </Button>
        </div>

        <AnimatePresence>
          {(deliveryTime === "custom" || !isOpen) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1">
                <input
                  type="datetime-local"
                  value={customDateTime}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    if (!chosen) {
                      setCustomDateTime("");
                      return;
                    }
                    const open = scheduling.openingTime;
                    const close = scheduling.closingTime;
                    const dateOnly = chosen.split("T")[0];
                    const timeOnly = chosen.split("T")[1];
                    if (timeOnly < open) {
                      setCustomDateTime(`${dateOnly}T${open}`);
                      return;
                    }
                    if (timeOnly > close) {
                      setCustomDateTime(`${dateOnly}T${close}`);
                      return;
                    }
                    setCustomDateTime(chosen);
                  }}
                  min={scheduling.minDateTime}
                  className="w-full px-4 py-2 text-base rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {openingTime && closingTime && (
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 pl-1">
                    ⏰ {openingTime} – {closingTime}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cart items */}
      <div className="pt-2 border-t border-stone-200 dark:border-stone-700 space-y-1">
        <ScrollArea className="h-[140px] pr-1">
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {Object.entries(cart).map(([id, qty]) => {
                const item = menuItems.find((i) => i.id === parseInt(id));
                if (!item) return null;
                return (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12, height: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className="flex justify-between items-center p-3 rounded-2xl bg-stone-50 dark:bg-stone-700"
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        key={qty}
                        initial={{ scale: 1.3 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 22,
                        }}
                        className="h-10 w-10 rounded-xl bg-white dark:bg-stone-600 flex items-center justify-center font-bold text-primary"
                      >
                        {qty}x
                      </motion.div>
                      <div>
                        <p className="font-bold dark:text-stone-100 text-sm">
                          {item.name}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {item.price}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => updateCart(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => updateCart(item.id, 1)}
                      >
                        <Plus className="h-3 w-3 text-primary" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center p-2 pt-3 rounded-2xl">
          <span className="text-base font-semibold dark:text-stone-100">
            {t.totalBill}
          </span>
          <motion.p
            key={cartTotal}
            initial={{ scale: 1.15, color: "var(--primary)" }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="text-xl font-bold text-primary"
          >
            {cartTotal} DEN
          </motion.p>
        </div>
      </div>
    </div>
  );
}

// ========== AI ASSISTANT ==========
interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  recommendedItems?: MenuItem[];
  showMap?: boolean;
  mapData?: {
    latitude?: string | null;
    longitude?: string | null;
    name: string;
    location?: string;
  };
}

// Builds the system prompt with full restaurant context — sent to Claude every request
function buildSystemPrompt({
  restaurantName,
  restaurantPhone,
  restaurantLocation,
  openingTime,
  closingTime,
  menuItems,
  cart,
  lang,
  restaurantLatitude,
  restaurantLongitude,
}: {
  restaurantName: string;
  restaurantPhone?: string;
  restaurantLocation?: string;
  openingTime?: string;
  closingTime?: string;
  menuItems: MenuItem[];
  cart: Record<number, number>;
  lang: "en" | "al" | "mk";
  restaurantLatitude?: string | null;
  restaurantLongitude?: string | null;
}): string {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const isOpen = IsOpen(openingTime, closingTime);

  // Minutes until closing
  let minutesUntilClose: number | null = null;
  if (closingTime && isOpen) {
    const [ch, cm] = closingTime.split(":").map(Number);
    const closeMinutes = ch * 60 + cm;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    minutesUntilClose = closeMinutes - nowMinutes;
  }

  // Cart summary
  const cartItems = Object.entries(cart)
    .map(([id, qty]) => {
      const item = menuItems.find((i) => i.id === parseInt(id));
      return item ? `  - ${qty}x ${item.name} (${item.price})` : null;
    })
    .filter(Boolean);

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find((i) => i.id === parseInt(id));
    return (
      sum + (parseInt(item?.price?.replace(/[^0-9]/g, "") || "0") || 0) * qty
    );
  }, 0);

  // Menu grouped by category
  const menuByCategory: Record<string, MenuItem[]> = {};
  menuItems
    .filter((i) => i.active)
    .forEach((item) => {
      if (!menuByCategory[item.category]) menuByCategory[item.category] = [];
      menuByCategory[item.category].push(item);
    });

  const menuText = Object.entries(menuByCategory)
    .map(
      ([cat, items]) =>
        `[${cat}]\n` +
        items
          .map((i) => {
            const flags = [
              i.isVegetarian ? "vegetarian" : "",
              i.isVegan ? "vegan" : "",
              i.isGlutenFree ? "gluten-free" : "",
            ]
              .filter(Boolean)
              .join(", ");
            return `  • ${i.name} — ${i.price}${i.description ? ` | ${i.description}` : ""}${flags ? ` [${flags}]` : ""}`;
          })
          .join("\n"),
    )
    .join("\n\n");

  const langInstructions: Record<string, string> = {
    en: "Detect the language the user writes in and ALWAYS reply in that same language. If they write in Albanian, reply in Albanian. If they write in Macedonian, reply in Macedonian. If they write in English, reply in English. Default to English if unsure.",
    al: "Detekto gjuhën që përdoruesi shkruan dhe GJITHMONË përgjigju në të njëjtën gjuhë. Nëse shkruajnë shqip, përgjigju shqip. Nëse shkruajnë maqedonisht, përgjigju maqedonisht. Nëse shkruajnë anglisht, përgjigju anglisht. Parazgjedhja është shqipja.",
    mk: "Детектирај го јазикот на кој пишува корисникот и СЕКОГАШ одговарај на истиот јазик. Ако пишуваат македонски, одговори македонски. Ако пишуваат албански, одговори албански. Ако пишуваат англиски, одговори англиски. Стандардно е македонски.",
  };

  return `You are a friendly, knowledgeable AI waiter assistant for "${restaurantName}".
${langInstructions[lang]}

## Restaurant Info
- Name: ${restaurantName}
- Location: ${restaurantLocation || "Not provided"}
- Phone: ${restaurantPhone || "Not provided"}
- Opening hours: ${openingTime || "N/A"} – ${closingTime || "N/A"}
- Current time: ${currentTime}
- Status: ${isOpen ? `OPEN${minutesUntilClose !== null && minutesUntilClose <= 30 ? ` ⚠️ Closing in ${minutesUntilClose} minutes! Urge the customer to order soon.` : ""}` : "CLOSED — tell the customer and suggest they schedule an order"}

## Current Customer Cart
${
  cartItems.length > 0
    ? `${cartItems.join("\n")}\nCart total: ${cartTotal} DEN`
    : "Cart is empty"
}

## Full Menu
${menuText}

## Your behaviour rules
1. You know EVERYTHING about this restaurant's menu — ingredients, dietary info, prices.
2. When the customer asks for recommendations, suggest SPECIFIC dishes from the menu above with their prices.
3. Be proactive about the cart: if they have items in cart but are missing a drink/dessert, mention it naturally.
4. If the restaurant is closing soon (≤30 min), gently remind the customer to order quickly.
5. For booking a table, guide them to call ${restaurantPhone || "the restaurant"} or use WhatsApp.
6. Keep responses SHORT and conversational — max 3-4 sentences unless listing dishes.
7. Use emojis naturally but don't overdo it.
8. If asked about location/map, say you can show the map and include the text: [SHOW_MAP]
9. NEVER make up dishes that aren't in the menu above.
10. If cart has items and user seems done ordering, proactively offer to help them complete the order.`;
}

function AIRestaurantAssistant({
  restaurantName,
  restaurantPhone,
  restaurantLocation,
  openingTime,
  closingTime,
  menuItems,
  onAddToCart,
  lang,
  onScrollToMap,
  restaurantLatitude,
  restaurantLongitude,
  cart,
}: {
  restaurantName: string;
  restaurantPhone?: string;
  restaurantLocation?: string;
  openingTime?: string;
  closingTime?: string;
  menuItems: MenuItem[];
  onAddToCart: (itemId: number, quantity: number) => void;
  lang: "en" | "al" | "mk";
  onScrollToMap: () => void;
  restaurantLatitude?: string | null;
  restaurantLongitude?: string | null;
  cart: Record<number, number>;
}) {
  const aiT: Record<string, any> = {
    en: {
      aiAssistant: "AI Waiter",
      typing: "Thinking...",
      placeholder: "Ask me anything about the menu...",
      send: "Send",
      addToCart: "Add",
      added: "Added!",
      greeting: `Hi! I'm your AI waiter for **${restaurantName}** 👋\n\nAsk me anything — I know the full menu, can suggest dishes for your mood, diet, or budget, and I'm watching your cart in real time!`,
      errorMsg: "Sorry, I had a connection issue. Please try again!",
    },
    al: {
      aiAssistant: "Kamarieri AI",
      typing: "Po mendon...",
      placeholder: "Më pyet çfarë të duash për menunë...",
      send: "Dërgo",
      addToCart: "Shto",
      added: "U shtua!",
      greeting: `Përshëndetje! Jam kamarierin tuaj AI për **${restaurantName}** 👋\n\nPyetni çfarë të doni — e njoh menunë plotësisht, mund t'ju sugjeroj pjata sipas humorit, dietës ose buxhetit tuaj!`,
      errorMsg: "Na vjen keq, pati një problem. Ju lutemi provoni sërish!",
    },
    mk: {
      aiAssistant: "AI Келнер",
      typing: "Размислува...",
      placeholder: "Прашај ме за менито...",
      send: "Испрати",
      addToCart: "Додај",
      added: "Додадено!",
      greeting: `Здраво! Јас сум вашиот AI келнер за **${restaurantName}** 👋\n\nПрашајте ме сè e � го знам целото мени, можам да предложам јадења по вашиот расположение, исхрана или буџет!`,
      errorMsg: "Се извинуваме, имаше проблем. Обидете се повторно!",
    },
  };

  const t = aiT[lang];
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Track previous cart to detect changes
  const prevCartRef = useRef<Record<number, number>>({});

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // ── Cart awareness: proactively comment when cart changes ──
  useEffect(() => {
    if (!isOpen || messages.length === 0) return;

    const prevCart = prevCartRef.current;
    const newItems = Object.entries(cart).filter(
      ([id, qty]) => (prevCart[+id] || 0) < qty,
    );

    if (newItems.length === 0) {
      prevCartRef.current = { ...cart };
      return;
    }

    prevCartRef.current = { ...cart };

    // Find what was just added
    const addedItem = menuItems.find((i) => i.id === +newItems[0][0]);
    if (!addedItem) return;

    // Ask Claude for a smart cart comment
    const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = menuItems.find((i) => i.id === parseInt(id));
      return (
        sum + (parseInt(item?.price?.replace(/[^0-9]/g, "") || "0") || 0) * qty
      );
    }, 0);

    const hasCategory = (kw: string) =>
      Object.entries(cart).some(([id]) => {
        const item = menuItems.find((i) => i.id === +id);
        return item?.category.toLowerCase().includes(kw);
      });

    const cartSuggestionPrompt =
      lang === "en"
        ? `The customer just added "${addedItem.name}" to their cart. Cart total is now ${cartTotal} DEN. ${!hasCategory("drink") ? "They have no drinks yet." : ""} ${!hasCategory("dessert") ? "They have no dessert yet." : ""} Give a very short (1 sentence max), friendly, natural comment or suggestion. Don't be pushy.`
        : lang === "al"
          ? `Klienti sapo shtoi "${addedItem.name}" në shportë. Totali tani është ${cartTotal} DEN. ${!hasCategory("drink") ? "Nuk ka pije akoma." : ""} ${!hasCategory("dessert") ? "Nuk ka ëmbëlsirë akoma." : ""} Jep një koment shumë të shkurtër (max 1 fjali), miqësor dhe natyral. Mos u bëj i ngutshëm.`
          : `Клиентот штотуку додаде "${addedItem.name}" во кошничката. Вкупно е сега ${cartTotal} DEN. ${!hasCategory("drink") ? "Нема пијалок уште." : ""} ${!hasCategory("dessert") ? "Нема десерт уште." : ""} Дај многу краток (макс 1 реченица), пријателски и природен коментар. Не биди напорен.`;

    // Short timeout so it feels natural, not instant
    const timer = setTimeout(async () => {
      try {
        const systemPrompt = buildSystemPrompt({
          restaurantName,
          restaurantPhone,
          restaurantLocation,
          openingTime,
          closingTime,
          menuItems,
          cart,
          lang,
          restaurantLatitude,
          restaurantLongitude,
        });

        const response = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: systemPrompt,
            max_tokens: 120,
            messages: [{ role: "user", content: cartSuggestionPrompt }],
          }),
        });

        const data = await response.json();
        const text = data.text?.trim();
        if (!text) return;

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: text,
            timestamp: new Date(),
          },
        ]);
      } catch {
        // Silent fail — cart comments are optional
      }
    }, 1200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, isOpen]);

  // ── Quick action buttons ──
  const actionButtons = {
    en: {
      menu: [
        { label: "⭐ Popular", prompt: "What are your most popular dishes?" },
        {
          label: "🌱 Vegan/Veg",
          prompt: "Show me vegetarian and vegan options.",
        },
        {
          label: "💰 Budget picks",
          prompt: "What are the cheapest dishes on the menu?",
        },
      ],
      restaurant: [
        { label: "📍 Location", prompt: "Show me the restaurant location." },
        { label: "⏰ Hours", prompt: "What are your opening hours?" },
        { label: "📅 Book table", prompt: "I want to book a table." },
      ],
    },
    al: {
      menu: [
        {
          label: "⭐ Popullore",
          prompt: "Cilat janë pjatat tuaja më popullore?",
        },
        {
          label: "🌱 Vegan/Veg",
          prompt: "Tregomë opsionet vegjetariane dhe vegane.",
        },
        { label: "💰 Çmim i mirë", prompt: "Cilat janë pjatat më të lira?" },
      ],
      restaurant: [
        {
          label: "📍 Vendndodhja",
          prompt: "Tregomë vendndodhjen e restorantit.",
        },
        { label: "⏰ Orari", prompt: "Cilët janë oraret e hapjes?" },
        { label: "📅 Rezervo", prompt: "Dua të rezervoj tavolinë." },
      ],
    },
    mk: {
      menu: [
        { label: "⭐ Популарни", prompt: "Кои се вашите најпопуларни јадења?" },
        {
          label: "🌱 Веган/Вег",
          prompt: "Покажи ми вегетаријански и вегански опции.",
        },
        { label: "💰 Евтино", prompt: "Кои се најевтините јадења?" },
      ],
      restaurant: [
        {
          label: "📍 Локација",
          prompt: "Покажи ми ја локацијата на ресторанот.",
        },
        { label: "⏰ Работно време", prompt: "Кое е работното време?" },
        { label: "📅 Резервација", prompt: "Сакам да резервирам маса." },
      ],
    },
  };

  // ── Greeting on first open ──
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: Date.now().toString(),
          role: "assistant",
          content: t.greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen]);

  // ── Core: send message to Claude API ──
  const sendToClaude = useCallback(
    async (userText: string) => {
      setIsTyping(true);

      // Build conversation history for Claude (exclude map/item metadata — text only)
      const history = messages
        .filter((m) => m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }));

      const systemPrompt = buildSystemPrompt({
        restaurantName,
        restaurantPhone,
        restaurantLocation,
        openingTime,
        closingTime,
        menuItems,
        cart,
        lang,
        restaurantLatitude,
        restaurantLongitude,
      });

      try {
        const response = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: systemPrompt,
            max_tokens: 600,
            messages: [...history, { role: "user", content: userText }],
          }),
        });

        const data = await response.json();
        const rawText: string = data.text || t.errorMsg;

        // Check if Claude wants to show the map
        const showMap = rawText.includes("[SHOW_MAP]");
        const cleanText = rawText.replace("[SHOW_MAP]", "").trim();

        // Try to find recommended items mentioned by name in the response
        const mentionedItems = menuItems
          .filter(
            (item) =>
              item.active &&
              cleanText.toLowerCase().includes(item.name.toLowerCase()),
          )
          .slice(0, 4);

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: cleanText,
            timestamp: new Date(),
            recommendedItems:
              mentionedItems.length > 0 ? mentionedItems : undefined,
            showMap,
            mapData: showMap
              ? {
                  latitude: restaurantLatitude,
                  longitude: restaurantLongitude,
                  name: restaurantName,
                  location: restaurantLocation,
                }
              : undefined,
          },
        ]);

        if (showMap) setTimeout(() => onScrollToMap(), 600);
      } catch (err: any) {
        const errText = err?.message || String(err) || "unknown";
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `${t.errorMsg}

_(debug: ${errText})_`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [
      messages,
      menuItems,
      lang,
      restaurantName,
      restaurantPhone,
      restaurantLocation,
      openingTime,
      closingTime,
      cart,
      restaurantLatitude,
      restaurantLongitude,
      onScrollToMap,
      t,
    ],
  );

  const [showButton, setShowButton] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      setShowButton((scrollTop / docHeight) * 100 > 1);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isTyping) return;
    const text = inputValue.trim();
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: new Date(),
      },
    ]);
    setInputValue("");
    sendToClaude(text);
  };

  const handleQuickAction = (prompt: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: prompt,
        timestamp: new Date(),
      },
    ]);
    sendToClaude(prompt);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.button
          animate={
            showButton ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.75 }
          }
          transition={{ type: "spring", stiffness: 340, damping: 26 }}
          style={{ pointerEvents: showButton ? "auto" : "none" }}
          className="fixed bottom-[140px] right-4 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl z-40 bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center"
        >
          <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          <motion.span
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="h-2.5 w-2.5 text-yellow-400" />
          </motion.span>
        </motion.button>
      </DialogTrigger>
      <DialogContent
        className="w-screen max-w-none sm:w-[calc(100vw-16px)] sm:max-w-md mx-auto flex flex-col p-0 gap-0 bg-gradient-to-b from-white to-stone-50 dark:from-stone-900 dark:to-stone-950 rounded-none sm:rounded-2xl [&>button]:top-3 [&>button]:right-3"
        style={{
          height: "100dvh",
          maxHeight: "100dvh",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: "none",
          position: "fixed",
          margin: 0,
          touchAction: "manipulation",
          WebkitUserSelect: "none",
        }}
      >
        <DialogHeader
          className="p-3 pb-2 border-b dark:border-stone-700 flex-shrink-0"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <DialogTitle className="text-sm sm:text-base dark:text-stone-100">
                {t.aiAssistant}
              </DialogTitle>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="grid grid-cols-3 gap-1">
              {actionButtons[lang].menu.map((btn, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 px-1 flex-shrink-0 whitespace-nowrap justify-center truncate"
                  onClick={() => handleQuickAction(btn.prompt)}
                  disabled={isTyping}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {actionButtons[lang].restaurant.map((btn, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 px-1 flex-shrink-0 whitespace-nowrap justify-center truncate"
                  onClick={() => handleQuickAction(btn.prompt)}
                  disabled={isTyping}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                // ✅ Improved: slide from side based on role
                initial={{
                  opacity: 0,
                  x: message.role === "user" ? 20 : -20,
                  scale: 0.95,
                }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 340, damping: 26 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-white dark:bg-stone-800 border dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line leading-relaxed">
                    {message.content}
                  </p>
                  {message.showMap && message.mapData && (
                    <InlineMap
                      latitude={message.mapData.latitude}
                      longitude={message.mapData.longitude}
                      name={message.mapData.name}
                    />
                  )}
                  {message.recommendedItems &&
                    message.recommendedItems.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.recommendedItems.map((item, idx) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: idx * 0.06,
                              type: "spring",
                              stiffness: 300,
                              damping: 24,
                            }}
                            className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-2.5 border dark:border-stone-600"
                          >
                            <div className="flex items-center gap-2.5">
                              {item.imageUrl && (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                                  {item.description}
                                </p>
                                <p className="text-xs font-bold text-primary mt-0.5">
                                  {item.price}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  onAddToCart(item.id, 1);
                                  toast({ title: `${item.name} ${t.added}` });
                                }}
                                className="flex-shrink-0 h-7 text-xs px-2"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {t.addToCart}
                              </Button>
                            </div>
                          </motion.div>
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
                initial={{ opacity: 0, x: -12, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 340, damping: 26 }}
                className="flex justify-start"
              >
                <div className="bg-white dark:bg-stone-800 border dark:border-stone-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((delay) => (
                        <motion.span
                          key={delay}
                          className="w-1.5 h-1.5 bg-primary rounded-full"
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: delay / 1000,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {t.typing}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div
          className="p-3 border-t dark:border-stone-700 bg-white dark:bg-stone-900 flex-shrink-0 rounded-b-none sm:rounded-b-2xl"
          style={{
            paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
          }}
        >
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={t.placeholder}
              className="flex-1 rounded-full text-sm dark:bg-stone-800 dark:text-stone-100 h-9"
              disabled={isTyping}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              size="icon"
              className="rounded-full h-9 w-9 flex-shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// ========== END AI ASSISTANT ==========

// ========== DIGITAL RECEIPT ==========
function DigitalReceipt({
  data,
  onClose,
  lang,
}: {
  data: {
    orderId: string;
    customerName: string;
    orderType: string;
    deliveryTime: string;
    items: { name: string; qty: number; price: number }[];
    total: number;
    restaurantName: string;
    restaurantSlug: string;
    timestamp: Date;
  };
  onClose: () => void;
  lang: "en" | "al" | "mk";
}) {
  const rT: Record<string, any> = {
    en: {
      receipt: "Receipt",
      order: "Order",
      customer: "Customer",
      type: "Type",
      time: "Time",
      item: "Item",
      qty: "Qty",
      price: "Price",
      total: "Total",
      save: "Save as Image",
      share: "Share",
      close: "Close",
      thankYou: "Thank you!",
      enjoy: "Enjoy your meal 😋",
      poweredBy: "Powered by HAJDE HA",
      saved: "Receipt saved!",
    },
    al: {
      receipt: "Faturë",
      order: "Porosi",
      customer: "Klienti",
      type: "Lloji",
      time: "Koha",
      item: "Artikulli",
      qty: "Sasia",
      price: "Çmimi",
      total: "Totali",
      save: "Ruaj si foto",
      share: "Shpërndaj",
      close: "Mbyll",
      thankYou: "Faleminderit!",
      enjoy: "Ju bëftë mirë! 😋",
      poweredBy: "Mundësuar nga HAJDE HA",
      saved: "Fatura u ruajt!",
    },
    mk: {
      receipt: "Сметка",
      order: "Нарачка",
      customer: "Клиент",
      type: "Тип",
      time: "Време",
      item: "Производ",
      qty: "Кол.",
      price: "Цена",
      total: "Вкупно",
      save: "Зачувај kako слика",
      share: "Сподели",
      close: "Затвори",
      thankYou: "Благодарам!",
      enjoy: "Пријатно! 😋",
      poweredBy: "Овозможено од HAJDE HA",
      saved: "Сметката е зачувана!",
    },
  };

  const t = rT[lang];
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const menuUrl = `${window.location.origin}/restaurant/${data.restaurantSlug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(menuUrl)}&bgcolor=ffffff&color=000000&margin=6`;

  const handleSave = async () => {
    if (!receiptRef.current) return;
    setSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `receipt-${data.orderId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: t.saved });
    } catch (e) {
      toast({ title: t.saved });
    }
    setSaving(false);
  };

  const handleShare = async () => {
    const text = `🧾 ${data.restaurantName} — ${t.order} #${data.orderId}\n${data.items.map((i) => `• ${i.qty}× ${i.name}`).join("\n")}\n💰 ${data.total} DEN`;
    if ("share" in navigator) {
      try {
        await navigator.share({ title: `${t.receipt} #${data.orderId}`, text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    toast({ title: t.saved });
  };

  const pad = (n: number) => n.toString().padStart(2, "0");
  const d = data.timestamp;
  const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="w-[calc(100vw-24px)] max-w-sm bg-white dark:bg-stone-900 rounded-3xl overflow-hidden p-0 border-0 shadow-2xl flex flex-col max-h-[92dvh]">
        <div className="flex-1 overflow-y-auto">
          <div
            ref={receiptRef}
            className="bg-white px-4 pt-6 pb-4 font-mono text-[13px]"
          >
            <div className="text-center mb-5">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">
                {t.receipt}
              </p>
              <h2 className="text-xl font-bold text-stone-900 leading-tight">
                {data.restaurantName}
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                {dateStr} · {timeStr}
              </p>
              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-stone-100 text-stone-500 text-xs font-bold">
                <span>#{data.orderId}</span>
              </div>
            </div>
            <div className="border-t-2 border-dashed border-stone-200 my-4" />
            <div className="space-y-1.5 mb-4">
              {[
                [t.customer, data.customerName],
                [t.type, data.orderType],
                [t.time, data.deliveryTime],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2 text-xs">
                  <span className="text-stone-400 flex-shrink-0">{label}</span>
                  <span className="font-bold text-stone-800 text-right break-words">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-dashed border-stone-200 my-4" />
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-[10px] text-stone-400 uppercase tracking-widest mb-2">
                <span className="flex-1">{t.item}</span>
                <span className="w-8 text-center">{t.qty}</span>
                <span className="w-16 text-right">{t.price}</span>
              </div>
              {data.items.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between text-xs items-start gap-1"
                >
                  <span className="flex-1 text-stone-800 font-medium leading-tight break-words min-w-0 pr-1">
                    {item.name}
                  </span>
                  <span className="w-8 text-center text-stone-500">
                    {item.qty}×
                  </span>
                  <span className="w-16 text-right font-bold text-stone-800">
                    {item.price * item.qty} den
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-dashed border-stone-200 my-4" />
            <div className="flex justify-between items-center mb-5">
              <span className="font-bold text-sm text-stone-900 uppercase tracking-widest">
                {t.total}
              </span>
              <span className="font-bold text-xl text-stone-900">
                {data.total} DEN
              </span>
            </div>
            <div className="flex flex-col items-center gap-3 mt-2">
              <div className="text-center">
                <p className="font-bold text-base text-stone-900">
                  {t.thankYou}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">{t.enjoy}</p>
              </div>
              <div className="p-2 border-2 border-stone-100 rounded-2xl">
                <img
                  src={qrUrl}
                  alt="QR"
                  width={120}
                  height={120}
                  crossOrigin="anonymous"
                  className="rounded-xl"
                />
              </div>
              <p className="text-[9px] text-stone-300">{t.poweredBy}</p>
            </div>
            <div className="mt-5 -mx-6 h-4 relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 flex">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-4 rounded-full bg-stone-100 -mx-1"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-3 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 flex gap-2 flex-shrink-0">
          {"share" in navigator && (
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl text-[11px] font-bold border-stone-200 dark:border-stone-700 px-2"
              onClick={handleShare}
            >
              <Share2 className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
              <span className="truncate">{t.share}</span>
            </Button>
          )}
          <Button
            className="flex-1 h-10 rounded-xl text-[11px] font-bold bg-primary hover:bg-primary/90 text-white border-0 px-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1 flex-shrink-0" />
            ) : (
              <Check className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            )}
            <span className="truncate">{t.save}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// ========== END DIGITAL RECEIPT ==========

// ========== SURPRISE ME ==========
function SurpriseMe({
  menuItems,
  onAddToCart,
  lang,
}: {
  menuItems: MenuItem[];
  onAddToCart: (itemId: number, delta: number) => void;
  lang: "en" | "al" | "mk";
}) {
  const sT: Record<string, any> = {
    en: {
      title: "Surprise Me!",
      subtitle: "We'll build your perfect meal",
      budgetLabel: "Total budget",
      personsLabel: "Persons",
      perPerson: "per person",
      spinning: "Building your meal...",
      result: "Your perfect meal",
      addAll: "Add all to cart",
      added: "Added to cart!",
      noMatch: "No combo found. Try a higher budget!",
      tryAgain: "Try again",
      changeBudget: "Change budget",
      categories: {
        starter: "Starter",
        main: "Main",
        dessert: "Dessert",
        drink: "Drink",
      },
      withinBudget: "within budget",
      den: "DEN",
      hint: "Set your budget, pick persons, and we'll find the perfect meal!",
      tapHint: "Tap to set budget & persons",
    },
    al: {
      title: "më Surprizo!",
      subtitle: "Ndërtojmë vaktin tuaj të përsosur",
      budgetLabel: "Buxheti total",
      personsLabel: "Persona",
      perPerson: "për person",
      spinning: "Po ndërtojmë vaktin tuaj...",
      result: "Vakti juaj i përsosur",
      addAll: "Shto në shportë",
      added: "U shtua në shportë!",
      noMatch: "Nuk u gjet kombinim. Provo buxhet më të lartë!",
      tryAgain: "Provo sërish",
      changeBudget: "Ndrysho buxhetin",
      categories: {
        starter: "Paragjellë",
        main: "Gjellë kryesore",
        dessert: "Ëmbëlsirë",
        drink: "Pije",
      },
      withinBudget: "brenda buxhetit",
      den: "DEN",
      hint: "Vendos buxhetin, zgjidh personat dhe ne gjejmë vaktin e përsosur!",
      tapHint: "Kliko për të vendosur buxhetin",
    },
    mk: {
      title: "Изненади ме!",
      subtitle: "Ќе го составиме вашиот совршен оброк",
      budgetLabel: "Вкупен буџет",
      personsLabel: "Лица",
      perPerson: "по лице",
      spinning: "Го составуваме вашиот оброк...",
      result: "Вашиот совршен оброк",
      addAll: "Сè во кошница",
      added: "Додадено во кошница!",
      noMatch: "Нема комбинација. Обидете се со поголем буџет!",
      tryAgain: "Обиди се пак",
      changeBudget: "Промени буџет",
      categories: {
        starter: "Предјадење",
        main: "Главно јадење",
        dessert: "Десерт",
        drink: "Пијалок",
      },
      withinBudget: "во рамките на буџетот",
      den: "DEN",
      hint: "Внесете буџет, изберете лица и ние бираме совршен оброк!",
      tapHint: "Допри за да го поставите буџетот",
    },
  };

  const t = sT[lang];
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState("");
  const [persons, setPersons] = useState(2);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{
    starter?: MenuItem;
    main?: MenuItem;
    dessert?: MenuItem;
    drink?: MenuItem;
    total: number;
    perPerson: number;
  } | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getByCategory = (keywords: string[]) =>
    menuItems.filter(
      (i) =>
        i.active && keywords.some((k) => i.category.toLowerCase().includes(k)),
    );

  const pickRandom = (arr: MenuItem[]) =>
    arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined;

  const parsePrice = (item: MenuItem) =>
    parseInt(item.price.replace(/[^0-9]/g, "")) || 0;

  const budgetPerPerson = parseInt(budget)
    ? Math.floor(parseInt(budget) / persons)
    : 0;

  const buildCombo = (budgetPP: number) => {
    const starters = getByCategory([
      "starter",
      "appetizer",
      "paragjell",
      "предјад",
    ]);
    const mains = getByCategory(["main", "kryesor", "gjell", "главн"]);
    const desserts = getByCategory([
      "dessert",
      "embëlsir",
      "ëmbëlsir",
      "десерт",
      "sweet",
    ]);
    const drinks = getByCategory(["drink", "pij", "пијал", "beverage"]);
    const allActive = menuItems.filter((i) => i.active);
    const mainPool = mains.length > 0 ? mains : allActive;

    for (let attempt = 0; attempt < 50; attempt++) {
      const main = pickRandom(mainPool);
      if (!main) break;
      let total = parsePrice(main);
      if (total > budgetPP) continue;
      const starter = pickRandom(
        starters.filter((i) => parsePrice(i) + total <= budgetPP),
      );
      if (starter) total += parsePrice(starter);
      const drink = pickRandom(
        drinks.filter((i) => parsePrice(i) + total <= budgetPP),
      );
      if (drink) total += parsePrice(drink);
      const dessert = pickRandom(
        desserts.filter((i) => parsePrice(i) + total <= budgetPP),
      );
      if (dessert) total += parsePrice(dessert);
      return {
        starter,
        main,
        dessert,
        drink,
        perPerson: total,
        total: total * persons,
      };
    }
    return null;
  };

  const handleSurprise = () => {
    if (!budgetPerPerson || budgetPerPerson <= 0) {
      inputRef.current?.focus();
      return;
    }
    setIsSpinning(true);
    setResult(null);
    setNoMatch(false);
    setTimeout(() => {
      const combo = buildCombo(budgetPerPerson);
      setIsSpinning(false);
      if (!combo) setNoMatch(true);
      else setResult(combo);
    }, 1500);
  };

  const handleAddAll = () => {
    if (!result) return;
    [result.starter, result.main, result.dessert, result.drink].forEach(
      (item) => {
        if (item) for (let p = 0; p < persons; p++) onAddToCart(item.id, 1);
      },
    );
    toast({ title: t.added });
    setOpen(false);
    setBudget("");
    setResult(null);
  };

  const slots = result
    ? [
        {
          key: "starter",
          label: t.categories.starter,
          item: result.starter,
          emoji: "🥗",
        },
        {
          key: "main",
          label: t.categories.main,
          item: result.main,
          emoji: "🍽️",
        },
        {
          key: "dessert",
          label: t.categories.dessert,
          item: result.dessert,
          emoji: "🍰",
        },
        {
          key: "drink",
          label: t.categories.drink,
          item: result.drink,
          emoji: "🥤",
        },
      ]
    : [];

  const hasResult = result && !isSpinning;
  const showHint = !isSpinning && !result && !noMatch;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setResult(null);
          setNoMatch(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.975 }}
          className="w-full relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-white dark:bg-stone-900 shadow-sm focus:outline-none"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md text-xl">
                🎲
              </div>
              <div className="text-left min-w-0">
                <p className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 leading-tight">
                  {t.title}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                  {t.tapHint}
                </p>
              </div>
            </div>
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
          </div>
        </motion.button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-32px)] max-w-md max-h-[88dvh] bg-white dark:bg-stone-900 rounded-3xl overflow-hidden p-0 border-0 shadow-2xl flex flex-col [&>button]:z-[60] [&>button]:text-white/90 [&>button]:hover:text-white [&>button]:hover:bg-white/20 [&>button]:transition-all">
        {/* Header */}
        <div className="relative bg-primary px-5 pt-6 pb-10 sm:pt-8 sm:pb-12 flex-shrink-0">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <DialogHeader className="relative z-10 text-left">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              🎲 {t.title}
            </DialogTitle>
            <DialogDescription className="text-white/75 mt-1 text-xs sm:text-sm">
              {t.subtitle}
            </DialogDescription>
          </DialogHeader>

          <div className="relative z-10 mt-4 sm:mt-5 bg-white dark:bg-stone-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-stone-100 dark:border-stone-700">
              <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest block">
                {t.budgetLabel}
              </label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={budget}
                  onChange={(e) => {
                    setBudget(e.target.value);
                    setResult(null);
                    setNoMatch(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSurprise()}
                  placeholder="0"
                  className="flex-1 text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 bg-transparent outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600 min-w-0"
                />
                <span className="text-base font-bold text-stone-300 dark:text-stone-600 flex-shrink-0">
                  {t.den}
                </span>
              </div>
              {budgetPerPerson > 0 && (
                <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                  ≈ {budgetPerPerson} {t.den} {t.perPerson}
                </p>
              )}
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest block">
                  {t.personsLabel}
                </label>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {persons}{" "}
                  {persons === 1
                    ? lang === "en"
                      ? "person"
                      : lang === "al"
                        ? "person"
                        : "лице"
                    : lang === "en"
                      ? "persons"
                      : lang === "al"
                        ? "persona"
                        : "лица"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { label: "−", delta: -1 },
                  { label: "+", delta: 1 },
                ].map(({ label, delta }, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPersons((p) => Math.max(1, Math.min(20, p + delta)));
                      setResult(null);
                    }}
                    className="h-9 w-9 rounded-xl border-2 border-stone-200 dark:border-stone-600 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:border-primary hover:text-primary transition-colors font-bold text-lg active:scale-95"
                  >
                    {label}
                  </button>
                ))}
                <span className="w-8 text-center font-bold text-lg text-stone-900 dark:text-stone-100">
                  {persons}
                </span>
                <Button
                  onClick={handleSurprise}
                  disabled={!budget || parseInt(budget) <= 0 || isSpinning}
                  className="ml-1 h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold border-0 disabled:opacity-40 active:scale-95 transition-all"
                >
                  {isSpinning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "🎲"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 -mt-3">
          <AnimatePresence mode="wait">
            {isSpinning && (
              <motion.div
                key="spin"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                {/* ✅ Improved spinner — theatrical dice roll */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="text-5xl select-none"
                >
                  🎲
                </motion.div>
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="text-sm text-stone-500 dark:text-stone-400 font-medium"
                >
                  {t.spinning}
                </motion.p>
              </motion.div>
            )}

            {noMatch && !isSpinning && (
              <motion.div
                key="nomatch"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-10 gap-3 text-center"
              >
                <span className="text-5xl">😕</span>
                <p className="text-sm text-stone-500 dark:text-stone-400 max-w-[220px]">
                  {t.noMatch}
                </p>
                <Button
                  variant="outline"
                  className="mt-2 rounded-xl text-xs h-9 px-4 border-primary/30 text-primary"
                  onClick={() => {
                    setNoMatch(false);
                    inputRef.current?.focus();
                  }}
                >
                  ✏️ {t.changeBudget}
                </Button>
              </motion.div>
            )}

            {hasResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    {t.result}
                  </p>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      {result!.perPerson} {t.den} {t.perPerson}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      {result!.total} {t.den} · {persons}×
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {slots.map(({ key, label, item, emoji }, i) =>
                    item ? (
                      // ✅ Improved: cascade in with spring
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, x: -20, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{
                          delay: i * 0.08,
                          type: "spring",
                          stiffness: 320,
                          damping: 26,
                        }}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                            {emoji}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold text-primary uppercase tracking-widest leading-none mb-0.5">
                            {label}
                          </p>
                          <p className="font-semibold text-sm text-stone-900 dark:text-stone-100 leading-tight line-clamp-2">
                            {item.name}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right ml-1">
                          <p className="font-bold text-sm text-stone-700 dark:text-stone-300">
                            {item.price}
                          </p>
                          {persons > 1 && (
                            <p className="text-[10px] text-stone-400">
                              ×{persons}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ) : null,
                  )}
                </div>

                {persons > 1 && (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
                    <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                      {persons} × {result!.perPerson} {t.den}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {result!.total} {t.den}
                    </span>
                  </div>
                )}

                <div className="flex gap-1 pt-1 pb-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-7 rounded-xl text-xs font-bold border-stone-200 dark:border-stone-700"
                    onClick={handleSurprise}
                  >
                    🔀 {t.tryAgain}
                  </Button>
                  <Button
                    className="flex-1 h-7 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 border-0 text-white shadow-md active:scale-95 transition-all"
                    onClick={handleAddAll}
                  >
                    <ShoppingBag className="h-4 w-4 mr-1.5" />
                    {t.addAll}
                  </Button>
                </div>
              </motion.div>
            )}

            {showHint && (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-10 gap-3"
              >
                <motion.span
                  className="text-5xl"
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  🤔
                </motion.span>
                <p className="text-xs text-center text-stone-400 dark:text-stone-600 max-w-[210px]">
                  {t.hint}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// ========== END SURPRISE ME ==========

export default function PublicMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [lang] = useState<"en" | "al" | "mk">(
    () => (localStorage.getItem(LANG_KEY) as any) || "en",
  );
  const t = translations[lang];
  const { isDark, toggleDarkMode } = useDarkMode();
  const { toast } = useToast();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const {
    data: restaurant,
    isLoading,
    error,
  } = useQuery({
    queryKey: [api.restaurants.getBySlug.path, slug],
    queryFn: async () => {
      const url = buildUrl(api.restaurants.getBySlug.path, { slug: slug! });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Restaurant not found");
      return api.restaurants.getBySlug.responses[200].parse(await res.json());
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });


  const [cart, setCart] = useState<Record<number, number>>({});
  const [openOrderDialog, setOpenOrderDialog] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [orderType, setOrderType] = useState<"dineIn" | "takeaway">("dineIn");
  const [deliveryTime, setDeliveryTime] = useState<"asap" | "custom">("asap");
  const [customDateTime, setCustomDateTime] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  // ✅ Debounced search — no fuzzy match on every keystroke
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [voiceSearchMatches, setVoiceSearchMatches] = useState<MenuItem[]>([]);
  const [showVoiceResults, setShowVoiceResults] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [receiptData, setReceiptData] = useState<null | {
    orderId: string;
    customerName: string;
    orderType: string;
    deliveryTime: string;
    items: { name: string; qty: number; price: number }[];
    total: number;
    restaurantName: string;
    restaurantSlug: string;
    timestamp: Date;
  }>(null);

  const handleVoiceResult = useCallback(
    (text: string, matches: MenuItem[]) => {
      setSearchTerm(text);
      setVoiceSearchMatches(matches);
      setShowVoiceResults(true);
      if (matches.length > 0) {
        toast({
          title: `${t.foundMatches.replace("{count}", matches.length.toString())} "${text}"`,
        });
        setTimeout(() => {
          document
            .getElementById(`item-${matches[0].id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      } else {
        toast({ title: t.noVoiceMatches, variant: "destructive" });
      }
    },
    [t, toast],
  );

  const { isListening, isSupported, startListening, stopListening } =
    useVoiceSearch(handleVoiceResult, restaurant?.menuItems || [], lang);

  // ✅ Stable updateCart with useCallback
  const updateCart = useCallback((itemId: number, delta: number) => {
    setCart((prev) => {
      const next = Math.max(0, (prev[itemId] || 0) + delta);
      if (next === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  }, []);

  // ✅ O(1) price lookup instead of O(n) per entry
  const priceMap = useMemo(() => {
    const map: Record<number, number> = {};
    restaurant?.menuItems.forEach((i: MenuItem) => {
      map[i.id] = parseInt(i.price.replace(/[^0-9]/g, "")) || 0;
    });
    return map;
  }, [restaurant?.menuItems]);

  const cartTotal = useMemo(
    () =>
      Object.entries(cart).reduce(
        (sum, [id, qty]) => sum + (priceMap[+id] ?? 0) * qty,
        0,
      ),
    [cart, priceMap],
  );

  const filteredItems = useMemo(() => {
    if (!restaurant?.menuItems) return [];
    if (showVoiceResults && voiceSearchMatches.length > 0)
      return voiceSearchMatches;
    return restaurant.menuItems.filter((item: MenuItem) => {
      if (!item.active) return false;
      const categoryMatch =
        selectedCategory === "All" || item.category === selectedCategory;
      if (debouncedSearch !== "") {
        return (
          categoryMatch &&
          findBestMatches(debouncedSearch, [item], lang, 0.3).length > 0
        );
      }
      return categoryMatch;
    });
  }, [
    restaurant?.menuItems,
    selectedCategory,
    debouncedSearch,
    showVoiceResults,
    voiceSearchMatches,
    lang,
  ]);

  // ✅ Memoized — not recomputed every render
  const groupedMenu = useMemo(() => groupItems(filteredItems), [filteredItems]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(restaurant?.menuItems.map((i: MenuItem) => i.category) ?? []),
      ),
    [restaurant?.menuItems],
  );

  const cartCount = useMemo(
    () => Object.values(cart).reduce((a, b) => a + b, 0),
    [cart],
  );

  const scrollToMap = useCallback(() => {
    document
      .getElementById("map-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const callRestaurant = useCallback(() => {
    if (restaurant?.phoneNumber)
      window.location.href = `tel:${restaurant.phoneNumber}`;
  }, [restaurant?.phoneNumber]);

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-gradient-to-br from-stone-50 via-white to-stone-50 dark:from-stone-900 dark:via-stone-950 dark:to-stone-900 flex flex-col items-center justify-center gap-4 text-stone-400">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-10 w-10 text-primary" />
        </motion.div>
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="font-display text-base"
        >
          {t.loading}
        </motion.p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-50 dark:from-stone-900 dark:via-stone-950 dark:to-stone-900 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <UtensilsCrossed className="h-12 w-12 text-stone-400" />
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">
            {t.notFound}
          </h1>
          <p className="text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
            {t.notFoundDesc}
          </p>
        </div>
      </div>
    );
  }

  // ✅ Recomputed inside handlers (not stale closure)
  const isOpen = IsOpen(
    restaurant.openingTime || undefined,
    restaurant.closingTime || undefined,
  );
  const scheduling = getSchedulingConstraints(
    restaurant.openingTime || undefined,
    restaurant.closingTime || undefined,
  );

  const buildAndSendWhatsAppOrder = () => {
    if (!restaurant?.phoneNumber) return;
    if (!customerName.trim()) {
      toast({ title: t.pleaseEnterName, variant: "destructive" });
      return;
    }
    // ✅ Recompute isOpen at call time — not stale
    const currentlyOpen = IsOpen(
      restaurant.openingTime || undefined,
      restaurant.closingTime || undefined,
    );
    if (!currentlyOpen && deliveryTime === "asap") {
      toast({
        title: t.restaurantClosed,
        description: t.closedAsapWarning,
        variant: "destructive",
      });
      setDeliveryTime("custom");
      return;
    }
    if (deliveryTime === "custom") {
      if (!customDateTime) {
        toast({ title: t.selectWithinHours, variant: "destructive" });
        return;
      }
      if (
        restaurant.openingTime &&
        restaurant.closingTime &&
        !isWithinOpeningHours(
          customDateTime,
          restaurant.openingTime,
          restaurant.closingTime,
        )
      ) {
        toast({
          title: t.outsideHours,
          description: `${restaurant.openingTime} – ${restaurant.closingTime}`,
          variant: "destructive",
        });
        return;
      }
    }

    const phone = restaurant.phoneNumber.replace(/\D/g, "");
    let total = 0;
    let message = `🧾 *${t.newOrder}*\n\n👤 *${t.customerName}*\n${customerName}\n\n🍽️ *${t.orderType}*\n${orderType === "dineIn" ? t.dineIn : t.takeaway}\n\n⏰ *${t.deliveryTime}*\n${
      deliveryTime === "asap"
        ? t.asap
        : customDateTime
          ? new Date(customDateTime).toLocaleString()
          : t.customTime
    }\n\n🛒 *${t.orderSummary}*\n`;

    const receiptItems: { name: string; qty: number; price: number }[] = [];
    Object.entries(cart).forEach(([id, qty]) => {
      const item = restaurant.menuItems.find(
        (i: MenuItem) => i.id === parseInt(id),
      );
      if (!item) return;
      const price = priceMap[item.id] ?? 0;
      total += price * qty;
      message += `• ${qty} × ${item.name} — ${price * qty} den\n`;
      receiptItems.push({ name: item.name, qty: qty as number, price });
    });

    message += `\n💰 *${t.total}*: ${total} den`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );

    setReceiptData({
      orderId: Math.random().toString(36).substring(2, 8).toUpperCase(),
      customerName,
      orderType: orderType === "dineIn" ? t.dineIn : t.takeaway,
      deliveryTime:
        deliveryTime === "asap"
          ? t.asap
          : customDateTime
            ? new Date(customDateTime).toLocaleString()
            : t.customTime,
      items: receiptItems,
      total,
      restaurantName: restaurant.name,
      restaurantSlug: slug!,
      timestamp: new Date(),
    });
  };

  const sharedOrderFormProps: OrderFormContentProps = {
    cart,
    menuItems: restaurant.menuItems,
    customerName,
    setCustomerName,
    orderType,
    setOrderType,
    deliveryTime,
    setDeliveryTime,
    customDateTime,
    setCustomDateTime,
    isOpen,
    scheduling,
    openingTime: restaurant.openingTime || undefined,
    closingTime: restaurant.closingTime || undefined,
    cartTotal,
    t,
    isDark,
    updateCart,
  };

  return (
    <>
      <style>{leafletStyles}</style>
      {receiptData && (
        <DigitalReceipt
          data={receiptData}
          lang={lang}
          onClose={() => setReceiptData(null)}
        />
      )}
      <div
        className={`min-h-screen bg-gradient-to-b from-[#FDFBF7] via-white to-[#FDFBF7] dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 transition-colors duration-300 ${cartCount > 0 ? "pb-48" : "pb-36"}`}
      >
        <DarkModeToggle isDark={isDark} toggleDarkMode={toggleDarkMode} />

        <Link href="/">
          <Button
            variant="ghost"
            className="fixed top-4 left-4 z-50 bg-white/90 dark:bg-stone-800/90 backdrop-blur-lg hover:bg-white dark:hover:bg-stone-800 shadow-lg rounded-full h-10 w-10 p-0 border border-white/50 dark:border-stone-700/50"
          >
            <X className="h-4 w-4 text-stone-700 dark:text-stone-300" />
          </Button>
        </Link>

        <AIRestaurantAssistant
          restaurantName={restaurant.name}
          restaurantPhone={restaurant.phoneNumber ?? undefined}
          restaurantLocation={restaurant.location || undefined}
          openingTime={restaurant.openingTime || undefined}
          closingTime={restaurant.closingTime || undefined}
          menuItems={restaurant.menuItems || []}
          onAddToCart={(itemId, quantity) => updateCart(itemId, quantity)}
          lang={lang}
          onScrollToMap={scrollToMap}
          restaurantLatitude={
            restaurant.latitude ? String(restaurant.latitude) : null
          }
          restaurantLongitude={
            restaurant.longitude ? String(restaurant.longitude) : null
          }
          cart={cart}
        />

        {/* Hero Header */}
        <header className="relative bg-stone-900 dark:bg-stone-950 overflow-hidden">
          {restaurant.photoUrl ? (
            <div className="absolute inset-0">
              <img
                src={restaurant.photoUrl}
                className="w-full h-full object-cover opacity-40 dark:opacity-30"
                alt={restaurant.name}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10" />
          )}

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            {/* Restaurant Info Frame */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border-2 border-primary/40 shadow-2xl p-8 sm:p-12 text-center space-y-5 sm:space-y-8 text-white">
              {/* Staggered hero with variants */}
              <motion.div
                variants={heroVariants}
                initial="hidden"
                animate="show"
              >
                <motion.h1
                  variants={heroItem}
                  className="font-display font-bold text-4xl sm:text-6xl tracking-tight text-white drop-shadow-2xl leading-tight"
                >
                  {restaurant.name}
                </motion.h1>

                <motion.div variants={heroItem}>
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg mt-4 ${
                      isOpen
                        ? "bg-emerald-500/30 text-emerald-300 border-2 border-emerald-400/50"
                        : "bg-red-500/30 text-red-300 border-2 border-red-400/50"
                    }`}
                  >
                    {isOpen ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t.openNow}
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5" />
                        {t.closed}
                      </>
                    )}
                  </div>
                </motion.div>

                {restaurant.description && (
                  <motion.p
                    variants={heroItem}
                    className="text-stone-100 text-base sm:text-lg font-medium max-w-xl mx-auto drop-shadow leading-relaxed mt-4"
                  >
                    {restaurant.description}
                  </motion.p>
                )}

                <motion.div
                  variants={heroItem}
                  className="flex flex-wrap justify-center gap-3 pt-2"
                >
                  {restaurant.website && (
                    <a
                      href={restaurant.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-lg px-5 py-2.5 rounded-full border-2 border-white/30 transition-all text-xs font-bold hover:scale-105"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {t.website}
                    </a>
                  )}
                  <a
                    href={`tel:${restaurant.phoneNumber || "+38944123456"}`}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 px-6 py-2.5 rounded-full shadow-xl transition-all text-xs font-bold text-white hover:scale-105"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {t.reserve}
                  </a>
                </motion.div>

                {restaurant.openingTime && restaurant.closingTime && (
                  <motion.div
                    variants={heroItem}
                    className="flex items-center justify-center gap-2 text-stone-300 text-xs pt-2"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {restaurant.openingTime} - {restaurant.closingTime}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </header>

        {/* Sticky Search + Filter Bar */}
        <div className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-lg border-b border-stone-100 dark:border-stone-800 py-3 shadow-sm">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 space-y-2.5">
            <div className="relative">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowVoiceResults(false);
                  }}
                  placeholder={t.searchPlaceholder}
                  className="h-11 pl-12 pr-4 rounded-xl bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-sm w-full"
                />
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <AnimatePresence>
                  {searchTerm && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setSearchTerm("");
                          setShowVoiceResults(false);
                          setVoiceSearchMatches([]);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
                {isSupported && (
                  <Button
                    variant={isListening ? "default" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={isListening ? stopListening : startListening}
                  >
                    <motion.div
                      animate={
                        isListening ? { scale: [1, 1.2, 1] } : { scale: 1 }
                      }
                      transition={{
                        duration: 0.8,
                        repeat: isListening ? Infinity : 0,
                      }}
                    >
                      <Mic className="h-3.5 w-3.5" />
                    </motion.div>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setTimeout(() => {
                    const first = document.querySelector(
                      "[id^='category-']",
                    ) as HTMLElement;
                    if (!first) return;
                    const stickyBarHeight = 120;
                    const top =
                      first.getBoundingClientRect().top +
                      window.scrollY -
                      stickyBarHeight;
                    window.scrollTo({ top, behavior: "smooth" });
                  }, 50);
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${selectedCategory === "All" ? "bg-primary text-primary-foreground shadow-sm" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"}`}
              >
                {t.allCategories}
              </button>
              {categories.map((cat: any) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setTimeout(() => {
                      const el = document.getElementById(`category-${cat}`);
                      if (!el) return;
                      const stickyBarHeight = 120; // adjust if your bar is taller/shorter
                      const top =
                        el.getBoundingClientRect().top +
                        window.scrollY -
                        stickyBarHeight;
                      window.scrollTo({ top, behavior: "smooth" });
                    }, 50);
                  }}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${selectedCategory === cat ? "bg-primary text-primary-foreground shadow-sm" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"}`}
                >
                  {getCategoryDisplay(cat, lang)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu */}
        <main className="max-w-4xl mx-auto px-3 sm:px-4 py-8 space-y-10">
          <SurpriseMe
            menuItems={restaurant.menuItems || []}
            onAddToCart={updateCart}
            lang={lang}
          />

          {/* ✅ Empty state */}
          <AnimatePresence>
            {groupedMenu.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 gap-4 text-stone-400"
              >
                <UtensilsCrossed className="h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">
                  No items match "{searchTerm}"
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm("");
                    setShowVoiceResults(false);
                  }}
                >
                  Clear search
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {groupedMenu.map(
            ([category, items]: [string, MenuItem[]], idx: number) => (
              <motion.section
                key={category}
                id={`category-${category}`}
                // ✅ Improved: spring + slide from left
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: idx * 0.1,
                  type: "spring",
                  stiffness: 260,
                  damping: 24,
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-200 dark:to-stone-700" />
                  <h2 className="font-display font-bold text-xl text-primary px-4 py-1.5 bg-primary/5 dark:bg-primary/10 rounded-full">
                    {getCategoryDisplay(category, lang)}
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-200 dark:to-stone-700" />
                </div>
                <div className="grid gap-4">
                  {items.map((item: MenuItem, itemIdx: number) => (
                    <motion.article
                      key={item.id}
                      id={`item-${item.id}`}
                      // ✅ Improved: blur + spring entrance
                      initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{
                        delay: itemIdx * 0.055,
                        duration: 0.45,
                        ease: EASE_OUT_QUART,
                      }}
                      className="group flex gap-3 sm:gap-5 items-start bg-white dark:bg-stone-800 p-3 sm:p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30 transition-all duration-200"
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          loading="lazy"
                          className="w-20 h-20 sm:w-24 sm:h-28 rounded-xl object-cover shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-200 cursor-zoom-in"
                          alt={item.name}
                          onClick={(e) => { e.stopPropagation(); setLightboxUrl(item.imageUrl!); }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-base sm:text-lg leading-tight flex-1">
                            {lang === "al" && item.nameAl
                              ? item.nameAl
                              : lang === "mk" && item.nameMk
                                ? item.nameMk
                                : item.name}
                          </h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-primary font-bold text-lg sm:text-xl whitespace-nowrap">
                              {item.price}
                            </span>
                            <ShareDialog
                              item={item}
                              restaurantSlug={slug!}
                              lang={lang}
                            />
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 line-clamp-2 mb-2.5 leading-relaxed">
                          {lang === "al" && item.descriptionAl
                            ? item.descriptionAl
                            : lang === "mk" && item.descriptionMk
                              ? item.descriptionMk
                              : item.description}
                        </p>

                        {(item.isVegetarian ||
                          item.isVegan ||
                          item.isGlutenFree) && (
                          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                            {item.isVegetarian && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              >
                                <Leaf className="h-2.5 w-2.5 mr-1" />
                                Vegetarian
                              </Badge>
                            )}
                            {item.isVegan && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              >
                                <Leaf className="h-2.5 w-2.5 mr-1" />
                                Vegan
                              </Badge>
                            )}
                            {item.isGlutenFree && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                              >
                                <WheatOff className="h-2.5 w-2.5 mr-1" />
                                GF
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 bg-stone-50 dark:bg-stone-700/50 w-fit p-1 rounded-full border border-stone-200 dark:border-stone-600">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full hover:bg-white dark:hover:bg-stone-600"
                            onClick={(e) => {
                              e.preventDefault();
                              updateCart(item.id, -1);
                            }}
                          >
                            <Minus className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300" />
                          </Button>
                          {/* ✅ Improved: quantity pops on change */}
                          <motion.span
                            key={cart[item.id] || 0}
                            initial={{ scale: 1.6 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 22,
                            }}
                            className="font-bold w-6 text-center text-stone-900 dark:text-stone-100 text-base"
                          >
                            {cart[item.id] || 0}
                          </motion.span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full hover:bg-white dark:hover:bg-stone-600"
                            onClick={(e) => {
                              e.preventDefault();
                              updateCart(item.id, 1);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300" />
                          </Button>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </motion.section>
            ),
          )}

          {/* Map Section */}
          <motion.section
            id="map-section"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-12 border-t border-stone-200 dark:border-stone-700"
          >
            <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 sm:p-8 shadow-lg border border-stone-100 dark:border-stone-700 space-y-6">
              <div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-stone-900 dark:text-stone-100 mb-3">
                  {t.about} {restaurant.name}
                </h2>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  {restaurant.description || "No description available."}
                </p>
              </div>
              <div className="pt-4 border-t border-stone-100 dark:border-stone-700 space-y-4">
                <h3 className="font-semibold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  {t.ourLocation}
                </h3>
                <RestaurantMap
                  location={restaurant.location || "Macedonia"}
                  name={restaurant.name}
                  latitude={
                    restaurant.latitude ? String(restaurant.latitude) : null
                  }
                  longitude={
                    restaurant.longitude ? String(restaurant.longitude) : null
                  }
                />
                <div className="flex items-start gap-3 bg-stone-50 dark:bg-stone-700/50 p-3.5 rounded-xl border border-stone-100 dark:border-stone-600">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-stone-700 dark:text-stone-300 font-medium text-sm">
                    {restaurant.location || "Macedonia"}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </main>

        {/* Cart Bar */}
        <AnimatePresence>
          {cartCount > 0 && (
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              // ✅ Improved: tighter spring bounce
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-stone-900/95 backdrop-blur-lg border-t-2 border-stone-200 dark:border-stone-700 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-3 pt-3 sm:px-5 sm:pt-4 z-50"
              style={{
                paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))",
              }}
            >
              <div className="max-w-4xl mx-auto">
                {/* Mobile */}
                <div className="flex flex-col gap-2 sm:hidden">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-lg">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        {t.totalBill}
                      </p>
                      <motion.p
                        key={cartTotal}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 20,
                        }}
                        className="text-lg font-bold text-primary"
                      >
                        {cartTotal} DEN
                      </motion.p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCart({})}
                      className="h-8 w-8 p-0 rounded-xl"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex-1 h-auto px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
                        >
                          🟢 {t.orderOnWhatsapp}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white dark:bg-stone-800 border-none rounded-3xl max-w-[100vw] max-h-[92vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-bold text-primary">
                            {t.orderSummary}
                          </DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="flex-1">
                          <OrderFormContent {...sharedOrderFormProps} />
                        </ScrollArea>
                        <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
                          <div className="flex gap-1">
                            <Button
                              className="flex-1 h-7 text-xs font-semibold rounded-xl"
                              onClick={buildAndSendWhatsAppOrder}
                            >
                              🟢 {t.orderOnWhatsapp}
                            </Button>
                            <a
                              href={`tel:${restaurant.phoneNumber || "+38944123456"}`}
                              className="flex-1"
                            >
                              <Button className="w-full h-7 text-xs font-semibold rounded-xl flex items-center justify-center gap-1">
                                <Phone className="h-3 w-3" />
                                {t.callToOrder}
                              </Button>
                            </a>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <a href={`tel:${restaurant.phoneNumber || "+38944123456"}`}>
                      <Button className="h-10 text-xs font-semibold rounded-xl px-3">
                        <Phone className="h-3 w-3 mr-1" />
                        {t.callToOrder}
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Desktop */}
                <div className="hidden sm:flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary text-primary-foreground p-3 rounded-xl">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t.totalBill}
                      </p>
                      <motion.p
                        key={cartTotal}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 20,
                        }}
                        className="text-2xl font-bold text-primary"
                      >
                        {cartTotal} DEN
                      </motion.p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setCart({})}
                      className="h-9 text-xs rounded-xl"
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t.clear}
                    </Button>
                    <Dialog
                      open={openOrderDialog}
                      onOpenChange={setOpenOrderDialog}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-9 text-xs rounded-xl"
                        >
                          <UtensilsCrossed className="h-4 w-4 mr-1" />
                          {t.viewOrder}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white dark:bg-stone-800 rounded-3xl max-w-lg max-h-[90vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold dark:text-stone-100">
                            {t.orderSummary}
                          </DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="flex-1 pr-4">
                          {/* ✅ Shared form — no duplication */}
                          <OrderFormContent {...sharedOrderFormProps} />
                        </ScrollArea>
                        <div className="pt-4 space-y-2.5 border-t border-stone-200 dark:border-stone-700">
                          <Button
                            className="w-full h-11 rounded-2xl font-bold"
                            onClick={buildAndSendWhatsAppOrder}
                          >
                            🟢 {t.orderOnWhatsapp}
                          </Button>
                          <Button
                            onClick={callRestaurant}
                            className="w-full h-11 rounded-xl font-bold"
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            {t.callToOrder}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      onClick={callRestaurant}
                      className="h-9 text-xs rounded-xl"
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      {t.callToOrder}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="py-10 text-center text-stone-400 dark:text-stone-500 text-sm space-y-2">
          {restaurant.location && (
            <div className="flex items-center justify-center gap-2 text-stone-500 dark:text-stone-400">
              <MapPin className="h-3.5 w-3.5" />
              <span className="font-medium">{restaurant.location}</span>
            </div>
          )}
          <p>{t.poweredBy}</p>
        </footer>
      </div>

      {/* ── Image Lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/40 rounded-full w-9 h-9 flex items-center justify-center text-xl hover:bg-black/70 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt="Menu item"
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
