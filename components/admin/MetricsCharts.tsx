"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { abbreviateARS, type NamedValue, type SalesPoint } from "@/lib/metrics";
import { useTheme } from "@/lib/theme";

const CHART_TOKENS = {
  light: { axis: "#64748b", grid: "#e2e8f0", label: "#334155" },
  dark: { axis: "#a1a1aa", grid: "#27272a", label: "#e4e4e7" },
} as const;

function useChartTokens() {
  const theme = useTheme();
  return CHART_TOKENS[theme];
}

const TOP_COLORS = ["#3b82f6", "#8b5cf6", "#14b8a6", "#38bdf8", "#6366f1"];
const INVENTORY_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#14b8a6", "#38bdf8"];

const PAYMENT_COLORS: Record<string, string> = {
  Efectivo: "#f97316",
  Transferencia: "#10b981",
  Débito: "#38bdf8",
  Crédito: "#a855f7",
};
const PAYMENT_FALLBACK = ["#f97316", "#10b981", "#38bdf8", "#a855f7", "#3b82f6", "#14b8a6"];

function paymentColor(name: string, index: number): string {
  return PAYMENT_COLORS[name] ?? PAYMENT_FALLBACK[index % PAYMENT_FALLBACK.length];
}

type TooltipEntry = { name?: string | number; value?: number; color?: string; payload?: { fill?: string } };

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  valueFormatter?: (value: number) => string;
}) {
  const { axis } = useChartTokens();
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-800/95">
      {label != null && label !== "" && <p className="mb-1 font-medium text-slate-900 dark:text-zinc-100">{label}</p>}
      {payload.map((entry, index) => (
        <p key={index} className="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: entry.color ?? entry.payload?.fill ?? axis }}
          />
          <span>{entry.name}</span>
          <span className="ml-3 font-medium text-slate-900 dark:text-zinc-100">
            {typeof entry.value === "number" && valueFormatter ? valueFormatter(entry.value) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{title}</h2>
      {subtitle && <p className="mb-2 text-xs text-slate-500 dark:text-zinc-400">{subtitle}</p>}
      <div className="mt-2 h-[260px] w-full">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-zinc-500">{text}</div>;
}

export function TopProductsChart({ data }: { data: { name: string; quantity: number }[] }) {
  const { axis, grid, label } = useChartTokens();
  return (
    <ChartCard title="Top 5 productos más vendidos" subtitle="Unidades vendidas en el período">
      {data.length === 0 ? (
        <Empty text="Sin ventas en el período." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 4, right: 36, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke={grid} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              interval={0}
              tick={{ fill: axis, fontSize: 12 }}
              tickFormatter={(value: string) => (value.length > 18 ? `${value.slice(0, 17)}…` : value)}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
            <Bar dataKey="quantity" name="Vendidos" radius={[0, 6, 6, 0]} barSize={22}>
              {data.map((_, index) => (
                <Cell key={index} fill={TOP_COLORS[index % TOP_COLORS.length]} />
              ))}
              <LabelList dataKey="quantity" position="right" fill={label} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function PaymentMethodsChart({ data }: { data: NamedValue[] }) {
  const { label } = useChartTokens();
  const total = data.reduce((acc, d) => acc + d.value, 0);
  return (
    <ChartCard title="Métodos de pago" subtitle="Distribución de pedidos en el período">
      {data.length === 0 ? (
        <Empty text="Sin pagos registrados." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="62%"
              cy="50%"
              innerRadius={54}
              outerRadius={92}
              paddingAngle={2}
              stroke="none"
              labelLine={false}
              label={({ percent, x, y }) =>
                (percent ?? 0) >= 0.05 ? (
                  <text x={x} y={y} fill={label} fontSize={12} textAnchor="middle" dominantBaseline="central">
                    {`${Math.round((percent ?? 0) * 100)}%`}
                  </text>
                ) : null
              }
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={paymentColor(entry.name, index)} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v} (${total ? Math.round((v / total) * 100) : 0}%)`} />} />
            <Legend
              layout="vertical"
              align="left"
              verticalAlign="middle"
              iconType="circle"
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => <span className="text-slate-600 dark:text-zinc-300">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function InventoryByCategoryChart({ data }: { data: NamedValue[] }) {
  const { axis, grid, label } = useChartTokens();
  return (
    <ChartCard title="Valor de inventario por categoría" subtitle="Stock actual valuado a precio de lista">
      {data.length === 0 ? (
        <Empty text="Sin productos cargados." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 4, right: 8, top: 24, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={grid} />
            <XAxis
              dataKey="name"
              tick={{ fill: axis, fontSize: 12 }}
              tickFormatter={(value: string) => (value.length > 12 ? `${value.slice(0, 11)}…` : value)}
              interval={0}
            />
            <YAxis hide />
            <Tooltip content={<ChartTooltip valueFormatter={abbreviateARS} />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
            <Bar dataKey="value" name="Valor" radius={[6, 6, 0, 0]} barSize={46}>
              {data.map((_, index) => (
                <Cell key={index} fill={INVENTORY_COLORS[index % INVENTORY_COLORS.length]} />
              ))}
              <LabelList dataKey="value" position="top" fill={label} fontSize={12} formatter={(value) => abbreviateARS(Number(value))} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function SalesBySourceChart({ data }: { data: SalesPoint[] }) {
  const { axis, grid } = useChartTokens();
  const hasData = data.some((point) => point.WEB > 0 || point.POS > 0);
  return (
    <ChartCard title="Ventas: WEB vs POS" subtitle="Ingresos por origen a lo largo del período">
      {!hasData ? (
        <Empty text="Sin ventas en el período." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="webFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="posFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={grid} />
            <XAxis dataKey="label" tick={{ fill: axis, fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: axis, fontSize: 11 }} tickFormatter={(value) => abbreviateARS(Number(value))} width={52} />
            <Tooltip content={<ChartTooltip valueFormatter={abbreviateARS} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span className="text-slate-600 dark:text-zinc-300">{value}</span>} />
            <Area type="monotone" dataKey="WEB" name="WEB" stroke="#10b981" strokeWidth={2} fill="url(#webFill)" />
            <Area type="monotone" dataKey="POS" name="POS" stroke="#3b82f6" strokeWidth={2} fill="url(#posFill)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
