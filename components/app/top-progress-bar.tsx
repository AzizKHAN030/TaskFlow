"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MIN_VISIBLE_MS = 260;
const COMPLETE_DELAY_MS = 180;

type Phase = "idle" | "loading" | "completing";

function isInternalNavigation(target: HTMLAnchorElement) {
  if (target.target && target.target !== "_self") return false;
  if (target.hasAttribute("download")) return false;

  const href = target.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  const url = new URL(target.href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  const current = `${window.location.pathname}${window.location.search}`;
  const next = `${url.pathname}${url.search}`;
  return current !== next;
}

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);

  const startedAt = useRef(0);
  const trickleInterval = useRef<number | null>(null);
  const completeTimeout = useRef<number | null>(null);

  const clearTimers = () => {
    if (trickleInterval.current) {
      window.clearInterval(trickleInterval.current);
      trickleInterval.current = null;
    }
    if (completeTimeout.current) {
      window.clearTimeout(completeTimeout.current);
      completeTimeout.current = null;
    }
  };

  const start = () => {
    if (phase === "loading") return;

    clearTimers();
    startedAt.current = Date.now();
    setPhase("loading");
    setProgress(12);

    trickleInterval.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;
        const remaining = 92 - current;
        const step = Math.max(1.5, remaining * 0.14);
        return Math.min(92, current + step);
      });
    }, 180);
  };

  const complete = () => {
    if (phase !== "loading") return;

    clearTimers();
    const elapsed = Date.now() - startedAt.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);

    completeTimeout.current = window.setTimeout(() => {
      setPhase("completing");
      setProgress(100);

      completeTimeout.current = window.setTimeout(() => {
        setPhase("idle");
        setProgress(0);
      }, COMPLETE_DELAY_MS);
    }, wait);
  };

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInternalNavigation(anchor)) return;

      start();
    };

    const onPopState = () => {
      start();
    };

    window.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
  });

  useEffect(() => {
    complete();
  }, [pathname, searchParams?.toString()]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[2px]">
      <div
        className="h-full origin-left bg-primary transition-[transform,opacity] duration-200"
        style={{
          transform: `scaleX(${progress / 100})`,
          opacity: phase === "idle" ? 0 : 1
        }}
      />
    </div>
  );
}
