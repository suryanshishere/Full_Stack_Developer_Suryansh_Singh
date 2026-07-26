"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function LiveToast() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const latestId = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/leads?pageSize=1&sort=createdAt&order=desc");
        if (!res.ok || cancelled) return;
        const body = await res.json();
        const newest = body.data?.[0];
        if (!newest) return;
        if (latestId.current && latestId.current !== newest.id) {
          setMessage(`✨ New lead just arrived: ${newest.name}`);
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => setMessage(""), 6000);
          router.refresh();
        }
        latestId.current = newest.id;
      } catch {
        return;
      }
    }

    poll();
    const interval = setInterval(() => {
      if (!document.hidden) poll();
    }, 12000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  if (!message) return null;
  return (
    <div className="fixed right-5 bottom-5 z-50 rounded-md border border-line bg-paper px-4 py-2.5 text-sm shadow-lg">
      {message}
    </div>
  );
}
