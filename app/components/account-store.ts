export type AccountRole = "artist" | "buyer";

export type Artwork = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  image: string;
};

export type Account = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AccountRole;
  passwordHash: string;
  passwordSalt: string;
  bio: string;
  avatar: string;
  banner: string;
  pixKey: string;
  artworks: Artwork[];
};

const ACCOUNTS_KEY = "payart.accounts";
const SESSION_KEY = "payart.session";

export function getAccounts(): Account[] {
  const storedAccounts = window.localStorage.getItem(ACCOUNTS_KEY);
  if (!storedAccounts) return [];

  try {
    const accounts: unknown = JSON.parse(storedAccounts);
    if (!Array.isArray(accounts)) {
      throw new Error("Os dados de contas estão em um formato inválido.");
    }
    return accounts as Account[];
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Não foi possível ler as contas salvas neste navegador.");
    }
    throw error;
  }
}

function saveAccounts(accounts: Account[]) {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    throw new Error("Não foi possível salvar os dados. Libere espaço no navegador e tente novamente.");
  }
}

async function hashPassword(password: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const hash = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createAccount(
  account: Omit<Account, "id" | "passwordHash" | "passwordSalt" | "bio" | "avatar" | "banner" | "pixKey" | "artworks">,
  password: string,
) {
  const accounts = getAccounts();
  if (accounts.some((savedAccount) => savedAccount.email.toLowerCase() === account.email.toLowerCase())) {
    throw new Error("Já existe uma conta cadastrada com este e-mail.");
  }

  const passwordSalt = window.crypto.randomUUID();
  const newAccount: Account = {
    ...account,
    id: window.crypto.randomUUID(),
    passwordSalt,
    passwordHash: await hashPassword(password, passwordSalt),
    bio: "",
    avatar: "",
    banner: "",
    pixKey: "",
    artworks: [],
  };
  saveAccounts([...accounts, newAccount]);
  return newAccount;
}

export async function authenticate(email: string, password: string) {
  const account = getAccounts().find((savedAccount) => savedAccount.email.toLowerCase() === email.toLowerCase());
  if (!account || (await hashPassword(password, account.passwordSalt)) !== account.passwordHash) {
    throw new Error("E-mail ou senha inválidos.");
  }

  try {
    window.localStorage.setItem(SESSION_KEY, account.id);
  } catch {
    throw new Error("Não foi possível iniciar a sessão neste navegador.");
  }
  return account;
}

export function getCurrentAccount() {
  const accountId = window.localStorage.getItem(SESSION_KEY);
  if (!accountId) return null;
  return getAccounts().find((account) => account.id === accountId) ?? null;
}

export function updateAccount(updatedAccount: Account) {
  const accounts = getAccounts();
  if (!accounts.some((account) => account.id === updatedAccount.id)) {
    throw new Error("Esta conta não está mais disponível neste navegador. Entre novamente.");
  }
  saveAccounts(accounts.map((account) => account.id === updatedAccount.id ? updatedAccount : account));
}

export function signOut() {
  window.localStorage.removeItem(SESSION_KEY);
}
