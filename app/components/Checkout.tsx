"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, CreditCard, MapPin } from "lucide-react";
import {
  Account,
  DeliveryAddress,
  emptyDeliveryAddress,
  getCurrentAccount,
  saveBuyerDeliveryAddress,
  signOut,
} from "./account-store";
import { CartItem, removeFromCart, subscribeToCart } from "./cart-store";
import { getPublicArtwork, getPublicArtworks } from "./catalog-store";
import { isCompleteDeliveryAddress } from "./delivery-address";
import { createSimulatedOrder, PaymentMethod } from "./orders-store";
import MediaImage from "./MediaImage";
import ShippingAddressFields from "./ShippingAddressFields";
import Toast from "./Toast";

type ShippingQuoteOption = { serviceId: string; name: string; price: number; deliveryDays: number };
type ArtistShippingQuotes = { artistId: string; artistName: string; options: ShippingQuoteOption[] };

function formatPrice(price: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(price));
}

export default function Checkout({
  artworkId,
  selectedArtworkIds,
}: {
  artworkId?: string;
  selectedArtworkIds?: string;
}) {
  const router = useRouter();
  const checkoutUrl = artworkId
    ? `/checkout?obra=${encodeURIComponent(artworkId)}`
    : selectedArtworkIds
      ? `/checkout?itens=${encodeURIComponent(selectedArtworkIds)}`
      : "/checkout";
  const [account, setAccount] = useState<Account | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [address, setAddress] = useState<DeliveryAddress>({ ...emptyDeliveryAddress });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [wrongAccountRole, setWrongAccountRole] = useState(false);
  const [selectionValid, setSelectionValid] = useState(true);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [simulationReference, setSimulationReference] = useState("");
  const [simulationTotal, setSimulationTotal] = useState("0.00");
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [shippingQuotes, setShippingQuotes] = useState<ArtistShippingQuotes[]>([]);
  const [selectedShippingServices, setSelectedShippingServices] = useState<Record<string, string>>({});
  const [quotedPostalCode, setQuotedPostalCode] = useState("");
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const productTotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.price), 0), [items]);
  const itemArtistIds = useMemo(
    () => [...new Set(items.map((item) => item.artistId).filter((artistId): artistId is string => Boolean(artistId)))],
    [items],
  );
  const destinationPostalCode = address.postalCode.replace(/\D/g, "");
  const shippingReady = itemArtistIds.length > 0
    && shippingQuotes.length === itemArtistIds.length
    && quotedPostalCode === destinationPostalCode
    && itemArtistIds.every((artistId) => shippingQuotes.some((group) => group.artistId === artistId))
    && shippingQuotes.every((group) => group.options.some((option) => option.serviceId === selectedShippingServices[group.artistId]));
  const shippingTotal = shippingReady
    ? shippingQuotes.reduce((sum, group) => sum + (
        group.options.find((option) => option.serviceId === selectedShippingServices[group.artistId])?.price ?? 0
      ), 0)
    : 0;
  const total = productTotal + shippingTotal;

  useEffect(() => {
    let cancelled = false;
    let unsubscribeCart = () => {};
    void (async () => {
      try {
        const currentAccount = await getCurrentAccount();
        if (cancelled) return;
        if (!currentAccount) {
          router.replace(`/login?next=${encodeURIComponent(checkoutUrl)}`);
          return;
        }
        if (currentAccount.role !== "buyer") {
          setWrongAccountRole(true);
          setReady(true);
          return;
        }

        setAccount(currentAccount);
        setAddress(currentAccount.deliveryAddress ?? { ...emptyDeliveryAddress });

        if (artworkId) {
          const artwork = await getPublicArtwork(artworkId);
          if (cancelled) return;
          if (!artwork || !artwork.artistId || artwork.artistId === currentAccount.id) {
            setError("Esta obra não está disponível para compra.");
          } else {
            setItems([{ ...artwork, addedAt: new Date().toISOString() }]);
          }
        } else {
          const requestedIds = selectedArtworkIds?.split(",").filter(Boolean);
          unsubscribeCart = subscribeToCart(
            currentAccount.id,
            (cartItems) => {
              const selectedItems = requestedIds
                ? cartItems.filter((item) => requestedIds.includes(item.id))
                : cartItems;
              const isValid = !requestedIds || (
                requestedIds.length > 0
                && selectedItems.length === new Set(requestedIds).size
                && selectedItems.length === requestedIds.length
              );
              setItems(selectedItems);
              setSelectionValid(isValid);
              setError(isValid ? "" : "Uma ou mais obras selecionadas não estão mais no carrinho. Volte ao carrinho e selecione novamente.");
            },
            (issue) => setError(issue.message),
          );
        }
      } catch (issue) {
        if (!cancelled) setError(issue instanceof Error ? issue.message : "Não foi possível carregar o fechamento da compra.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeCart();
    };
  }, [artworkId, checkoutUrl, router, selectedArtworkIds]);

  function handleAddressChange(nextAddress: DeliveryAddress) {
    if (nextAddress.postalCode.replace(/\D/g, "") !== address.postalCode.replace(/\D/g, "")) {
      setShippingQuotes([]);
      setSelectedShippingServices({});
      setQuotedPostalCode("");
    }
    setAddress(nextAddress);
  }

  async function calculateShipping() {
    setError("");
    setShippingQuotes([]);
    setSelectedShippingServices({});
    setQuotedPostalCode("");
    if (!/^\d{8}$/.test(destinationPostalCode)) {
      setError("Informe um CEP de destino válido para calcular o frete.");
      return;
    }
    if (items.length === 0) {
      setError("Não há obras para calcular o frete.");
      return;
    }

    setCalculatingShipping(true);
    try {
      const latestArtworks = new Map((await getPublicArtworks()).map((artwork) => [artwork.id, artwork]));
      const quoteItems = items.map((item) => {
        const latestArtwork = latestArtworks.get(item.id);
        if (!latestArtwork || latestArtwork.isSold) {
          throw new Error(`A obra "${item.title}" não está mais disponível para cotação.`);
        }
        return {
          ...item,
          shippingWidth: latestArtwork.shippingWidth,
          shippingHeight: latestArtwork.shippingHeight,
          shippingLength: latestArtwork.shippingLength,
          shippingWeight: latestArtwork.shippingWeight,
        };
      });
      setItems(quoteItems);
      if (quoteItems.some((item) => (
        !item.artistId
        || !item.shippingWidth
        || !item.shippingHeight
        || !item.shippingLength
        || !item.shippingWeight
      ))) {
        setError("Há obras sem dimensões de embalagem completas. Peça ao artista para atualizar os dados de envio.");
        return;
      }

      const artistGroups = new Map<string, CartItem[]>();
      for (const item of quoteItems) {
        if (!item.artistId) continue;
        const group = artistGroups.get(item.artistId) ?? [];
        group.push(item);
        artistGroups.set(item.artistId, group);
      }
      const groups = await Promise.all([...artistGroups.entries()].map(async ([artistId, artistItems]) => {
        const response = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationPostalCode,
            products: artistItems.map((item) => ({
              width: item.shippingWidth,
              height: item.shippingHeight,
              length: item.shippingLength,
              weight: item.shippingWeight,
              insuranceValue: Number(item.price),
            })),
          }),
        });
        const result: unknown = await response.json();
        if (!response.ok || typeof result !== "object" || result === null || !("quotes" in result) || !Array.isArray(result.quotes)) {
          const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
            ? result.error
            : "Não foi possível calcular o frete deste artista.";
          throw new Error(message);
        }
        const options = result.quotes.flatMap((quote): ShippingQuoteOption[] => {
          if (
            typeof quote !== "object"
            || quote === null
            || !("serviceId" in quote)
            || !("name" in quote)
            || !("price" in quote)
            || !("deliveryDays" in quote)
            || typeof quote.serviceId !== "string"
            || !quote.serviceId
            || typeof quote.name !== "string"
            || typeof quote.price !== "number"
            || typeof quote.deliveryDays !== "number"
          ) return [];
          return [{ serviceId: quote.serviceId, name: quote.name, price: quote.price, deliveryDays: quote.deliveryDays }];
        });
        if (options.length === 0) throw new Error("Não foi possível estimar o frete deste artista.");
        return {
          artistId,
          artistName: artistItems[0].artist,
          options,
        };
      }));

      setShippingQuotes(groups);
      setSelectedShippingServices(Object.fromEntries(groups.map((group) => [
        group.artistId,
        [...group.options].sort((a, b) => a.price - b.price)[0].serviceId,
      ])));
      setQuotedPostalCode(destinationPostalCode);
    } catch (issue) {
      setShippingQuotes([]);
      setSelectedShippingServices({});
      setQuotedPostalCode("");
      setError(issue instanceof Error ? issue.message : "Não foi possível calcular o frete.");
    } finally {
      setCalculatingShipping(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!account) return;
    if (!isCompleteDeliveryAddress(address)) {
      setError("Preencha todos os campos obrigatórios do endereço de entrega.");
      return;
    }
    if (items.length === 0) {
      setError("Não há obras disponíveis para finalizar.");
      return;
    }
    if (!selectionValid) {
      setError("Atualize sua seleção no carrinho antes de continuar.");
      return;
    }
    if (!shippingReady) {
      setError("Calcule o frete para o CEP informado e selecione uma opção para cada artista.");
      return;
    }
    if (
      paymentMethod === "credit-card"
      && (
        cardholder.trim().length < 2
        || !/^\d{12,19}$/.test(cardNumber.replace(/\D/g, ""))
        || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)
        || !/^\d{3,4}$/.test(cardCvv)
      )
    ) {
      setError("Preencha os campos do cartão usando somente dados inventados para a demonstração.");
      return;
    }

    setSaving(true);
    let orderCount = 0;
    const completedTotal = total.toFixed(2);
    const artistsWithShipping = new Set<string>();
    try {
      const savedAccount = await saveBuyerDeliveryAddress(account, address);
      setAccount(savedAccount);
      for (const item of items) {
        const artistId = item.artistId;
        let shippingAmount = 0;
        if (artistId) {
          if (!artistsWithShipping.has(artistId)) {
            shippingAmount = shippingQuotes.find((group) => group.artistId === artistId)?.options
              .find((option) => option.serviceId === selectedShippingServices[artistId])?.price ?? 0;
          }
          artistsWithShipping.add(artistId);
        }
        await createSimulatedOrder(savedAccount, item, paymentMethod, address, shippingAmount.toFixed(2));
        orderCount += 1;
        if (!artworkId) await removeFromCart(account.id, item.id);
      }
      setCardholder("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      setSimulationReference(`PA-${Date.now().toString().slice(-8)}`);
      setSimulationTotal(completedTotal);
      setSimulationComplete(true);
    } catch (issue) {
      const detail = issue instanceof Error ? issue.message : "Não foi possível concluir a simulação.";
      setError(orderCount ? `${orderCount} pedido(s) de teste foi/foram criado(s), mas houve um erro: ${detail}` : detail);
    } finally {
      setSaving(false);
    }
  }

  async function switchToBuyerAccount() {
    try {
      await signOut();
      router.replace(`/login?next=${encodeURIComponent(checkoutUrl)}`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Não foi possível sair desta conta.");
    }
  }

  if (!ready) {
    return <main className="grid min-h-screen place-items-center bg-[#f3f0ee] px-6"><p role="status">Preparando seu fechamento de compra...</p></main>;
  }

  if (wrongAccountRole) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f0ee] px-5 py-12 text-[#17131f]">
        <section className="max-w-xl rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-lg sm:p-10">
          <h1 className="text-3xl font-extrabold">Esta etapa é para compradores</h1>
          <p className="mt-3 leading-6 text-[#5f586d]">Você está conectado como artista. Como os perfis de artista e comprador são separados, escolha sua conta de comprador ou crie uma agora. Depois do acesso, você voltará para informar o endereço e concluir o pedido.</p>
          {error && <div className="mt-5"><Toast type="error" message={error} /></div>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => void switchToBuyerAccount()} className="rounded-xl bg-[#5c2df2] px-5 py-3 text-sm font-bold text-white">
              Entrar com conta de comprador
            </button>
            <Link
              href={`/cadastro?perfil=comprador&next=${encodeURIComponent(checkoutUrl)}`}
              className="rounded-xl border border-[#5c2df2]/20 px-5 py-3 text-sm font-bold text-[#5c2df2]"
            >
              Criar conta de comprador
            </Link>
            <Link href="/painel" className="rounded-xl border border-black/10 px-5 py-3 text-sm font-semibold">
              Voltar ao painel
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (simulationComplete) {
    return (
      <main className="min-h-screen bg-[#f3f0ee] px-5 py-12 text-[#17131f] sm:px-8">
        <section className="mx-auto max-w-2xl rounded-[28px] border border-black/5 bg-white p-8 shadow-lg sm:p-12">
          <div className="text-center">
            <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Simulação concluída</p>
            <h1 className="mt-2 text-3xl font-extrabold">Pagamento fictício registrado</h1>
            <p className="mt-3 text-[#5f586d]">Nenhum valor foi cobrado. Esta tela e os dados de pagamento são apenas demonstrativos.</p>
          </div>
          <div className="mt-6 rounded-2xl bg-[#f7f5fa] p-5 text-sm leading-6">
            <p><strong>Forma:</strong> {paymentMethod === "pix" ? "Pix demonstrativo" : paymentMethod === "credit-card" ? "Cartão demonstrativo" : "Boleto demonstrativo"}</p>
            <p><strong>Referência:</strong> {simulationReference}</p>
            <p><strong>Valor ilustrativo:</strong> {formatPrice(simulationTotal)}</p>
          </div>
          {paymentMethod === "pix" && (
            <div className="mt-6 text-center">
              <div aria-label="Ilustração de QR Code fictício, não pagável" className="mx-auto grid h-44 w-44 grid-cols-13 gap-0.5 rounded-lg border-8 border-white bg-white p-1 shadow" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
                {Array.from({ length: 169 }, (_, index) => (
                  <span key={index} className={(index * 17 + simulationReference.charCodeAt(index % simulationReference.length)) % 5 < 2 ? "bg-[#17131f]" : "bg-white"} />
                ))}
              </div>
              <p className="mt-3 text-sm font-bold">QR Code ilustrativo — não pode ser pago</p>
              <p className="mt-1 break-all text-xs text-[#746e80]">PAYART-PIX-DEMO-{simulationReference}</p>
            </div>
          )}
          {paymentMethod === "credit-card" && (
            <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              Cartão de teste aprovado na simulação. Os dados digitados foram usados somente nesta tela e não foram enviados nem armazenados.
            </p>
          )}
          {paymentMethod === "bank-slip" && (
            <div className="mt-6 rounded-xl border border-dashed border-black/20 p-5">
              <p className="text-center text-sm font-bold">BOLETO FICTÍCIO — SEM VALOR DE COBRANÇA</p>
              <p className="mt-4 break-all font-mono text-sm">{`00000.00000 00000.000000 ${simulationReference} 00000000000000`}</p>
              <button type="button" onClick={() => window.print()} className="mt-4 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold print:hidden">
                Imprimir demonstração
              </button>
            </div>
          )}
          <address className="mt-5 rounded-2xl bg-[#f7f5fa] p-4 text-left text-sm not-italic leading-6 text-[#5f586d]">
            <strong className="text-[#17131f]">Entrega para {address.recipient}</strong><br />
            {address.street}, {address.number}{address.complement ? `, ${address.complement}` : ""}<br />
            {address.neighborhood} · {address.city}/{address.state}<br />
            CEP {address.postalCode}
          </address>
          <div className="mt-7 flex flex-wrap justify-center gap-3 print:hidden">
            <Link href="/painel" className="rounded-xl bg-[#5c2df2] px-5 py-3 text-sm font-bold text-white">Ver meus pedidos</Link>
            <Link href="/explorar" className="rounded-xl border border-black/10 px-5 py-3 text-sm font-semibold">Voltar a explorar</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f0ee] px-5 py-8 text-[#17131f] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link href={artworkId ? `/obras/${encodeURIComponent(artworkId)}` : "/painel"} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#5c2df2]">
          <ArrowLeft size={17} /> {artworkId ? "Voltar para a obra" : "Voltar ao carrinho"}
        </Link>
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Finalizar compra</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.06em]">Onde vamos entregar?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f586d]">Confira suas obras e informe o endereço. O frete é uma estimativa fictícia para demonstração; nenhum pagamento real será processado.</p>
        </div>
        {error && <div className="mb-5"><Toast type="error" message={error} /></div>}
        {items.length === 0 ? (
          <section className="rounded-[24px] border border-black/5 bg-white p-8 text-center">
            <h2 className="text-xl font-bold">{artworkId ? "Obra indisponível" : "Seu carrinho está vazio"}</h2>
            <p className="mt-2 text-sm text-[#5f586d]">{artworkId ? "Volte para explorar e escolha outra obra." : "Adicione obras ao carrinho antes de finalizar a compra."}</p>
            <Link href="/explorar" className="mt-5 inline-flex rounded-xl bg-[#5c2df2] px-5 py-3 text-sm font-bold text-white">Explorar obras</Link>
          </section>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f4efff] text-[#5c2df2]"><MapPin size={20} /></span>
                <div>
                  <h2 className="text-xl font-bold">Endereço de entrega</h2>
                  <p className="mt-1 text-xs text-[#746e80]">Salvo no seu perfil privado para compras futuras.</p>
                </div>
              </div>
              <ShippingAddressFields address={address} onChange={handleAddressChange} disabled={saving || calculatingShipping} />
            </section>
            <aside className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Resumo do pedido</h2>
              <div className="mt-5 space-y-4">
                {items.map((item) => (
                  <article key={item.id} className="flex gap-3 border-b border-black/5 pb-4">
                    <MediaImage src={item.image} alt={item.title} className="h-16 w-16 shrink-0 rounded-xl bg-white" imageClassName="object-contain p-1" sizes="64px" />
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold">{item.title}</h3>
                      <p className="mt-1 text-xs text-[#5f586d]">por {item.artist}</p>
                      <p className="mt-1 text-sm font-bold">{formatPrice(item.price)}</p>
                    </div>
                  </article>
                ))}
              </div>
              <section className="mt-5 border-t border-black/5 pt-4">
                <h3 className="text-sm font-bold">Estimativa de frete</h3>
                <p className="mt-1 text-xs leading-5 text-[#746e80]">Simulação local baseada no peso e nas dimensões informadas. Não consulta transportadoras e não representa preço ou prazo real.</p>
                <button
                  type="button"
                  onClick={() => void calculateShipping()}
                  disabled={calculatingShipping || saving || !/^\d{8}$/.test(destinationPostalCode)}
                  className="mt-3 w-full rounded-xl border border-[#5c2df2]/30 px-4 py-2.5 text-sm font-bold text-[#5c2df2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {calculatingShipping ? "Calculando estimativa..." : "Estimar frete"}
                </button>
                {shippingQuotes.map((group) => (
                  <label key={group.artistId} className="mt-3 block text-xs font-semibold">
                    Envio de {group.artistName}
                    <select
                      value={selectedShippingServices[group.artistId] ?? ""}
                      onChange={(event) => setSelectedShippingServices((current) => ({
                        ...current,
                        [group.artistId]: event.target.value,
                      }))}
                      disabled={saving}
                      className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-normal"
                    >
                      {group.options.map((option) => (
                        <option key={option.serviceId} value={option.serviceId}>
                          {option.name} · {formatPrice(option.price.toFixed(2))} · {option.deliveryDays} dia(s)
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                {shippingReady && <p className="mt-3 text-xs font-semibold text-emerald-800">Frete total: {formatPrice(shippingTotal.toFixed(2))}</p>}
              </section>
              <label className="mt-5 block text-sm font-semibold">
                Forma de pagamento demonstrativa
                <select value={paymentMethod} onChange={(event) => {
                  const value = event.target.value;
                  if (value === "pix" || value === "credit-card" || value === "bank-slip") setPaymentMethod(value);
                }} className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm">
                  <option value="pix">Pix</option>
                  <option value="credit-card">Cartão de crédito</option>
                  <option value="bank-slip">Boleto bancário</option>
                </select>
              </label>
              {paymentMethod === "credit-card" && (
                <div className="mt-4 space-y-3 rounded-xl bg-[#f7f5fa] p-4">
                  <p className="text-xs font-semibold text-[#746e80]">Use apenas dados inventados. Nada será enviado ou guardado.</p>
                  <input aria-label="Nome fictício no cartão" autoComplete="off" value={cardholder} onChange={(event) => setCardholder(event.target.value)} placeholder="Nome fictício no cartão" className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" />
                  <input aria-label="Número fictício do cartão" autoComplete="off" inputMode="numeric" maxLength={19} value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} placeholder="Número fictício do cartão" className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" />
                  <div className="grid grid-cols-2 gap-3">
                    <input aria-label="Validade fictícia" autoComplete="off" maxLength={5} value={cardExpiry} onChange={(event) => setCardExpiry(event.target.value)} placeholder="MM/AA" className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" />
                    <input aria-label="CVV fictício" autoComplete="off" inputMode="numeric" maxLength={4} value={cardCvv} onChange={(event) => setCardCvv(event.target.value)} placeholder="CVV fictício" className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" />
                  </div>
                </div>
              )}
              <div className="mt-5 flex justify-between border-t border-black/5 pt-4 text-sm">
                <span>Obras</span>
                <span>{formatPrice(productTotal.toFixed(2))}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span>Frete</span>
                <span>{shippingReady ? formatPrice(shippingTotal.toFixed(2)) : "Calcule o frete"}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-black/5 pt-3">
                <span className="text-sm">Total do pedido</span>
                <span className="font-bold">{formatPrice(total.toFixed(2))}</span>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#746e80]">Esta demonstração não se conecta a bancos ou provedores de pagamento e não cobra valores. Nunca informe dados reais de cartão.</p>
              <button type="submit" disabled={saving || !selectionValid || !isCompleteDeliveryAddress(address) || !shippingReady} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5c2df2] px-5 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                <CreditCard size={17} /> {saving ? "Registrando simulação..." : "Testar pagamento fictício"}
              </button>
              {!isCompleteDeliveryAddress(address) && <p className="mt-2 text-center text-xs text-[#746e80]">Preencha o endereço para continuar.</p>}
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}
