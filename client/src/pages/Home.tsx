import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { api } from "@shared/routes";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Utensils,
  Globe,
  Phone,
  Search,
  Sparkles,
  ForkKnife,
  Clock,
  MapPin,
  ChevronRight,
  Loader2,
  User,
  Mail,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "@/hooks/useDarkMode";
import { DarkModeToggle } from "@/components/DarkModeToggle";

const translations: Record<string, any> = {
  en: {
    hero: "The Digital Menu Platform of Macedonia.",
    subHero: "Browse menus and calculate your bill before you order.",
    searchPlaceholder:
      "Search for restaurants or dishes (e.g. Pizza, Burger)...",
    results: "Search Results",
    localRestaurants: "Local Restaurants",
    found: "Found",
    matches: "matches",
    explore: "Explore the taste of Macedonia",
    noResults: "No results matching your search.",
    noRestaurants: "No restaurants have joined HAJDE HA yet.",
    whyUs: "Why Choose HAJDE HA?",
    whyUsSub:
      "The modern way to experience dining in Macedonia. Simple, efficient, and contactless.",
    digitalMenus: "Digital Menus",
    digitalMenusDesc:
      "Access high-quality menus instantly from any smartphone. No physical menus needed.",
    billCalc: "Bill Calculator",
    billCalcDesc:
      "Know exactly what your meal will cost before you order. Calculate sums in Denars instantly.",
    eco: "Eco-Friendly",
    ecoDesc:
      "Reduce paper waste by switching to digital menus. Update your menu anytime without reprinting.",
    listRestaurant: "Want to list your restaurant?",
    noRestaurantsOpen: "No restaurants are opened now.",
    joinPlatform:
      "Join the fastest growing digital menu platform in Macedonia. Help your customers browse faster and better.",
    emailUs: "Email Us",
    callSupport: "Call Support",
    contactTitle: "Get Your Restaurant Online",
    contactSubtitle:
      "Join the digital menu revolution in Macedonia. Fill out the form below and we'll get back to you within 24 hours.",
    fullName: "Full Name",
    emailAddr: "Email Address",
    restaurantName: "Restaurant Name",
    message: "Message",
    send: "Send Message",
    sending: "Sending...",
    contactSuccess: "Thank you! We will contact you soon.",
    ownerLogin: "Owner Login",
    open: "Open",
    closed: "Closed",
    poweredBy: "Powered by HAJDE HA",
    howToUse: "How to Use HAJDE HA?",
    sortByDistance: "Sort by nearest",
    clearLocation: "Clear location",
    openNow: "Open now",
    gettingLocation: "Getting location...",
    locationError: "Location access denied",
    distance: "distance",
    km: "km",
    step1: "Select a Restaurant",
    step1Desc:
      "Browse our curated list of the best local restaurants in Macedonia.",
    step2: "Explore the Menu",
    step2Desc:
      "See dishes with photos, detailed descriptions, and up-to-date prices.",
    step3: "Calculate Your Bill",
    step3Desc:
      "Add items to your virtual bill to see the total before you even order.",
    step4: "Enjoy Your Meal",
    step4Desc:
      "Visit the restaurant or call them directly to place your order with confidence.",
  },
  al: {
    hero: "Platforma e Menusë Digjitale e Maqedonisë.",
    subHero:
      "Shfletoni menutë dhe llogaritni faturën tuaj para se të porosisni.",
    searchPlaceholder: "Kërko për restorante ose pjata (p.sh. Pica, Burger)...",
    results: "Rezultatet e Kërkimit",
    localRestaurants: "Restorantet Lokale",
    found: "U gjetën",
    matches: "përputhje",
    explore: "Eksploroni shijen e Maqedonisë",
    noResults: "Nuk u gjet asnjë rezultat që përputhet me kërkimin tuaj.",
    noRestaurants: "Ende asnjë restorant nuk i është bashkuar HAJDE HA.",
    whyUs: "Pse të zgjidhni HAJDE HA?",
    whyUsSub:
      "Mënyra moderne për të përjetuar ngrënien në Maqedoni. E thjeshtë, efikase dhe pa kontakt.",
    digitalMenus: "Menu Digjitale",
    digitalMenusDesc:
      "Qasuni menjëherë në menu cilësore nga çdo smartphone. Nuk ka nevojë për menu fizike.",
    billCalc: "Llogaritësi i Faturës",
    billCalcDesc:
      "Dini saktësisht se sa do të kushtojë vakti juaj para se të porosisni. Llogaritni shumat në Denarë menjëherë.",
    eco: "Ekologjike",
    ecoDesc:
      "Reduktoni mbetjet e letrës duke kaluar në menu digjitale. Përditësoni menunë tuaj në çdo kohë pa riprintim.",
    listRestaurant: "Dëshironi të listoni restorantin tuaj?",
    noRestaurantsOpen: "Asnjë restorant nuk është i hapur tani.",
    joinPlatform:
      "Bashkohuni me platformën e menusë digjitale me rritjen më të shpejtë në Maqedoni.",
    emailUs: "Na dërgoni email",
    callSupport: "Telefoni Mbështetjen",
    contactTitle: "Vendosni Restorantin tuaj Online",
    contactSubtitle:
      "Bashkohuni me revolucionin e menusë digjitale në Maqedoni. Plotësoni formularin dhe ne do t'ju kontaktojmë brenda 24 orëve.",
    fullName: "Emri i plotë",
    emailAddr: "Adresa e Email-it",
    restaurantName: "Emri i Restorantit",
    message: "Mesazhi",
    send: "Dërgo Mesazhin",
    sending: "Duke dërguar...",
    contactSuccess: "Faleminderit! Ne do t'ju kontaktojmë së shpejti.",
    ownerLogin: "Hyrja e Pronarit",
    open: "Hapur",
    closed: "Mbyllur",
    poweredBy: "Mundësuar nga HAJDE HA",
    howToUse: "Si ta përdorni këtë platformë?",
    sortByDistance: "Rendit sipas distancës",
    clearLocation: "Fshi lokacionin",
    openNow: "Hapur tani",
    gettingLocation: "Duke marrë vendndodhjen...",
    locationError: "Qasja në vendndodhje u refuzua",
    distance: "distanca",
    km: "km",
    step1: "Zgjidhni një restorant",
    step1Desc: "Shfletoni listën tonë të restoranteve më të mira në Maqedoni.",
    step2: "Shfletoni menunë",
    step2Desc: "Shikoni pjatat me foto, përshkrime dhe çmime të sakta.",
    step3: "Llogaritni faturën",
    step3Desc:
      "Shtoni pjatat në llogaritës për të parë shumën totale para se të porosisni.",
    step4: "Shijoni vaktin tuaj",
    step4Desc:
      "Vizitoni restorantin ose telefononi direkt për të bërë porosinë tuaj.",
  },
  mk: {
    hero: "Дигитална платформа за мени во Македонија.",
    subHero:
      "Прелистувајте менија и пресметајте ја вашата сметка пред да нарачате.",
    searchPlaceholder:
      "Пребарајте ресторани или јадења (на пр. Пица, Бургер)...",
    results: "Резултати од пребарувањето",
    localRestaurants: "Локални ресторани",
    found: "Пронајдени",
    matches: "резултати",
    explore: "Истражете го вкусот на Македонија",
    noResults: "Нема резултати што одговараат на вашето пребарување.",
    noRestaurants: "Ниту еден ресторан сè уште не се приклучил на HAJDE HA.",
    whyUs: "Зошто да изберете HAJDE HA?",
    whyUsSub:
      "Модерен начин за јадење во Македонија. Едноставно, ефикасно и без контакт.",
    digitalMenus: "Дигитални менија",
    digitalMenusDesc:
      "Пристапете до квалитетни менија веднаш од кој било паметен телефон. Нема потреба од физички менија.",
    billCalc: "Калкулатор на сметки",
    billCalcDesc:
      "Знајте точно колку ќе чини вашиот оброк пред да нарачате. Пресметајте ги сумите во денари веднаш.",
    eco: "Еколошки",
    ecoDesc:
      "Намалете го отпадот од хартија со префрлање на дигитални менија. Ажурирајте го вашето мени во секое време без печатење.",
    listRestaurant: "Сакате да го наведете вашиот ресторан?",
    noRestaurantsOpen: "Ниту еден ресторан не е отворен сега.",
    joinPlatform:
      "Придружете се на најбрзо растечката дигитална платформа за менија во Македонија.",
    emailUs: "Пишете ни",
    callSupport: "Повикајте поддршка",
    contactTitle: "Ставете го вашиот ресторан онлајн",
    contactSubtitle:
      "Придружете се на дигиталната револуција во Македонија. Пополнете го формуларот и ќе ве контактираме во рок од 24 часа.",
    fullName: "Целосно име",
    emailAddr: "Е-пошта",
    restaurantName: "Име на ресторан",
    message: "Порака",
    send: "Испрати порака",
    sending: "Се испраќа...",
    contactSuccess: "Ви благодариме! Ќе ве контактираме наскоро.",
    ownerLogin: "Најава за сопственик",
    open: "Отворено",
    closed: "Затворено",
    poweredBy: "Овозможено од HAJDE HA",
    howToUse: "Како да ја користите оваа платформа?",
    sortByDistance: "Сортирај според оддалеченост",
    clearLocation: "Исчисти локација",
    openNow: "Отворено сега",
    gettingLocation: "Преземање локација...",
    locationError: "Пристапот до локација е одбиен",
    distance: "оддалеченост",
    km: "км",
    step1: "Изберете ресторан",
    step1Desc: "Прелистајте ја нашата листа на најдобри ресторани во Македонија.",
    step2: "Прелистајте го менито",
    step2Desc: "Погледнете ги јадењата со слики, описи и точни цени.",
    step3: "Пресметајте ја сметката",
    step3Desc:
      "Додајте јадења во калкулаторот за да го видите вкупниот износ пред да нарачате.",
    step4: "Уживајте во вашиот оброк",
    step4Desc:
      "Посетете го ресторанот или јавете се директно за да ја направите вашата нарачка.",
  },
};

function IsOpen(openingTime?: string, closingTime?: string) {
  if (!openingTime || !closingTime) return true;
  const d = new Date();
  const currentTime = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  if (closingTime <= openingTime) {
    return currentTime >= openingTime || currentTime <= closingTime;
  }
  return currentTime >= openingTime && currentTime <= closingTime;
}

// ── Persist location in localStorage so it survives navigation ──
function loadSavedLocation(): { lat: number; lng: number } | null {
  try {
    const saved = localStorage.getItem("hajdeha-location");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveLocation(loc: { lat: number; lng: number } | null) {
  if (loc) {
    localStorage.setItem("hajdeha-location", JSON.stringify(loc));
  } else {
    localStorage.removeItem("hajdeha-location");
  }
}

export default function Home() {
  const { isDark, toggleDarkMode } = useDarkMode();
  const [lang, setLang] = useState<"en" | "al" | "mk">(() => {
    const saved = localStorage.getItem("hajdeha-lang");
    return (saved as any) || "en";
  });

  const t = translations[lang];

  // ── Load location from localStorage on mount ──
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(loadSavedLocation);

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(false);

  // ── PWA Install Prompt ──
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const iosStandalone = (window.navigator as any).standalone === true;
    const androidStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const isInstalled = iosStandalone || androidStandalone;
    setIsIOS(ios);

    // Don't show banner if already installed as PWA
    if (isInstalled) return;

    // Show iOS guide if on iOS and not already installed
    if (ios) {
      const dismissed = localStorage.getItem("hajdeha-ios-banner-dismissed");
      if (!dismissed) setShowInstallBanner(true);
    }

    // Android/Desktop Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem("hajdeha-ios-banner-dismissed", "1");
  };

  const handleGetLocation = () => {
    // If already have location, clear it (toggle off)
    if (userLocation) {
      setUserLocation(null);
      saveLocation(null);
      return;
    }

    setIsGettingLocation(true);
    setLocationError(false);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          saveLocation(loc); // persist so back-navigation keeps it
          setIsGettingLocation(false);
        },
        () => {
          setIsGettingLocation(false);
          setLocationError(true);
        },
      );
    } else {
      setIsGettingLocation(false);
    }
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  const handleLangChange = (newLang: "en" | "al" | "mk") => {
    setLang(newLang);
    localStorage.setItem("hajdeha-lang", newLang);
  };

  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const { data: restaurantsData, isLoading } = useQuery({
    queryKey: [api.restaurants.listAll.path],
  });
  const restaurants = useMemo(() => {
    const activeRestaurants = ((restaurantsData as any[]) || []).filter(
      (r) => r.active !== false,
    );
    return shuffleArray(activeRestaurants);
  }, [restaurantsData]);

  const filteredRestaurants = useMemo(() => {
    let result = restaurants.map((r: any) => {
      let distance = null;
      if (userLocation && r.latitude && r.longitude) {
        distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          parseFloat(r.latitude),
          parseFloat(r.longitude),
        );
      }
      const isOpen = IsOpen(r.openingTime, r.closingTime);

      // Calculate dish match score for better sorting
      let dishMatchScore = 0;
      if (searchTerm && r.menuItems?.length > 0) {
        const searchLower = searchTerm.toLowerCase().trim();
        r.menuItems.forEach((item: any) => {
          const itemName = (item.name || "").toLowerCase();
          const itemDesc = (item.description || "").toLowerCase();

          // Exact match gets highest score
          if (itemName === searchLower || itemDesc === searchLower) {
            dishMatchScore += 10;
          }
          // Starts with search term gets medium score
          else if (
            itemName.startsWith(searchLower) ||
            itemDesc.startsWith(searchLower)
          ) {
            dishMatchScore += 5;
          }
          // Contains search term gets lowest score
          else if (
            itemName.includes(searchLower) ||
            itemDesc.includes(searchLower)
          ) {
            dishMatchScore += 1;
          }
        });
      }

      return { ...r, distance, isOpen, dishMatchScore };
    });

    if (showOpenOnly) {
      result = result.filter((r) => r.isOpen);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim();

      result = result.filter((restaurant: any) => {
        const nameMatch = (restaurant.name || "")
          .toLowerCase()
          .includes(searchLower);

        const menuMatch = restaurant.dishMatchScore > 0;

        return nameMatch || menuMatch;
      });

      // Sort by dish match score, then by distance
      result.sort((a, b) => {
        // First, sort by dish match score (higher is better)
        if (a.dishMatchScore !== b.dishMatchScore) {
          return b.dishMatchScore - a.dishMatchScore;
        }

        // Then by distance if available
        if (userLocation) {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        }

        return 0;
      });
    } else if (userLocation) {
      // Only sort by distance if no search term
      result.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    return result;
  }, [restaurants, searchTerm, userLocation, showOpenOnly]);

  function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let i = 0;

    const interval = setInterval(() => {
      setTyped(t.hero.slice(0, i + 1));
      i++;

      if (i === t.hero.length) clearInterval(interval);
    }, 70);

    return () => clearInterval(interval);
  }, [t.hero]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Dark Mode Toggle - Fixed Position */}
      <DarkModeToggle isDark={isDark} toggleDarkMode={toggleDarkMode} />

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex flex-col bg-primary text-primary-foreground overflow-hidden">
        {/* Background Pattern with Gradient Overlay */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-10 dark:opacity-5 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/60 to-primary" />
        </div>

        {/* Top Bar */}
        <div className="relative z-20 flex items-center justify-between p-4 safe-area-inset-top">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/10 dark:bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 dark:border-white/30 shadow-lg">
              <Utensils className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">HAJDE HA</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="bg-white/10 dark:bg-white/20 backdrop-blur-md rounded-xl border border-white/20 dark:border-white/30 p-1 flex shadow-lg">
              {(["en", "al", "mk"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => handleLangChange(l)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                    lang === l
                      ? "bg-white dark:bg-white/90 text-primary shadow-md scale-105"
                      : "text-white/80 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Admin Login */}
            <Link href="/auth/login">
              <button
                className="w-10 h-10 bg-white/10 dark:bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 dark:border-white/30 hover:bg-white/20 dark:hover:bg-white/30 hover:scale-105 transition-all duration-300 shadow-lg"
                title={t.ownerLogin}
              >
                <User className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>

        {/* Hero Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 relative z-10">
          <div className="text-center max-w-md mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 dark:bg-white/20 backdrop-blur-md rounded-full px-4 py-2 mb-6 border border-white/20 dark:border-white/30 shadow-lg">
              <ForkKnife className="w-4 h-4" />
              <span className="text-sm font-medium">Hajde Ha</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-balance drop-shadow-lg text-white">
              {typed}
            </h1>

            <p className="text-base sm:text-lg opacity-90 mb-8 text-pretty drop-shadow-md">
              {t.subHero}
            </p>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none z-10" />
              <Input
                placeholder={t.searchPlaceholder}
                className="pl-12 h-14 bg-white dark:bg-stone-800 text-foreground dark:text-stone-100 rounded-2xl border-0 shadow-2xl focus-visible:ring-2 focus-visible:ring-primary/50 dark:focus-visible:ring-primary focus-visible:shadow-2xl focus-visible:scale-[1.02] transition-all duration-300 text-base placeholder:text-stone-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-restaurants"
              />
            </div>
          </div>
          <div
            onClick={() =>
              window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
            }
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center animate-bounce cursor-pointer"
          >
            <span className="text-[10px] text-white/70 mb-1">Scroll</span>

            <div className="w-4 h-7 border border-white/60 rounded-full flex items-start justify-center p-[2px]">
              <div className="w-[2px] h-[4px] bg-white rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant List */}
      <main className="max-w-6xl mx-auto py-16 px-4">
        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">
              {searchTerm ? t.results : t.localRestaurants}
            </h2>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <p className="text-muted-foreground">
                {searchTerm
                  ? `${t.found} ${filteredRestaurants.length} ${t.matches}`
                  : t.explore}
              </p>

              {/* Location button — active state shows it's ON, click again to clear */}
              <Button
                variant={userLocation ? "default" : "outline"}
                size="sm"
                className={`rounded-full gap-2 transition-all duration-300 ${userLocation ? "shadow-md" : ""}`}
                onClick={handleGetLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                {isGettingLocation
                  ? t.gettingLocation
                  : locationError
                    ? t.locationError
                    : userLocation
                      ? t.clearLocation
                      : t.sortByDistance}
              </Button>

              <Button
                variant={showOpenOnly ? "default" : "outline"}
                size="sm"
                className={`rounded-full gap-2 transition-all duration-300 ${showOpenOnly ? "shadow-md" : ""}`}
                onClick={() => setShowOpenOnly(!showOpenOnly)}
              >
                <Clock className="h-4 w-4" />
                {t.openNow}
              </Button>
            </div>
          </div>
        </div>

        {/* Restaurants Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse h-64 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRestaurants
              .filter((restaurant: any) =>
                showOpenOnly ? restaurant.isOpen : true,
              )
              .map((restaurant: any) => {
                const isOpen = restaurant.isOpen;

                return (
                  <div key={restaurant.id} className="contents">
                    <Link
                      href={`/restaurant/${restaurant.slug}`}
                      className="contents"
                    >
                      <Card className="hover-elevate cursor-pointer h-full border-2 border-stone-200 dark:border-stone-700 hover:border-primary dark:hover:border-primary shadow-lg hover:shadow-2xl dark:shadow-stone-900/50 overflow-hidden group rounded-2xl flex flex-col relative bg-white dark:bg-stone-800 active:border-primary dark:active:border-primary transition-all duration-300">
                        {/* Open/Closed Badge */}
                        <div
                          className={`absolute top-4 left-4 z-20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border ${
                            isOpen
                              ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30"
                              : "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30"
                          }`}
                        >
                          {isOpen ? `● ${t.open}` : `○ ${t.closed}`}
                        </div>

                        {/* Distance Badge */}
                        {restaurant.distance !== null && (
                          <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full text-[10px] font-bold bg-white/80 dark:bg-stone-700/80 backdrop-blur-md border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300">
                            {restaurant.distance.toFixed(1)} {t.km}
                          </div>
                        )}

                        {/* Restaurant Image */}
                        {restaurant.photoUrl && (
                          <div className="h-48 overflow-hidden flex-shrink-0">
                            <img
                              src={restaurant.photoUrl}
                              alt={restaurant.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        )}

                        {/* Card Header */}
                        <CardHeader className="bg-white dark:bg-stone-800 flex-1 flex flex-col">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="font-display text-2xl text-stone-900 dark:text-stone-100 group-hover:text-primary transition-colors">
                              {restaurant.name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2 text-stone-500 dark:text-stone-400 mt-2 flex-1">
                              {restaurant.description ||
                                t.noDesc ||
                                "No description available."}
                            </CardDescription>
                          </div>

                          {/* Website & Phone */}
                          <div className="flex flex-wrap gap-4 mt-4 text-xs text-stone-400 dark:text-stone-500 font-medium">
                            {restaurant.website && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.open(
                                    restaurant.website.startsWith("http")
                                      ? restaurant.website
                                      : `https://${restaurant.website}`,
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                                }}
                                className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0"
                              >
                                <Globe className="h-3 w-3" />
                                {restaurant.website
                                  .replace(/^https?:\/\//, "")
                                  .replace(/\/$/, "")}
                              </button>
                            )}
                            {restaurant.phoneNumber && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.location.href = `tel:${restaurant.phoneNumber}`;
                                }}
                                className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0"
                              >
                                <Phone className="h-3 w-3" />
                                {restaurant.phoneNumber}
                              </button>
                            )}
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  </div>
                );
              })}
          </div>
        )}

        {/* Empty State */}
        {filteredRestaurants.length === 0 && !isLoading && (
          <div className="text-center py-20 px-4">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center">
                <Utensils className="h-10 w-10 text-stone-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-stone-900 dark:text-stone-100">
                {searchTerm
                  ? lang === "en"
                    ? "No results found"
                    : lang === "al"
                      ? "Nuk u gjet asgjë"
                      : "Ништо не е најдено"
                  : lang === "en"
                    ? "No restaurants yet"
                    : lang === "al"
                      ? "Ende pa restorante"
                      : "Сè уште нема ресторани"}
              </h3>
              <p className="text-stone-600 dark:text-stone-400 mb-6">
                {searchTerm
                  ? lang === "en"
                    ? "Try searching for something else"
                    : lang === "al"
                      ? "Provo të kërkosh diçka tjetër"
                      : "Обидете се да побарате нешто друго"
                  : lang === "en"
                    ? "Check back soon for new restaurants"
                    : lang === "al"
                      ? "Kontrollo së shpejti për restorante të reja"
                      : "Проверете наскоро за нови ресторани"}
              </p>
              {searchTerm && (
                <Button
                  onClick={() => setSearchTerm("")}
                  variant="outline"
                  className="rounded-full"
                >
                  {lang === "en"
                    ? "Clear search"
                    : lang === "al"
                      ? "Pastro kërkimin"
                      : "Исчисти пребарување"}
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* How to Use Section */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 bg-gradient-to-b from-white to-orange-50 dark:from-stone-900 dark:to-stone-800/50 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-stone-800 dark:text-stone-100 transition-colors duration-300">
              {t.howToUse}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-8">
            {[1, 2, 3, 4].map((num) => (
              <div
                key={num}
                className="bg-white dark:bg-stone-900 p-6 sm:p-7 lg:p-8 rounded-2xl border-2 border-stone-200 dark:border-stone-700 hover:border-primary dark:hover:border-primary active:border-primary dark:active:border-primary shadow-lg hover:shadow-xl transition-all duration-300 space-y-4 hover:-translate-y-1 cursor-pointer"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full flex items-center justify-center font-bold text-lg sm:text-xl shadow-md">
                  {num}
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-display text-stone-800 dark:text-stone-100 transition-colors duration-300">
                  {t[`step${num}` as keyof typeof t]}
                </h3>
                <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed transition-colors duration-300">
                  {t[`step${num}Desc` as keyof typeof t]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Why Us Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-white to-orange-50 dark:from-stone-900 dark:to-stone-800/50 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-stone-800 dark:text-stone-100 transition-colors duration-300">
              {t.whyUs}
            </h2>
            <p className="text-stone-600 dark:text-stone-200 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed transition-colors duration-300">
              {t.whyUsSub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            <div className="text-center space-y-5 group">
              <div className="bg-primary/10 dark:bg-primary/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-105">
                <Utensils className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold font-display text-stone-900 dark:text-stone-100 transition-colors duration-300">
                {t.digitalMenus}
              </h3>
              <p className="text-stone-600 dark:text-stone-200 leading-relaxed transition-colors duration-300">
                {t.digitalMenusDesc}
              </p>
            </div>

            <div className="text-center space-y-5 group">
              <div className="bg-primary/10 dark:bg-primary/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-105">
                <span className="text-3xl font-bold font-display">DEN</span>
              </div>
              <h3 className="text-2xl font-bold font-display text-stone-900 dark:text-stone-100 transition-colors duration-300">
                {t.billCalc}
              </h3>
              <p className="text-stone-600 dark:text-stone-200 leading-relaxed transition-colors duration-300">
                {t.billCalcDesc}
              </p>
            </div>

            <div className="text-center space-y-5 group">
              <div className="bg-primary/10 dark:bg-primary/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-105">
                <Globe className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold font-display text-stone-900 dark:text-stone-100 transition-colors duration-300">
                {t.eco}
              </h3>
              <p className="text-stone-600 dark:text-stone-200 leading-relaxed transition-colors duration-300">
                {t.ecoDesc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 px-4 bg-muted/20 dark:bg-stone-900/50 relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-4 transition-colors duration-300">
              {t.contactTitle}
            </h2>
            <p className="text-stone-600 dark:text-stone-200 leading-relaxed transition-colors duration-300">
              {t.contactSubtitle}
            </p>
          </div>

          <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-gradient-to-b from-white to-orange-50 dark:from-stone-900 dark:to-stone-800/50 transition-colors duration-300">
            <div className="grid grid-cols-1 md:grid-cols-5">
              {/* Contact Info */}
              <div className="md:col-span-2 flex flex-col justify-between p-8 md:p-12 rounded-2xl bg-primary dark:bg-secondary transition-colors duration-300">
                <div>
                  <h3 className="text-2xl font-bold mb-6 text-primary-foreground dark:text-stone-100 transition-colors duration-300">
                    Contact Information
                  </h3>
                  <div className="space-y-8">
                    <div className="flex items-start gap-4">
                      <Mail className="h-6 w-6 text-primary-foreground dark:text-stone-100 transition-colors duration-300" />
                      <div>
                        <p className="font-semibold text-primary-foreground dark:text-stone-100 transition-colors duration-300">
                          {t.emailUs}
                        </p>
                        <p className="text-primary-foreground/70 dark:text-stone-200 transition-colors duration-300">
                          hajdeha.mk@outlook.com
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Phone className="h-6 w-6 text-primary-foreground dark:text-stone-100 transition-colors duration-300" />
                      <div>
                        <p className="font-semibold text-primary-foreground dark:text-stone-100 transition-colors duration-300">
                          {t.callSupport}
                        </p>
                        <p className="text-primary-foreground/70 dark:text-stone-200 transition-colors duration-300">
                          +389 70 860 063
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-12 border-t border-white/10 dark:border-stone-700">
                  <p className="text-sm text-primary-foreground/60 dark:text-stone-300 leading-relaxed transition-colors duration-300">
                    Based in Macedonia, supporting local businesses transition to
                    the digital era.
                  </p>
                </div>
              </div>

              {/* Contact Form */}
              <div className="md:col-span-3 p-8 md:p-12 bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 rounded-2xl transition-colors duration-300">
                <form
                  className="space-y-6"
                  action="https://formspree.io/f/xykkalgq"
                  method="POST"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget as HTMLFormElement;
                    const btn = form.querySelector("button");
                    if (!btn) return;

                    const formData = {
                      name: (form.querySelector("#name") as HTMLInputElement)
                        .value,
                      email: (form.querySelector("#email") as HTMLInputElement)
                        .value,
                      restaurant: (
                        form.querySelector("#restaurant") as HTMLInputElement
                      ).value,
                      message: (
                        form.querySelector("#message") as HTMLTextAreaElement
                      ).value,
                    };

                    try {
                      btn.disabled = true;
                      const originalText = btn.innerText;
                      btn.innerText = t.sending;

                      const res = await fetch(
                        "https://formspree.io/f/xykkalgq",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(formData),
                        },
                      );

                      if (!res.ok) throw new Error("Failed to send message");

                      toast({
                        title: t.contactSuccess,
                        className: "bg-green-600 text-white border-0",
                      });

                      form.reset();
                      btn.innerText = originalText;
                      btn.disabled = false;
                    } catch (err) {
                      console.error(err);
                      toast({
                        title: "Failed to send message",
                        className: "bg-red-600 text-white border-0",
                      });
                      btn.disabled = false;
                    }
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-sm font-semibold dark:text-stone-100"
                      >
                        {t.fullName}
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        className="bg-muted/30 border-0 focus-visible:ring-primary h-11 dark:bg-stone-800 dark:text-stone-100"
                        placeholder="Filan Fisteku"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-sm font-semibold dark:text-stone-100"
                      >
                        {t.emailAddr}
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="bg-muted/30 border-0 focus-visible:ring-primary h-11 dark:bg-stone-800 dark:text-stone-100"
                        placeholder="filan@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="restaurant"
                      className="text-sm font-semibold dark:text-stone-100"
                    >
                      {t.restaurantName}
                    </Label>
                    <Input
                      id="restaurant"
                      name="restaurant"
                      required
                      className="bg-muted/30 border-0 focus-visible:ring-primary h-11 dark:bg-stone-800 dark:text-stone-100"
                      placeholder="My Awesome Restaurant"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="message"
                      className="text-sm font-semibold dark:text-stone-100"
                    >
                      {t.message}
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      className="bg-muted/30 border-0 focus-visible:ring-primary min-h-[120px] dark:bg-stone-800 dark:text-stone-100"
                      placeholder="..."
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg rounded-xl hover-elevate shadow-lg"
                  >
                    {t.send}
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <footer className="py-12 border-t text-center text-stone-400 text-sm">
        <p>© 2026 HAJDE HA - Macedonia Digital Menu Platform</p>
      </footer>

      {/* ── PWA Install Banner ── */}
      {showInstallBanner && !showIOSGuide && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
          <div className="bg-stone-900 dark:bg-stone-800 text-white rounded-2xl p-4 shadow-2xl border border-stone-700 flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-xl">
              📲
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">HAJDE HA</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {isIOS
                  ? lang === "en"
                    ? "Add to home screen"
                    : lang === "al"
                      ? "Shto në ekranin kryesor"
                      : "Додај на почетен екран"
                  : lang === "en"
                    ? "Install the app"
                    : lang === "al"
                      ? "Instalo aplikacionin"
                      : "Инсталирај ја апликацијата"}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={dismissBanner}
                className="px-2.5 py-1.5 rounded-lg bg-stone-700 text-xs text-stone-300 hover:bg-stone-600 transition-colors"
              >
                {lang === "en" ? "No" : lang === "al" ? "Jo" : "Не"}
              </button>
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
              >
                {isIOS
                  ? lang === "en"
                    ? "How?"
                    : lang === "al"
                      ? "Si?"
                      : "Како?"
                  : lang === "en"
                    ? "Install"
                    : lang === "al"
                      ? "Instalo"
                      : "Инсталирај"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── iOS Install Guide ── */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">📱</div>
              <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">
                {lang === "en"
                  ? "Install HAJDE HA"
                  : lang === "al"
                    ? "Instalo HAJDE HA"
                    : "Инсталирај HAJDE HA"}
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                {lang === "en"
                  ? "Add to your iPhone home screen"
                  : lang === "al"
                    ? "Shto në ekranin kryesor të iPhone-it"
                    : "Додај на почетниот екран на iPhone"}
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800">
                <span className="text-xl flex-shrink-0">1️⃣</span>
                <p className="text-sm text-stone-700 dark:text-stone-300">
                  {lang === "en" ? (
                    <>
                      Tap the <strong>Share</strong> button (
                      <span className="text-primary">□↑</span>) at the bottom of
                      Safari
                    </>
                  ) : lang === "al" ? (
                    <>
                      Shtyp butonin <strong>Shpërnda</strong> (
                      <span className="text-primary">□↑</span>) në fund të
                      Safari
                    </>
                  ) : (
                    <>
                      Допри го копчето <strong>Сподели</strong> (
                      <span className="text-primary">□↑</span>) на дното на
                      Safari
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800">
                <span className="text-xl flex-shrink-0">2️⃣</span>
                <p className="text-sm text-stone-700 dark:text-stone-300">
                  {lang === "en" ? (
                    <>
                      {" "}
                      Select <strong>"Add to Home Screen"</strong>
                    </>
                  ) : lang === "al" ? (
                    <>
                      Zgjidh <strong>"Shto në Ekranin Kryesor"</strong>
                    </>
                  ) : (
                    <>
                      Избери <strong>"Додај на почетен екран"</strong>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800">
                <span className="text-xl flex-shrink-0">3️⃣</span>
                <p className="text-sm text-stone-700 dark:text-stone-300">
                  {lang === "en" ? (
                    <>
                      Tap <strong>"Add"</strong> and done! 🎉
                    </>
                  ) : lang === "al" ? (
                    <>
                      Shtyp <strong>"Shto"</strong> dhe gati! 🎉
                    </>
                  ) : (
                    <>
                      Допри <strong>"Додај"</strong> и готово! 🎉
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowIOSGuide(false);
                setShowInstallBanner(false);
                localStorage.setItem("hajdeha-ios-banner-dismissed", "1");
              }}
              className="w-full mt-5 h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              {lang === "en"
                ? "Got it! ✓"
                : lang === "al"
                  ? "Kuptova! ✓"
                  : "Разбрав! ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
