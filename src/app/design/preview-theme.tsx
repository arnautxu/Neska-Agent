"use client";
import { useEffect, type ReactNode } from "react";
import { UiLocaleProvider } from "@/i18n/provider";
export function PreviewTheme({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const visual = root.dataset.visualTheme;
    const theme = root.dataset.theme;
    root.dataset.visualTheme = "neska"; root.dataset.theme = "light";
    // The installation theme provider can hydrate after this preview mounts.
    const observer = new MutationObserver(() => {
      if (root.dataset.theme !== "light") root.dataset.theme = "light";
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      observer.disconnect();
      if (visual) root.dataset.visualTheme = visual; else delete root.dataset.visualTheme;
      if (theme) root.dataset.theme = theme; else delete root.dataset.theme;
    };
  }, []);
  return <UiLocaleProvider locale="ca">{children}</UiLocaleProvider>;
}
