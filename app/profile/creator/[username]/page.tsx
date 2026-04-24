"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyCreatorRedirect() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  useEffect(() => {
    if (username) {
      router.replace(`/creator/${username}`);
    }
  }, [username, router]);

  return (
    <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-[#0A0A0A] border-t-transparent animate-spin" />
        <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Weiterleitung</p>
      </div>
    </main>
  );
}
