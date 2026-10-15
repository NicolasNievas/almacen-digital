import PosScreen from "@/components/admin/PosScreen";
import mock from "@/data/products_mock.json";
import type { Product, StoreData } from "@/lib/types";

const products = (mock as unknown as StoreData).products as Product[];

export default function PosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Punto de venta</h1>
        <p className="text-sm text-neutral-500">
          Fase 1: la venta descuenta stock en memoria. En Fase 2 pasá <code>onCheckout</code> conectado al RPC{" "}
          <code>create_sale</code> (source <code>POS</code>).
        </p>
      </div>

      <PosScreen products={products} />
    </div>
  );
}
