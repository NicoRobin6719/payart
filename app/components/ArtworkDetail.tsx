"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Heart, MessageCircle, ShoppingCart, Star, UserRound } from "lucide-react";
import { Account, getCurrentAccount } from "./account-store";
import { getPublicArtwork, PublicArtwork } from "./catalog-store";
import {
  getFavoriteIds,
  getReviews,
  Review,
  saveReview,
  sendMessage,
  toggleFavorite,
} from "./community-store";
import Toast from "./Toast";
import { addToCart } from "./cart-store";
import MediaImage from "./MediaImage";

const cardClass = "rounded-[24px] border border-black/5 bg-white/80 p-6 shadow-sm";

function formatPrice(price: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(price));
}

export default function ArtworkDetail({ artworkId }: { artworkId: string }) {
  const router = useRouter();
  const [artwork, setArtwork] = useState<PublicArtwork | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [cartSaving, setCartSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void (async () => {
      try {
        const currentAccount = getCurrentAccount();
        const foundArtwork = await getPublicArtwork(artworkId);
        const signedInAccount = await currentAccount;
        if (cancelled) return;
        setAccount(signedInAccount);
        setArtwork(foundArtwork);
        if (foundArtwork) {
          const loadedReviews = await getReviews(foundArtwork.id);
          if (cancelled) return;
          setReviews(loadedReviews);
          const ownReview = signedInAccount
            ? loadedReviews.find((review) => review.accountId === signedInAccount.id)
            : undefined;
          if (ownReview) {
            setRating(ownReview.rating);
            setReviewText(ownReview.text);
          }
        }
        if (signedInAccount && foundArtwork) {
          setFavorite((await getFavoriteIds(signedInAccount.id)).includes(foundArtwork.id));
        }
      } catch (error) {
        if (!cancelled) setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível carregar esta obra." });
      } finally {
        if (!cancelled) setReady(true);
      }
      })();
    });
    return () => { cancelled = true; };
  }, [artworkId]);

  function promptLogin() {
    const next = encodeURIComponent(`/obras/${artworkId}`);
    router.push(`/login?next=${next}`);
  }

  async function handleFavorite() {
    if (!account) {
      promptLogin();
      return;
    }
    try {
      setFavorite(await toggleFavorite(account.id, artworkId));
      setFeedback({ type: "success", message: favorite ? "Obra removida dos favoritos." : "Obra adicionada aos favoritos." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível atualizar seus favoritos." });
    }
  }

  async function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) {
      promptLogin();
      return;
    }
    try {
      await saveReview(account, artworkId, rating, reviewText);
      setReviews(await getReviews(artworkId));
      setFeedback({ type: "success", message: "Sua avaliação foi publicada." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível publicar sua avaliação." });
    }
  }

  async function handleMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) {
      promptLogin();
      return;
    }
    if (!artwork) return;
    try {
      await sendMessage(account, artwork, messageText);
      setMessageText("");
      setFeedback({ type: "success", message: "Mensagem enviada. Você pode acompanhar a conversa na sua caixa de mensagens." });
      router.push("/mensagens");
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível enviar sua mensagem." });
    }
  }

  async function handleAddToCart() {
    if (!account) {
      promptLogin();
      return;
    }
    if (!artwork) return;
    setCartSaving(true);
    try {
      await addToCart(account, artwork);
      setFeedback({ type: "success", message: "Obra adicionada ao seu carrinho." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível adicionar ao carrinho." });
    } finally {
      setCartSaving(false);
    }
  }

  if (!ready) {
    return <main className="grid min-h-screen place-items-center bg-[#f3f0ee]"><p role="status">Carregando detalhes da obra...</p></main>;
  }

  if (!artwork) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f0ee] px-6">
        <section className={`${cardClass} max-w-lg text-center`}>
          {feedback && <Toast type={feedback.type} message={feedback.message} />}
          <h1 className="mt-4 text-2xl font-bold">Obra não encontrada</h1>
          <p className="mt-2 text-sm text-[#5f586d]">Ela pode ter sido removida ou o endereço está incorreto.</p>
          <Link href="/explorar" className="mt-5 inline-flex rounded-xl bg-[#5c2df2] px-5 py-3 font-bold text-white">Voltar para explorar</Link>
        </section>
      </main>
    );
  }

  const average = reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : 0;
  const ownArtwork = artwork.artistId === account?.id;

  return (
    <main className="min-h-screen bg-[#f3f0ee] px-5 py-8 text-[#17131f] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/explorar" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#5c2df2]"><ArrowLeft size={17} /> Voltar para explorar</Link>
        {feedback && <div className="mb-5"><Toast type={feedback.type} message={feedback.message} /></div>}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <MediaImage
            src={artwork.image}
            alt={`Imagem da obra ${artwork.title}`}
            className="min-h-72 rounded-[28px] bg-white shadow-lg sm:min-h-[520px]"
            imageClassName="object-contain p-3"
          />
          <section className={`${cardClass} flex flex-col justify-center`}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">{artwork.category}</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.06em] sm:text-5xl">{artwork.title}</h1>
            <p className="mt-4 text-2xl font-bold">{formatPrice(artwork.price)}</p>
            <p className="mt-6 leading-7 text-[#5f586d]">{artwork.description || "Obra original publicada por um artista independente."}</p>
            <div className="mt-7 flex items-center gap-3 border-t border-black/5 pt-5">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#eee8ff] text-[#5c2df2]"><UserRound size={22} /></span>
              <div>
                <p className="text-xs text-[#746e80]">Obra de</p>
                <p className="font-bold">{artwork.artist}</p>
              </div>
              {artwork.artistId && <Link href={`/artistas/${encodeURIComponent(artwork.artistId)}`} className="ml-auto text-sm font-bold text-[#5c2df2]">Ver perfil</Link>}
            </div>
            <button onClick={handleFavorite} className={`mt-6 inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition ${favorite ? "border-pink-200 bg-pink-50 text-pink-700" : "border-black/10 hover:bg-black/5"}`}>
              <Heart size={18} fill={favorite ? "currentColor" : "none"} /> {favorite ? "Salva nos favoritos" : "Adicionar aos favoritos"}
            </button>
            {artwork.artistId && !ownArtwork && account?.role !== "artist" && (
              <button onClick={() => void handleAddToCart()} disabled={cartSaving} className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-[#5c2df2]/20 px-5 py-3 text-sm font-bold text-[#5c2df2] hover:bg-[#f4efff] disabled:opacity-60">
                <ShoppingCart size={18} /> {cartSaving ? "Adicionando..." : "Adicionar ao carrinho"}
              </button>
            )}
            {artwork.artistId && !ownArtwork && (
              <button
                type="button"
                onClick={() => router.push(`/checkout?obra=${encodeURIComponent(artwork.id)}`)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#5c2df2] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4a20d4]"
              >
                Comprar agora
              </button>
            )}
          </section>
        </div>

        {artwork.artistId && !ownArtwork && (
          <form onSubmit={handleMessage} className={`${cardClass} mt-8`}>
            <div className="flex items-center gap-2"><MessageCircle className="text-[#5c2df2]" size={20} /><h2 className="text-xl font-bold">Fale com o artista</h2></div>
            <p className="mt-2 text-sm text-[#5f586d]">Tire dúvidas sobre “{artwork.title}”. A conversa ficará na sua caixa de mensagens.</p>
            <textarea required minLength={2} maxLength={1000} value={messageText} onChange={(event) => setMessageText(event.target.value)} className="mt-4 min-h-24 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#5c2df2]" placeholder="Escreva sua mensagem..." />
            <button type="submit" className="mt-3 rounded-xl bg-[#5c2df2] px-5 py-3 text-sm font-bold text-white">Enviar mensagem</button>
          </form>
        )}

        <section id="avaliacoes" className="mt-8 grid scroll-mt-8 gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={handleReview} className={cardClass}>
            <h2 className="text-xl font-bold">Avalie esta obra</h2>
            <p className="mt-2 text-sm text-[#5f586d]">Compartilhe sua opinião com a comunidade.</p>
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold">Sua nota</legend>
              <div role="radiogroup" aria-label="Sua nota" className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} ${value === 1 ? "estrela" : "estrelas"}`} onClick={() => setRating(value)} className={`rounded-md p-1 ${value <= rating ? "text-amber-500" : "text-gray-300"}`}>
                    <Star size={24} fill={value <= rating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="mt-4 block text-sm font-semibold">
              Comentário
              <textarea required minLength={3} maxLength={1000} value={reviewText} onChange={(event) => setReviewText(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-black/10 bg-white px-4 py-3 font-normal outline-none focus:border-[#5c2df2]" placeholder="O que achou desta obra?" />
            </label>
            <button type="submit" className="mt-4 rounded-xl bg-[#5c2df2] px-5 py-3 text-sm font-bold text-white">{account && reviews.some((review) => review.accountId === account.id) ? "Atualizar avaliação" : "Publicar avaliação"}</button>
            {account && <p className="mt-2 text-xs text-[#746e80]">Uma avaliação por conta; você pode atualizá-la depois.</p>}
          </form>

          <div className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Comentários e avaliações</h2>
                <p className="mt-1 text-sm text-[#5f586d]">{reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}</p>
              </div>
              {reviews.length > 0 && <p className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700"><Star size={16} fill="currentColor" /> {average.toFixed(1)} / 5</p>}
            </div>
            {reviews.length === 0 ? (
              <p className="mt-6 rounded-xl bg-[#f3f0ee] p-5 text-sm text-[#5f586d]">Esta obra ainda não recebeu avaliações. Seja o primeiro a comentar.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="border-t border-black/5 pt-4 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">{review.accountName}</h3>
        <time className="text-xs text-[#746e80]" dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("pt-BR")}</time>
      </div>
      <p className="mt-1 text-amber-500" aria-label={`Nota ${review.rating} de 5`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
      <p className="mt-2 text-sm leading-6 text-[#5f586d]">{review.text}</p>
    </article>
  );
}
