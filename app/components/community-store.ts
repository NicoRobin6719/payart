import { Account } from "./account-store";
import { PublicArtwork } from "./catalog-store";

const COMMUNITY_KEY = "payart.community";

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

type CommunityData = {
  favorites: Record<string, string[]>;
  reviews: Review[];
  messages: StoredMessage[];
};

function emptyData(): CommunityData {
  return { favorites: {}, reviews: [], messages: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReview(value: unknown): value is Review {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.artworkId === "string"
    && typeof value.accountId === "string"
    && typeof value.accountName === "string"
    && typeof value.rating === "number"
    && Number.isInteger(value.rating)
    && value.rating >= 1
    && value.rating <= 5
    && typeof value.text === "string"
    && typeof value.createdAt === "string";
}

function isStoredMessage(value: unknown): value is StoredMessage {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.artworkId === "string"
    && typeof value.artworkTitle === "string"
    && typeof value.fromId === "string"
    && typeof value.fromName === "string"
    && typeof value.toId === "string"
    && typeof value.toName === "string"
    && typeof value.text === "string"
    && typeof value.sentAt === "string";
}

function readCommunityData(): CommunityData {
  const value = window.localStorage.getItem(COMMUNITY_KEY);
  if (!value) return emptyData();

  try {
    const data: unknown = JSON.parse(value);
    if (!isRecord(data) || !isRecord(data.favorites) || !Array.isArray(data.reviews) || !Array.isArray(data.messages)) {
      throw new Error("Os dados de favoritos e conversas estão em um formato inválido.");
    }
    const favorites: Record<string, string[]> = {};
    for (const [accountId, ids] of Object.entries(data.favorites)) {
      if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
        throw new Error("A lista de favoritos está em um formato inválido.");
      }
      favorites[accountId] = ids;
    }
    if (!data.reviews.every(isReview) || !data.messages.every(isStoredMessage)) {
      throw new Error("Os comentários ou as mensagens estão em um formato inválido.");
    }
    return { favorites, reviews: data.reviews, messages: data.messages };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Não foi possível ler os dados de interação salvos neste navegador.");
    }
    throw error;
  }
}

function saveCommunityData(data: CommunityData) {
  try {
    window.localStorage.setItem(COMMUNITY_KEY, JSON.stringify(data));
  } catch {
    throw new Error("Não foi possível salvar. O armazenamento deste navegador pode estar cheio.");
  }
}

export function getFavoriteIds(accountId: string) {
  return readCommunityData().favorites[accountId] ?? [];
}

export function toggleFavorite(accountId: string, artworkId: string) {
  const data = readCommunityData();
  const favorites = data.favorites[accountId] ?? [];
  const alreadyFavorite = favorites.includes(artworkId);
  data.favorites[accountId] = alreadyFavorite
    ? favorites.filter((id) => id !== artworkId)
    : [...favorites, artworkId];
  saveCommunityData(data);
  return !alreadyFavorite;
}

export function getReviews(artworkId: string) {
  return readCommunityData().reviews
    .filter((review) => review.artworkId === artworkId)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export function saveReview(account: Account, artworkId: string, rating: number, text: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Escolha uma nota entre 1 e 5 estrelas.");
  }
  if (text.trim().length < 3) {
    throw new Error("O comentário deve ter pelo menos 3 caracteres.");
  }

  const data = readCommunityData();
  const existing = data.reviews.find((review) => review.accountId === account.id && review.artworkId === artworkId);
  const review: Review = {
    id: existing?.id ?? window.crypto.randomUUID(),
    artworkId,
    accountId: account.id,
    accountName: account.name,
    rating,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  data.reviews = existing
    ? data.reviews.map((savedReview) => savedReview.id === existing.id ? review : savedReview)
    : [review, ...data.reviews];
  saveCommunityData(data);
  return review;
}

export function sendMessage(account: Account, artwork: PublicArtwork, text: string) {
  if (!artwork.artistId || artwork.artistId === account.id) {
    throw new Error("Não é possível iniciar uma conversa com este perfil.");
  }
  if (text.trim().length < 2) {
    throw new Error("Escreva uma mensagem com pelo menos 2 caracteres.");
  }

  const data = readCommunityData();
  const message: StoredMessage = {
    id: window.crypto.randomUUID(),
    artworkId: artwork.id,
    artworkTitle: artwork.title,
    fromId: account.id,
    fromName: account.name,
    toId: artwork.artistId,
    toName: artwork.artist,
    text: text.trim(),
    sentAt: new Date().toISOString(),
  };
  data.messages = [...data.messages, message];
  saveCommunityData(data);
  return message;
}

export function replyToConversation(account: Account, conversation: Conversation, text: string) {
  if (text.trim().length < 2) {
    throw new Error("Escreva uma mensagem com pelo menos 2 caracteres.");
  }

  const data = readCommunityData();
  const message: StoredMessage = {
    id: window.crypto.randomUUID(),
    artworkId: conversation.artworkId,
    artworkTitle: conversation.artworkTitle,
    fromId: account.id,
    fromName: account.name,
    toId: conversation.otherId,
    toName: conversation.otherName,
    text: text.trim(),
    sentAt: new Date().toISOString(),
  };
  data.messages = [...data.messages, message];
  saveCommunityData(data);
  return message;
}

export function getConversations(accountId: string): Conversation[] {
  const messages = readCommunityData().messages.filter(
    (message) => message.fromId === accountId || message.toId === accountId,
  );
  const conversations = new Map<string, Conversation>();

  for (const message of messages) {
    const otherId = message.fromId === accountId ? message.toId : message.fromId;
    const otherName = message.fromId === accountId ? message.toName : message.fromName;
    const id = `${message.artworkId}:${[accountId, otherId].sort().join(":")}`;
    const existing = conversations.get(id);
    if (existing) {
      existing.messages.push(message);
    } else {
      conversations.set(id, {
        id,
        artworkId: message.artworkId,
        artworkTitle: message.artworkTitle,
        otherId,
        otherName,
        messages: [message],
      });
    }
  }

  return [...conversations.values()]
    .map((conversation) => ({
      ...conversation,
      messages: conversation.messages.sort((first, second) => first.sentAt.localeCompare(second.sentAt)),
    }))
    .sort((first, second) => {
      const firstLast = first.messages.at(-1)?.sentAt ?? "";
      const secondLast = second.messages.at(-1)?.sentAt ?? "";
      return secondLast.localeCompare(firstLast);
    });
}
