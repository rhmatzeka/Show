"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push("/admin/dashboard");
      } else {
        setError(data.error || "Invalid username or password");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-white p-4">
      <div className="w-full max-w-md border border-black p-8 md:p-12 shadow-sm bg-white">
        <div className="border-b border-black pb-4 mb-6">
          <h1 className="text-3xl font-black font-display uppercase tracking-tight">
            Admin Portal
          </h1>
          <p className="text-xs uppercase font-sans font-bold text-black/60 mt-1">
            Sign in to manage projects
          </p>
        </div>

        {error && (
          <div className="border border-black bg-black text-white text-xs uppercase font-bold p-3 mb-6">
            Error: {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs uppercase font-sans font-bold text-black">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-black p-3 font-sans text-sm focus:outline-none focus:bg-black/5"
              placeholder="e.g. admin"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase font-sans font-bold text-black">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-black p-3 font-sans text-sm focus:outline-none focus:bg-black/5"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 border border-black font-sans font-bold text-xs uppercase tracking-widest bg-black text-white hover:bg-white hover:text-black transition-colors duration-200"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 border-t border-black/10 pt-4 flex justify-between text-[10px] font-sans font-bold uppercase text-black/40">
              <span>Rahmat CMS</span>
          <a href="/" className="hover:underline text-black/60 hover:text-black">
            Back to Website
          </a>
        </div>
      </div>
    </div>
  );
}
