"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Account, getAccounts, getLocalArtistAccounts, localAccountUpdatedEvent } from "./account-store";
import { firestore } from "./firebase-client";
import { PublicArtwork, subscribeToPublicArtworks } from "./catalog-store";

export default function useRegisteredAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [artworks, setArtworks] = useState<PublicArtwork[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cloudAccounts: Account[] = [];
    const loadAccounts = async () => {
      try {
        cloudAccounts = await getAccounts();
        if (!cancelled) {
          setAccounts(cloudAccounts);
          setReady(true);
        }
      } catch (issue) {
        if (!cancelled) {
          setAccounts([...cloudAccounts, ...getLocalArtistAccounts().filter((local) => !cloudAccounts.some((cloud) => cloud.id === local.id))]);
          setError(issue instanceof Error ? issue.message : "Não foi possível carregar os perfis.");
          setReady(true);
        }
      }
    };
    const handleLocalUpdate = () => { void loadAccounts(); };
    window.addEventListener(localAccountUpdatedEvent, handleLocalUpdate);
    window.addEventListener("storage", handleLocalUpdate);
    void loadAccounts();

    const unsubscribeArtwork = subscribeToPublicArtworks((publicArtworks) => {
      if (!cancelled) {
        setArtworks(publicArtworks);
        setReady(true);
      }
    }, (issue) => {
      if (!cancelled) {
        setError(issue.message);
        setReady(true);
      }
    });
    const unsubscribeProfiles = onSnapshot(collection(firestore, "profiles"), () => {
      void loadAccounts();
    }, (issue) => {
      if (!cancelled && issue.code !== "not-found") setError(issue.message);
    });
    const unsubscribeArtworks = onSnapshot(collection(firestore, "artworks"), () => {
      void loadAccounts();
    }, (issue) => {
      if (!cancelled && issue.code !== "not-found") setError(issue.message);
    });
    return () => {
      cancelled = true;
      unsubscribeArtwork();
      unsubscribeProfiles();
      unsubscribeArtworks();
      window.removeEventListener(localAccountUpdatedEvent, handleLocalUpdate);
      window.removeEventListener("storage", handleLocalUpdate);
    };
  }, []);

  return { accounts, artworks, error, ready };
}
