import { ClipboardList } from "lucide-react";

export default function PedidosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Pedidos</h1>
        <p className="text-sm text-neutral-500">
          Fase 2: los pedidos web (WhatsApp) y del POS se guardan en Supabase y se listan acá.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="p-3 font-medium">Pedido</th>
              <th className="font-medium">Cliente</th>
              <th className="font-medium">Retiro</th>
              <th className="font-medium">Pago</th>
              <th className="font-medium">Total</th>
              <th className="font-medium">Origen</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="p-10 text-center text-neutral-500">
                <ClipboardList className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
                Todavía no hay pedidos.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
