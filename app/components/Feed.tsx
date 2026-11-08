"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Repeat2, Send, Trash2, UserRound } from "lucide-react";
import { Account, getCurrentAccount } from "./account-store";
import {
  createFeedComment,
  createFeedPost,
  createFeedQuotePost,
  deleteFeedComment,
  deleteFeedPost,
  FeedComment,
  FeedPost,
  rankFeedPosts,
  subscribeToFeed,
  subscribeToFeedComments,
  toggleFeedLike,
  toggleFeedRepost,
} from "./feed-store";
import Toast from "./Toast";
import MediaImage from "./MediaImage";

function Avatar({ src, name, size = 44 }: { src: string; name: string; size?: number }) {
  return (
    <div
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#f3e8ff] text-sm font-bold text-[#6d28d9]"
      style={{ width: size, height: size }}
    >
      {src ? (
        <MediaImage src={src} alt={`Foto de ${name}`} className="absolute inset-0 h-full w-full" sizes={`${size}px`} />
      ) : (
        name.trim().slice(0, 1).toUpperCase() || <UserRound size={20} />
      )}
    </div>
  );
}

function formatPostDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "Agora" : parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Feed() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [feedReady, setFeedReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState<"for-you" | "recent">("for-you");
  const [quotePost, setQuotePost] = useState<FeedPost | null>(null);
  const [quoteText, setQuoteText] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const [sendingQuote, setSendingQuote] = useState(false);

  const orderedPosts = sortMode === "recent" ? posts : rankFeedPosts(posts, account?.id ?? null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void getCurrentAccount()
        .then((currentAccount) => {
          if (!cancelled) setAccount(currentAccount);
        })
        .catch((issue) => {
          if (!cancelled) setError(issue instanceof Error ? issue.message : "Não foi possível carregar sua conta.");
        })
        .finally(() => {
          if (!cancelled) setReady(true);
        });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => subscribeToFeed(
    account?.id ?? null,
    (items) => {
      setPosts(items);
      setFeedReady(true);
      setError("");
    },
    (issue) => {
      setFeedReady(true);
      setError(issue.message);
    },
  ), [account?.id]);

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    setSending(true);
    try {
      await createFeedPost(account, text);
      setText("");
      setError("");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Não foi possível publicar.");
    } finally {
      setSending(false);
    }
  }

  async function handleAction(action: () => Promise<void>) {
    try {
      await action();
      setError("");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Não foi possível concluir esta ação.");
    }
  }

  async function handleQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !quotePost) return;
    setSendingQuote(true);
    setQuoteError("");
    try {
      await createFeedQuotePost(quotePost, account, quoteText);
      setQuotePost(null);
      setQuoteText("");
      setError("");
    } catch (issue) {
      setQuoteError(issue instanceof Error ? issue.message : "Não foi possível compartilhar.");
    } finally {
      setSendingQuote(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      <header className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6d28d9]">Comunidade PayArt</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.06em]">Feed</h1>
        <p className="mt-2 text-sm leading-6 text-[#475569]">Compartilhe ideias, descubra artistas e converse sobre arte.</p>
      </header>

      {error && <div className="mb-4"><Toast type="error" message={error} /></div>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" aria-label="Ordenação do feed">
          <button type="button" onClick={() => setSortMode("for-you")} aria-pressed={sortMode === "for-you"} className={`rounded-full px-4 py-2 text-xs font-bold transition ${sortMode === "for-you" ? "bg-[#6d28d9] text-white" : "bg-white text-[#475569] hover:bg-[#f4efff]"}`}>
            Para você
          </button>
          <button type="button" onClick={() => setSortMode("recent")} aria-pressed={sortMode === "recent"} className={`rounded-full px-4 py-2 text-xs font-bold transition ${sortMode === "recent" ? "bg-[#6d28d9] text-white" : "bg-white text-[#475569] hover:bg-[#f4efff]"}`}>
            Recentes
          </button>
        </div>
        {sortMode === "for-you" && <span className="text-xs text-[#746e80]">Relevância, atividade e recência</span>}
      </div>

      {account ? (
        <form onSubmit={handlePublish} className="mb-5 rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Avatar src={account.avatar} name={account.name} />
            <label htmlFor="feed-post" className="sr-only">Escreva uma publicação</label>
            <textarea
              id="feed-post"
              required
              maxLength={500}
              rows={3}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="O que você quer compartilhar sobre arte?"
              className="min-h-24 flex-1 resize-y rounded-xl border border-black/10 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#6d28d9]"
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 pl-14">
            <span className="text-xs text-[#746e80]">{text.length}/500</span>
            <button type="submit" disabled={sending || !text.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:opacity-50">
              <Send size={15} /> {sending ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </form>
      ) : ready ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#e9d5ff] bg-[#faf7ff] p-5">
          <p className="text-sm text-[#475569]">Entre para publicar, curtir, comentar e repostar.</p>
          <Link href="/login?next=%2Ffeed" className="rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-bold text-white">Entrar</Link>
        </div>
      ) : null}

      <div aria-live="polite" className="space-y-4">
        {!feedReady ? (
          <p role="status" className="rounded-[24px] border border-black/5 bg-white p-8 text-center text-sm text-[#475569]">Carregando publicações...</p>
        ) : posts.length === 0 && !error ? (
          <div className="rounded-[24px] border border-black/5 bg-white p-9 text-center">
            <h2 className="font-bold">O feed está começando</h2>
            <p className="mt-2 text-sm text-[#475569]">Seja a primeira pessoa a compartilhar algo com a comunidade.</p>
          </div>
        ) : orderedPosts.map((post) => (
          <FeedPostCard
            key={post.id}
            post={post}
            account={account}
            onAction={handleAction}
            onQuote={(selectedPost) => {
              setQuotePost(selectedPost);
              setQuoteText("");
              setQuoteError("");
            }}
            onSignIn={() => router.push(`/login?next=${encodeURIComponent("/feed")}`)}
          />
        ))}
      </div>

      {quotePost && account && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !sendingQuote) setQuotePost(null);
        }}>
          <form role="dialog" aria-modal="true" aria-labelledby="quote-title" onSubmit={handleQuote} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="quote-title" className="text-xl font-extrabold">Compartilhe com seu comentário</h2>
                <p className="mt-1 text-sm text-[#746e80]">Sua publicação será exibida junto da obra original.</p>
              </div>
              <button type="button" onClick={() => setQuotePost(null)} disabled={sendingQuote} aria-label="Fechar" className="rounded-lg px-2 py-1 text-lg text-[#746e80] hover:bg-black/5">×</button>
            </div>
            {quoteError && <div className="mt-4"><Toast type="error" message={quoteError} /></div>}
            <label htmlFor="feed-quote" className="sr-only">Adicione um comentário ao compartilhamento</label>
            <textarea
              id="feed-quote"
              autoFocus
              required
              maxLength={500}
              rows={3}
              value={quoteText}
              onChange={(event) => setQuoteText(event.target.value)}
              placeholder="O que você pensa sobre esta publicação?"
              className="mt-5 min-h-24 w-full resize-y rounded-xl border border-black/10 px-4 py-3 text-sm leading-6 outline-none focus:border-[#6d28d9]"
            />
            <div className="mt-3 rounded-2xl border border-black/5 bg-[#faf9fc] p-4">
              <div className="flex items-center gap-2">
                <Avatar src={quotePost.type === "repost" ? quotePost.originalAuthorAvatar ?? "" : quotePost.authorAvatar} name={quotePost.type === "repost" ? quotePost.originalAuthorName ?? quotePost.authorName : quotePost.authorName} size={32} />
                <span className="text-sm font-bold">{quotePost.type === "repost" ? quotePost.originalAuthorName : quotePost.authorName}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#475569]">{quotePost.type === "repost" ? quotePost.originalText : quotePost.text}</p>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={sendingQuote} onClick={() => setQuotePost(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#475569] hover:bg-black/5">Cancelar</button>
              <button type="submit" disabled={sendingQuote || !quoteText.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#5b21b6] disabled:opacity-50">
                <Repeat2 size={15} /> {sendingQuote ? "Publicando..." : "Publicar citação"}
              </button>
            </div>
          </form>
        </div>
      )}

      <p className="mt-6 text-center text-xs leading-5 text-[#746e80]">
        As publicações e interações de contas conectadas são sincronizadas em tempo real. Contas em modo local salvam suas atividades somente neste navegador.
      </p>
    </section>
  );
}

function FeedPostCard({
  post,
  account,
  onAction,
  onQuote,
  onSignIn,
}: {
  post: FeedPost;
  account: Account | null;
  onAction: (action: () => Promise<void>) => void;
  onQuote: (post: FeedPost) => void;
  onSignIn: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    if (!showComments) return;
    return subscribeToFeedComments(post.id, setComments, (issue) => setCommentError(issue.message), post.isLocal);
  }, [post.id, post.isLocal, showComments]);

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    try {
      await createFeedComment(post.id, account, commentText, post.isLocal);
      setCommentText("");
      setCommentError("");
    } catch (issue) {
      setCommentError(issue instanceof Error ? issue.message : "Não foi possível enviar o comentário.");
    }
  }

  const isRepost = post.type === "repost";

  return (
    <article className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
      {isRepost && (
        <div className="mb-3 flex items-center justify-between pl-1">
          <p className="flex items-center gap-2 text-xs font-semibold text-[#746e80]">
            <Repeat2 size={14} />
            {post.authorId === account?.id ? "Você citou" : `${post.authorName} citou`}
          </p>
          {account?.id === post.authorId && (
            <button
              type="button"
              aria-label="Excluir repost"
              title="Excluir repost"
              onClick={() => onAction(() => deleteFeedPost(post, account))}
              className="rounded-lg p-2 text-[#746e80] transition hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}
      <div className="flex items-start gap-3">
        {isRepost ? (
          <div className="min-w-0 flex-1 pl-1">
            {post.text.trim() && (
              <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-6">{post.text}</p>
            )}
            <div className="flex items-start gap-3">
              <Avatar src={post.originalAuthorAvatar ?? ""} name={post.originalAuthorName ?? "Artista"} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-bold">{post.originalAuthorName}</span>
                  <time dateTime={post.createdAt} className="text-xs text-[#746e80]">{formatPostDate(post.createdAt)}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{post.originalText}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Avatar src={post.authorAvatar} name={post.authorName} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-bold">{post.authorName}</span>
                <time dateTime={post.createdAt} className="text-xs text-[#746e80]">{formatPostDate(post.createdAt)}</time>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{post.text}</p>
            </div>
          </>
        )}
        {!isRepost && account?.id === post.authorId && (
          <button
            type="button"
            aria-label="Excluir publicação"
            title="Excluir publicação"
            onClick={() => onAction(() => deleteFeedPost(post, account))}
            className="rounded-lg p-2 text-[#746e80] transition hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-black/5 pt-3">
        <button
          type="button"
          onClick={account ? () => onAction(() => toggleFeedLike(post, account)) : onSignIn}
          aria-pressed={post.isLiked}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${post.isLiked ? "bg-pink-50 text-pink-700" : "text-[#475569] hover:bg-black/5"}`}
        >
          <Heart size={16} fill={post.isLiked ? "currentColor" : "none"} /> Curtir <span>{post.likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowComments((current) => !current)}
          aria-expanded={showComments}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${showComments ? "bg-[#f4efff] text-[#6d28d9]" : "text-[#475569] hover:bg-black/5"}`}
        >
          <MessageCircle size={16} /> {showComments ? "Fechar comentários" : "Comentar"} <span>{post.commentCount}</span>
        </button>
        <>
          <button
            type="button"
            onClick={account ? () => onAction(() => toggleFeedRepost(post, account)) : onSignIn}
            aria-pressed={post.isReposted}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${post.isReposted ? "bg-green-50 text-green-700" : "text-[#475569] hover:bg-black/5"}`}
          >
            <Repeat2 size={16} /> {post.isReposted ? "Repostado" : "Repostar"} <span>{post.repostCount}</span>
          </button>
          <button
            type="button"
            onClick={account ? () => onQuote(post) : onSignIn}
            aria-label="Citar publicação com comentário"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#475569] transition hover:bg-black/5"
          >
            <MessageCircle size={16} /> Citar
          </button>
        </>
      </div>

      {showComments && (
        <div className="mt-2 border-t border-black/5 pt-4">
          {commentError && <div className="mb-3"><Toast type="error" message={commentError} /></div>}
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2.5">
                <Avatar src={comment.authorAvatar} name={comment.authorName} size={32} />
                <div className="min-w-0 flex-1 rounded-2xl bg-[#f7f5fa] px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{comment.authorName}</span>
                    <time dateTime={comment.createdAt} className="text-[10px] text-[#746e80]">{formatPostDate(comment.createdAt)}</time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5">{comment.text}</p>
                </div>
                {account?.id === comment.authorId && (
                  <button type="button" aria-label="Excluir comentário" onClick={() => onAction(() => deleteFeedComment(comment, account))} className="rounded-lg p-1.5 text-[#746e80] hover:text-red-700">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {comments.length === 0 && <p className="py-2 text-center text-xs text-[#746e80]">Ainda não há comentários.</p>}
          </div>
          {account ? (
            <form onSubmit={handleComment} className="mt-4 flex gap-2">
              <label htmlFor={`comment-${post.id}`} className="sr-only">Escreva um comentário</label>
              <input
                id={`comment-${post.id}`}
                required
                maxLength={280}
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Escreva um comentário..."
                className="min-w-0 flex-1 rounded-xl border border-black/10 px-3.5 py-2.5 text-xs outline-none focus:border-[#6d28d9]"
              />
              <button type="submit" disabled={!commentText.trim()} aria-label="Enviar comentário" className="rounded-xl bg-[#6d28d9] px-3 text-white disabled:opacity-50">
                <Send size={15} />
              </button>
            </form>
          ) : (
            <button type="button" onClick={onSignIn} className="mt-4 text-xs font-bold text-[#6d28d9]">Entre para comentar</button>
          )}
        </div>
      )}
    </article>
  );
}
