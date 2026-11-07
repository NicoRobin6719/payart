import { addDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { Account, isLocalAccount } from "./account-store";
import { firestore } from "./firebase-client";

export const demoCommissionRate = 25;

export type DemoWithdrawal = {
  id: string;
  artistId: string;
  amount: number;
  commissionRate: number;
  createdAt: string;
  status: "simulated";
};

const localWithdrawalsKey = "payart:demo-withdrawals";
const localWithdrawalsUpdatedEvent = "payart:demo-withdrawals-updated";

function parseWithdrawal(value: unknown): DemoWithdrawal {
  if (
    typeof value !== "object"
    || value === null
    || !("id" in value)
    || typeof value.id !== "string"
    || !("artistId" in value)
    || typeof value.artistId !== "string"
    || !("amount" in value)
    || typeof value.amount !== "number"
    || !Number.isFinite(value.amount)
    || value.amount <= 0
    || !("createdAt" in value)
    || typeof value.createdAt !== "string"
  ) {
    throw new Error("Uma solicitação fictícia de saque está incompleta ou inválida.");
  }
  return {
    id: value.id,
    artistId: value.artistId,
    amount: value.amount,
    commissionRate: "commissionRate" in value && typeof value.commissionRate === "number"
      ? value.commissionRate
      : demoCommissionRate,
    createdAt: value.createdAt,
    status: "simulated",
  };
}

function readAllLocalWithdrawals() {
  const stored = window.localStorage.getItem(localWithdrawalsKey);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error("O histórico local de saques fictícios está inválido.");
  return parsed.map(parseWithdrawal);
}

function readLocalWithdrawals(artistId: string) {
  return readAllLocalWithdrawals().filter((withdrawal) => withdrawal.artistId === artistId)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export function subscribeToDemoWithdrawals(
  artistId: string,
  onChange: (withdrawals: DemoWithdrawal[]) => void,
  onError: (error: Error) => void,
) {
  if (isLocalAccount(artistId)) {
    const refresh = () => {
      try {
        onChange(readLocalWithdrawals(artistId));
      } catch (error) {
        onError(error instanceof Error ? error : new Error("Não foi possível carregar o histórico local de saques fictícios."));
      }
    };
    window.addEventListener(localWithdrawalsUpdatedEvent, refresh);
    window.addEventListener("storage", refresh);
    refresh();
    return () => {
      window.removeEventListener(localWithdrawalsUpdatedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }

  return onSnapshot(query(
    collection(firestore, "demoWithdrawals"),
    where("artistId", "==", artistId),
  ), (snapshot) => {
    try {
      onChange(snapshot.docs.map((item) => parseWithdrawal({ id: item.id, ...item.data() }))
        .sort((first, second) => second.createdAt.localeCompare(first.createdAt)));
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Não foi possível ler as solicitações fictícias de saque."));
    }
  }, (error) => onError(error));
}

export async function requestDemoWithdrawal(account: Account, amount: number) {
  if (account.role !== "artist") throw new Error("Somente artistas podem solicitar um saque fictício.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor de saque fictício maior que zero.");
  const withdrawal = {
    artistId: account.id,
    amount: Number(amount.toFixed(2)),
    commissionRate: demoCommissionRate,
    createdAt: new Date().toISOString(),
    status: "simulated" as const,
  };

  if (isLocalAccount(account.id)) {
    const existing = readAllLocalWithdrawals();
    const saved = { ...withdrawal, id: crypto.randomUUID() };
    const all = [...existing, saved];
    window.localStorage.setItem(localWithdrawalsKey, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent(localWithdrawalsUpdatedEvent));
    return saved;
  }

  try {
    const reference = await addDoc(collection(firestore, "demoWithdrawals"), withdrawal);
    return { ...withdrawal, id: reference.id };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "permission-denied") {
      throw new Error("O Firebase bloqueou a solicitação fictícia. Publique as regras atualizadas do Firestore.");
    }
    throw new Error("Não foi possível registrar a solicitação fictícia de saque.");
  }
}
