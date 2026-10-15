import { AlertTriangle, Boxes, DollarSign, Package } from "lucide-react";
import mock from "@/data/products_mock.json";
import type { Product, StoreData } from "@/lib/types";
import { formatARS } from "@/lib/pricing";

const LOW_STOCK = 5;
const products = (mock as unknown as StoreData).products as Product[];

export default function PanelHomePage() {
  const active = products.filter((p) => p.active).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock < LOW_STOCK).length;
  const units = products.reduce((acc, p) => acc + p.stock, 0);
  const inventoryValue = products.reduce((acc, p) => acc + p.stock * p.unit_price, 0);

  const cards = [
    { label: "Productos", value: String(products.length), hint: `${active} activos`, icon: Package },
    { label: "Unidades en stock", value: String(units), hint: "todas las categorías", icon: Boxes },
    { label: "Valor de inventario", value: formatARS(inventoryValue), hint: "precio de lista", icon: DollarSign },
    {
      label: "Alertas de stock",
      value: String(outOfStock + lowStock),
      hint: `${outOfStock} agotados · ${lowStock} críticos`,
      icon: AlertTriangle,
    },
  ];

  const critical = products
    .filter((p) => p.stock < LOW_STOCK)
    .sort((a, b) => a.stock - b.stock);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Métricas</h1>
        <p className="text-sm text-neutral-500">
          Fase 1 con datos de ejemplo. En Fase 2 se alimenta de las vistas <code>sales_metrics</code> y{" "}
          <code>top_products</code> de Supabase.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">{card.label}</span>
              <card.icon size={18} className="text-green-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{card.value}</p>
            <p className="text-xs text-neutral-400">{card.hint}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white">
        <h2 className="border-b border-neutral-200 p-4 text-base font-semibold text-neutral-900">
          Reposición sugerida
        </h2>
        {critical.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">No hay productos con stock crítico.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {critical.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-4 text-sm">
                <span className="font-medium text-neutral-900">{p.name}</span>
                <span className={p.stock === 0 ? "text-red-600" : "text-amber-600"}>
                  {p.stock === 0 ? "Agotado" : `${p.stock} unidades`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
