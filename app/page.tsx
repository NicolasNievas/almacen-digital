import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Check,
  ChefHat,
  CreditCard,
  Layers,
  LineChart,
  MessageCircle,
  Package,
  ShieldCheck,
  Shirt,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  UtensilsCrossed,
  Wallet,
  Zap,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { DEMO_STORES, SAAS_BRAND } from "@/lib/store";

const demoIcons = {
  boxes: Boxes,
  utensils: UtensilsCrossed,
  shirt: Shirt,
} as const;

const features = [
  {
    title: "POS en mostrador",
    description:
      "Cobrá en el local con descuento de stock atómico, ticket imprimible y medios de pago configurables.",
    icon: ShoppingCart,
    accent: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  {
    title: "Stock en tiempo real",
    description:
      "Cada venta web o presencial descuenta unidades al instante. Alertas de reposición y ajustes auditados.",
    icon: Package,
    accent: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    title: "Métricas ejecutivas",
    description:
      "Ingresos, ticket promedio, top de productos y mezcla de canales con gráficos listos para decidir.",
    icon: BarChart3,
    accent: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  },
  {
    title: "Checkout flexible",
    description:
      "Pedido por WhatsApp con desglose completo o pago online con Mercado Pago. Vos elegís por tienda.",
    icon: Wallet,
    accent: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
];

const capabilities = [
  { label: "Un panel, múltiples comercios", icon: Layers },
  { label: "Configuración por rubro en JSONB", icon: Zap },
  { label: "Delivery o retiro programado", icon: Truck },
  { label: "Variantes de talle y color", icon: Shirt },
  { label: "Notas por ítem para gastronomía", icon: ChefHat },
  { label: "Datos protegidos con RLS por tenant", icon: ShieldCheck },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur-xl dark:border-neutral-800/70 dark:bg-neutral-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-sm">
              <Layers size={18} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {SAAS_BRAND.name}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                Commerce OS
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 md:flex dark:text-neutral-300">
            <a href="#demos" className="hover:text-brand">
              Demos en vivo
            </a>
            <a href="#funciones" className="hover:text-brand">
              Funciones
            </a>
            <a href="#plataforma" className="hover:text-brand">
              Plataforma
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/admin"
              className="hidden items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 sm:flex dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Ingresar al panel <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(37,99,235,0.16),transparent_70%)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgba(59,130,246,0.18),transparent_70%)]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-semibold text-brand dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300">
              <Sparkles size={13} /> SaaS multitenant para comercios
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl dark:text-white">
              Vendé online y en el local.
              <span className="block bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                Sin planillas ni caos.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg dark:text-neutral-300">
              {SAAS_BRAND.description}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#demos"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-solid px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-transform hover:-translate-y-0.5 hover:bg-brand-accent"
              >
                Ver demos en vivo <ArrowRight size={16} />
              </a>
              <Link
                href="/ag-mayorista"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-brand hover:text-brand dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                Explorar catálogo <Store size={16} />
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" /> Listo en minutos
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" /> Sin comisiones por venta
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" /> WhatsApp + Mercado Pago
              </span>
            </div>
          </div>

          {/* Dashboard mock */}
          <div className="relative mx-auto w-full max-w-lg">
            <div
              aria-hidden
              className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-emerald-400/20 blur-2xl"
            />
            <div className="rounded-3xl border border-neutral-200/80 bg-white/90 p-4 shadow-2xl shadow-neutral-900/10 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Panel de métricas</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">Hoy · todas las tiendas</p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> En vivo
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: "Ingresos", value: "$1.28M", tone: "text-neutral-900 dark:text-white" },
                  { label: "Pedidos", value: "184", tone: "text-neutral-900 dark:text-white" },
                  { label: "Ticket", value: "$6.960", tone: "text-neutral-900 dark:text-white" },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800/60">
                    <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">{metric.label}</p>
                    <p className={`mt-0.5 text-sm font-extrabold ${metric.tone}`}>{metric.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-neutral-100 p-3 dark:border-neutral-800">
                <div className="flex items-center justify-between text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                  <span>Ventas por canal</span>
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Web</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> POS</span>
                  </span>
                </div>
                <div className="mt-3 flex h-24 items-end gap-1.5">
                  {[38, 55, 42, 68, 52, 78, 61, 88, 72, 95, 66, 84].map((height, index) => (
                    <div key={index} className="flex flex-1 flex-col justify-end gap-0.5">
                      <div
                        className="rounded-t bg-gradient-to-t from-blue-600 to-cyan-400"
                        style={{ height: `${height * 0.65}%` }}
                      />
                      <div
                        className="rounded-t bg-gradient-to-t from-violet-600 to-fuchsia-400"
                        style={{ height: `${height * 0.28}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl bg-neutral-900 p-3 text-white dark:bg-white dark:text-neutral-900">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500 text-white">
                    <MessageCircle size={15} />
                  </span>
                  <div>
                    <p className="text-[10px] font-medium opacity-70">Nuevo pedido web</p>
                    <p className="text-xs font-bold">Rotisería Express · $18.400</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold dark:bg-neutral-900/10">PENDIENTE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-6 text-center sm:grid-cols-4">
          {[
            { value: "3", label: "rubros listos" },
            { value: "100%", label: "responsive" },
            { value: "0", label: "planillas manuales" },
            { value: "24/7", label: "catálogo online" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-black text-neutral-900 dark:text-white">{stat.value}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEMOS */}
      <section id="demos" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Demos en vivo</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
              Tres comercios, la misma plataforma
            </h2>
            <p className="mt-3 text-neutral-600 dark:text-neutral-300">
              Cada demo tiene su propia configuración en Supabase: tipo de negocio, checkout, entrega y
              funcionalidades. Entrá y probá el flujo completo.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {DEMO_STORES.map((demo) => {
              const Icon = demoIcons[demo.icon];
              return (
                <Link
                  key={demo.slug}
                  href={`/${demo.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className={`relative h-32 bg-gradient-to-br ${demo.accent} p-5 text-white`}>
                    <div className="flex items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                        <Icon size={22} />
                      </span>
                      <ArrowUpRight className="opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={20} />
                    </div>
                    <p className="absolute bottom-4 left-5 text-lg font-extrabold tracking-tight">{demo.name}</p>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="w-fit rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {demo.label}
                    </span>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{demo.description}</p>
                    <ul className="mt-4 space-y-1.5">
                      {demo.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                          <Check size={13} className="shrink-0 text-emerald-500" /> {highlight}
                        </li>
                      ))}
                    </ul>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
                      Ver demo en vivo <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="funciones" className="scroll-mt-20 border-y border-neutral-200 bg-white py-16 sm:py-20 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Todo incluido</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
                Las herramientas que tu comercio usa todos los días
              </h2>
            </div>
            <p className="max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
              Una sola base de datos para el catálogo, el POS, los pedidos web y las métricas.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-5 transition-colors hover:border-brand/40 dark:border-neutral-800 dark:bg-neutral-950/40"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.accent}`}>
                  <feature.icon size={19} />
                </span>
                <h3 className="mt-4 font-bold text-neutral-900 dark:text-white">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORM */}
      <section id="plataforma" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Arquitectura multitenant</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
              Un solo código. Cada comercio con su propia experiencia.
            </h2>
            <p className="mt-3 text-neutral-600 dark:text-neutral-300">
              El campo <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-semibold dark:bg-neutral-800">settings</code>{" "}
              de cada tienda define el rubro, el checkout, la entrega y las funcionalidades activas. La UI se adapta
              sola, sin duplicar proyectos.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {capabilities.map((capability) => (
                <div
                  key={capability.label}
                  className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand dark:bg-blue-400/10 dark:text-blue-300">
                    <capability.icon size={14} />
                  </span>
                  {capability.label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-neutral-950 p-5 shadow-2xl dark:border-neutral-800">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 text-[10px] font-medium text-neutral-500">stores · settings</span>
            </div>
            <pre className="mt-4 overflow-x-auto text-[11px] leading-relaxed text-neutral-300 sm:text-xs">
{`{
  "slug": "aura-studio",
  "name": "Aura Studio",
  "settings": {
    "business_type": "CLOTHING",
    "checkout_type": "MERCADO_PAGO",
    "fulfillment": {
      "shipping_enabled": true,
      "pickup_enabled": true
    },
    "features": {
      "variants_enabled": true,
      "gallery_enabled": true,
      "pos_enabled": true,
      "stock_alerts": true,
      "custom_notes": false
    }
  }
}`}
            </pre>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Talles", "Galería", "Mercado Pago", "Delivery"].map((tag) => (
                <span key={tag} className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/80">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 px-6 py-12 text-center text-white shadow-2xl shadow-blue-600/20 sm:px-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Sparkles size={13} /> Empezá hoy
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
            ¿Listo para ordenar tu comercio?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/85 sm:text-base">
            Mirá las demos, probá el POS y llevá tu catálogo online sin fricción.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#demos"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 transition-transform hover:-translate-y-0.5"
            >
              Probar las demos <ArrowRight size={16} />
            </a>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Ingresar al panel
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-400 text-white">
              <Layers size={15} />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-neutral-900 dark:text-white">{SAAS_BRAND.product}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{SAAS_BRAND.tagline}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <a href="#demos" className="hover:text-brand">Demos</a>
            <a href="#funciones" className="hover:text-brand">Funciones</a>
            <Link href="/admin" className="hover:text-brand">Panel</Link>
            <span className="flex items-center gap-1">
              <CreditCard size={12} /> WhatsApp + Mercado Pago
            </span>
            <span className="flex items-center gap-1">
              <LineChart size={12} /> Recharts
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
