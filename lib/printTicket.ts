export interface TicketItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  originalUnitPrice?: number;
  note?: string;
}

export interface TicketData {
  orderId: string;
  createdAt: string;
  customerName?: string;
  source: 'POS' | 'WEB';
  paymentMethod: string;
  items: TicketItem[];
  total: number;
  originalTotal?: number;
}

export const printTicket = (data: TicketData): void => {
  const originalTotal = data.originalTotal ?? data.items.reduce((acc, i) => {
    const orig = i.originalUnitPrice ?? i.unitPrice;
    return acc + orig * i.quantity;
  }, 0);

  const savings = Math.max(0, originalTotal - data.total);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Ticket #${data.orderId.slice(0, 8)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Courier New',monospace;font-size:12px;max-width:280px;margin:0 auto;padding:12px 8px;color:#000}
    h2{text-align:center;font-size:15px;margin-bottom:2px;text-transform:uppercase}
    .sub{text-align:center;font-size:10px;color:#444;margin-bottom:8px}
    .dash{border-top:1px dashed #000;margin:8px 0}
    .row{display:flex;justify-content:space-between;margin:3px 0}
    .bold{font-weight:bold}
    .total{font-size:14px;font-weight:bold;margin-top:4px}
    .pname{flex:1;padding-right:4px}.pprice{text-align:right;white-space:nowrap}
    .small{font-size:10px;color:#000}
    .footer{text-align:center;font-size:10px;margin-top:12px}
  </style>
</head>
<body>
  <h2>AG Mayorista</h2>
  <div class="sub">Ventas por Mayor y Menor</div>
  <div class="sub">Comprobante No Válido como Factura</div>
  <div class="dash"></div>
  <div class="row"><span>Origen:</span><span class="bold">${data.source}</span></div>
  <div class="row"><span>Fecha:</span><span>${new Date(data.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
  ${data.customerName ? `<div class="row"><span>Cliente:</span><span class="bold">${data.customerName}</span></div>` : ''}
  <div class="row"><span>Pago:</span><span>${data.paymentMethod}</span></div>
  <div class="dash"></div>
  ${data.items.map(i => {
    const orig = i.originalUnitPrice ?? i.unitPrice;
    const unitAfter = i.subtotal / i.quantity;
    const hasDiscount = i.quantity > 0 && orig > unitAfter + 0.01;
    const detail = i.note
      ? i.note
      : hasDiscount
        ? `(Precio con descuento: $${Math.round(unitAfter).toLocaleString('es-AR')} c/u)`
        : '';
    return `
  <div class="row">
    <span class="pname">${i.quantity}x ${i.productName}</span>
    <span class="pprice">$${i.subtotal.toLocaleString('es-AR')}</span>
  </div>
  ${hasDiscount ? `<div class="row small"><span>(Precio lista: $${Math.round(orig).toLocaleString('es-AR')} c/u)</span><span></span></div>` : ''}
  ${detail ? `<div class="row small"><span>${detail}</span><span></span></div>` : ''}`;
  }).join('')}
  <div class="dash"></div>
  ${savings > 0 ? `<div class="row"><span>Subtotal sin desc.:</span><span>$${Math.round(originalTotal).toLocaleString('es-AR')}</span></div>` : ''}
  ${savings > 0 ? `<div class="row"><span>Ahorro acumulado:</span><span>-$${Math.round(savings).toLocaleString('es-AR')}</span></div>` : ''}
  <div class="row total"><span>TOTAL FINAL:</span><span>$${Math.round(data.total).toLocaleString('es-AR')}</span></div>
  <div class="dash"></div>
  <div class="footer">¡Muchas gracias por su compra!</div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=380,height=600');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 250);
};
