"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Plus,
  Loader2,
  ExternalLink,
  Trash2,
  LogOut,
  Store,
  ChevronRight,
  QrCode,
  Download,
  MapPin,
  Clock,
  LayoutGrid,
  Upload,
  X,
  Link as LinkIcon,
  TrendingUp,
  Eye,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRestaurantSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import QRCode from "qrcode";
import { useState, useRef, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ── Image Upload ──────────────────────────────────────────────────────────────
function ImageUploadField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const [preview, setPreview] = useState<string>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const b = reader.result as string;
      setPreview(b);
      onChange(b);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setPreview("");
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="grid gap-2.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2 mb-2">
        <Button
          type="button"
          variant={uploadMode === "url" ? "default" : "outline"}
          size="sm"
          onClick={() => setUploadMode("url")}
          className="flex-1"
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          URL
        </Button>
        <Button
          type="button"
          variant={uploadMode === "file" ? "default" : "outline"}
          size="sm"
          onClick={() => setUploadMode("file")}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>
      {uploadMode === "url" ? (
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setPreview(e.target.value);
          }}
          placeholder="https://images.unsplash.com/..."
          className="h-11"
        />
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="restaurant-photo-upload"
          />
          <label htmlFor="restaurant-photo-upload">
            <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload image</p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 5MB
              </p>
            </div>
          </label>
        </div>
      )}
      {preview && (
        <div className="relative mt-2">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border"
            onError={() => {
              if (uploadMode === "url") setPreview("");
            }}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={clearImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}


function WaiterEarningsPanel({ restaurantId }: { restaurantId: number }) {
  const { data: raw, isLoading } = useQuery<{ earnings: { waiterId: number; waiterName: string; total: number }[]; days: string[] }>({
    queryKey: [`waiter-earnings-${restaurantId}`],
    queryFn: async () => {
      const res = await fetch(`/api/admin/waiter-earnings?restaurantId=${restaurantId}&period=day`);
      if (!res.ok) return { earnings: [], days: [] };
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const data = raw?.earnings ?? [];

  if (isLoading)
    return (
      <div className="py-2 flex justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );

  if (!data || data.length === 0)
    return (
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground">Kamarierat sot</p>
        </div>
        <p className="text-xs text-muted-foreground">Nuk ka të dhëna për sot</p>
      </div>
    );

  const grandTotal = data.reduce((s, w) => s + w.total, 0);

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground">Kamarierat sot</p>
        </div>
        <p className="text-xs font-bold text-foreground">{grandTotal} DEN total</p>
      </div>
      <div className="space-y-1.5">
        {data.map((w) => (
          <div
            key={w.waiterId}
            className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
            data-testid={`waiter-earnings-${w.waiterId}`}
          >
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">
                  {w.waiterName.split(" ").map((n) => n[0]).join("").toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground">{w.waiterName}</span>
            </div>
            <span className="text-sm font-bold text-foreground">{w.total} DEN</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Translations ──────────────────────────────────────────────────────────────
const translations: Record<string, any> = {
  en: {
    loading: "Loading dashboard...",
    admin: "Admin",
    logout: "Logout",
    dashboard: "Dashboard",
    yourRestaurants: "Your Restaurants",
    dashboardDesc:
      "Manage all your venues, menus, and QR codes from one centralized dashboard.",
    addRestaurant: "Add Restaurant",
    createNew: "Create New Restaurant",
    name: "Restaurant Name",
    slug: "URL Slug",
    address: "Address",
    coverPhoto: "Cover Photo",
    latitude: "Latitude",
    longitude: "Longitude",
    opensAt: "Opens at",
    closesAt: "Closes at",
    description: "Description",
    creating: "Creating...",
    create: "Create Restaurant",
    statsTotal: "Total Restaurants",
    statsStatus: "System Status",
    statsQR: "QR Codes Ready",
    statsAccess: "Menu Access",
    noDesc: "No description provided",
    manageMenu: "Manage Menu",
    viewPublic: "View Public Menu",
    getQR: "Get QR Code",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this restaurant?",
    qrTitle: "Restaurant QR Code",
    downloadQR: "Download QR Image",
    successCreate: "Restaurant created successfully",
    successDelete: "Restaurant removed successfully",
    errorQR: "Failed to generate QR code",
    analytics: "Analytics",
    viewAnalytics: "View Stats",
    hideAnalytics: "Hide Stats",
  },
  al: {
    loading: "Duke ngarkuar...",
    admin: "Admin",
    logout: "Çkyçu",
    dashboard: "Paneli",
    yourRestaurants: "Restorantet Tuaja",
    dashboardDesc: "Menaxhoni të gjitha vendet, menutë dhe kodet QR tuaja.",
    addRestaurant: "Shto Restorant",
    createNew: "Krijo Restorant të Ri",
    name: "Emri i Restorantit",
    slug: "Slug i URL-së",
    address: "Adresa",
    coverPhoto: "Fotoja e Kopertinës",
    latitude: "Gjerësia",
    longitude: "Gjatësia",
    opensAt: "Hapet në",
    closesAt: "Mbyllet në",
    description: "Përshkrimi",
    creating: "Duke u krijuar...",
    create: "Krijo Restorant",
    statsTotal: "Totali",
    statsStatus: "Statusi",
    statsQR: "Kode QR",
    statsAccess: "Qasja",
    noDesc: "Nuk ka përshkrim",
    manageMenu: "Menaxho Menunë",
    getQR: "Merr QR",
    delete: "Fshij",
    confirmDelete: "A jeni të sigurt?",
    qrTitle: "Kodi QR",
    downloadQR: "Shkarko QR",
    successCreate: "U krijua me sukses",
    successDelete: "U hoq me sukses",
    errorQR: "Dështoi QR",
    analytics: "Analitikë",
    viewAnalytics: "Shiko Statistikat",
    hideAnalytics: "Fshih Statistikat",
  },
  mk: {
    loading: "Се вчитува...",
    admin: "Админ",
    logout: "Одјава",
    dashboard: "Табла",
    yourRestaurants: "Ваши ресторани",
    dashboardDesc: "Управувајте со сите локации, менија и QR кодови.",
    addRestaurant: "Додај ресторан",
    createNew: "Нов ресторан",
    name: "Ime",
    slug: "URL слаг",
    address: "Адреса",
    coverPhoto: "Насловна фото",
    latitude: "Ширина",
    longitude: "Должина",
    opensAt: "Отвора",
    closesAt: "Затвора",
    description: "Опис",
    creating: "Се креира...",
    create: "Креирај",
    statsTotal: "Вкупно",
    statsStatus: "Статус",
    statsQR: "QR кодови",
    statsAccess: "Пристап",
    noDesc: "Нема опис",
    manageMenu: "Управувај",
    getQR: "QR код",
    delete: "Избриши",
    confirmDelete: "Сигурни?",
    qrTitle: "QR код",
    downloadQR: "Преземи QR",
    successCreate: "Креиран",
    successDelete: "Избришан",
    errorQR: "Неуспешно",
    analytics: "Аналитика",
    viewAnalytics: "Статистики",
    hideAnalytics: "Скриј",
  },
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [lang] = useState<"en" | "al" | "mk">(
    () => (localStorage.getItem("hajdeha-lang") as any) || "en",
  );
  const t = translations[lang];
  const { data: user } = useUser();
  const logoutMutation = useLogout();
  const { toast } = useToast();
  const [qrData, setQrData] = useState<string | null>(null);
  const [activeRestaurant, setActiveRestaurant] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedAnalytics, setExpandedAnalytics] = useState<Set<number>>(
    new Set(),
  );
  const toggleAnalytics = (id: number) => {
    setExpandedAnalytics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const generateQR = async (restaurant: any) => {
    try {
      const url = `${window.location.origin}/restaurant/${restaurant.slug}`;
      const qrImage = await QRCode.toDataURL(url, {
        width: 1024,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrData(qrImage);
      setActiveRestaurant(restaurant);
    } catch (err) {
      toast({ title: t.errorQR, variant: "destructive" });
    }
  };

  const downloadQR = () => {
    if (!qrData || !activeRestaurant) return;
    const link = document.createElement("a");
    link.href = qrData;
    link.download = `qr-${activeRestaurant.slug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { data: restaurants, isLoading } = useQuery<any[]>({
    queryKey: [api.restaurants.list.path],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.restaurants.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.restaurants.list.path] });
      toast({ title: t.successCreate });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.restaurants.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.restaurants.list.path] });
      toast({ title: t.successDelete });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertRestaurantSchema.omit({ userId: true })),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      photoUrl: "",
      website: "",
      phoneNumber: "",
      location: "",
      openingTime: "08:00",
      closingTime: "22:00",
      latitude: "",
      longitude: "",
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative bg-background rounded-full p-4 shadow-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {t.loading}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-foreground">
                  Hajde Ha
                </span>
                <span className="hidden sm:inline text-xs text-muted-foreground ml-2 px-2 py-0.5 bg-muted rounded-full">
                  {t.admin}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  {user?.username}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t.logout}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LayoutGrid className="h-4 w-4" />
              <span>{t.dashboard}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {t.yourRestaurants}
            </h1>
            <p className="text-muted-foreground max-w-md">{t.dashboardDesc}</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            {user?.username === 'hajdeha' && (
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t.addRestaurant}
              </Button>
            </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-background border-border">
              <DialogTitle className="text-xl text-foreground">
                {t.createNew}
              </DialogTitle>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5 pt-6"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.name}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Hajde Grill"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.slug}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. hajde-grill"
                            className="h-11 font-mono text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.address}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter full address..."
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="photoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUploadField
                            value={field.value || ""}
                            onChange={field.onChange}
                            label={t.coverPhoto}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.latitude}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 42.01"
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.longitude}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 20.97"
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="openingTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.opensAt}</FormLabel>
                          <FormControl>
                            <Input type="time" className="h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="closingTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.closesAt}</FormLabel>
                          <FormControl>
                            <Input type="time" className="h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.description}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell customers about your restaurant..."
                            className="min-h-[100px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-4 border-t border-border">
                    <Button
                      type="submit"
                      className="w-full h-11 text-base font-medium"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t.creating}
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          {t.create}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Bar */}
        {restaurants && restaurants.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <div className="bg-background border border-border rounded-xl p-4">
              <p className="text-2xl font-bold text-foreground">
                {restaurants.length}
              </p>
              <p className="text-sm text-muted-foreground">{t.statsTotal}</p>
            </div>
            <div className="bg-background border border-border rounded-xl p-4">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                Active
              </p>
              <p className="text-sm text-muted-foreground">{t.statsStatus}</p>
            </div>
            <div className="bg-background border border-border rounded-xl p-4 hidden sm:block">
              <p className="text-2xl font-bold text-foreground">
                {restaurants.length}
              </p>
              <p className="text-sm text-muted-foreground">{t.statsQR}</p>
            </div>
            <div className="bg-background border border-border rounded-xl p-4 hidden sm:block">
              <p className="text-2xl font-bold text-foreground">24/7</p>
              <p className="text-sm text-muted-foreground">{t.statsAccess}</p>
            </div>
          </div>
        )}

        {/* Restaurant Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {restaurants?.map((restaurant) => (
            <Card
              key={restaurant.id}
              className="group relative overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 bg-transparent"
            >
              {restaurant.photoUrl ? (
                <>
                  <div
                    className="absolute inset-0 scale-125 transition-opacity duration-300"
                    style={{
                      backgroundImage: `url(${restaurant.photoUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "blur(16px)",
                    }}
                  />
                  <div className="absolute inset-0 bg-background/70" />
                </>
              ) : (
                <div className="absolute inset-0 bg-card" />
              )}

              <div className="relative z-10">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl font-semibold truncate group-hover:text-primary transition-colors text-foreground">
                        {restaurant.name}
                      </CardTitle>
                      <CardDescription className="mt-2 line-clamp-2 text-sm">
                        {restaurant.description || t.noDesc}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Dialog
                        onOpenChange={(open) => {
                          if (!open) {
                            setQrData(null);
                            setActiveRestaurant(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => generateQR(restaurant)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px] bg-background border-border">
                          <DialogHeader className="pb-4 border-b border-border">
                            <DialogTitle className="text-foreground">
                              {t.qrTitle}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="flex flex-col items-center justify-center space-y-6 py-6">
                            {qrData ? (
                              <>
                                <div className="bg-white p-6 rounded-2xl shadow-inner border">
                                  <img
                                    src={qrData}
                                    alt="QR Code"
                                    className="w-64 h-64"
                                  />
                                </div>
                                <div className="text-center space-y-1">
                                  <p className="font-medium text-foreground">
                                    {restaurant.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground font-mono">
                                    /{restaurant.slug}
                                  </p>
                                </div>
                                <Button
                                  className="w-full h-11"
                                  onClick={downloadQR}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  {t.downloadQR}
                                </Button>
                              </>
                            ) : (
                              <div className="py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Link
                        href={`/restaurant/${restaurant.slug}`}
                        target="_blank"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(t.confirmDelete))
                            deleteMutation.mutate(restaurant.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {restaurant.location && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">
                          {restaurant.location}
                        </span>
                      </div>
                    )}
                    {restaurant.openingTime && restaurant.closingTime && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {restaurant.openingTime} - {restaurant.closingTime}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/restaurant/${restaurant.id}`}
                      className="flex-1"
                    >
                      <Button
                        className="w-full h-10 font-medium transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground bg-transparent"
                        variant="outline"
                      >
                        {t.manageMenu}
                        <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 px-3 text-muted-foreground hover:text-primary"
                      onClick={() => toggleAnalytics(restaurant.id)}
                    >
                      <BarChart2 className="h-4 w-4 mr-1" />
                      {expandedAnalytics.has(restaurant.id) ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  {expandedAnalytics.has(restaurant.id) && (
                    <>
                      <WaiterEarningsPanel restaurantId={restaurant.id} />
                    </>
                  )}
                </CardContent>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {restaurants?.length === 0 && (
          <div className="col-span-full">
            <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-6">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No restaurants yet
              </h3>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                Get started by adding your first restaurant to manage menus and
                generate QR codes.
              </p>
              {user?.username === 'hajdeha' && (
              <Button
                size="lg"
                onClick={() => setIsCreateOpen(true)}
                className="shadow-lg shadow-primary/20"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Restaurant
              </Button>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>RestaurantOS Admin Dashboard</p>
            <p>
              Logged in as{" "}
              <span className="font-medium text-foreground">
                {user?.username}
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
