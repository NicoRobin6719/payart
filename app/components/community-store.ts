import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  Unsubscribe,
  where,
} from "firebase/firestore";
import { Account, isLocalAccount } from "./account-store";
import { firestore } from "./firebase-client";
import { PublicArtwork } from "./catalog-store";

const localMessagesKey = "payart:local-messages";
const localReviewsKey = "payart:local-reviews";
const localCommunityUpdatedEvent = "payart:local-community-updated";

export type Review = {
  id: string;
  artworkId: string;
  accountId: string;
  accountName: string;
  rating: number;
  text: string;
  createdAt: string;
};

export type StoredMessage = {
  id: string;
  artworkId: string;
  artworkTitle: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  text: string;
  sentAt: string;
};

export type Conversation = {
  id: string;
  artworkId: string;
  artworkTitle: string;
  otherId: string;
  otherName: string;
  messages: StoredMessage[];
};

function explainFirestoreError(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error) || typeof error.code !== "string") {
    return null;
  }
  if (error.code === "permission-denied") return "O Firebase bloqueou esta operação. Confira as regras do Firestore e sua sessão.";
  if (error.code === "unavailable") return "O Firebase está temporariamente indisponível. Tente novamente.";
  return null;
}

function reviewFromData(id: string, data: Record<string, unknown>): Review {
  if (
    typeof data.artworkId !== "string"
    || typeof data.accountId !== "string"
    || typeof data.accountName !== "string"
    || typeof data.rating !== "number"
    || typeof data.text !== "string"
    || typeof data.createdAt !== "string"
  ) {
    throw new Error("Uma avaliação salva no Firebase está incompleta ou inválida.");
  }
  return { id, artworkId: data.artworkId, accountId: data.accountId, accountName: data.accountName, rating: data.rating, text: data.text, createdAt: data.createdAt };
}

function messageFromData(id: string, data: Record<string, unknown>): StoredMessage {
  if (
    typeof data.artworkId !== "string"
    || typeof data.artworkTitle !== "string"
    || typeof data.fromId !== "string"
    || typeof data.fromName !== "string"
    || typeof data.toId !== "string"
    || typeof data.toName !== "string"
    || typeof data.text !== "string"
    || typeof data.sentAt !== "string"
  ) {
    throw new Error("Uma mensagem salva no Firebase está incompleta ou inválida.");
  }
  return { id, artworkId: data.artworkId, artworkTitle: data.artworkTitle, fromId: data.fromId, fromName: data.fromName, toId: data.toId, toName: data.toName, text: data.text, sentAt: data.sentAt };
}

function conversationId(artworkId: string, firstId: string, secondId: string) {
  return `${artworkId}__${[firstId, secondId].sort().join("__")}`;
}

function isMissingDatabase(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "not-found";
}

function readLocalMessages(): StoredMessage[] {
  const stored = window.localStorage.getItem(localMessagesKey);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error("O armazenamento local de mensagens está inválido.");
  return parsed as StoredMessage[];
}

function localConversationsFor(accountId: string): Conversation[] {
  const messages = readLocalMessages().filter((message) => message.fromId === accountId || message.toId === accountId);
  const grouped = new Map<string, Conversation>();
  for (const message of messages) {
    const otherId = message.fromId === accountId ? message.toId : message.fromId;
    const otherName = message.fromId === accountId ? message.toName : message.fromName;
    const id = conversationId(message.artworkId, accountId, otherId);
    const conversation = grouped.get(id) ?? {
      id,
      artworkId: message.artworkId,
      artworkTitle: message.artworkTitle,
      otherId,
      otherName,
      messages: [],
    };
    conversation.messages.push(message);
    grouped.set(id, conversation);
  }
  return [...grouped.values()]
    .map((conversation) => ({ ...conversation, messages: conversation.messages.sort((a, b) => a.sentAt.localeCompare(b.sentAt)) }))
    .sort((a, b) => (b.messages.at(-1)?.sentAt ?? "").localeCompare(a.messages.at(-1)?.sentAt ?? ""));
}

function localReviews(): Review[] {
  const stored = window.localStorage.getItem(localReviewsKey);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error("O armazenamento local de avaliações está inválido.");
  return parsed as Review[];
}

async function saveConversationMessage(message: Omit<StoredMessage, "id">) {
  if (isLocalAccount(message.fromId) || isLocalAccount(message.toId)) {
    const saved = { ...message, id: crypto.randomUUID() };
    const messages = readLocalMessages();
    messages.push(saved);
    window.localStorage.setItem(localMessagesKey, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent(localCommunityUpdatedEvent));
    return saved;
  }
  const participants = [message.fromId, message.toId].sort();
  const id = conversationId(message.artworkId, message.fromId, message.toId);
  const conversationRef = doc(firestore, "conversations", id);
  await setDoc(conversationRef, {
    artworkId: message.artworkId,
    artworkTitle: message.artworkTitle,
    participants,
    participantNames: {
      [message.fromId]: message.fromName,
      [message.toId]: message.toName,
    },
  }, { merge: true });
  const messageRef = await addDoc(collection(conversationRef, "messages"), message);
  return { id: messageRef.id, ...message };
}

export async function getFavoriteIds(accountId: string) {
  if (isLocalAccount(accountId)) {
    const stored = window.localStorage.getItem(`payart:favorites:${accountId}`);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) {
      throw new Error("O armazenamento local de favoritos está inválido.");
    }
    return parsed;
  }
  try {
    const favorites = await getDocs(collection(firestore, "profiles", accountId, "favorites"));
    return favorites.docs.map((snapshot) => snapshot.id);
  } catch (error) {
    throw new Error(explainFirestoreError(error) ?? "Não foi possível carregar os favoritos do Firebase.");
  }
}

export async function toggleFavorite(accountId: string, artworkId: string) {
  if (isLocalAccount(accountId)) {
    const favorites = await getFavoriteIds(accountId);
    const updated = favorites.includes(artworkId)
      ? favorites.filter((id) => id !== artworkId)
      : [...favorites, artworkId];
    window.localStorage.setItem(`payart:favorites:${accountId}`, JSON.stringify(updated));
    return updated.includes(artworkId);
  }
  const favoriteRef = doc(firestore, "profiles", accountId, "favorites", artworkId);
  try {
    const favorites = await getDocs(collection(firestore, "profiles", accountId, "favorites"));
    const alreadyFavorite = favorites.docs.some((snapshot) => snapshot.id === artworkId);
    if (alreadyFavorite) await deleteDoc(favoriteRef);
    else await setDoc(favoriteRef, { artworkId, createdAt: new Date().toISOString() });
    return !alreadyFavorite;
  } catch (error) {
    throw new Error(explainFirestoreError(error) ?? "Não foi possível atualizar os favoritos no Firebase.");
  }
}

export async function getReviews(artworkId: string) {
  try {
    const reviews = await getDocs(query(collection(firestore, "reviews"), where("artworkId", "==", artworkId)));
    const cloudReviews = reviews.docs
      .map((snapshot) => reviewFromData(snapshot.id, snapshot.data()))
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    const cloudIds = new Set(cloudReviews.map((review) => review.id));
    return [...cloudReviews, ...localReviews().filter((review) => review.artworkId === artworkId && !cloudIds.has(review.id))]
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  } catch (error) {
    if (isMissingDatabase(error)) return localReviews().filter((review) => review.artworkId === artworkId);
    throw new Error(explainFirestoreError(error) ?? "Não foi possível carregar as avaliações do Firebase.");
  }
}

export async function saveReview(account: Account, artworkId: string, rating: number, text: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Escolha uma nota entre 1 e 5 estrelas.");
  }
  if (text.trim().length < 3 || text.trim().length > 1000) {
    throw new Error("O comentário deve ter entre 3 e 1000 caracteres.");
  }

  const id = `${account.id}__${artworkId}`;
  const review: Review = {
    id,
    artworkId,
    accountId: account.id,
    accountName: account.name,
    rating,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  if (isLocalAccount(account.id)) {
    const reviews = localReviews().filter((item) => item.id !== id);
    reviews.push(review);
    window.localStorage.setItem(localReviewsKey, JSON.stringify(reviews));
    return review;
  }
  try {
    await setDoc(doc(firestore, "reviews", id), review);
    return review;
  } catch (error) {
    throw new Error(explainFirestoreError(error) ?? "Não foi possível publicar a avaliação no Firebase.");
  }
}

export async function sendMessage(account: Account, artwork: PublicArtwork, text: string) {
  if (!artwork.artistId || artwork.artistId === account.id) {
    throw new Error("Não é possível iniciar uma conversa com este perfil.");
  }
  if (text.trim().length < 2 || text.trim().length > 1000) {
    throw new Error("A mensagem deve ter entre 2 e 1000 caracteres.");
  }

  try {
    return await saveConversationMessage({
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      fromId: account.id,
      fromName: account.name,
      toId: artwork.artistId,
      toName: artwork.artist,
      text: text.trim(),
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    throw new Error(explainFirestoreError(error) ?? "Não foi possível enviar a mensagem ao Firebase.");
  }
}

export async function replyToConversation(account: Account, conversation: Conversation, text: string) {
  if (text.trim().length < 2 || text.trim().length > 1000) {
    throw new Error("A mensagem deve ter entre 2 e 1000 caracteres.");
  }

  try {
    return await saveConversationMessage({
      artworkId: conversation.artworkId,
      artworkTitle: conversation.artworkTitle,
      fromId: account.id,
      fromName: account.name,
      toId: conversation.otherId,
      toName: conversation.otherName,
      text: text.trim(),
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    throw new Error(explainFirestoreError(error) ?? "Não foi possível enviar a resposta ao Firebase.");
  }
}

export async function getConversations(accountId: string): Promise<Conversation[]> {
  if (isLocalAccount(accountId)) return localConversationsFor(accountId);
  try {
    const conversations = await getDocs(query(
      collection(firestore, "conversations"),
      where("participants", "array-contains", accountId),
    ));

    return await Promise.all(conversations.docs.map(async (snapshot) => {
      const data = snapshot.data();
      if (
        typeof data.artworkId !== "string"
        || typeof data.artworkTitle !== "string"
        || !Array.isArray(data.participants)
        || !data.participants.every((participant) => typeof participant === "string")
        || typeof data.participantNames !== "object"
        || data.participantNames === null
      ) {
        throw new Error("Uma conversa salva no Firebase está incompleta ou inválida.");
      }
      const otherId = data.participants.find((participant) => participant !== accountId);
      if (!otherId) return null;
      const names = data.participantNames as Record<string, unknown>;
      const otherName = names[otherId];
      if (typeof otherName !== "string") throw new Error("O nome do participante está inválido.");
      const messagesSnapshot = await getDocs(collection(snapshot.ref, "messages"));
      const messages = messagesSnapshot.docs
        .map((message) => messageFromData(message.id, message.data()))
        .sort((first, second) => first.sentAt.localeCompare(second.sentAt));
      return {
        id: snapshot.id,
        artworkId: data.artworkId,
        artworkTitle: data.artworkTitle,
        otherId,
        otherName,
        messages,
      };
    })).then((results) => results.filter((conversation): conversation is Conversation => conversation !== null))
      .then((results) => results.sort((first, second) => {
        const firstLast = first.messages.at(-1)?.sentAt ?? "";
        const secondLast = second.messages.at(-1)?.sentAt ?? "";
        return secondLast.localeCompare(firstLast);
      }));
  } catch (error) {
    if (isMissingDatabase(error)) return localConversationsFor(accountId);
    throw new Error(explainFirestoreError(error) ?? "Não foi possível carregar as conversas do Firebase.");
  }
}

export function subscribeToConversations(
  accountId: string,
  onChange: (conversations: Conversation[]) => void,
  onError: (error: Error) => void,
): () => void {
  if (isLocalAccount(accountId)) {
    const refresh = () => {
      try {
        onChange(localConversationsFor(accountId));
      } catch (error) {
        onError(error instanceof Error ? error : new Error("Não foi possível ler as conversas locais."));
      }
    };
    window.addEventListener(localCommunityUpdatedEvent, refresh);
    window.addEventListener("storage", refresh);
    refresh();
    return () => {
      window.removeEventListener(localCommunityUpdatedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }

  const conversations = new Map<string, { artworkId: string; artworkTitle: string; otherId: string; otherName: string }>();
  const messages = new Map<string, StoredMessage[]>();
  const messageListeners = new Map<string, Unsubscribe>();
  const publish = () => onChange([...conversations.entries()].map(([id, conversation]) => ({
    id,
    ...conversation,
    messages: (messages.get(id) ?? []).slice().sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
  })).sort((a, b) => (b.messages.at(-1)?.sentAt ?? "").localeCompare(a.messages.at(-1)?.sentAt ?? "")));

  const unsubscribeConversations = onSnapshot(query(
    collection(firestore, "conversations"),
    where("participants", "array-contains", accountId),
  ), (snapshots) => {
    const activeIds = new Set<string>();
    try {
      for (const snapshot of snapshots.docs) {
        const data = snapshot.data();
        if (
          typeof data.artworkId !== "string"
          || typeof data.artworkTitle !== "string"
          || !Array.isArray(data.participants)
          || !data.participants.every((participant) => typeof participant === "string")
          || typeof data.participantNames !== "object"
          || data.participantNames === null
        ) throw new Error("Uma conversa salva no Firebase está incompleta ou inválida.");
        const otherId = data.participants.find((participant) => participant !== accountId);
        if (!otherId) continue;
        const names = data.participantNames as Record<string, unknown>;
        if (typeof names[otherId] !== "string") throw new Error("O nome do participante está inválido.");
        activeIds.add(snapshot.id);
        conversations.set(snapshot.id, {
          artworkId: data.artworkId,
          artworkTitle: data.artworkTitle,
          otherId,
          otherName: names[otherId],
        });
        if (!messageListeners.has(snapshot.id)) {
          const unsubscribeMessages = onSnapshot(collection(snapshot.ref, "messages"), (messageSnapshots) => {
            try {
              messages.set(snapshot.id, messageSnapshots.docs.map((message) => messageFromData(message.id, message.data())));
              publish();
            } catch (error) {
              onError(error instanceof Error ? error : new Error("Não foi possível ler as mensagens."));
            }
          }, onError);
          messageListeners.set(snapshot.id, unsubscribeMessages);
        }
      }
      for (const [id, unsubscribe] of messageListeners) {
        if (!activeIds.has(id)) {
          unsubscribe();
          messageListeners.delete(id);
          conversations.delete(id);
          messages.delete(id);
        }
      }
      publish();
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Não foi possível carregar as conversas."));
    }
  }, (error) => {
    if (isMissingDatabase(error)) onError(new Error("O Firestore ainda não foi criado; o chat em nuvem ficará disponível após criar o banco e publicar as regras."));
    else onError(error);
  });

  return () => {
    unsubscribeConversations();
    for (const unsubscribe of messageListeners.values()) unsubscribe();
  };
}
