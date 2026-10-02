import { collection, doc, onSnapshot, query, runTransaction, where } from "firebase/firestore";
import { Account, DeliveryAddress, isLocalAccount } from "./account-store";
import { markLocalArtworkSold, PublicArtwork } from "./catalog-store";
import { firestore } from "./firebase-client";
import { isCompleteDeliveryAddress } from "./delivery-address";

export type PaymentMethod = "pix" | "credit-card" | "bank-slip";
export type SimulatedOrder = {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artistId: string;
  artistName: string;
  buyerId: string;
  buyerName: string;
  participants: string[];
  amount: string;
  shippingAmount: string;
  paymentMethod: PaymentMethod;
  deliveryAddress?: DeliveryAddress;
  status: "simulated" | "pending" | "approved" | "rejected" | "cancelled" | "refunded" | "conflict";
  createdAt: string;
};

const localOrdersKey = "payart:local-orders";
const localOrdersUpdatedEvent = "payart:local-orders-updated";

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "pix" || value === "credit-card" || value === "bank-slip";
}

function isOrderStatus(value: unknown): value is SimulatedOrder["status"] {
  return value === "simulated"
    || value === "pending"
    || value === "approved"
    || value === "rejected"
    || value === "cancelled"
    || value === "refunded"
    || value === "conflict";
}

function orderFromData(id: string, data: Record<string, unknown>): SimulatedOrder {
  if (
    typeof data.artworkId !== "string"
    || typeof data.artworkTitle !== "string"
    || typeof data.artistId !== "string"
    || typeof data.artistName !== "string"
    || typeof data.buyerId !== "string"
    || typeof data.buyerName !== "string"
    || !Array.isArray(data.participants)
    || !data.participants.every((participant) => typeof participant === "string")
    || typeof data.amount !== "string"
    || !isPaymentMethod(data.paymentMethod)
    || !isOrderStatus(data.status)
    || typeof data.createdAt !== "string"
  ) {
    throw new Error("Um pedido salvo está incompleto ou inválido.");
  }
  return {
    id,
    artworkId: data.artworkId,
    artworkTitle: data.artworkTitle,
    artistId: data.artistId,
    artistName: data.artistName,
    buyerId: data.buyerId,
    buyerName: data.buyerName,
    participants: data.participants,
    amount: data.amount,
    shippingAmount: typeof data.shippingAmount === "string" ? data.shippingAmount : "0.00",
    paymentMethod: data.paymentMethod,
    ...(isDeliveryAddress(data.deliveryAddress) ? { deliveryAddress: data.deliveryAddress } : {}),
    status: data.status,
    createdAt: data.createdAt,
  };
}

function isDeliveryAddress(value: unknown): value is DeliveryAddress {
  if (typeof value !== "object" || value === null) return false;
  const address = value as Record<string, unknown>;
  return ["recipient", "postalCode", "street", "number", "complement", "neighborhood", "city", "state"]
    .every((key) => typeof address[key] === "string");
}

function readLocalOrders(): SimulatedOrder[] {
  const stored = window.localStorage.getItem(localOrdersKey);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error("O armazenamento local de pedidos está inválido.");
  return parsed.map((entry) => {
    if (typeof entry !== "object" || entry === null || !("id" in entry) || typeof entry.id !== "string") {
      throw new Error("Um pedido local está inválido.");
    }
    return orderFromData(entry.id, entry as Record<string, unknown>);
  });
}

function localOrdersFor(accountId: string) {
  return readLocalOrders()
    .filter((order) => order.participants.includes(accountId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createSimulatedOrder(
  account: Account,
  artwork: PublicArtwork,
  paymentMethod: PaymentMethod,
  deliveryAddress: DeliveryAddress = account.deliveryAddress,
  shippingAmount = "0.00",
) {
  if (!isPaymentMethod(paymentMethod)) throw new Error("Selecione uma forma de pagamento demonstrativa válida.");
  if (account.role !== "buyer") throw new Error("Somente uma conta de comprador pode iniciar um pedido.");
  if (!isCompleteDeliveryAddress(deliveryAddress)) throw new Error("Preencha corretamente o endereço de entrega antes de confirmar o pedido.");
  if (!artwork.artistId || artwork.artistId === account.id) {
    throw new Error("Esta obra não possui um artista cadastrado para receber pedidos.");
  }
  const participants = [account.id, artwork.artistId].sort();
  const order: Omit<SimulatedOrder, "id"> = {
    artworkId: artwork.id,
    artworkTitle: artwork.title,
    artistId: artwork.artistId,
    artistName: artwork.artist,
    buyerId: account.id,
    buyerName: account.name,
    participants,
    amount: artwork.price,
    shippingAmount,
    paymentMethod,
    deliveryAddress,
    status: "simulated",
    createdAt: new Date().toISOString(),
  };

  if (isLocalAccount(account.id) || Boolean(artwork.artistId && isLocalAccount(artwork.artistId))) {
    const saved = { ...order, id: crypto.randomUUID() };
    const orders = readLocalOrders();
    orders.unshift(saved);
    window.localStorage.setItem(localOrdersKey, JSON.stringify(orders));
    markLocalArtworkSold(artwork.id);
    window.dispatchEvent(new CustomEvent(localOrdersUpdatedEvent));
    return saved;
  }

  try {
    const artworkReference = doc(firestore, "artworks", artwork.id);
    const orderReference = doc(collection(firestore, "orders"));
    await runTransaction(firestore, async (transaction) => {
      const artworkSnapshot = await transaction.get(artworkReference);
      if (!artworkSnapshot.exists()) throw new Error("Esta obra não está mais disponível.");
      if (artworkSnapshot.data().isSold === true) {
        throw new Error("Esta obra já foi comprada e não está mais disponível.");
      }
      const currentArtwork = artworkSnapshot.data();
      if (
        currentArtwork.artistId !== artwork.artistId
        || currentArtwork.price !== artwork.price
        || currentArtwork.title !== artwork.title
      ) {
        throw new Error("Os dados da obra mudaram. Atualize a página e tente novamente.");
      }
      transaction.update(artworkReference, { isSold: true });
      transaction.set(orderReference, order);
    });
    return { ...order, id: orderReference.id };
  } catch (error) {
    if (
      error instanceof Error
      && (
        error.message.includes("não está mais disponível")
        || error.message.includes("já foi comprada")
        || error.message.includes("Os dados da obra mudaram")
      )
    ) throw error;
    if (typeof error === "object" && error !== null && "code" in error && error.code === "not-found") {
      throw new Error("O Firestore ainda não foi criado. O pedido não foi salvo; crie o banco para habilitar os pedidos em nuvem.");
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "permission-denied") {
      throw new Error("As regras atuais do Firestore não permitem concluir a compra. Publique as regras atualizadas do projeto.");
    }
    throw new Error("Não foi possível concluir a compra no Firebase. Tente novamente.");
  }
}

export function subscribeToOrders(
  accountId: string,
  onChange: (orders: SimulatedOrder[]) => void,
  onError: (error: Error) => void,
) {
  if (isLocalAccount(accountId)) {
    const refresh = () => {
      try {
        onChange(localOrdersFor(accountId));
      } catch (error) {
        onError(error instanceof Error ? error : new Error("Não foi possível carregar os pedidos locais."));
      }
    };
    window.addEventListener(localOrdersUpdatedEvent, refresh);
    window.addEventListener("storage", refresh);
    refresh();
    return () => {
      window.removeEventListener(localOrdersUpdatedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }

  return onSnapshot(query(
    collection(firestore, "orders"),
    where("participants", "array-contains", accountId),
  ), (snapshot) => {
    try {
      onChange(snapshot.docs
        .map((item) => orderFromData(item.id, item.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Não foi possível ler os pedidos."));
    }
  }, (error) => {
    if (error.code === "not-found") onError(new Error("O Firestore ainda não foi criado; pedidos em nuvem indisponíveis."));
    else if (error.code === "permission-denied") onError(new Error("O Firebase bloqueou a leitura dos pedidos. Publique as regras atualizadas."));
    else onError(error);
  });
}
