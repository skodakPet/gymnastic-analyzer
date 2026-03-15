"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    if (error) { setError(error.message); setLoading(false); }
    else setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-xl font-bold text-[#1a3a5c] mb-2">Zkontrolujte e-mail</h2>
          <p className="text-gray-500 text-sm">Poslali jsme vám potvrzovací odkaz na <strong>{email}</strong>.</p>
          <Link href="/login" className="mt-6 block text-[#2563a8] text-sm font-semibold hover:underline">Zpět na přihlášení</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[#1a3a5c]">Gym<span className="text-[#e85d26]">Analyze</span></h1>
          <p className="text-gray-500 mt-1 text-sm">Vytvořte si účet</p>
        </div>
        <form onSubmit={handleRegister} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-5">
          {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jméno</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563a8]"
              placeholder="Petr Škoda"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563a8]"
              placeholder="vas@email.cz"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Heslo</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563a8]"
              placeholder="min. 6 znaků"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-[#1a3a5c] text-white rounded-lg py-2.5 font-semibold text-sm hover:bg-[#2563a8] transition-colors disabled:opacity-60"
          >
            {loading ? "Registruji…" : "Vytvořit účet"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-5">
          Již máte účet?{" "}
          <Link href="/login" className="text-[#2563a8] font-semibold hover:underline">Přihlásit se</Link>
        </p>
      </div>
    </div>
  );
}
