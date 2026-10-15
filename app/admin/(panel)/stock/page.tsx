import StockPanel from "@/components/admin/StockPanel";
import mock from "@/data/products_mock.json";
import type { Product, StoreData } from "@/lib/types";

const products = (mock as unknown as StoreData).products as Product[];

export default function StockPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Stock</h1>
        <p className="text-sm text-neutral-500">
          Fase 1: datos de ejemplo. En Fase 2 conectá <code>onSave</code> al RPC <code>adjust_stock</code> y a{" "}
          <code>products</code> de Supabase.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <StockPanel initial={products} />
      </div>
    </div>
  );
}
