"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildRecoveryKey,
  parseRecoverySnapshot,
  shouldOfferRecovery,
  type ArticleFormFields,
  type RecoverySnapshot,
} from "@/lib/article-editing";

type Options = {
  articleId?: string;
  fields: ArticleFormFields;
  isDirty: boolean;
  serverUpdatedAt?: string | null;
};

export function useArticleRecovery({
  articleId,
  fields,
  isDirty,
  serverUpdatedAt,
}: Options) {
  const key = useMemo(() => buildRecoveryKey(articleId), [articleId]);
  const initializedKey = useRef<string | null>(null);
  const [recovery, setRecovery] = useState<RecoverySnapshot | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const snapshot = parseRecoverySnapshot(window.localStorage.getItem(key));
      setRecovery(
        snapshot && shouldOfferRecovery(snapshot, serverUpdatedAt) ? snapshot : null
      );
    } catch {
      setRecovery(null);
    } finally {
      initializedKey.current = key;
    }
  }, [key, serverUpdatedAt]);

  useEffect(() => {
    if (initializedKey.current !== key || !isDirty) return;

    const timeout = window.setTimeout(() => {
      const snapshot: RecoverySnapshot = {
        ...fields,
        savedAt: new Date().toISOString(),
      };

      try {
        window.localStorage.setItem(key, JSON.stringify(snapshot));
        setLastSavedAt(snapshot.savedAt);
      } catch {
        // Storage can be unavailable in private or locked-down browsers.
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [fields, isDirty, key]);

  const clearRecovery = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // No action is required when the browser blocks local storage access.
    }
    setRecovery(null);
    setLastSavedAt(null);
  }, [key]);

  return {
    recovery,
    lastSavedAt,
    clearRecovery,
    discardRecovery: clearRecovery,
  };
}
