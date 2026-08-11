"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/check");
        if (res.ok) {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/admin/login");
        }
      } catch (err) {
        router.replace("/admin/login");
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div className="w-screen h-screen flex justify-center items-center font-sans font-bold text-lg bg-white uppercase tracking-widest text-black">
      Redirecting...
    </div>
  );
}
