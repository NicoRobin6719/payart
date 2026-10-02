"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Account } from "./account-store";
import { CartItem, removeFromCart, subscribeToCart } from "./cart-store";
import Toast from "./Toast";
import MediaImage from "./MediaImage";

function formatPrice(price: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(price));
}

export default function CartPanel({ account }: { account: Account }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string> | null>(null);
  const [error, setError] = useState("");
  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds === null || selectedItemIds.has(item.id)),
    [items, selectedItemIds],
  );
  const total = useMemo(
    () => selectedItems.reduce((sum, item) => sum + Number(item.price), 0),
    [selectedItems],
  );
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  useEffect(() => subscribeToCart(account.id, (nextItems) => {
    setItems(nextItems);
    setError("");
  }, (issue) => setError(issue.message)), [account.id]);

  async function handleRemove(artworkId: string) {
    try {
      await removeFromCart(account.id, artworkId);
      setSelectedItemIds((current) => current === null ? null : new Set([...current].filter((id) => id !== artworkId)));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Não foi possível remover a obra.");
    }
  }

  function toggleSelection(artworkId: string) {
    setSelectedItemIds((current) => {
      const next = new Set(current ?? items.map((item) => item.id));
      if (next.has(artworkId)) next.delete(artworkId);
      else next.add(artworkId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedItemIds(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  }

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Suas escolhas</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Carrinho</h1>
        <p className="mt-2 text-sm text-[#5f586d]">Escolha quais obras deseja incluir neste checkout.</p>
      </div>
      {error && <div className="mb-4"><Toast type="error" message={error} /></div>}
      {items.length === 0 ? (
        <div className="rounded-[24px] border border-black/5 bg-white p-8 text-center">
          <h2 className="text-xl font-bold">Seu carrinho está vazio</h2>
          <p className="mt-2 text-sm text-[#5f586d]">Adicione obras publicadas para encontrá-las aqui.</p>
          <Link href="/explorar" className="mt-5 inline-flex rounded-xl bg-[#5c2df2] px-5 py-3 text-sm font-bold text-white">Explorar obras</Link>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <label className="mb-3 flex items-center gap-3 rounded-[22px] border border-black/5 bg-white p-4 text-sm font-semibold shadow-sm">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                aria-label="Selecionar todas as obras do carrinho"
                className="h-4 w-4 accent-[#5c2df2]"
              />
              Selecionar todas as obras ({items.length})
            </label>
            <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="flex gap-4 rounded-[22px] border border-black/5 bg-white p-4 shadow-sm">
                <label className="flex items-start pt-2">
                  <input
                    type="checkbox"
                    checked={selectedItemIds === null || selectedItemIds.has(item.id)}
                    onChange={() => toggleSelection(item.id)}
                    aria-label={`Selecionar ${item.title}`}
                    className="h-4 w-4 accent-[#5c2df2]"
                  />
                </label>
                <MediaImage src={item.image} alt={item.title} className="h-24 w-24 shrink-0 rounded-xl bg-white" imageClassName="object-contain p-1" sizes="96px" />
                <div className="min-w-0 flex-1">
                  <Link href={`/obras/${encodeURIComponent(item.id)}`} className="font-bold hover:text-[#5c2df2]">{item.title}</Link>
                  <p className="mt-1 text-sm text-[#5f586d]">{item.artist}</p>
                  <p className="mt-2 font-bold">{formatPrice(item.price)}</p>
                  <button onClick={() => void handleRemove(item.id)} className="mt-2 text-xs font-semibold text-red-700">Remover</button>
                </div>
              </article>
            ))}
            </div>
          </div>
          <aside className="rounded-[22px] border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Resumo</h2>
            <div className="mt-4 flex justify-between border-t border-black/5 pt-4 text-sm">
              <span>{selectedItems.length} de {items.length} {items.length === 1 ? "obra selecionada" : "obras selecionadas"}</span>
              <span className="font-bold">{formatPrice(total.toFixed(2))}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#746e80]">Informe o endereço e escolha a forma de pagamento na próxima etapa. O pedido é demonstrativo, sem cobrança.</p>
            {selectedItems.length > 0 ? (
              <Link
                href={`/checkout?itens=${encodeURIComponent(selectedItems.map((item) => item.id).join(","))}`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#5c2df2] px-4 py-3 text-sm font-bold text-white"
              >
                Ir para checkout ({selectedItems.length})
              </Link>
            ) : (
              <button type="button" disabled className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#5c2df2] px-4 py-3 text-sm font-bold text-white opacity-50">
                Selecione ao menos uma obra
              </button>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
