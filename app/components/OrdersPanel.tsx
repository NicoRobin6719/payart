"use client";

import { useEffect, useState } from "react";
import { Account, isLocalAccount } from "./account-store";
import { SimulatedOrder, subscribeToOrders } from "./orders-store";
import Toast from "./Toast";

const paymentLabels = {
  pix: "Pix",
  "credit-card": "Cartão de crédito",
  "bank-slip": "Boleto",
};

const orderStatusLabels = {
  simulated: "Simulação",
  pending: "Aguardando pagamento",
  approved: "Pago",
  rejected: "Pagamento recusado",
  cancelled: "Pagamento cancelado",
  refunded: "Reembolsado",
  conflict: "Precisa de atendimento",
};

export default function OrdersPanel({ account }: { account: Account }) {
  const [orders, setOrders] = useState<SimulatedOrder[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    return subscribeToOrders(account.id, (items) => {
      setOrders(items);
      setError("");
    }, (issue) => setError(issue.message));
  }, [account.id]);

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Compras e vendas</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Pedidos</h1>
        <p className="mt-2 text-sm text-[#5f586d]">
          {account.role === "artist" ? "Pedidos de obras do seu catálogo." : "Pedidos iniciados para suas obras favoritas."}
        </p>
      </div>
      {error && <div className="mb-4"><Toast type="error" message={error} /></div>}
      {orders.length === 0 ? (
        <div className="rounded-[24px] border border-black/5 bg-white p-8 text-center">
          <h2 className="text-xl font-bold">Nenhum pedido por enquanto</h2>
          <p className="mt-2 text-sm text-[#5f586d]">Quando um pedido for criado, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{order.artworkTitle}</h2>
                  <p className="mt-1 text-sm text-[#5f586d]">
                    {account.role === "artist" ? `Comprador: ${order.buyerName}` : `Artista: ${order.artistName}`}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  order.status === "approved" ? "bg-emerald-50 text-emerald-800"
                    : order.status === "rejected" || order.status === "cancelled" || order.status === "refunded" || order.status === "conflict"
                      ? "bg-red-50 text-red-800"
                      : order.status === "simulated" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"
                }`}>{orderStatusLabels[order.status]}</span>
              </div>
              <div className="mt-4 space-y-2 border-t border-black/5 pt-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span>{paymentLabels[order.paymentMethod]} · obra</span>
                  <span>R$ {Number(order.amount).toFixed(2).replace(".", ",")}</span>
                </div>
                {Number(order.shippingAmount) > 0 && (
                  <div className="flex justify-between gap-2">
                    <span>Frete demonstrativo</span>
                    <span>R$ {Number(order.shippingAmount).toFixed(2).replace(".", ",")}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2 border-t border-black/5 pt-2 font-bold">
                  <span>Total demonstrativo</span>
                  <span>R$ {(Number(order.amount) + Number(order.shippingAmount)).toFixed(2).replace(".", ",")}</span>
                </div>
              </div>
              {order.deliveryAddress && (
                <div className="mt-3 border-t border-black/5 pt-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[#746e80]">Endereço de entrega</h3>
                  <address className="mt-1 not-italic text-sm leading-5 text-[#5f586d]">
                    {order.deliveryAddress.recipient}<br />
                    {order.deliveryAddress.street}, {order.deliveryAddress.number}
                    {order.deliveryAddress.complement ? `, ${order.deliveryAddress.complement}` : ""}<br />
                    {order.deliveryAddress.neighborhood} · {order.deliveryAddress.city}/{order.deliveryAddress.state}<br />
                    CEP {order.deliveryAddress.postalCode}
                  </address>
                </div>
              )}
              <time className="mt-2 block text-xs text-[#746e80]" dateTime={order.createdAt}>
                Criado em {new Date(order.createdAt).toLocaleString("pt-BR")}
              </time>
            </article>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-[#746e80]">
        {isLocalAccount(account.id)
          ? "Pedidos salvos somente neste navegador; o Firestore é necessário para sincronizar com outros dispositivos."
          : "Os pedidos são sincronizados em tempo real pelo Firebase. Todos os pagamentos neste site são apenas demonstrações fictícias."}
      </p>
    </section>
  );
}
