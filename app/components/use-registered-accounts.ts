"use client";

import { useEffect, useState } from "react";
import { Account, getAccounts } from "./account-store";

export default function useRegisteredAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setAccounts(getAccounts());
      } catch (issue) {
        setError(issue instanceof Error ? issue.message : "Não foi possível carregar os perfis.");
      } finally {
        setReady(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return { accounts, error, ready };
}
