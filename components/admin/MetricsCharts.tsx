"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { abbreviateARS, type NamedValue, type SalesPoint } from "@/lib/metrics";
import { useTheme } from "@/lib/theme";
import { ADMIN_EYEBROW } from "@/lib/admin-ui";

/**
 * Paleta editorial de gráficos.
 *
 * Nada de azul/violeta de dashboard genérico: tinta para la lectura
 * principal y tres acentos apagados (rosa, salvia, arcilla) que conviven con
 * el canvas del tenant. En oscuro suben de luminosidad sin volverse pastel.
 */
const CHART_TOKENS = {
  light: {
    axis: "#737373",
    grid: "#e5e5e5",
    label: "#1a1918",
    ink: "#1a1918",
    rose: "#c78f97",
    sage: "#7d8f7d",
    clay: "#b08d6a",
    sand: "#a8a29b",
  },
  dark: {
    axis: "#a8a49c",
    grid: "#2c2b28",
    label: "#f2efe9",
    ink: "#f2efe9",
    rose: "#d9a7ad",
    sage: "#9db49f",
    clay: "#c9a68a",
    sand: "#8a867e",
  },
} as const;

function useChartTokens() {
  const theme = useTheme();
  return CHART_TOKENS[theme];
}

const PAYMENT_ORDER = ["Efectivo", "Transferencia", "Débito", "Crédito"];

type TooltipEntry = {
  name?: string | number;
  value?: number;
  color?: string;
  payload?: { fill?: string };
};

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
    <div className="border border-[var(--admin-line-strong)] bg-[var(--admin-canvas)] px-3 py-2 text-[11px] leading-5 text-[var(--admin-ink)]">
      {label != null && label !== "" && (
        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--admin-faint)]">
          {label}
        </p>
      )}
      {payload.map((entry, index) => (
        <p key={index} className="flex items-center gap-2 text-[var(--admin-muted)]">
          <span
            className="inline-block h-1.5 w-1.5 shrink-0"
            style={{ background: entry.color ?? entry.payload?.fill ?? axis }}
          />
          <span>{entry.name}</span>
          <span className="ml-auto pl-4 tabular-nums text-[var(--admin-ink)]">
            {typeof entry.value === "number" && valueFormatter
              ? valueFormatter(entry.value)
              : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--admin-line)] pt-5">
      <h2 className={`${ADMIN_EYEBROW} [font-family:var(--store-font-body)]`}>{title}</h2>
      {subtitle && (
        <p className="mt-2 text-[12px] leading-5 text-[var(--admin-muted)]">{subtitle}</p>
      )}
      <div className="mt-4 h-[248px] w-full">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.14em] text-[var(--admin-faint)]">
      {text}
    </div>
  );
}

export function TopProductsChart({ data }: { data: { name: string; quantity: number }[] }) {
  const { axis, grid, label, ink } = useChartTokens();
  return (
    <ChartCard title="Top 5 productos" subtitle="Unidades vendidas en el período">
      {data.length === 0 ? (
        <Empty text="Sin ventas en el período" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 4, right: 36, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke={grid} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={132}
              interval={0}
              tick={{ fill: axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => (value.length > 18 ? `${value.slice(0, 17)}…` : value)}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "rgba(120,120,120,0.08)" }}
            />
            <Bar dataKey="quantity" name="Vendidos" fill={ink} barSize={18}>
              <LabelList dataKey="quantity" position="right" fill={label} fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function PaymentMethodsChart({ data }: { data: NamedValue[] }) {
  const { ink, rose, sage, clay, sand } = useChartTokens();
  const palette = [ink, sage, rose, clay, sand];
  const total = data.reduce((acc, d) => acc + d.value, 0);

  const colorFor = (name: string) => {
    const index = PAYMENT_ORDER.indexOf(name);
    return palette[(index >= 0 ? index : palette.length - 1) % palette.length];
  };

  return (
    <ChartCard title="Métodos de pago" subtitle="Distribución de pedidos en el período">
      {data.length === 0 ? (
        <Empty text="Sin pagos registrados" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="34%"
              cy="50%"
              innerRadius={52}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
              labelLine={false}
              label={({ percent, x, y }) =>
                (percent ?? 0) >= 0.07 ? (
                  <text
                    x={x}
                    y={y}
                    fill={ink}
                    fontSize={10}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {`${Math.round((percent ?? 0) * 100)}%`}
                  </text>
                ) : null
              }
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={colorFor(entry.name)} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={(v) => `${v} (${total ? Math.round((v / total) * 100) : 0}%)`}
                />
              }
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="square"
              iconSize={7}
              wrapperStyle={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}
              formatter={(value) => (
                <span className="text-[var(--admin-muted)]">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function InventoryByCategoryChart({ data }: { data: NamedValue[] }) {
  const { axis, grid, label, ink } = useChartTokens();
  return (
    <ChartCard title="Inventario por categoría" subtitle="Stock actual valuado a precio de lista">
      {data.length === 0 ? (
        <Empty text="Sin productos cargados" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 4, right: 8, top: 24, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={grid} />
            <XAxis
              dataKey="name"
              tick={{ fill: axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => (value.length > 12 ? `${value.slice(0, 11)}…` : value)}
              interval={0}
            />
            <YAxis hide />
            <Tooltip
              content={<ChartTooltip valueFormatter={abbreviateARS} />}
              cursor={{ fill: "rgba(120,120,120,0.08)" }}
            />
            <Bar dataKey="value" name="Valor" fill={ink} barSize={40}>
              <LabelList
                dataKey="value"
                position="top"
                fill={label}
                fontSize={10}
                formatter={(value) => abbreviateARS(Number(value))}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function SalesBySourceChart({ data }: { data: SalesPoint[] }) {
  const { axis, grid, sage, rose, label } = useChartTokens();
  const hasData = data.some((point) => point.WEB > 0 || point.POS > 0);

  return (
    <ChartCard title="Ventas: web vs. mostrador" subtitle="Ingresos por origen a lo largo del período">
      {!hasData ? (
        <Empty text="Sin ventas en el período" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="adminWebFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={sage} stopOpacity={0.26} />
                <stop offset="95%" stopColor={sage} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="adminPosFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={rose} stopOpacity={0.26} />
                <stop offset="95%" stopColor={rose} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={grid} />
            <XAxis
              dataKey="label"
              tick={{ fill: axis, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: axis, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => abbreviateARS(Number(value))}
              width={52}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}
              iconType="square"
              iconSize={7}
              formatter={(value) => <span className="text-[var(--admin-muted)]">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="WEB"
              name="WEB"
              stroke={sage}
              strokeWidth={1.5}
              fill="url(#adminWebFill)"
            />
            <Area
              type="monotone"
              dataKey="POS"
              name="POS"
              stroke={rose}
              strokeWidth={1.5}
              fill="url(#adminPosFill)"
            />
            <Tooltip
              content={<ChartTooltip valueFormatter={abbreviateARS} />}
              cursor={{ stroke: label, strokeOpacity: 0.15 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
