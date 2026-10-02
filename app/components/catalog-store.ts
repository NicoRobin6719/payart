import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { firestore } from "./firebase-client";
import { Artwork, getLocalArtistAccounts, localAccountUpdatedEvent } from "./account-store";

export type PublicArtwork = Artwork & {
  artistId: string | null;
  artist: string;
  artistEmail: string;
};

const localSoldArtworksKey = "payart:sold-artworks";

function getLocalSoldArtworkIds() {
  const stored = window.localStorage.getItem(localSoldArtworksKey);
  if (!stored) return new Set<string>();
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) {
    throw new Error("O registro local de obras vendidas está inválido.");
  }
  return new Set(parsed);
}

export function markLocalArtworkSold(artworkId: string) {
  const soldIds = getLocalSoldArtworkIds();
  if (soldIds.has(artworkId)) throw new Error("Esta obra já foi comprada e não está mais disponível.");
  soldIds.add(artworkId);
  window.localStorage.setItem(localSoldArtworksKey, JSON.stringify([...soldIds]));
  window.dispatchEvent(new CustomEvent(localAccountUpdatedEvent));
}

function localArtworks(): PublicArtwork[] {
  return getLocalArtistAccounts().flatMap((artist) => artist.artworks.map((artwork) => ({
    ...artwork,
    artistId: artist.id,
    artist: artist.name,
    artistEmail: "",
  })));
}

function combineArtworks(cloudArtworks: PublicArtwork[] = []) {
  const cloudIds = new Set(cloudArtworks.map((artwork) => artwork.id));
  const soldLocalIds = getLocalSoldArtworkIds();
  return [
    ...cloudArtworks.filter((artwork) => !artwork.isSold),
    ...localArtworks().filter((artwork) => !cloudIds.has(artwork.id) && !soldLocalIds.has(artwork.id)),
  ];
}

function missingDatabase(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "not-found";
}

function publicArtworkFromData(id: string, data: Record<string, unknown>): PublicArtwork {
  if (
    typeof data.title !== "string"
    || typeof data.category !== "string"
    || typeof data.price !== "string"
    || typeof data.artistId !== "string"
    || typeof data.artist !== "string"
  ) {
    throw new Error("Uma obra publicada no Firebase está incompleta ou inválida.");
  }
  return {
    id,
    title: data.title,
    category: data.category,
    price: data.price,
    description: typeof data.description === "string" ? data.description : "",
    image: typeof data.image === "string" ? data.image : "",
    artistId: data.artistId,
    artist: data.artist,
    artistEmail: "",
    isSold: data.isSold === true,
    ...(typeof data.shippingWidth === "number" && Number.isFinite(data.shippingWidth) && data.shippingWidth > 0
      ? { shippingWidth: data.shippingWidth } : {}),
    ...(typeof data.shippingHeight === "number" && Number.isFinite(data.shippingHeight) && data.shippingHeight > 0
      ? { shippingHeight: data.shippingHeight } : {}),
    ...(typeof data.shippingLength === "number" && Number.isFinite(data.shippingLength) && data.shippingLength > 0
      ? { shippingLength: data.shippingLength } : {}),
    ...(typeof data.shippingWeight === "number" && Number.isFinite(data.shippingWeight) && data.shippingWeight > 0
      ? { shippingWeight: data.shippingWeight } : {}),
  };
}

export async function getPublicArtworks(): Promise<PublicArtwork[]> {
  try {
    const snapshots = await getDocs(collection(firestore, "artworks"));
    return combineArtworks(snapshots.docs.map((snapshot) => publicArtworkFromData(snapshot.id, snapshot.data())));
  } catch (error) {
    if (missingDatabase(error)) return combineArtworks();
    throw error;
  }
}

export async function getPublicArtwork(id: string) {
  return (await getPublicArtworks()).find((artwork) => artwork.id === id) ?? null;
}

export function subscribeToPublicArtworks(
  onChange: (artworks: PublicArtwork[]) => void,
  onError: (error: Error) => void,
) {
  let cloudArtworks: PublicArtwork[] = [];
  const refresh = () => onChange(combineArtworks(cloudArtworks));
  const refreshLocal = () => refresh();
  window.addEventListener(localAccountUpdatedEvent, refreshLocal);
  window.addEventListener("storage", refreshLocal);
  refresh();

  const unsubscribe = onSnapshot(collection(firestore, "artworks"), (snapshots) => {
    try {
      cloudArtworks = snapshots.docs.map((snapshot) => publicArtworkFromData(snapshot.id, snapshot.data()));
      refresh();
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Não foi possível ler as obras publicadas."));
    }
  }, (error) => {
    if (missingDatabase(error)) {
      onError(new Error("O Firestore ainda não foi criado. As obras salvas neste navegador aparecem apenas localmente; para sincronizar entre dispositivos, crie o banco e publique as regras."));
      return;
    }
    onError(error);
  });

  return () => {
    unsubscribe();
    window.removeEventListener(localAccountUpdatedEvent, refreshLocal);
    window.removeEventListener("storage", refreshLocal);
  };
}
