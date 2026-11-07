import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "./firebase-client";
import { AccountRole, Artwork } from "./account-store";

export type ModerationArtwork = Artwork & {
  artistId: string;
  artistName: string;
  moderationStatus: "pending";
};

export type ManagedAccount = {
  id: string;
  name: string;
  role: AccountRole;
  blocked: boolean;
  reason: string;
};

export type ManagedModerator = {
  id: string;
  active: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function hasModeratorAccess(userId: string) {
  if (await hasSuperModeratorAccess(userId)) return true;
  const snapshot = await getDoc(doc(firestore, "moderators", userId));
  return snapshot.exists() && snapshot.data().active === true;
}

export async function hasSuperModeratorAccess(userId: string) {
  const snapshot = await getDoc(doc(firestore, "superModerators", userId));
  return snapshot.exists() && snapshot.data().active === true;
}

export async function getManagedModerators(): Promise<ManagedModerator[]> {
  const snapshots = await getDocs(collection(firestore, "moderators"));
  return snapshots.docs.map((snapshot) => ({
    id: snapshot.id,
    active: snapshot.data().active === true,
  }));
}

export async function setModeratorAccess(userId: string, active: boolean) {
  if (!userId.trim()) throw new Error("Selecione uma conta para alterar o acesso de moderação.");
  const reference = doc(firestore, "moderators", userId);
  if (active) {
    await setDoc(reference, { active: true });
  } else {
    await deleteDoc(reference);
  }
}

export async function getModerationQueue(): Promise<ModerationArtwork[]> {
  const snapshots = await getDocs(query(
    collection(firestore, "artworks"),
    where("moderationStatus", "==", "pending"),
  ));
  return snapshots.docs.map((snapshot) => {
    const data = snapshot.data();
    if (
      typeof data.artistId !== "string"
      || typeof data.artist !== "string"
      || typeof data.title !== "string"
      || typeof data.price !== "string"
      || typeof data.category !== "string"
    ) {
      throw new Error(`A obra ${snapshot.id} tem dados incompletos para moderação.`);
    }
    return {
      id: snapshot.id,
      title: data.title,
      description: typeof data.description === "string" ? data.description : "",
      category: data.category,
      price: data.price,
      image: typeof data.image === "string" ? data.image : "",
      artistId: data.artistId,
      artistName: data.artist,
      moderationStatus: "pending",
      ...(typeof data.shippingWidth === "number" ? { shippingWidth: data.shippingWidth } : {}),
      ...(typeof data.shippingHeight === "number" ? { shippingHeight: data.shippingHeight } : {}),
      ...(typeof data.shippingLength === "number" ? { shippingLength: data.shippingLength } : {}),
      ...(typeof data.shippingWeight === "number" ? { shippingWeight: data.shippingWeight } : {}),
      isSold: data.isSold === true,
    };
  });
}

export async function reviewArtwork(artworkId: string, approved: boolean, reason: string) {
  if (!approved && reason.trim().length < 3) {
    throw new Error("Informe um motivo com pelo menos 3 caracteres para reprovar a obra.");
  }
  await updateDoc(doc(firestore, "artworks", artworkId), {
    moderationStatus: approved ? "approved" : "rejected",
    moderationReason: approved ? "" : reason.trim().slice(0, 500),
    moderationUpdatedAt: new Date().toISOString(),
  });
}

export async function getManagedAccounts(): Promise<ManagedAccount[]> {
  const [profilesSnapshot, controlsSnapshot] = await Promise.all([
    getDocs(collection(firestore, "profiles")),
    getDocs(collection(firestore, "accountControls")),
  ]);
  const controls = new Map(controlsSnapshot.docs.map((snapshot) => [snapshot.id, snapshot.data()]));
  return profilesSnapshot.docs.flatMap((snapshot) => {
    const data = snapshot.data();
    if (typeof data.name !== "string" || (data.role !== "artist" && data.role !== "buyer")) return [];
    const control = controls.get(snapshot.id);
    return [{
      id: snapshot.id,
      name: data.name,
      role: data.role,
      blocked: control?.blocked === true,
      reason: typeof control?.reason === "string" ? control.reason : "",
    }];
  }).sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
}

export async function setAccountBlocked(userId: string, blocked: boolean, reason: string) {
  if (blocked && reason.trim().length < 3) {
    throw new Error("Informe um motivo com pelo menos 3 caracteres para bloquear a conta.");
  }
  const reference = doc(firestore, "accountControls", userId);
  const snapshot = await getDoc(reference);
  const control = {
    blocked,
    reason: blocked ? reason.trim().slice(0, 500) : "",
    updatedAt: new Date().toISOString(),
  };
  if (snapshot.exists()) {
    await updateDoc(reference, control);
  } else {
    await setDoc(reference, control);
  }
}

export function moderationErrorMessage(error: unknown) {
  if (!isRecord(error) || !("code" in error) || typeof error.code !== "string") return null;
  if (error.code === "permission-denied") {
    return "O Firebase negou a operação. Confirme o nível de acesso desta conta e publique as regras atualizadas do Firestore.";
  }
  return null;
}
