"use client";

import { useState, useEffect } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) window.location.href = "/dashboard";
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Hard-code API for debugging to avoid NEXT_PUBLIC variable issues
      const API_BASE = "http://localhost:8000/v1";
      const url = `${API_BASE}/auth/login`;
      console.log("🔍 Attempting login:", url); // Debug log

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log("🔍 Response status:", res.status);
      const data = await res.json();
      console.log("🔍 Response data:", data);

      if (!res.ok) throw new Error(data.detail || "Invalid credentials");

      localStorage.setItem("access_token", data.access_token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("❌ Login failed:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="max-w-sm w-full border rounded-lg shadow-md p-8 bg-white">
        <h1 className="text-2xl font-bold mb-6">Login to ConsentVault</h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-md px-3 py-2 w-full"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded-md px-3 py-2 w-full"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}
