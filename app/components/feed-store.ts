import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Unsubscribe,
  writeBatch,
} from "firebase/firestore";
import { Account, isLocalAccount } from "./account-store";
import { firestore } from "./firebase-client";

const localPostsKey = "payart:feed:posts";
const localReactionsKey = "payart:feed:reactions";
const localCommentsKey = "payart:feed:comments";
const localFeedUpdatedEvent = "payart:feed:updated";

export type FeedPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
  type: "post" | "repost";
  originalPostId?: string;
  originalAuthorId?: string;
  originalAuthorName?: string;
  originalAuthorAvatar?: string;
  originalText?: string;
  isLocal?: boolean;
  likeCount: number;
  repostCount: number;
  isLiked: boolean;
  isReposted: boolean;
};

export type FeedComment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
  isLocal?: boolean;
};

type StoredFeedPost = Omit<FeedPost, "likeCount" | "repostCount" | "isLiked" | "isReposted">;
type LocalReaction = { likedBy: string[]; repostedBy: string[] };
type LocalComment = FeedComment;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readLocalPosts(): StoredFeedPost[] {
  const stored = window.localStorage.getItem(localPostsKey);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error("O feed local está inválido.");
  return parsed.map((item) => {
    if (
      !isRecord(item)
      || typeof item.id !== "string"
      || typeof item.authorId !== "string"
      || typeof item.authorName !== "string"
      || typeof item.authorAvatar !== "string"
      || typeof item.text !== "string"
      || typeof item.createdAt !== "string"
      || (item.type !== "post" && item.type !== "repost")
    ) {
      throw new Error("Uma publicação local está incompleta ou inválida.");
    }
    return item as StoredFeedPost;
  });
}

function readLocalReactions(): Record<string, LocalReaction> {
  const stored = window.localStorage.getItem(localReactionsKey);
  if (!stored) return {};
  const parsed: unknown = JSON.parse(stored);
  if (!isRecord(parsed)) throw new Error("As interações locais do feed estão inválidas.");
  for (const value of Object.values(parsed)) {
    if (
      !isRecord(value)
      || !Array.isArray(value.likedBy)
      || !value.likedBy.every((id) => typeof id === "string")
      || !Array.isArray(value.repostedBy)
      || !value.repostedBy.every((id) => typeof id === "string")
    ) {
      throw new Error("Uma interação local do feed está inválida.");
    }
  }
  return parsed as Record<string, LocalReaction>;
}

function readLocalComments(): LocalComment[] {
  const stored = window.localStorage.getItem(localCommentsKey);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error("Os comentários locais do feed estão inválidos.");
  return parsed as LocalComment[];
}

function storedPostFromData(id: string, data: Record<string, unknown>): StoredFeedPost {
  if (
    typeof data.authorId !== "string"
    || typeof data.authorName !== "string"
    || typeof data.text !== "string"
    || typeof data.createdAt !== "string"
    || (data.type !== "post" && data.type !== "repost")
  ) {
    throw new Error("Uma publicação do feed está incompleta ou inválida.");
  }
  return {
    id,
    authorId: data.authorId,
    authorName: data.authorName,
    authorAvatar: typeof data.authorAvatar === "string" ? data.authorAvatar : "",
    text: data.text,
    createdAt: data.createdAt,
    type: data.type,
    ...(typeof data.originalPostId === "string" ? { originalPostId: data.originalPostId } : {}),
    ...(typeof data.originalAuthorId === "string" ? { originalAuthorId: data.originalAuthorId } : {}),
    ...(typeof data.originalAuthorName === "string" ? { originalAuthorName: data.originalAuthorName } : {}),
    ...(typeof data.originalAuthorAvatar === "string" ? { originalAuthorAvatar: data.originalAuthorAvatar } : {}),
    ...(typeof data.originalText === "string" ? { originalText: data.originalText } : {}),
  };
}

function mergePosts(
  cloudPosts: StoredFeedPost[],
  localPosts: StoredFeedPost[],
  reactions: Map<string, { likeCount: number; repostCount: number; isLiked: boolean; isReposted: boolean }>,
  accountId: string | null,
): FeedPost[] {
  const cloudIds = new Set(cloudPosts.map((post) => post.id));
  const localReactions = readLocalReactions();
  return [
    ...cloudPosts.map((post) => ({ ...post, isLocal: false })),
    ...localPosts.filter((post) => !cloudIds.has(post.id)).map((post) => ({ ...post, isLocal: true })),
  ]
    .map((post) => {
      const state = reactions.get(post.id);
      const localState = localReactions[post.id] ?? { likedBy: [], repostedBy: [] };
      return {
        ...post,
        likeCount: (state?.likeCount ?? 0) + localState.likedBy.length,
        repostCount: (state?.repostCount ?? 0) + localState.repostedBy.length,
        isLiked: accountId
          ? Boolean(state?.isLiked || localState.likedBy.includes(accountId))
          : false,
        isReposted: accountId
          ? Boolean(state?.isReposted || localState.repostedBy.includes(accountId))
          : false,
      };
    })
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

function repostDocumentId(postId: string, accountId: string) {
  return `repost_${accountId}_${postId}`;
}

function validateText(text: string, maxLength: number, label: string) {
  const value = text.trim();
  if (!value || value.length > maxLength) {
    throw new Error(`${label} deve ter entre 1 e ${maxLength} caracteres.`);
  }
  return value;
}

function explainFeedError(error: Error) {
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  if (code === "permission-denied") {
    return new Error("O Firestore ainda não permite o feed. Publique as regras atualizadas do arquivo firestore.rules para habilitar as publicações e interações.");
  }
  return error;
}

function reportWriteError(error: unknown, message: string): Error {
  return explainFeedError(error instanceof Error ? error : new Error(message));
}

export function subscribeToFeed(
  accountId: string | null,
  onChange: (posts: FeedPost[]) => void,
  onError: (error: Error) => void,
): () => void {
  let cloudPosts: StoredFeedPost[] = [];
  const engagement = new Map<string, { likeCount: number; repostCount: number; isLiked: boolean; isReposted: boolean }>();
  const engagementListeners = new Map<string, Unsubscribe[]>();
  let localPosts: StoredFeedPost[] = [];

  const publish = () => {
    try {
      localPosts = readLocalPosts();
      onChange(mergePosts(cloudPosts, localPosts, engagement, accountId));
    } catch (error) {
      onError(explainFeedError(error instanceof Error ? error : new Error("Não foi possível carregar o feed.")));
    }
  };

  const refreshLocal = () => publish();
  window.addEventListener(localFeedUpdatedEvent, refreshLocal);
  window.addEventListener("storage", refreshLocal);
  publish();

  const unsubscribePosts = onSnapshot(
    query(collection(firestore, "feedPosts"), orderBy("createdAt", "desc"), limit(30)),
    (snapshots) => {
      try {
        cloudPosts = snapshots.docs.map((snapshot) => storedPostFromData(snapshot.id, snapshot.data()));
        const activeIds = new Set(cloudPosts.map((post) => post.id));
        for (const [postId, listeners] of engagementListeners) {
          if (!activeIds.has(postId)) {
            listeners.forEach((unsubscribe) => unsubscribe());
            engagementListeners.delete(postId);
            engagement.delete(postId);
          }
        }
        for (const post of cloudPosts) {
          if (engagementListeners.has(post.id)) continue;
          const postReference = doc(firestore, "feedPosts", post.id);
          const state = { likeCount: 0, repostCount: 0, isLiked: false, isReposted: false };
          engagement.set(post.id, state);
          const likes = onSnapshot(collection(postReference, "likes"), (items) => {
            state.likeCount = items.size;
            state.isLiked = accountId ? items.docs.some((item) => item.id === accountId) : false;
            publish();
          }, (error) => onError(explainFeedError(error)));
          const reposts = onSnapshot(collection(postReference, "reposts"), (items) => {
            state.repostCount = items.size;
            state.isReposted = accountId ? items.docs.some((item) => item.id === accountId) : false;
            publish();
          }, (error) => onError(explainFeedError(error)));
          engagementListeners.set(post.id, [likes, reposts]);
        }
        publish();
      } catch (error) {
        onError(explainFeedError(error instanceof Error ? error : new Error("Não foi possível ler as publicações.")));
      }
    },
    (error) => onError(explainFeedError(error)),
  );

  return () => {
    unsubscribePosts();
    for (const listeners of engagementListeners.values()) listeners.forEach((unsubscribe) => unsubscribe());
    window.removeEventListener(localFeedUpdatedEvent, refreshLocal);
    window.removeEventListener("storage", refreshLocal);
  };
}

export async function createFeedPost(account: Account, text: string) {
  const normalizedText = validateText(text, 500, "A publicação");
  const post: StoredFeedPost = {
    id: crypto.randomUUID(),
    authorId: account.id,
    authorName: account.name,
    authorAvatar: account.avatar,
    text: normalizedText,
    createdAt: new Date().toISOString(),
    type: "post",
  };
  if (account.storageMode === "local" || isLocalAccount(account.id)) {
    const posts = readLocalPosts();
    posts.unshift(post);
    window.localStorage.setItem(localPostsKey, JSON.stringify(posts));
    window.dispatchEvent(new CustomEvent(localFeedUpdatedEvent));
    return;
  }
  try {
    await addDoc(collection(firestore, "feedPosts"), {
      authorId: post.authorId,
      authorName: post.authorName,
      authorAvatar: post.authorAvatar,
      text: post.text,
      createdAt: post.createdAt,
      type: post.type,
    });
  } catch (error) {
    throw reportWriteError(error, "Não foi possível publicar no feed.");
  }
}

export async function deleteFeedPost(post: FeedPost, account: Account) {
  if (post.authorId !== account.id) throw new Error("Você só pode excluir suas próprias publicações.");
  if (post.isLocal || account.storageMode === "local" || isLocalAccount(account.id)) {
    window.localStorage.setItem(localPostsKey, JSON.stringify(readLocalPosts().filter((item) => item.id !== post.id)));
    if (post.type === "repost" && post.originalPostId) {
      const reactions = readLocalReactions();
      const state = reactions[post.originalPostId];
      if (state) {
        state.repostedBy = state.repostedBy.filter((id) => id !== account.id);
        reactions[post.originalPostId] = state;
        window.localStorage.setItem(localReactionsKey, JSON.stringify(reactions));
      }
    }
    window.dispatchEvent(new CustomEvent(localFeedUpdatedEvent));
    return;
  }
  if (post.type === "repost" && post.originalPostId) {
    const batch = writeBatch(firestore);
    batch.delete(doc(firestore, "feedPosts", post.id));
    batch.delete(doc(firestore, "feedPosts", post.originalPostId, "reposts", account.id));
    try {
      await batch.commit();
    } catch (error) {
      throw reportWriteError(error, "Não foi possível excluir o repost.");
    }
    return;
  }
  try {
    await deleteDoc(doc(firestore, "feedPosts", post.id));
  } catch (error) {
    throw reportWriteError(error, "Não foi possível excluir a publicação.");
  }
}

export async function toggleFeedLike(post: FeedPost, account: Account) {
  const localMode = post.isLocal || account.storageMode === "local" || isLocalAccount(account.id);
  if (localMode) {
    const reactions = readLocalReactions();
    const state = reactions[post.id] ?? { likedBy: [], repostedBy: [] };
    state.likedBy = state.likedBy.includes(account.id)
      ? state.likedBy.filter((id) => id !== account.id)
      : [...state.likedBy, account.id];
    reactions[post.id] = state;
    window.localStorage.setItem(localReactionsKey, JSON.stringify(reactions));
    window.dispatchEvent(new CustomEvent(localFeedUpdatedEvent));
    return;
  }
  try {
    const reference = doc(firestore, "feedPosts", post.id, "likes", account.id);
    if ((await getDoc(reference)).exists()) await deleteDoc(reference);
    else await setDoc(reference, { userId: account.id, createdAt: new Date().toISOString() });
  } catch (error) {
    throw reportWriteError(error, "Não foi possível atualizar a curtida.");
  }
}

export async function toggleFeedRepost(post: FeedPost, account: Account) {
  const originalPostId = post.type === "repost" ? post.originalPostId : post.id;
  const originalAuthorId = post.type === "repost" ? post.originalAuthorId : post.authorId;
  const originalAuthorName = post.type === "repost" ? post.originalAuthorName : post.authorName;
  const originalAuthorAvatar = post.type === "repost" ? post.originalAuthorAvatar : post.authorAvatar;
  const originalText = post.type === "repost" ? post.originalText : post.text;
  if (!originalPostId || !originalAuthorId || !originalAuthorName || originalText === undefined) {
    throw new Error("Não foi possível identificar a publicação original para repostar.");
  }
  const localMode = post.isLocal || account.storageMode === "local" || isLocalAccount(account.id);
  const reactions = readLocalReactions();
  const localState = reactions[originalPostId] ?? { likedBy: [], repostedBy: [] };
  const removing = localMode
    ? localState.repostedBy.includes(account.id)
    : post.isReposted;

  if (localMode) {
    localState.repostedBy = removing
      ? localState.repostedBy.filter((id) => id !== account.id)
      : [...localState.repostedBy, account.id];
    reactions[originalPostId] = localState;
    const posts = readLocalPosts();
    const repostId = repostDocumentId(originalPostId, account.id);
    const updatedPosts = removing
      ? posts.filter((item) => item.id !== repostId)
      : [{
          id: repostId,
          authorId: account.id,
          authorName: account.name,
          authorAvatar: account.avatar,
          text: "",
          createdAt: new Date().toISOString(),
          type: "repost" as const,
          originalPostId,
          originalAuthorId,
          originalAuthorName,
          originalAuthorAvatar,
          originalText,
        }, ...posts];
    window.localStorage.setItem(localReactionsKey, JSON.stringify(reactions));
    window.localStorage.setItem(localPostsKey, JSON.stringify(updatedPosts));
    window.dispatchEvent(new CustomEvent(localFeedUpdatedEvent));
    return;
  }

  const batch = writeBatch(firestore);
  const repostReference = doc(firestore, "feedPosts", post.id, "reposts", account.id);
  const repostEventReference = doc(firestore, "feedPosts", repostDocumentId(originalPostId, account.id));
  if (removing) {
    batch.delete(repostReference);
    batch.delete(repostEventReference);
  } else {
    batch.set(repostReference, { userId: account.id, createdAt: new Date().toISOString() });
    batch.set(repostEventReference, {
      authorId: account.id,
      authorName: account.name,
      authorAvatar: account.avatar,
      text: "",
      createdAt: new Date().toISOString(),
      type: "repost",
      originalPostId,
      originalAuthorId,
      originalAuthorName,
      originalAuthorAvatar,
      originalText,
    });
  }
  try {
    await batch.commit();
  } catch (error) {
    throw reportWriteError(error, "Não foi possível atualizar o repost.");
  }
}

function commentFromData(id: string, postId: string, data: Record<string, unknown>): FeedComment {
  if (
    typeof data.authorId !== "string"
    || typeof data.authorName !== "string"
    || typeof data.text !== "string"
    || typeof data.createdAt !== "string"
  ) {
    throw new Error("Um comentário do feed está incompleto ou inválido.");
  }
  return {
    id,
    postId,
    authorId: data.authorId,
    authorName: data.authorName,
    authorAvatar: typeof data.authorAvatar === "string" ? data.authorAvatar : "",
    text: data.text,
    createdAt: data.createdAt,
    isLocal: false,
  };
}

export function subscribeToFeedComments(
  postId: string,
  onChange: (comments: FeedComment[]) => void,
  onError: (error: Error) => void,
) {
  const publishLocal = () => {
    try {
      onChange(readLocalComments().filter((comment) => comment.postId === postId)
        .sort((first, second) => first.createdAt.localeCompare(second.createdAt)));
    } catch (error) {
      onError(explainFeedError(error instanceof Error ? error : new Error("Não foi possível carregar os comentários.")));
    }
  };
  window.addEventListener(localFeedUpdatedEvent, publishLocal);
  window.addEventListener("storage", publishLocal);
  publishLocal();
  const unsubscribe = onSnapshot(
    query(collection(firestore, "feedPosts", postId, "comments"), orderBy("createdAt", "asc"), limit(100)),
    (snapshots) => {
      try {
        const cloudComments = snapshots.docs.map((snapshot) => commentFromData(snapshot.id, postId, snapshot.data()));
        const cloudIds = new Set(cloudComments.map((comment) => comment.id));
        const localComments = readLocalComments().filter((comment) => comment.postId === postId && !cloudIds.has(comment.id));
        onChange([...cloudComments, ...localComments].sort((first, second) => first.createdAt.localeCompare(second.createdAt)));
      } catch (error) {
        onError(explainFeedError(error instanceof Error ? error : new Error("Não foi possível ler os comentários.")));
      }
    },
    (error) => onError(explainFeedError(error)),
  );
  return () => {
    unsubscribe();
    window.removeEventListener(localFeedUpdatedEvent, publishLocal);
    window.removeEventListener("storage", publishLocal);
  };
}

export async function createFeedComment(postId: string, account: Account, text: string, isLocalPost = false) {
  const normalizedText = validateText(text, 280, "O comentário");
  const comment: Omit<FeedComment, "id"> = {
    postId,
    authorId: account.id,
    authorName: account.name,
    authorAvatar: account.avatar,
    text: normalizedText,
    createdAt: new Date().toISOString(),
  };
  if (isLocalPost || account.storageMode === "local" || isLocalAccount(account.id)) {
    const comments = readLocalComments();
    comments.push({ ...comment, id: crypto.randomUUID(), isLocal: true });
    window.localStorage.setItem(localCommentsKey, JSON.stringify(comments));
    window.dispatchEvent(new CustomEvent(localFeedUpdatedEvent));
    return;
  }
  try {
    await addDoc(collection(firestore, "feedPosts", postId, "comments"), comment);
  } catch (error) {
    throw reportWriteError(error, "Não foi possível enviar o comentário.");
  }
}

export async function deleteFeedComment(comment: FeedComment, account: Account) {
  if (comment.authorId !== account.id) throw new Error("Você só pode excluir seus próprios comentários.");
  if (comment.isLocal || account.storageMode === "local" || isLocalAccount(account.id)) {
    window.localStorage.setItem(localCommentsKey, JSON.stringify(
      readLocalComments().filter((item) => item.id !== comment.id),
    ));
    window.dispatchEvent(new CustomEvent(localFeedUpdatedEvent));
    return;
  }
  try {
    await deleteDoc(doc(firestore, "feedPosts", comment.postId, "comments", comment.id));
  } catch (error) {
    throw reportWriteError(error, "Não foi possível excluir o comentário.");
  }
}
