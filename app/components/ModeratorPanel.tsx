"use client";

import { useCallback, useEffect, useState } from "react";
import { Account } from "./account-store";
import {
  getManagedAccounts,
  getManagedModerators,
  getModerationQueue,
  ManagedAccount,
  ManagedModerator,
  ModerationArtwork,
  moderationErrorMessage,
  reviewArtwork,
  setAccountBlocked,
  setModeratorAccess,
} from "./moderation-store";
import MediaImage from "./MediaImage";
import Toast from "./Toast";

export default function ModeratorPanel({ account, isSuperModerator }: { account: Account; isSuperModerator: boolean }) {
  const [artworks, setArtworks] = useState<ModerationArtwork[]>([]);
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [moderators, setModerators] = useState<ManagedModerator[]>([]);
  const [selectedModeratorId, setSelectedModeratorId] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");

  const refresh = useCallback(async () => {
    const [queue, managedAccounts, managedModerators] = await Promise.all([
      getModerationQueue(),
      getManagedAccounts(),
      isSuperModerator ? getManagedModerators() : Promise.resolve([]),
    ]);
    setArtworks(queue);
    setAccounts(managedAccounts);
    setModerators(managedModerators);
    setSelectedModeratorId((current) => current || managedAccounts.find((item) => item.id !== account.id && !item.blocked)?.id || "");
  }, [account.id, isSuperModerator]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void refresh().catch((issue: unknown) => {
        setError(moderationErrorMessage(issue) ?? (issue instanceof Error ? issue.message : "Não foi possível carregar a moderação."));
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });
    return () => { cancelled = true; };
  }, [refresh]);

  async function handleArtworkDecision(artwork: ModerationArtwork, approved: boolean) {
    const reason = reasons[artwork.id] ?? "";
    setWorkingId(artwork.id);
    setError("");
    setSuccess("");
    try {
      await reviewArtwork(artwork.id, approved, reason);
      await refresh();
      setSuccess(approved ? `“${artwork.title}” aprovada e publicada.` : `“${artwork.title}” reprovada.`);
    } catch (issue) {
      setError(moderationErrorMessage(issue) ?? (issue instanceof Error ? issue.message : "Não foi possível revisar a obra."));
    } finally {
      setWorkingId("");
    }
  }

  async function handleBlock(accountToManage: ManagedAccount) {
    const blocked = !accountToManage.blocked;
    const reason = reasons[accountToManage.id] ?? "";
    setWorkingId(accountToManage.id);
    setError("");
    setSuccess("");
    try {
      await setAccountBlocked(accountToManage.id, blocked, reason);
      await refresh();
      setSuccess(blocked ? `A conta de ${accountToManage.name} foi bloqueada.` : `O bloqueio de ${accountToManage.name} foi removido.`);
    } catch (issue) {
      setError(moderationErrorMessage(issue) ?? (issue instanceof Error ? issue.message : "Não foi possível atualizar a conta."));
    } finally {
      setWorkingId("");
    }
  }

  async function handleModeratorAccess(target: ManagedAccount, active: boolean) {
    if (!isSuperModerator) {
      setError("Somente o administrador principal pode gerenciar moderadores.");
      return;
    }
    setWorkingId(target.id);
    setError("");
    setSuccess("");
    try {
      await setModeratorAccess(target.id, active);
      await refresh();
      setSuccess(active
        ? `${target.name} agora tem acesso de moderador.`
        : `O acesso de moderador de ${target.name} foi removido.`);
    } catch (issue) {
      setError(moderationErrorMessage(issue) ?? (issue instanceof Error ? issue.message : "Não foi possível alterar os moderadores."));
    } finally {
      setWorkingId("");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6d28d9]">Área restrita</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Moderação e usuários</h1>
        <p className="mt-2 text-sm leading-6 text-[#475569]">Aprovações e bloqueios são administrativos e não representam uma análise legal ou antifraude automatizada.</p>
      </div>
      {error && <div className="mb-4"><Toast type="error" message={error} /></div>}
      {success && <div className="mb-4"><Toast type="success" message={success} /></div>}
      {loading ? (
        <p role="status" className="rounded-2xl bg-white p-5 text-sm">Carregando fila de moderação...</p>
      ) : (
        <>
          {isSuperModerator && (
            <div className="mb-6 rounded-[24px] border border-[#6d28d9]/15 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">Administrar moderadores</h2>
              <p className="mt-2 text-sm leading-6 text-[#475569]">
                Somente o administrador principal pode conceder ou remover esse acesso. A pessoa precisa ter uma conta PayArt ativa.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <select
                  aria-label="Selecionar pessoa para moderador"
                  value={selectedModeratorId}
                  onChange={(event) => setSelectedModeratorId(event.target.value)}
                  className="min-w-60 flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm"
                >
                  <option value="">Selecione uma conta</option>
                  {accounts
                    .filter((item) => !item.blocked && !moderators.some((moderatorItem) => moderatorItem.id === item.id && moderatorItem.active))
                    .map((item) => (
                      <option key={item.id} value={item.id}>{item.name} · {item.role === "artist" ? "Artista" : "Comprador"}</option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedModeratorId || workingId === selectedModeratorId}
                  onClick={() => {
                    const target = accounts.find((item) => item.id === selectedModeratorId);
                    if (target) void handleModeratorAccess(target, true);
                  }}
                  className="rounded-xl bg-[#6d28d9] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Conceder acesso
                </button>
              </div>
              <ul className="mt-4 divide-y divide-black/5">
                {moderators.filter((item) => item.active).map((item) => {
                  const managed = accounts.find((candidate) => candidate.id === item.id);
                  return (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-semibold">{managed?.name ?? "Conta sem perfil"}</p>
                        <p className="text-xs text-[#746e80]">{item.id}</p>
                      </div>
                      <button
                        type="button"
                        disabled={workingId === item.id}
                        onClick={() => {
                          const target = managed ?? { id: item.id, name: item.id, role: "buyer" as const, blocked: false, reason: "" };
                          void handleModeratorAccess(target, false);
                        }}
                        className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      >
                        Remover acesso
                      </button>
                    </li>
                  );
                })}
              </ul>
              {moderators.every((item) => !item.active) && (
                <p className="mt-3 text-sm text-[#475569]">Ainda não há moderadores adicionais cadastrados.</p>
              )}
            </div>
          )}
          <div className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Obras aguardando aprovação ({artworks.length})</h2>
            {artworks.length === 0 ? (
              <p className="mt-3 text-sm text-[#475569]">Não há obras pendentes.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {artworks.map((artwork) => (
                  <article key={artwork.id} className="flex flex-wrap gap-4 border-t border-black/5 pt-4">
                    <MediaImage src={artwork.image} alt={artwork.title} className="h-24 w-24 rounded-xl bg-white" imageClassName="object-contain p-1" sizes="96px" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold">{artwork.title}</h3>
                      <p className="mt-1 text-sm text-[#475569]">{artwork.category} · {artwork.artistName} · R$ {Number(artwork.price).toFixed(2).replace(".", ",")}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[#475569]">{artwork.description}</p>
                      <label className="mt-3 block text-xs font-semibold">
                        Motivo da reprovação (obrigatório ao reprovar)
                        <textarea
                          value={reasons[artwork.id] ?? ""}
                          onChange={(event) => setReasons((current) => ({ ...current, [artwork.id]: event.target.value }))}
                          maxLength={500}
                          className="mt-1 min-h-16 w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-normal"
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={workingId === artwork.id} onClick={() => void handleArtworkDecision(artwork, true)} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Aprovar e publicar</button>
                        <button type="button" disabled={workingId === artwork.id} onClick={() => void handleArtworkDecision(artwork, false)} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Reprovar</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Contas ({accounts.length})</h2>
            {accounts.length === 0 ? (
              <p className="mt-3 text-sm text-[#475569]">Nenhuma conta encontrada.</p>
            ) : (
              <ul className="mt-3 divide-y divide-black/5">
                {accounts.map((managed) => (
                  <li key={managed.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{managed.name}</p>
                        <p className="text-xs text-[#746e80]">{managed.role === "artist" ? "Artista" : "Comprador"} · {managed.blocked ? "Bloqueada" : "Ativa"}</p>
                        {managed.blocked && managed.reason && <p className="mt-1 text-xs text-red-700">Motivo: {managed.reason}</p>}
                      </div>
                      {managed.id !== account.id && (
                        <button
                          type="button"
                          disabled={workingId === managed.id}
                          onClick={() => void handleBlock(managed)}
                          className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${managed.blocked ? "bg-emerald-700" : "bg-red-700"}`}
                        >
                          {managed.blocked ? "Desbloquear conta" : "Bloquear conta"}
                        </button>
                      )}
                    </div>
                    {!managed.blocked && managed.id !== account.id && (
                      <label className="mt-3 block text-xs font-semibold">
                        Motivo (obrigatório ao bloquear)
                        <input
                          value={reasons[managed.id] ?? ""}
                          onChange={(event) => setReasons((current) => ({ ...current, [managed.id]: event.target.value }))}
                          maxLength={500}
                          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-normal"
                        />
                      </label>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
