"use client";

import { useState } from "react";
import { useLogin } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  ChefHat,
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

const translations: Record<string, any> = {
  en: {
    backHome: "Back to Home",
    adminPortal: "Admin Portal",
    secureAccess: "Secure Admin Access",
    heroTitle: "Restaurant Management Dashboard",
    heroDesc:
      "Access your administrative tools to manage menus, track orders, and oversee restaurant operations.",
    feature1: "Menu Management",
    feature1Desc: "Update dishes & prices",
    feature2: "Order Tracking",
    feature2Desc: "Real-time monitoring",
    feature3: "Analytics",
    feature3Desc: "Business insights",
    feature4: "Staff Access",
    feature4Desc: "Team permissions",
    welcomeBack: "Welcome back",
    signInDesc: "Sign in to access your restaurant management dashboard",
    adminLogin: "Administrator Login",
    credentialsDesc: "Enter your credentials to continue",
    username: "Username",
    usernamePlaceholder: "Enter your username",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    signingIn: "Signing in...",
    signIn: "Sign In to Dashboard",
    demoCredentials: "Demo Credentials",
    securityNotice:
      "This is a secure admin area. Unauthorized access is prohibited.",
    loginFailed: "Login failed",
  },
  al: {
    backHome: "Kthehu në Fillim",
    adminPortal: "Portali i Adminit",
    secureAccess: "Qasje e Sigurt Admin",
    heroTitle: "Paneli i Menaxhimit të Restorantit",
    heroDesc:
      "Hyni në mjetet tuaja administrative për të menaxhuar menutë, ndjekur porositë dhe mbikëqyrur operacionet e restorantit.",
    feature1: "Menaxhimi i Menusë",
    feature1Desc: "Përditëso pjatat & çmimet",
    feature2: "Ndjekja e Porosisë",
    feature2Desc: "Monitorim në kohë reale",
    feature3: "Analitika",
    feature3Desc: "Vpërshtatje biznesi",
    feature4: "Qasja e Stafit",
    feature4Desc: "Lejet e ekipit",
    welcomeBack: "Mirësevini përsëri",
    signInDesc:
      "Identifikohuni për të hyrë në panelin tuaj të menaxhimit të restorantit",
    adminLogin: "Identifikimi i Administratorit",
    credentialsDesc: "Jepni kredencialet tuaja për të vazhduar",
    username: "Përdoruesi",
    usernamePlaceholder: "Shkruani emrin e përdoruesit",
    password: "Fjalëkalimi",
    passwordPlaceholder: "Shkruani fjalëkalimin",
    signingIn: "Duke u identifikuar...",
    signIn: "Identifikohu në Panel",
    demoCredentials: "Kredencialet Demo",
    securityNotice:
      "Kjo është një zonë e sigurt admin. Qasja e paautorizuar është e ndaluar.",
    loginFailed: "Identifikimi dështoi",
  },
  mk: {
    backHome: "Назад до почетна",
    adminPortal: "Админ портал",
    secureAccess: "Безбеден админ пристап",
    heroTitle: "Платформа за менаџирање на ресторан",
    heroDesc:
      "Пристапете до вашите административни алатки за управување со менија, следење нарачки и надзор на работата на ресторанот.",
    feature1: "Управување со мени",
    feature1Desc: "Ажурирајте јадења и цени",
    feature2: "Следење на нарачки",
    feature2Desc: "Молскавично следење",
    feature3: "Аналитика",
    feature3Desc: "Бизнис увиди",
    feature4: "Пристап за персонал",
    feature4Desc: "Тимски дозволи",
    welcomeBack: "Добредојдовте назад",
    signInDesc:
      "Најавете се за пристап до вашата контролна табла за управување со ресторани",
    adminLogin: "Администраторска најава",
    credentialsDesc: "Внесете ги вашите податоци за да продолжите",
    username: "Корисничко име",
    usernamePlaceholder: "Внесете корисничко име",
    password: "Лозинка",
    passwordPlaceholder: "Внесете лозинка",
    signingIn: "Се најавува...",
    signIn: "Најави се на таблата",
    demoCredentials: "Демо податоци",
    securityNotice: "Ова е безбедна админ зона. Неовластен пристап е забранет.",
    loginFailed: "Најавата не успеа",
  },
};

export default function AuthLogin() {
  const [lang] = useState<"en" | "al" | "mk">(() => {
    const saved = localStorage.getItem("hajdeha-lang");
    return (saved as any) || "en";
  });
  const t = translations[lang];

  const { mutate: login, isPending } = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(data: LoginValues) {
    login(data, {
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message,
        });
      },
    });
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        {/* Decorative Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-foreground/10 rounded-2xl backdrop-blur-sm border border-primary-foreground/10">
              <ChefHat className="h-8 w-8" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight">
                Hajde Ha
              </span>
              <p className="text-xs text-primary-foreground/60 font-medium">
                {t.adminPortal}
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8 max-w-lg">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-foreground/10 rounded-full text-sm font-medium backdrop-blur-sm border border-primary-foreground/10">
                <Shield className="h-4 w-4" />
                {t.secureAccess}
              </div>
              <h2 className="text-5xl font-bold leading-[1.1] tracking-tight text-balance">
                {t.heroTitle}
              </h2>
              <p className="text-primary-foreground/70 text-lg leading-relaxed max-w-md">
                {t.heroDesc}
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: t.feature1, desc: t.feature1Desc },
                { label: t.feature2, desc: t.feature2Desc },
                { label: t.feature3, desc: t.feature3Desc },
                { label: t.feature4, desc: t.feature4Desc },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className="p-4 bg-primary-foreground/5 rounded-xl border border-primary-foreground/10 backdrop-blur-sm"
                >
                  <p className="font-semibold text-sm">{feature.label}</p>
                  <p className="text-xs text-primary-foreground/60 mt-0.5">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-primary-foreground/40">
              © 2026 Hajde Ha. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-6 lg:p-8">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.backHome}
            </Button>
          </Link>
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-xl">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="font-bold text-sm">Hajde Ha</span>
              <p className="text-[10px] text-muted-foreground">
                {t.adminPortal}
              </p>
            </div>
          </div>
        </header>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-8">
          <div className="w-full max-w-[420px] space-y-8">
            {/* Welcome Text */}
            <div className="space-y-3 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-xs font-medium text-primary lg:mx-0 mx-auto">
                <Shield className="h-3.5 w-3.5" />
                {t.secureAccess}
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t.welcomeBack}
              </h1>
              <p className="text-muted-foreground">{t.signInDesc}</p>
            </div>

            {/* Login Card */}
            <Card className="border-border/50 shadow-xl shadow-black/5 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2 pt-6">
                <CardTitle className="text-xl">{t.adminLogin}</CardTitle>
                <CardDescription>{t.credentialsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-5"
                  >
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            {t.username}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t.usernamePlaceholder}
                              {...field}
                              className="h-12 px-4 transition-all focus:shadow-md focus:shadow-primary/5 border-border/60 focus:border-primary/50"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            {t.password}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder={t.passwordPlaceholder}
                                {...field}
                                className="h-12 px-4 pr-12 transition-all focus:shadow-md focus:shadow-primary/5 border-border/60 focus:border-primary/50"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 hover:bg-muted/50"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="sr-only">
                                  {showPassword
                                    ? "Hide password"
                                    : "Show password"}
                                </span>
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-12 text-sm font-semibold transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t.signingIn}
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          {t.signIn}
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
              <Lock className="h-3 w-3" />
              <span>{t.securityNotice}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
