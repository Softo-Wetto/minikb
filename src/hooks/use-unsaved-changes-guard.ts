"use client";

import { useCallback, useEffect, useRef } from "react";

const DEFAULT_MESSAGE = "Are you sure you want to leave without saving changes?";

export function useUnsavedChangesGuard(
  isDirty: boolean,
  message = DEFAULT_MESSAGE,
) {
  const bypassNextNavigationRef = useRef(false);

  const allowNextNavigation = useCallback(() => {
    bypassNextNavigationRef.current = true;
  }, []);

  useEffect(() => {
    if (!isDirty) {
      bypassNextNavigationRef.current = false;
    }
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypassNextNavigationRef.current) return;

      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, message]);

  useEffect(() => {
    if (!isDirty) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (bypassNextNavigationRef.current) return;

      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const nextUrl = new URL(link.href, window.location.href);
      if (nextUrl.href === window.location.href) return;

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [isDirty, message]);

  useEffect(() => {
    if (!isDirty) return;

    const currentUrl = window.location.href;
    window.history.pushState({ ...window.history.state, __minikbUnsavedGuard: true }, "", currentUrl);

    const handlePopState = () => {
      if (bypassNextNavigationRef.current) return;
      if (window.confirm(message)) return;

      window.history.pushState(
        { ...window.history.state, __minikbUnsavedGuard: true },
        "",
        currentUrl,
      );
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDirty, message]);

  return allowNextNavigation;
}
