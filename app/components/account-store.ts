import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { firebaseAuth, firestore } from "./firebase-client";

export type AccountRole = "artist" | "buyer";

export type Artwork = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  image: string;
  isSold?: boolean;
  shippingWidth?: number;
  shippingHeight?: number;
  shippingLength?: number;
  shippingWeight?: number;
};

export type DeliveryAddress = {
  recipient: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type ImagePosition = { x: number; y: number };

const defaultImagePosition: ImagePosition = { x: 50, y: 50 };

export const emptyDeliveryAddress: DeliveryAddress = {
  recipient: "",
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

export type Account = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AccountRole;
  bio: string;
  avatar: string;
  banner: string;
  avatarPosition: ImagePosition;
  bannerPosition: ImagePosition;
  pixKey: string;
  deliveryAddress: DeliveryAddress;
  artworks: Artwork[];
  storageMode?: "local";
};

type PublicProfile = Pick<Account, "name" | "role" | "bio" | "avatar" | "banner" | "avatarPosition" | "bannerPosition">;
type PrivateProfile = Pick<Account, "email" | "phone" | "pixKey" | "deliveryAddress">;
const localAccountPrefix = "payart:account:";
const cloudAccountPrefix = "payart:cloud-account:";
export const localAccountUpdatedEvent = "payart:local-account-updated";
const profileTimeoutMessage = "O Firestore não respondeu. Verifique se o banco foi criado e tente novamente.";

function isAccountRole(value: unknown): value is AccountRole {
  return value === "artist" || value === "buyer";
}

function profileFromData(id: string, data: Record<string, unknown>): PublicProfile {
  if (typeof data.name !== "string" || !isAccountRole(data.role)) {
    throw new Error("O perfil salvo no Firebase está incompleto ou inválido.");
  }
  return {
    name: data.name,
    role: data.role,
    bio: typeof data.bio === "string" ? data.bio : "",
    avatar: typeof data.avatar === "string" ? data.avatar : "",
    banner: typeof data.banner === "string" ? data.banner : "",
    avatarPosition: imagePositionFromData(data.avatarPosition),
    bannerPosition: imagePositionFromData(data.bannerPosition),
  };
}

function imagePositionFromData(value: unknown): ImagePosition {
  if (!isRecord(value)) return { ...defaultImagePosition };
  const x = typeof value.x === "number" && Number.isFinite(value.x) ? value.x : defaultImagePosition.x;
  const y = typeof value.y === "number" && Number.isFinite(value.y) ? value.y : defaultImagePosition.y;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}

function privateProfileFromData(data: Record<string, unknown>): PrivateProfile {
  const address = isRecord(data.deliveryAddress) ? data.deliveryAddress : {};
  return {
    email: typeof data.email === "string" ? data.email : "",
    phone: typeof data.phone === "string" ? data.phone : "",
    pixKey: typeof data.pixKey === "string" ? data.pixKey : "",
    deliveryAddress: {
      recipient: typeof address.recipient === "string" ? address.recipient : "",
      postalCode: typeof address.postalCode === "string" ? address.postalCode : "",
      street: typeof address.street === "string" ? address.street : "",
      number: typeof address.number === "string" ? address.number : "",
      complement: typeof address.complement === "string" ? address.complement : "",
      neighborhood: typeof address.neighborhood === "string" ? address.neighborhood : "",
      city: typeof address.city === "string" ? address.city : "",
      state: typeof address.state === "string" ? address.state : "",
    },
  };
}

function artworkFromData(id: string, data: Record<string, unknown>): Artwork {
  if (
    typeof data.title !== "string"
    || typeof data.category !== "string"
    || typeof data.price !== "string"
    || typeof data.artistId !== "string"
  ) {
    throw new Error("Uma obra salva no Firebase está incompleta ou inválida.");
  }

  return {
    id,
    title: data.title,
    category: data.category,
    price: data.price,
    description: typeof data.description === "string" ? data.description : "",
    image: typeof data.image === "string" ? data.image : "",
    isSold: data.isSold === true,
    ...(isPositiveNumber(data.shippingWidth) ? { shippingWidth: data.shippingWidth } : {}),
    ...(isPositiveNumber(data.shippingHeight) ? { shippingHeight: data.shippingHeight } : {}),
    ...(isPositiveNumber(data.shippingLength) ? { shippingLength: data.shippingLength } : {}),
    ...(isPositiveNumber(data.shippingWeight) ? { shippingWeight: data.shippingWeight } : {}),
  };
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function accountFromParts(
  id: string,
  profile: PublicProfile,
  privateProfile: PrivateProfile,
  artworks: Artwork[],
): Account {
  return { id, ...profile, ...privateProfile, artworks };
}

function saveLocalAccount(account: Account) {
  if (typeof window === "undefined") {
    throw new Error("Não foi possível salvar o perfil neste navegador.");
  }
  window.localStorage.setItem(`${localAccountPrefix}${account.id}`, JSON.stringify(account));
  window.dispatchEvent(new CustomEvent(localAccountUpdatedEvent));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getLocalAccount(id: string): Account | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(`${localAccountPrefix}${id}`);
  if (!stored) return null;

  const data: unknown = JSON.parse(stored);
  if (!isRecord(data) || typeof data.name !== "string" || !isAccountRole(data.role)) {
    throw new Error("O perfil salvo neste navegador está inválido.");
  }
  const profile = profileFromData(id, data);
  const privateProfile = privateProfileFromData(data);
  const artworks = Array.isArray(data.artworks)
    ? data.artworks.map((artwork) => {
        if (!isRecord(artwork) || typeof artwork.id !== "string") {
          throw new Error("Uma obra salva neste navegador está inválida.");
        }
        return artworkFromData(artwork.id, artwork);
      })
    : [];
  return {
    ...accountFromParts(id, profile, privateProfile, artworks),
    ...(window.localStorage.getItem(`${cloudAccountPrefix}${id}`) === "true" ? {} : { storageMode: "local" as const }),
  };
}

export function isLocalAccount(id: string) {
  return typeof window !== "undefined"
    && Boolean(window.localStorage.getItem(`${localAccountPrefix}${id}`))
    && window.localStorage.getItem(`${cloudAccountPrefix}${id}`) !== "true";
}

export function getLocalArtistAccounts(): Account[] {
  if (typeof window === "undefined") return [];
  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith(localAccountPrefix))
    .map((key) => getLocalAccount(key.slice(localAccountPrefix.length)))
    .filter((account): account is Account => account?.role === "artist")
    .map((account) => ({ ...account, email: "", phone: "", pixKey: "", deliveryAddress: { ...emptyDeliveryAddress } }));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function isProfileStoreUnavailable(error: unknown) {
  if (error instanceof Error && error.message === profileTimeoutMessage) return true;
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return error.code === "unavailable" || error.code === "not-found" || error.code === "permission-denied";
}

async function getArtistArtworks(artistId: string) {
  const snapshots = await getDocs(query(collection(firestore, "artworks"), where("artistId", "==", artistId)));
  return snapshots.docs.map((snapshot) => artworkFromData(snapshot.id, snapshot.data()));
}

async function getAccountById(id: string) {
  const [profileSnapshot, privateSnapshot] = await withTimeout(
    Promise.all([
      getDoc(doc(firestore, "profiles", id)),
      getDoc(doc(firestore, "privateUsers", id)),
    ]),
    8000,
    profileTimeoutMessage,
  );

  if (!profileSnapshot.exists() || !privateSnapshot.exists()) return null;
  const profile = profileFromData(id, profileSnapshot.data());
  const privateProfile = privateProfileFromData(privateSnapshot.data());
  const artworks = profile.role === "artist" ? await getArtistArtworks(id) : [];
  return accountFromParts(id, profile, privateProfile, artworks);
}

function explainAuthError(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  const code = error.code;
  if (typeof code !== "string") return null;

  const messages: Record<string, string> = {
    "auth/email-already-in-use": "Já existe uma conta cadastrada com este e-mail.",
    "auth/invalid-credential": "E-mail ou senha inválidos.",
    "auth/invalid-email": "O e-mail informado é inválido.",
    "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
    "auth/network-request-failed": "Não foi possível conectar ao Firebase. Verifique sua internet e tente novamente.",
    "auth/operation-not-allowed": "O login por e-mail e senha ainda não está ativado no Firebase Authentication.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco antes de tentar novamente.",
    "permission-denied": "O Firebase bloqueou esta operação. Confira as regras de segurança do Firestore.",
    "unavailable": "O Firebase está temporariamente indisponível. Tente novamente.",
  };
  return messages[code] ?? null;
}

function isMissingFirestoreDatabase(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "not-found";
}

export async function getAccounts(): Promise<Account[]> {
  let profiles;
  let artworkSnapshots;
  try {
    profiles = await getDocs(collection(firestore, "profiles"));
    artworkSnapshots = await getDocs(collection(firestore, "artworks"));
  } catch (error) {
    if (isMissingFirestoreDatabase(error)) return getLocalArtistAccounts();
    throw new Error(explainAuthError(error) ?? "Não foi possível carregar os perfis de artistas do Firebase.");
  }
  const artists = profiles.docs
    .map((snapshot) => ({ id: snapshot.id, profile: profileFromData(snapshot.id, snapshot.data()) }))
    .filter((entry) => entry.profile.role === "artist");

  const artworksByArtist = new Map<string, Artwork[]>();
  for (const snapshot of artworkSnapshots.docs) {
    const artworkData = snapshot.data();
    if (typeof artworkData.artistId !== "string") continue;
    const artistArtworks = artworksByArtist.get(artworkData.artistId) ?? [];
    artistArtworks.push(artworkFromData(snapshot.id, artworkData));
    artworksByArtist.set(artworkData.artistId, artistArtworks);
  }

  const cloudArtists = artists.map(({ id, profile }) => accountFromParts(
    id,
    profile,
    { email: "", phone: "", pixKey: "", deliveryAddress: { ...emptyDeliveryAddress } },
    artworksByArtist.get(id) ?? [],
  ));
  const cloudIds = new Set(cloudArtists.map((artist) => artist.id));
  return [...cloudArtists, ...getLocalArtistAccounts().filter((artist) => !cloudIds.has(artist.id))];
}

export async function createAccount(
  account: Pick<Account, "name" | "email" | "phone" | "role">,
  password: string,
) {
  let user;
  try {
    ({ user } = await createUserWithEmailAndPassword(firebaseAuth, account.email.trim(), password));
  } catch (error) {
    throw new Error(explainAuthError(error) ?? "Não foi possível criar a conta no Firebase Authentication.");
  }

  const profile: PublicProfile = {
    name: account.name.trim(),
    role: account.role,
    bio: "",
    avatar: "",
    banner: "",
    avatarPosition: { ...defaultImagePosition },
    bannerPosition: { ...defaultImagePosition },
  };
  const privateProfile: PrivateProfile = {
    email: account.email.trim(),
    phone: account.phone,
    pixKey: "",
    deliveryAddress: { ...emptyDeliveryAddress },
  };

  try {
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, "profiles", user.uid), profile);
    batch.set(doc(firestore, "privateUsers", user.uid), privateProfile);
    await withTimeout(
      batch.commit(),
      8000,
      profileTimeoutMessage,
    );
  } catch (error) {
    if (isProfileStoreUnavailable(error)) {
      const localAccount = {
        ...accountFromParts(user.uid, profile, privateProfile, []),
        storageMode: "local" as const,
      };
      try {
        saveLocalAccount(localAccount);
      } catch (storageError) {
        await deleteUser(user);
        throw storageError;
      }
      return localAccount;
    }
    try {
      await deleteUser(user);
    } catch {
      throw new Error("A autenticação foi criada, mas o perfil não pôde ser salvo no Firestore. Exclua o usuário incompleto no Firebase Authentication e verifique as regras do Firestore.");
    }
    throw new Error(
      explainAuthError(error)
      ?? (error instanceof Error ? error.message : "Não foi possível salvar o perfil no Firestore."),
    );
  }

  return accountFromParts(user.uid, profile, privateProfile, []);
}

export async function authenticate(email: string, password: string) {
  let user;
  try {
    ({ user } = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password));
  } catch (error) {
    throw new Error(explainAuthError(error) ?? "Não foi possível entrar com esta conta Firebase.");
  }

  const localAccount = getLocalAccount(user.uid);
  if (localAccount) return localAccount;

  let account = await getAccountById(user.uid);
  if (!account) account = getLocalAccount(user.uid);
  if (!account) {
    await firebaseSignOut(firebaseAuth);
    throw new Error("O login funcionou, mas o perfil não está salvo neste navegador nem no Firestore. Configure o Firestore para acessar este perfil.");
  }
  return account;
}

export async function getCurrentAccount() {
  await firebaseAuth.authStateReady();
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  const localAccount = getLocalAccount(user.uid);
  if (localAccount) return localAccount;
  return getAccountById(user.uid);
}

async function saveArtworks(account: Account) {
  if (account.role !== "artist") return;

  const artworkCollection = collection(firestore, "artworks");
  const existing = await getDocs(query(artworkCollection, where("artistId", "==", account.id)));
  const savedIds = new Set(account.artworks.map((artwork) => artwork.id));
  const writes = [
    ...account.artworks.map((artwork) => ({
      id: artwork.id,
      data: {
        title: artwork.title,
        description: artwork.description,
        category: artwork.category,
        price: artwork.price,
        image: artwork.image,
        ...(artwork.shippingWidth ? { shippingWidth: artwork.shippingWidth } : {}),
        ...(artwork.shippingHeight ? { shippingHeight: artwork.shippingHeight } : {}),
        ...(artwork.shippingLength ? { shippingLength: artwork.shippingLength } : {}),
        ...(artwork.shippingWeight ? { shippingWeight: artwork.shippingWeight } : {}),
        artistId: account.id,
        artist: account.name,
      },
      remove: false,
    })),
    ...existing.docs
      .filter((snapshot) => !savedIds.has(snapshot.id))
      .map((snapshot) => ({ id: snapshot.id, data: {}, remove: true })),
  ];

  for (let index = 0; index < writes.length; index += 400) {
    const batch = writeBatch(firestore);
    for (const write of writes.slice(index, index + 400)) {
      const reference = doc(artworkCollection, write.id);
      if (write.remove) batch.delete(reference);
      else batch.set(reference, write.data, { merge: true });
    }
    if (writes.length > 0) await batch.commit();
  }
}

export async function updateAccount(updatedAccount: Account): Promise<Account> {
  const user = firebaseAuth.currentUser;
  if (!user || user.uid !== updatedAccount.id) {
    throw new Error("Sua sessão Firebase expirou. Entre novamente para salvar as alterações.");
  }

  try {
    await Promise.all([
      setDoc(doc(firestore, "profiles", user.uid), {
        name: updatedAccount.name,
        role: updatedAccount.role,
        bio: updatedAccount.bio,
        avatar: updatedAccount.avatar,
        banner: updatedAccount.banner,
        avatarPosition: imagePositionFromData(updatedAccount.avatarPosition),
        bannerPosition: imagePositionFromData(updatedAccount.bannerPosition),
      }),
      setDoc(doc(firestore, "privateUsers", user.uid), {
        email: updatedAccount.email,
        phone: updatedAccount.phone,
        pixKey: updatedAccount.pixKey,
        deliveryAddress: updatedAccount.deliveryAddress,
      }),
    ]);
    await saveArtworks(updatedAccount);
  } catch (error) {
    throw new Error(explainAuthError(error) ?? "Não foi possível salvar no Firebase. Confira as regras de segurança e tente novamente.");
  }

  const cloudAccount: Account = { ...updatedAccount, storageMode: undefined };
  if (updatedAccount.storageMode === "local" || typeof window !== "undefined" && window.localStorage.getItem(`${cloudAccountPrefix}${user.uid}`) === "true") {
    window.localStorage.setItem(`${cloudAccountPrefix}${user.uid}`, "true");
    saveLocalAccount(cloudAccount);
  }
  return cloudAccount;
}

export async function saveBuyerDeliveryAddress(account: Account, deliveryAddress: DeliveryAddress) {
  if (account.role !== "buyer") throw new Error("O endereço de entrega só pode ser salvo em uma conta de comprador.");
  const user = firebaseAuth.currentUser;
  if (!user || user.uid !== account.id) {
    throw new Error("Sua sessão Firebase expirou. Entre novamente para salvar o endereço.");
  }

  if (isLocalAccount(account.id)) {
    const updatedAccount = { ...account, deliveryAddress };
    saveLocalAccount(updatedAccount);
    return updatedAccount;
  }

  try {
    await setDoc(doc(firestore, "privateUsers", user.uid), { deliveryAddress }, { merge: true });
  } catch (error) {
    throw new Error(explainAuthError(error) ?? "Não foi possível salvar o endereço no Firebase. Tente novamente.");
  }
  return { ...account, deliveryAddress };
}

export async function signOut() {
  await firebaseSignOut(firebaseAuth);
}

export function requireFirebaseUserId() {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Entre na sua conta para continuar.");
  return user.uid;
}
