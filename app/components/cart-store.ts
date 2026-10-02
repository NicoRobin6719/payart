import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { Account, isLocalAccount } from "./account-store";
import { PublicArtwork } from "./catalog-store";
import { firestore } from "./firebase-client";

export type CartItem = PublicArtwork & { addedAt: string };

const localCartUpdatedEvent = "payart:local-cart-updated";

function localCartKey(accountId: string) {
  return `payart:cart:${accountId}`;
}

function parseCartItem(value: unknown): CartItem {
  if (typeof value !== "object" || value === null) throw new Error("Um item salvo no carrinho está inválido.");
  const data = value as Record<string, unknown>;
  if (
    typeof data.id !== "string"
    || typeof data.title !== "string"
    || typeof data.description !== "string"
    || typeof data.category !== "string"
    || typeof data.price !== "string"
    || typeof data.image !== "string"
    || typeof data.artistId !== "string"
    || typeof data.artist !== "string"
    || typeof data.addedAt !== "string"
  ) throw new Error("Um item salvo no carrinho está incompleto.");
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    price: data.price,
    image: data.image,
    artistId: data.artistId,
    artist: data.artist,
    artistEmail: "",
    addedAt: data.addedAt,
    ...(typeof data.shippingWidth === "number" ? { shippingWidth: data.shippingWidth } : {}),
    ...(typeof data.shippingHeight === "number" ? { shippingHeight: data.shippingHeight } : {}),
    ...(typeof data.shippingLength === "number" ? { shippingLength: data.shippingLength } : {}),
    ...(typeof data.shippingWeight === "number" ? { shippingWeight: data.shippingWeight } : {}),
  };
}

function getLocalCart(accountId: string): CartItem[] {
  const stored = window.localStorage.getItem(localCartKey(accountId));
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error("O carrinho salvo neste navegador está inválido.");
  return parsed.map(parseCartItem);
}

export async function addToCart(account: Account, artwork: PublicArtwork) {
  if (account.role !== "buyer") throw new Error("O carrinho está disponível para contas de comprador.");
  if (!artwork.artistId || artwork.artistId === account.id) throw new Error("Esta obra não está disponível para compra.");
  const item: CartItem = { ...artwork, addedAt: new Date().toISOString() };
  if (isLocalAccount(account.id)) {
    const cart = getLocalCart(account.id).filter((saved) => saved.id !== artwork.id);
    cart.push(item);
    window.localStorage.setItem(localCartKey(account.id), JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent(localCartUpdatedEvent));
    return;
  }

  try {
    await setDoc(doc(firestore, "profiles", account.id, "cart", artwork.id), {
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      price: item.price,
      image: item.image,
      artistId: item.artistId,
      artist: item.artist,
      addedAt: item.addedAt,
      ...(item.shippingWidth ? { shippingWidth: item.shippingWidth } : {}),
      ...(item.shippingHeight ? { shippingHeight: item.shippingHeight } : {}),
      ...(item.shippingLength ? { shippingLength: item.shippingLength } : {}),
      ...(item.shippingWeight ? { shippingWeight: item.shippingWeight } : {}),
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "permission-denied") {
      throw new Error("O Firebase bloqueou o carrinho. Confira se as regras do Firestore foram publicadas.");
    }
    throw new Error("Não foi possível salvar esta obra no carrinho.");
  }
}

export async function removeFromCart(accountId: string, artworkId: string) {
  if (isLocalAccount(accountId)) {
    const cart = getLocalCart(accountId).filter((item) => item.id !== artworkId);
    window.localStorage.setItem(localCartKey(accountId), JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent(localCartUpdatedEvent));
    return;
  }
  await deleteDoc(doc(firestore, "profiles", accountId, "cart", artworkId));
}

export function subscribeToCart(
  accountId: string,
  onChange: (items: CartItem[]) => void,
  onError: (error: Error) => void,
) {
  if (isLocalAccount(accountId)) {
    const refresh = () => {
      try {
        onChange(getLocalCart(accountId));
      } catch (error) {
        onError(error instanceof Error ? error : new Error("Não foi possível carregar o carrinho."));
      }
    };
    window.addEventListener(localCartUpdatedEvent, refresh);
    window.addEventListener("storage", refresh);
    refresh();
    return () => {
      window.removeEventListener(localCartUpdatedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }

  return onSnapshot(collection(firestore, "profiles", accountId, "cart"), (snapshot) => {
    try {
      onChange(snapshot.docs.map((item) => parseCartItem(item.data())));
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Não foi possível ler o carrinho."));
    }
  }, (error) => {
    if (error.code === "permission-denied") onError(new Error("O Firebase bloqueou o carrinho. Confira as regras do Firestore."));
    else onError(error);
  });
}
