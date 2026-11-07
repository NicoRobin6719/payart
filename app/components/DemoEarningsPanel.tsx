"use client";

import { useEffect, useMemo, useState } from "react";
import { Account } from "./account-store";
import { demoCommissionRate, DemoWithdrawal, requestDemoWithdrawal, subscribeToDemoWithdrawals } from "./demo-withdrawals-store";
import { SimulatedOrder, subscribeToOrders } from "./orders-store";
import Toast from "./Toast";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function DemoEarningsPanel({ account }: { account: Account }) {
  const [orders, setOrders] = useState<SimulatedOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<DemoWithdrawal[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribeOrders = subscribeToOrders(account.id, setOrders, (issue) => setError(issue.message));
    const unsubscribeWithdrawals = subscribeToDemoWithdrawals(
      account.id,
      setWithdrawals,
      (issue) => setError(issue.message),
    );
    return () => {
      unsubscribeOrders();
      unsubscribeWithdrawals();
    };
  }, [account.id]);

  const totals = useMemo(() => {
    const gross = orders
      .filter((order) => order.artistId === account.id && order.status === "simulated")
      .reduce((sum, order) => sum + Number(order.amount), 0);
    const commission = gross * demoCommissionRate / 100;
    const net = gross - commission;
    const requested = withdrawals.reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
    return { gross, commission, net, requested, available: Math.max(0, net - requested) };
  }, [account.id, orders, withdrawals]);

  async function handleRequestWithdrawal() {
    if (totals.available <= 0) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await requestDemoWithdrawal(account, totals.available);
      setSuccess("Solicitação de saque fictício registrada. Nenhum dinheiro foi transferido.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Não foi possível registrar a solicitação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6d28d9]">Área demonstrativa</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Vendas e saques fictícios</h1>
        <p className="mt-2 text-sm leading-6 text-[#475569]">
          Os pedidos simulados compõem este resumo. Do valor de cada obra, {100 - demoCommissionRate}% fica com o artista e {demoCommissionRate}% é destinado à manutenção do app; fretes são excluídos.
          Solicitações não movimentam dinheiro.
        </p>
      </div>
      {error && <div className="mb-4"><Toast type="error" message={error} /></div>}
      {success && <div className="mb-4"><Toast type="success" message={success} /></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Vendas simuladas", totals.gross],
          [`Parte do app (${demoCommissionRate}%)`, totals.commission],
          [`Parte do artista (${100 - demoCommissionRate}%)`, totals.net],
          ["Disponível para simular saque", totals.available],
        ].map(([label, amount]) => (
          <article key={label} className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
            <p className="text-sm text-[#475569]">{label}</p>
            <p className="mt-3 text-2xl font-extrabold">{currency.format(Number(amount))}</p>
          </article>
        ))}
      </div>
      <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <strong>Somente demonstração.</strong> Os valores não são saldo real, a comissão não é cobrada e os saques não são enviados a banco ou chave Pix.
        <button
          type="button"
          onClick={() => void handleRequestWithdrawal()}
          disabled={saving || totals.available <= 0}
          className="mt-4 block rounded-xl bg-[#6d28d9] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Registrando..." : `Simular saque de ${currency.format(totals.available)}`}
        </button>
      </div>
      <div className="mt-8 rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Solicitações demonstrativas</h2>
        {withdrawals.length === 0 ? (
          <p className="mt-3 text-sm text-[#475569]">Ainda não há solicitações fictícias.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/5">
            {withdrawals.map((withdrawal) => (
              <li key={withdrawal.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span>{new Date(withdrawal.createdAt).toLocaleString("pt-BR")} · Simulação, não transferida</span>
                <strong>{currency.format(withdrawal.amount)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
