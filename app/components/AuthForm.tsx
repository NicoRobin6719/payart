"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AccountRole, authenticate, createAccount } from "./account-store";
import Toast from "./Toast";

type AuthFormProps = {
  mode: "login" | "cadastro";
  defaultRole?: AccountRole;
  redirectTo?: string;
};

export default function AuthForm({ mode, defaultRole = "buyer", redirectTo = "/painel" }: AuthFormProps) {
  const isSignup = mode === "cadastro";
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AccountRole>(defaultRole);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (isSignup && name.trim().length < 2) {
      setStatus("error");
      setMessage("Informe seu nome completo.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus("error");
      setMessage("Informe um e-mail válido.");
      return;
    }
    if (password.length < 6) {
      setStatus("error");
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setStatus("loading");
    try {
      if (isSignup) {
        await createAccount({
          name: name.trim(),
          email: email.trim(),
          phone,
          role,
        }, password);
      } else {
        await authenticate(email.trim(), password);
      }
      setStatus("success");
      setMessage(isSignup ? "Cadastro realizado com sucesso!" : "Login realizado com sucesso!");
      router.push(isSignup ? "/painel" : redirectTo);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 max-w-xl space-y-5 rounded-[24px] border border-black/5 bg-white/70 p-8 shadow-lg">
      {isSignup && (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">Como você quer usar o PayArt?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["buyer", "Quero comprar", "Descubra e salve obras de arte."],
              ["artist", "Quero vender", "Publique e gerencie suas obras."],
            ] as const).map(([value, title, description]) => (
              <label key={value} className={`cursor-pointer rounded-2xl border p-4 transition ${role === value ? "border-[#5c2df2] bg-[#f4efff]" : "border-black/10 bg-white hover:border-[#5c2df2]/50"}`}>
                <input className="sr-only" type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} />
                <span className="block font-bold">{title}</span>
                <span className="mt-1 block text-sm font-normal text-[#5f586d]">{description}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {isSignup && (
        <label className="block text-sm font-semibold">
          Nome
          <input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3" type="text" autoComplete="name" />
        </label>
      )}
      {isSignup && (
        <label className="block text-sm font-semibold">
          Telefone
          <input value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3" type="tel" placeholder="(00) 00000-0000" />
        </label>
      )}
      <label className="block text-sm font-semibold">
        E-mail
        <input required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3" type="email" autoComplete="email" />
      </label>
      <label className="block text-sm font-semibold">
        Senha
        <input required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3" type="password" minLength={6} autoComplete={isSignup ? "new-password" : "current-password"} />
      </label>
      {message && (
        <Toast
          type={status === "success" ? "success" : "error"}
          message={message}
        />
      )}
      <button disabled={status === "loading" || status === "success"} className="w-full rounded-xl bg-gradient-to-r from-[#5c2df2] to-[#ff53c6] px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" type="submit">
        {status === "loading" ? "Processando..." : isSignup ? "Criar conta" : "Entrar"}
      </button>
      <p className="text-xs leading-5 text-[#746e80]">
        Protótipo: seus dados de cadastro ficam salvos somente neste navegador. Pagamentos ainda não são processados.
      </p>
      <p className="text-sm text-[#5f586d]">
        {isSignup ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
        <Link href={isSignup ? "/login" : "/cadastro"} className="font-bold text-[#5c2df2]">
          {isSignup ? "Entrar" : "Cadastrar"}
        </Link>
      </p>
    </form>
  );
}
