import { useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import Pusher from "pusher-js";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChefHat, Clock, UtensilsCrossed, Wifi, WifiOff, Check } from "lucide-react";

interface KDSItem {
  id: number;
  name: string;
  price: number;
  qty: number;
}

interface KDSOrder {
  uid: string;
  tableNumber: number;
  items: KDSItem[];
  customerNote: string | null;
  receivedAt: number;
  isNew: boolean;
  source: "qr" | "pos";
  doneItems: Set<number>;
}

function useElapsed(ms: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.floor((Date.now() - ms) / 1000);
  const mins = Math.floor(secs / 60);
  if (secs < 60) return { label: `${secs}s`, mins: 0 };
  if (mins < 60) return { label: `${mins}m`, mins };
  return { label: `${Math.floor(mins / 60)}h ${mins % 60}m`, mins };
}

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function OrderCard({
  order,
  onDone,
  onToggleItem,
}: {
  order: KDSOrder;
  onDone: () => void;
  onToggleItem: (index: number) => void;
}) {
  const { label, mins } = useElapsed(order.receivedAt);
  const allDone = order.doneItems.size === order.items.length;

  const urgency =
    mins >= 15 ? "red" :
    mins >= 8  ? "yellow" :
                 "normal";

  const urgencyBar =
    urgency === "red"    ? "bg-red-500" :
    urgency === "yellow" ? "bg-amber-400" :
    order.isNew          ? "bg-primary" :
                           "bg-muted";

  const borderColor =
    allDone              ? "border-green-500/50" :
    order.isNew          ? "border-primary/60" :
    urgency === "red"    ? "border-red-500/50" :
    urgency === "yellow" ? "border-amber-400/30" :
                           "border-border";

  const glow =
    allDone           ? "shadow-[0_0_24px_rgba(34,197,94,0.2)]" :
    order.isNew       ? "shadow-[0_0_32px_hsl(15_75%_55%_/_0.25)]" :
    urgency === "red" ? "shadow-[0_0_24px_rgba(239,68,68,0.2)]" :
                        "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.92 }}
      transition={{ type: "spring", damping: 24, stiffness: 300 }}
      className={`flex flex-col rounded-2xl border bg-secondary overflow-hidden ${borderColor} ${glow}`}
    >
      {/* Urgency bar */}
      <div className={`h-1 w-full ${allDone ? "bg-green-500" : urgencyBar} transition-colors duration-700`} />

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className={`font-black text-3xl tabular-nums leading-none ${
            allDone            ? "text-green-400" :
            order.isNew        ? "text-primary" :
            urgency === "red"  ? "text-red-400" :
            urgency === "yellow" ? "text-amber-400" :
            "text-foreground"
          }`}>
            T{order.tableNumber}
          </span>

          <div className="flex flex-col gap-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest border w-fit ${
              order.source === "pos"
                ? "bg-sky-500/15 text-sky-400 border-sky-500/25"
                : "bg-primary/15 text-primary border-primary/25"
            }`}>
              {order.source === "pos" ? "POS" : "QR"}
            </span>
            {order.isNew && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest bg-primary text-primary-foreground w-fit"
              >
                NEW
              </motion.span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress indicator */}
          {order.doneItems.size > 0 && (
            <span className="text-[10px] font-bold text-green-400 tabular-nums">
              {order.doneItems.size}/{order.items.length}
            </span>
          )}
          <div className={`flex items-center gap-1 text-xs font-semibold tabular-nums ${
            urgency === "red"    ? "text-red-400" :
            urgency === "yellow" ? "text-amber-400" :
            "text-muted-foreground"
          }`}>
            <Clock className="h-3.5 w-3.5" />
            {label}
          </div>
        </div>
      </div>

      {/* Items — tap to mark done */}
      <div className="flex-1 px-3 py-3 space-y-1.5">
        {order.items.map((item, i) => {
          const isDone = order.doneItems.has(i);
          return (
            <motion.button
              key={i}
              layout
              onClick={() => onToggleItem(i)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all active:scale-95 ${
                isDone
                  ? "border-green-500/30 bg-green-500/10 opacity-60"
                  : "border-border bg-background/40 hover:bg-background/70"
              }`}
            >
              <span className={`text-sm font-semibold leading-snug text-left ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {item.name}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-sm font-black tabular-nums h-6 w-6 rounded-md flex items-center justify-center ${
                  isDone
                    ? "bg-green-500/20 text-green-400"
                    : item.qty >= 3
                    ? "bg-primary text-primary-foreground"
                    : item.qty === 2
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {item.qty}
                </span>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isDone
                    ? "border-green-500 bg-green-500"
                    : "border-muted-foreground/40 bg-transparent"
                }`}>
                  {isDone && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Customer note */}
      {order.customerNote && (
        <div className="mx-3 mb-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2 flex items-start gap-2">
          <span className="text-sm flex-shrink-0">📝</span>
          <span className="text-xs text-amber-300 leading-snug">{order.customerNote}</span>
        </div>
      )}

      {/* Done button */}
      <div className="px-3 pb-3">
        <button
          onClick={onDone}
          className="w-full py-3 rounded-xl transition-all font-black text-sm tracking-widest uppercase text-white flex items-center justify-center gap-2 shadow-md active:scale-95"
          style={{
            backgroundColor: allDone ? "hsl(150 60% 30%)" : "hsl(150 50% 35%)",
            opacity: 1,
          }}
        >
          <CheckCircle2 className="h-4 w-4" />
          {allDone ? "Clear Order" : "Done"}
        </button>
      </div>
    </motion.div>
  );
}

export default function KDS({ slug: propSlug }: { slug?: string }) {
  const params = useParams<{ slug: string }>();
  const slug = propSlug || params.slug;

  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [connected, setConnected] = useState(false);

  const addOrder = useCallback((data: any, source: "qr" | "pos") => {
    beep();
    const uid = `${Date.now()}-${Math.random()}`;
    const order: KDSOrder = {
      uid,
      tableNumber: data.tableNumber,
      items: data.cart || [],
      customerNote: data.customerNote || null,
      receivedAt: data.timestamp || Date.now(),
      isNew: true,
      source,
      doneItems: new Set(),
    };
    setOrders((prev) => [order, ...prev]);
    setTimeout(() => {
      setOrders((prev) =>
        prev.map((o) => (o.uid === uid ? { ...o, isNew: false } : o))
      );
    }, 5000);
  }, []);

  useEffect(() => {
    if (!slug) return;
    const key = import.meta.env.VITE_PUSHER_KEY;
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    const pusher = new Pusher(key, { cluster });
    pusher.connection.bind("connected", () => setConnected(true));
    pusher.connection.bind("disconnected", () => setConnected(false));
    const channel = pusher.subscribe(`pos-${slug}`);
    channel.bind("incoming-order", (data: any) => addOrder(data, "qr"));
    channel.bind("kitchen-order", (data: any) => addOrder(data, "pos"));

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`pos-${slug}`);
      pusher.disconnect();
    };
  }, [slug, addOrder]);

  const markDone = (uid: string) => {
    const order = orders.find((o) => o.uid === uid);
    if (order) {
      fetch("/api/kitchen/order-ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, tableNumber: order.tableNumber }),
      }).catch(() => {});
    }
    setOrders((prev) => prev.filter((o) => o.uid !== uid));
    setDoneCount((n) => n + 1);
  };

  const toggleItem = (uid: string, index: number) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.uid !== uid) return o;
        const next = new Set(o.doneItems);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return { ...o, doneItems: next };
      })
    );
  };

  const restaurantLabel = slug
    ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
    : "Kitchen";

  return (
    <div className="min-h-screen bg-background text-foreground select-none overflow-x-hidden">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <ChefHat className="h-4.5 w-4.5 text-primary" style={{ height: 18, width: 18 }} />
            </div>
            <div>
              <div className="flex items-center gap-2 leading-none">
                <span className="font-black text-base text-foreground capitalize">{restaurantLabel}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Kitchen
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {connected
                  ? <Wifi className="h-3 w-3 text-green-500" />
                  : <WifiOff className="h-3 w-3 text-muted-foreground" />
                }
                <span className={`text-[10px] font-medium ${connected ? "text-green-500" : "text-muted-foreground"}`}>
                  {connected ? "Live" : "Connecting…"}
                </span>
              </div>
            </div>
          </div>

          {/* Right: stats */}
          <div className="flex items-center gap-2">
            {doneCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                {doneCount} done
              </div>
            )}
            {orders.length > 0 ? (
              <motion.div
                key={orders.length}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                className="bg-primary text-primary-foreground text-sm font-black px-3.5 py-1.5 rounded-full tabular-nums"
              >
                {orders.length} pending
              </motion.div>
            ) : (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border text-muted-foreground">
                All clear ✓
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Board ── */}
      <main className="max-w-7xl mx-auto p-3 sm:p-5">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <UtensilsCrossed className="h-9 w-9 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">No pending orders</p>
              <p className="text-sm text-muted-foreground mt-1">
                New orders will appear here automatically
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            <AnimatePresence>
              {orders.map((order) => (
                <OrderCard
                  key={order.uid}
                  order={order}
                  onDone={() => markDone(order.uid)}
                  onToggleItem={(i) => toggleItem(order.uid, i)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
