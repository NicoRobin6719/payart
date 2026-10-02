"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowUpRight,
  CreditCard,
  Heart,
  ImagePlus,
  LogOut,
  Mail,
  Palette,
  Plus,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  Account,
  Artwork,
  ImagePosition,
  emptyDeliveryAddress,
  getCurrentAccount,
  signOut,
  updateAccount,
} from "./account-store";
import { uploadAccountImage } from "./image-storage";
import Toast from "./Toast";
import FavoritesPanel from "./FavoritesPanel";
import MessagesCenter from "./MessagesCenter";
import OrdersPanel from "./OrdersPanel";
import CartPanel from "./CartPanel";
import { ARTWORK_CATEGORIES, isArtworkCategory } from "./artwork-categories";
import MediaImage from "./MediaImage";
import ShippingAddressFields from "./ShippingAddressFields";

type Section = "overview" | "artworks" | "profile" | "payments" | "favorites" | "messages" | "orders" | "cart";
type Feedback = { type: "success" | "error"; message: string };

const inputClass = "mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#5c2df2]";
const cardClass = "rounded-[24px] border border-black/5 bg-white p-6 shadow-sm";

function DisplayImage({
  src,
  label,
  className = "",
  objectPosition,
}: {
  src: string;
  label: string;
  className?: string;
  objectPosition?: string;
}) {
  return <MediaImage src={src} alt={label} objectPosition={objectPosition} className={className} sizes="(min-width: 640px) 160px, 100vw" />;
}

export default function Dashboard() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<Section>("overview");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void (async () => {
      try {
        const currentAccount = await getCurrentAccount();
        if (!currentAccount) {
          router.replace("/login");
        } else {
          setAccount(currentAccount);
          if (
            currentAccount.role === "artist"
            && new URLSearchParams(window.location.search).get("secao") === "obras"
          ) {
            setSection("artworks");
          }
          const params = new URLSearchParams(window.location.search);
          if (params.get("secao") === "orders") {
            setSection("orders");
            const paymentReturn = params.get("pagamento");
            if (paymentReturn === "retorno") {
              setFeedback({ type: "success", message: "Confira o status dos pedidos de demonstração nesta área." });
            } else if (paymentReturn === "falhou") {
              setFeedback({ type: "error", message: "A simulação não foi concluída. Você pode tentar novamente." });
            }
          }
          if (currentAccount.role === "artist" && params.get("secao") === "payments") {
            setSection("payments");
          }
        }
      } catch (error) {
        setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível carregar sua conta." });
      } finally {
        setReady(true);
      }
      })();
    });
    return () => { cancelled = true; };
  }, [router]);

  async function saveAccount(nextAccount: Account, successMessage: string) {
    try {
      const savedAccount = await updateAccount(nextAccount);
      setAccount(savedAccount);
      setFeedback({
        type: "success",
        message: nextAccount.storageMode === "local"
          ? `${successMessage} Seu perfil e suas obras agora estão sincronizados pelo Firebase.`
          : successMessage,
      });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível salvar as alterações." });
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível sair da conta." });
    }
  }

  if (!ready || !account) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f0ee] px-6">
        <p role={feedback ? "alert" : "status"} className="max-w-lg text-center text-sm text-[#5f586d]">
          {feedback?.message ?? "Carregando sua área PayArt..."}
        </p>
      </main>
    );
  }

  const isArtist = account.role === "artist";
  const sections: { id: Section; label: string; icon: typeof UserRound }[] = [
    { id: "overview", label: "Visão geral", icon: Settings },
    ...(isArtist ? [{ id: "artworks" as const, label: "Minhas obras", icon: Palette }] : []),
    { id: "favorites", label: "Favoritos", icon: Heart },
    { id: "messages", label: "Mensagens", icon: Mail },
    { id: "orders", label: "Pedidos", icon: ShoppingBag },
    ...(!isArtist ? [{ id: "cart" as const, label: "Carrinho", icon: ShoppingCart }] : []),
    { id: "profile", label: "Meu perfil", icon: UserRound },
    ...(isArtist ? [{ id: "payments" as const, label: "Pagamentos", icon: CreditCard }] : []),
  ];

  return (
    <main className="min-h-screen bg-[#f3f0ee] text-[#17131f]">
      <header className="border-b border-black/5 bg-white/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="text-2xl font-extrabold tracking-[-0.08em]">
            Pay<span className="text-[#5c2df2]">Art</span><span className="text-[#ff53c6]">.</span>
          </Link>
          <span className="hidden rounded-full bg-[#f4efff] px-4 py-2 text-xs font-bold text-[#5c2df2] sm:inline-flex">
            Área do {isArtist ? "artista" : "comprador"}
          </span>
          <button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[240px_1fr] lg:py-12">
        <aside>
          <div className="mb-6 flex items-center gap-3">
            {account.avatar ? (
              <DisplayImage src={account.avatar} label={`Foto de ${account.name}`} className="h-12 w-12 rounded-full bg-[#eee8ff]" />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#eee8ff] text-[#5c2df2]"><UserRound size={22} /></div>
            )}
            <div className="min-w-0">
              <p className="truncate font-bold">{account.name}</p>
              <p className="text-xs text-[#746e80]">{isArtist ? "Artista" : "Comprador"}</p>
            </div>
          </div>
          <nav aria-label="Menu da conta" className="flex gap-2 overflow-x-auto lg:flex-col">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setSection(id); setFeedback(null); }}
                aria-current={section === id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${section === id ? "bg-[#5c2df2] text-white shadow-lg shadow-purple-500/20" : "text-[#5f586d] hover:bg-white"}`}
              >
                <Icon size={18} /> {label}
              </button>
            ))}
          </nav>
          <p className="mt-8 hidden rounded-2xl border border-[#ffbde7] bg-white/70 p-4 text-xs leading-5 text-[#746e80] lg:block">
            {account.storageMode === "local"
              ? "Seu perfil está salvo apenas neste navegador. Para usar em outros dispositivos, é necessário configurar o Firestore."
              : "Seu perfil é sincronizado pelo Firebase. Nenhum pagamento é processado nesta versão."}
          </p>
        </aside>

        <section className="min-w-0">
          {feedback && <div className="mb-5"><Toast type={feedback.type} message={feedback.message} /></div>}
          {section === "overview" && (
            <Overview account={account} isArtist={isArtist} onNavigate={setSection} />
          )}
          {section === "profile" && (
            <ProfileEditor account={account} onSave={(updated) => saveAccount(updated, "Perfil atualizado com sucesso.")} />
          )}
          {section === "favorites" && <FavoritesPanel account={account} />}
          {section === "messages" && <MessagesCenter account={account} />}
          {section === "orders" && <OrdersPanel account={account} />}
          {section === "cart" && !isArtist && <CartPanel account={account} />}
          {section === "artworks" && isArtist && (
            <ArtworkManager
              key={editingArtwork?.id ?? "new"}
              account={account}
              editingArtwork={editingArtwork}
              onEdit={setEditingArtwork}
              onSave={(updated) => {
                saveAccount(updated, "Obra salva com sucesso.");
                setEditingArtwork(null);
              }}
            />
          )}
          {section === "payments" && isArtist && (
            <PaymentSettings account={account} onSave={(updated) => saveAccount(updated, "Chave Pix atualizada.")} />
          )}
        </section>
      </div>
    </main>
  );
}

function Overview({ account, isArtist, onNavigate }: { account: Account; isArtist: boolean; onNavigate: (section: Section) => void }) {
  return (
    <>
      <div className="mb-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Seu espaço PayArt</p>
        <h1 className="text-4xl font-extrabold tracking-[-0.06em] sm:text-5xl">Olá, {account.name.split(" ")[0]}.</h1>
        <p className="mt-3 max-w-xl text-[#5f586d]">
          {isArtist ? "Gerencie suas obras, seu perfil público e suas preferências de recebimento." : "Sua área de comprador está pronta. Explore artistas e encontre sua próxima obra favorita."}
        </p>
      </div>
      {isArtist ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => onNavigate("artworks")} className={`${cardClass} text-left transition hover:-translate-y-1 hover:shadow-md`}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f4efff] text-[#5c2df2]"><Palette size={21} /></span>
            <span className="mt-5 block text-3xl font-extrabold">{account.artworks.length}</span>
            <span className="mt-1 block text-sm text-[#5f586d]">obras publicadas</span>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#5c2df2]">Gerenciar obras <ArrowUpRight size={16} /></span>
          </button>
          <button onClick={() => onNavigate("profile")} className={`${cardClass} text-left transition hover:-translate-y-1 hover:shadow-md`}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff0fa] text-[#df3ea8]"><UserRound size={21} /></span>
            <span className="mt-5 block text-lg font-bold">Seu perfil de artista</span>
            <span className="mt-1 block text-sm text-[#5f586d]">Conte sua história e apresente seu trabalho.</span>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#5c2df2]">Editar perfil <ArrowUpRight size={16} /></span>
          </button>
          <div className={`${cardClass} sm:col-span-2`}>
            <h2 className="text-lg font-bold">Próximos passos</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f586d]">Complete seu perfil e publique suas obras. Os pagamentos no PayArt são apenas simulações, sem cobrança ou conexão com bancos.</p>
            <button onClick={() => onNavigate("payments")} className="mt-4 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5">Configurar recebimento</button>
          </div>
        </div>
      ) : (
        <div className={`${cardClass} max-w-2xl`}>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4efff] text-[#5c2df2]"><ShoppingBag size={23} /></span>
          <h2 className="mt-5 text-2xl font-bold">Seu perfil de comprador</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[#5f586d]">Mantenha suas informações pessoais atualizadas e descubra obras de artistas independentes no catálogo.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => onNavigate("profile")} className="rounded-xl bg-[#5c2df2] px-5 py-3 text-sm font-bold text-white">Editar meu perfil</button>
            <Link href="/explorar" className="rounded-xl border border-black/10 px-5 py-3 text-sm font-semibold">Explorar obras</Link>
            <button onClick={() => onNavigate("favorites")} className="rounded-xl border border-black/10 px-5 py-3 text-sm font-semibold">Ver favoritos</button>
          </div>
        </div>
      )}
    </>
  );
}

function ImagePositionControls({
  label,
  position,
  onChange,
}: {
  label: string;
  position: ImagePosition;
  onChange: (position: ImagePosition) => void;
}) {
  return (
    <fieldset className="mt-3 grid gap-3 rounded-xl bg-[#f7f5fa] p-4 sm:grid-cols-2">
      <legend className="px-1 text-xs font-semibold text-[#5f586d]">Ajustar enquadramento da {label}</legend>
      {(["x", "y"] as const).map((axis) => (
        <label key={axis} className="text-xs font-medium text-[#5f586d]">
          {axis === "x" ? "Horizontal" : "Vertical"} · {position[axis]}%
          <input
            type="range"
            min="0"
            max="100"
            value={position[axis]}
            aria-label={`Posição ${axis === "x" ? "horizontal" : "vertical"} da ${label}`}
            onChange={(event) => onChange({ ...position, [axis]: Number(event.target.value) })}
            className="mt-2 block w-full accent-[#5c2df2]"
          />
        </label>
      ))}
    </fieldset>
  );
}

function ProfileEditor({ account, onSave }: { account: Account; onSave: (account: Account) => void }) {
  const isArtist = account.role === "artist";
  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone);
  const [bio, setBio] = useState(account.bio);
  const [avatar, setAvatar] = useState(account.avatar);
  const [banner, setBanner] = useState(account.banner);
  const [avatarPosition, setAvatarPosition] = useState<ImagePosition>(account.avatarPosition);
  const [bannerPosition, setBannerPosition] = useState<ImagePosition>(account.bannerPosition);
  const [deliveryAddress, setDeliveryAddress] = useState(account.deliveryAddress ?? { ...emptyDeliveryAddress });
  const [error, setError] = useState("");
  const [processingImage, setProcessingImage] = useState(false);

  async function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: (image: string) => void,
    kind: "avatar" | "banner",
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    const input = event.currentTarget;
    setProcessingImage(true);
    try {
      setImage(await uploadAccountImage(account.id, file, kind));
      setError("");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Não foi possível carregar a imagem.");
    } finally {
      setProcessingImage(false);
      input.value = "";
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    setError("");
    onSave({
      ...account,
      name: name.trim(),
      phone,
      bio: bio.trim(),
      avatar,
      banner,
      avatarPosition,
      bannerPosition,
      deliveryAddress,
    });
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Perfil</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Edite suas informações</h1>
        <p className="mt-2 text-sm text-[#5f586d]">{isArtist ? "Essas informações ajudam o público a conhecer você e seu trabalho." : "Mantenha seus dados de consumidor atualizados."}</p>
      </div>
      <form onSubmit={handleSubmit} className={`${cardClass} space-y-5`}>
        <div>
          <label htmlFor="profile-banner" className="block text-sm font-semibold">Banner do perfil</label>
          {banner ? (
            <DisplayImage src={banner} label="Prévia do banner do perfil" objectPosition={`${bannerPosition.x}% ${bannerPosition.y}%`} className="mt-2 h-36 rounded-xl bg-[#eee8ff]" />
          ) : (
            <div className="mt-2 grid h-36 place-items-center rounded-xl bg-gradient-to-r from-[#5c2df2] via-[#a45be8] to-[#ffbde7] text-sm font-semibold text-white">Prévia do banner</div>
          )}
          <input id="profile-banner" type="file" accept="image/jpeg,image/png,image/webp" disabled={processingImage} onChange={(event) => handleImageChange(event, setBanner, "banner")} className="mt-3 block w-full text-sm text-[#5f586d] file:mr-4 file:rounded-lg file:border-0 file:bg-[#f4efff] file:px-4 file:py-2 file:font-semibold file:text-[#5c2df2]" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-xs leading-5 text-[#746e80]">JPG, PNG ou WebP até 5 MB. A imagem é otimizada antes de salvar.</p>
            {banner && <button type="button" onClick={() => { setBanner(""); setBannerPosition({ x: 50, y: 50 }); }} className="text-xs font-semibold text-red-700">Remover banner</button>}
          </div>
          {banner && <ImagePositionControls label="banner" position={bannerPosition} onChange={setBannerPosition} />}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {avatar ? (
            <DisplayImage src={avatar} label={`Prévia da foto de ${name || "perfil"}`} objectPosition={`${avatarPosition.x}% ${avatarPosition.y}%`} className="h-20 w-20 rounded-full bg-[#eee8ff]" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[#eee8ff] text-[#5c2df2]"><UserRound size={30} /></div>
          )}
          <div>
            <label htmlFor="profile-avatar" className="block text-sm font-semibold">Foto de perfil</label>
            <input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" disabled={processingImage} onChange={(event) => handleImageChange(event, setAvatar, "avatar")} className="mt-2 block max-w-full text-xs text-[#5f586d] file:mr-3 file:rounded-lg file:border-0 file:bg-[#f4efff] file:px-3 file:py-2 file:font-semibold file:text-[#5c2df2]" />
            <p className="mt-2 text-xs leading-5 text-[#746e80]">JPG, PNG ou WebP até 5 MB; a foto é compactada automaticamente.</p>
            {processingImage && <p role="status" className="mt-2 text-xs font-semibold text-[#5c2df2]">Otimizando imagem...</p>}
          </div>
          {avatar && <button type="button" onClick={() => { setAvatar(""); setAvatarPosition({ x: 50, y: 50 }); }} className="text-xs font-semibold text-red-700">Remover foto</button>}
        </div>
        {avatar && <ImagePositionControls label="foto de perfil" position={avatarPosition} onChange={setAvatarPosition} />}
        <label className="block text-sm font-semibold">
          {isArtist ? "Nome artístico" : "Nome"}
          <input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-semibold">
          E-mail
          <input value={account.email} disabled className={`${inputClass} bg-[#f3f0ee] text-[#746e80]`} />
        </label>
        <label className="block text-sm font-semibold">
          Telefone
          <input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} type="tel" placeholder="(00) 00000-0000" />
        </label>
        <label className="block text-sm font-semibold">
          {isArtist ? "Sobre seu trabalho" : "Sobre você"}
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} className={`${inputClass} min-h-28 resize-y`} maxLength={500} placeholder={isArtist ? "Conte sobre sua trajetória e suas técnicas..." : "Conte um pouco sobre você..."} />
        </label>
        {!isArtist && (
          <div className="border-t border-black/5 pt-5">
            <ShippingAddressFields address={deliveryAddress} onChange={setDeliveryAddress} required={false} />
            <p className="mt-3 text-xs leading-5 text-[#746e80]">O endereço fica privado na sua conta e pode ser usado para preencher os próximos pedidos.</p>
          </div>
        )}
        {error && <Toast type="error" message={error} />}
        <button type="submit" disabled={processingImage} className="rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-6 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60">Salvar perfil</button>
      </form>
    </div>
  );
}

function ArtworkManager({
  account,
  editingArtwork,
  onEdit,
  onSave,
}: {
  account: Account;
  editingArtwork: Artwork | null;
  onEdit: (artwork: Artwork | null) => void;
  onSave: (account: Account) => void;
}) {
  const [title, setTitle] = useState(editingArtwork?.title ?? "");
  const [category, setCategory] = useState(editingArtwork?.category ?? "");
  const [price, setPrice] = useState(editingArtwork?.price ?? "");
  const [description, setDescription] = useState(editingArtwork?.description ?? "");
  const [image, setImage] = useState(editingArtwork?.image ?? "");
  const [shippingWidth, setShippingWidth] = useState(editingArtwork?.shippingWidth?.toString() ?? "");
  const [shippingHeight, setShippingHeight] = useState(editingArtwork?.shippingHeight?.toString() ?? "");
  const [shippingLength, setShippingLength] = useState(editingArtwork?.shippingLength?.toString() ?? "");
  const [shippingWeight, setShippingWeight] = useState(editingArtwork?.shippingWeight?.toString() ?? "");
  const [error, setError] = useState("");
  const [processingImage, setProcessingImage] = useState(false);

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const input = event.currentTarget;
    setProcessingImage(true);
    try {
      setImage(await uploadAccountImage(account.id, file, "artwork"));
      setError("");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Não foi possível carregar a imagem.");
    } finally {
      setProcessingImage(false);
      input.value = "";
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(price);
    if (!title.trim() || !category.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Informe título, categoria e um preço válido maior que zero.");
      return;
    }
    const packageValues = [shippingWidth, shippingHeight, shippingLength, shippingWeight].map(Number);
    if (packageValues.some((value) => !Number.isFinite(value) || value <= 0)) {
      setError("Informe largura, altura, comprimento e peso maiores que zero para calcular o frete.");
      return;
    }
    const artwork: Artwork = {
      id: editingArtwork?.id ?? window.crypto.randomUUID(),
      title: title.trim(),
      category: category.trim(),
      price: amount.toFixed(2),
      description: description.trim(),
      image,
      isSold: editingArtwork?.isSold,
      shippingWidth: packageValues[0],
      shippingHeight: packageValues[1],
      shippingLength: packageValues[2],
      shippingWeight: packageValues[3],
    };
    const artworks = editingArtwork
      ? account.artworks.map((item) => item.id === editingArtwork.id ? artwork : item)
      : [artwork, ...account.artworks];
    onSave({ ...account, artworks });
  }

  function deleteArtwork(id: string) {
    onSave({ ...account, artworks: account.artworks.filter((artwork) => artwork.id !== id) });
    if (editingArtwork?.id === id) onEdit(null);
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
      <div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Ateliê</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Minhas obras</h1>
          </div>
          <button onClick={() => onEdit(null)} className="inline-flex items-center gap-2 rounded-xl bg-[#5c2df2] px-4 py-3 text-sm font-bold text-white"><Plus size={17} /> Nova obra</button>
        </div>
        {account.artworks.length === 0 ? (
          <div className={`${cardClass} text-center`}>
            <ImagePlus className="mx-auto text-[#5c2df2]" size={32} />
            <h2 className="mt-4 font-bold">Seu catálogo começa aqui</h2>
            <p className="mt-2 text-sm text-[#5f586d]">Publique sua primeira obra para apresentá-la ao público.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {account.artworks.map((artwork) => (
              <article key={artwork.id} className={`${cardClass} flex gap-4 p-4`}>
                {artwork.image ? (
                  <MediaImage src={artwork.image} alt={artwork.title} className="h-20 w-20 shrink-0 rounded-xl bg-white" imageClassName="object-contain p-1" sizes="80px" />
                ) : (
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-[#eee8ff] text-[#5c2df2]"><Palette size={25} /></div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-bold">{artwork.title}</h2>
                  <p className="mt-1 text-xs text-[#746e80]">{artwork.category}</p>
                  {artwork.isSold && <p className="mt-1 text-xs font-bold text-emerald-700">Vendida — removida da galeria</p>}
                  <p className="mt-2 text-sm font-bold">R$ {Number(artwork.price).toFixed(2).replace(".", ",")}</p>
                  <div className="mt-3 flex gap-3">
                    <button onClick={() => onEdit(artwork)} className="text-xs font-bold text-[#5c2df2]">Editar</button>
                    <button onClick={() => deleteArtwork(artwork.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"><Trash2 size={13} /> Excluir</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-4`}>
        <h2 className="text-lg font-bold">{editingArtwork ? "Editar obra" : "Cadastrar obra"}</h2>
        <label className="block text-sm font-semibold">Título<input required value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-semibold">
          Categoria
          <select required value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
            <option value="" disabled>Selecione uma categoria</option>
            {ARTWORK_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            {!isArtworkCategory(category) && category && (
              <option value={category}>{category} (categoria anterior)</option>
            )}
          </select>
        </label>
        <label className="block text-sm font-semibold">Preço (R$)<input required type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className={inputClass} /></label>
        <fieldset className="rounded-xl border border-black/10 p-4">
          <legend className="px-1 text-sm font-semibold">Embalagem para o frete</legend>
          <p className="mb-3 text-xs leading-5 text-[#746e80]">Informe as dimensões da embalagem em centímetros e o peso em quilogramas.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold">Largura (cm)<input required type="number" min="0.1" step="0.1" value={shippingWidth} onChange={(event) => setShippingWidth(event.target.value)} className={inputClass} /></label>
            <label className="text-xs font-semibold">Altura (cm)<input required type="number" min="0.1" step="0.1" value={shippingHeight} onChange={(event) => setShippingHeight(event.target.value)} className={inputClass} /></label>
            <label className="text-xs font-semibold">Comprimento (cm)<input required type="number" min="0.1" step="0.1" value={shippingLength} onChange={(event) => setShippingLength(event.target.value)} className={inputClass} /></label>
            <label className="text-xs font-semibold">Peso (kg)<input required type="number" min="0.01" step="0.01" value={shippingWeight} onChange={(event) => setShippingWeight(event.target.value)} className={inputClass} /></label>
          </div>
        </fieldset>
        <label className="block text-sm font-semibold">Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClass} min-h-24`} maxLength={500} /></label>
        <label className="block text-sm font-semibold">Imagem (URL)<input type="url" value={image.startsWith("data:") ? "" : image} onChange={(event) => setImage(event.target.value)} className={inputClass} placeholder="https://..." /></label>
        <label className="block text-sm font-semibold">Ou envie uma imagem<input type="file" accept="image/jpeg,image/png,image/webp" disabled={processingImage} onChange={handleImageChange} className="mt-2 block w-full text-xs text-[#5f586d] file:mr-3 file:rounded-lg file:border-0 file:bg-[#f4efff] file:px-3 file:py-2 file:font-semibold file:text-[#5c2df2]" /><span className="mt-2 block text-xs font-normal leading-5 text-[#746e80]">JPG, PNG ou WebP até 5 MB. A imagem será convertida e otimizada para aparecer no catálogo.</span>{processingImage && <span role="status" className="mt-2 block text-xs font-semibold text-[#5c2df2]">Otimizando imagem...</span>}</label>
        {image && <DisplayImage src={image} label="Prévia da obra" className="h-36 rounded-xl bg-[#eee8ff]" />}
        {error && <Toast type="error" message={error} />}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={processingImage} className="rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-5 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{editingArtwork ? "Salvar alterações" : "Publicar obra"}</button>
          {editingArtwork && <button type="button" onClick={() => onEdit(null)} className="rounded-xl border border-black/10 px-4 py-3 text-sm font-semibold">Cancelar</button>}
        </div>
      </form>
    </div>
  );
}

function PaymentSettings({ account, onSave }: { account: Account; onSave: (account: Account) => void }) {
  const [pixKey, setPixKey] = useState(account.pixKey);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    onSave({ ...account, pixKey: pixKey.trim() });
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5c2df2]">Recebimentos</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">Preferências de pagamento</h1>
      </div>
      <form onSubmit={handleSubmit} className={`${cardClass} space-y-5`}>
        <div className="rounded-xl border border-[#5c2df2]/15 bg-[#f7f5fa] p-4 text-sm leading-6 text-[#4c4560]">
          O PayArt está em modo de demonstração. Os pagamentos fictícios não movimentam dinheiro; nenhuma conta bancária ou provedor de pagamento está conectado.
        </div>
        <label className="block text-sm font-semibold">
          Chave Pix demonstrativa (opcional)
          <input value={pixKey} onChange={(event) => setPixKey(event.target.value)} className={inputClass} placeholder="CPF, e-mail, telefone ou chave aleatória" />
          <span className="mt-2 block text-xs font-normal text-[#746e80]">Este dado é apenas ilustrativo e não participa de cobranças nem de transferências.</span>
        </label>
        {error && <Toast type="error" message={error} />}
        <button type="submit" className="rounded-xl bg-[#5c2df2] px-6 py-3 font-bold text-white">Salvar preferência</button>
      </form>
    </div>
  );
}
