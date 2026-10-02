"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Account, getCurrentAccount, isLocalAccount } from "./account-store";
import { Conversation, replyToConversation, subscribeToConversations } from "./community-store";
import Toast from "./Toast";

export default function MessagesCenter({ account: accountProp }: { account?: Account }) {
  const router = useRouter();
  const [storedAccount, setStoredAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(Boolean(accountProp));
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (accountProp) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void (async () => {
      try {
        const currentAccount = await getCurrentAccount();
        if (currentAccount) setStoredAccount(currentAccount);
        else router.replace(`/login?next=${encodeURIComponent("/mensagens")}`);
      } catch (issue) {
        setError(issue instanceof Error ? issue.message : "Não foi possível carregar sua conta.");
      } finally {
        setReady(true);
      }
      })();
    });
    return () => { cancelled = true; };
  }, [accountProp, router]);

  const account = accountProp ?? storedAccount;

  useEffect(() => {
    if (!account) return;
    return subscribeToConversations(account.id, (items) => {
      setConversations(items);
      setError("");
    }, (issue) => setError(issue.message));
  }, [account]);

  const activeConversation = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0] ?? null;

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !activeConversation) return;
    try {
      await replyToConversation(account, activeConversation, reply);
      setReply("");
      setError("");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Não foi possível enviar sua mensagem.");
    }
  }

  if (!ready || !account) {
    return <p role={error ? "alert" : "status"} className="py-8 text-sm text-[#5f586d]">{error || "Carregando mensagens..."}</p>;
  }

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Comunicação</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Mensagens</h1>
        <p className="mt-2 text-sm text-[#5f586d]">Converse sobre obras diretamente com artistas e interessados.</p>
      </div>
      {error && <div className="mb-4"><Toast type="error" message={error} /></div>}
      {conversations.length === 0 ? (
        <div className="rounded-[24px] border border-black/5 bg-white/80 p-8 text-center">
          <h2 className="text-xl font-bold">Nenhuma conversa ainda</h2>
          <p className="mt-2 text-sm text-[#5f586d]">As conversas sobre obras aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid min-h-[440px] overflow-hidden rounded-[24px] border border-black/5 bg-white/80 shadow-sm md:grid-cols-[260px_1fr]">
          <nav aria-label="Conversas" className="border-b border-black/5 p-3 md:border-b-0 md:border-r">
            {conversations.map((conversation) => (
              <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} aria-current={activeConversation?.id === conversation.id ? "true" : undefined} className={`mb-2 block w-full rounded-xl p-3 text-left transition ${activeConversation?.id === conversation.id ? "bg-[#f4efff]" : "hover:bg-black/5"}`}>
                <span className="block truncate text-sm font-bold">{conversation.otherName}</span>
                <span className="mt-1 block truncate text-xs text-[#746e80]">{conversation.artworkTitle}</span>
                <span className="mt-1 block truncate text-xs text-[#5f586d]">{conversation.messages.at(-1)?.text}</span>
              </button>
            ))}
          </nav>
          {activeConversation && (
            <div className="flex min-w-0 flex-col">
              <div className="border-b border-black/5 px-5 py-4">
                <h2 className="font-bold">{activeConversation.otherName}</h2>
                <p className="mt-1 text-xs text-[#746e80]">Sobre: {activeConversation.artworkTitle}</p>
              </div>
              <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-5">
                {activeConversation.messages.map((message) => {
                  const isOwn = message.fromId === account.id;
                  return (
                    <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <article className={`max-w-[85%] rounded-2xl px-4 py-3 ${isOwn ? "bg-[#5c2df2] text-white" : "bg-[#f3f0ee] text-[#17131f]"}`}>
                        <p className="text-xs font-bold">{message.fromName}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.text}</p>
                        <time dateTime={message.sentAt} className={`mt-2 block text-right text-[10px] ${isOwn ? "text-white/70" : "text-[#746e80]"}`}>{new Date(message.sentAt).toLocaleString("pt-BR")}</time>
                      </article>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleReply} className="border-t border-black/5 p-4">
                <label htmlFor="message-reply" className="sr-only">Escreva uma resposta</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input id="message-reply" required minLength={2} maxLength={1000} value={reply} onChange={(event) => setReply(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#5c2df2]" placeholder="Escreva uma mensagem..." />
                  <button type="submit" className="rounded-xl bg-[#5c2df2] px-5 py-3 text-sm font-bold text-white">Enviar</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      <p className="mt-4 text-xs text-[#746e80]">
        {isLocalAccount(account.id)
          ? "Este perfil está em modo local: as conversas ficam salvas somente neste navegador. Crie o Firestore para sincronizar em tempo real entre dispositivos."
          : "As conversas são atualizadas em tempo real e salvas no Firebase para os participantes autenticados."}
      </p>
    </section>
  );
}
