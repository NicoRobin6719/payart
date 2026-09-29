import MessagesCenter from "../components/MessagesCenter";
import Link from "next/link";

export default function MensagensPage() {
  return (
    <main className="min-h-screen bg-[#f3f0ee] px-5 py-8 text-[#17131f] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold tracking-[-0.08em]">Pay<span className="text-[#5c2df2]">Art</span><span className="text-[#ff53c6]">.</span></Link>
          <Link href="/painel" className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold">Minha conta</Link>
        </header>
        <MessagesCenter />
      </div>
    </main>
  );
}
