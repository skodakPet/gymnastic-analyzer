"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFilePick(f: File) {
    setFile(f);
    if (!name) setName(f.name.replace(/\.pdf$/i, "").replace(/_/g, " "));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setError("");

    const fd = new FormData();
    fd.append("pdf", file);
    fd.append("name", name);
    if (date) fd.append("date", date);
    if (location) fd.append("location", location);

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();

    if (!res.ok) { setError(json.error || "Chyba nahrávání"); setLoading(false); }
    else router.push(`/competitions/${json.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1a3a5c] text-white px-6 h-14 flex items-center gap-4">
        <Link href="/" className="font-black text-lg">Gym<span className="text-[#f6a96e]">Analyze</span></Link>
        <span className="text-white/40">/</span>
        <span className="text-sm opacity-75">Nahrát soutěž</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-[#1a3a5c] mb-6">Nahrát výsledkovou listinu</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${drag ? "border-[#e85d26] bg-orange-50" : "border-gray-300 hover:border-[#2563a8] bg-white"} ${file ? "border-green-400 bg-green-50" : ""}`}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f?.type === "application/pdf") handleFilePick(f); }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFilePick(e.target.files[0]); }} />
            {file ? (
              <>
                <div className="text-3xl mb-2">✅</div>
                <p className="font-semibold text-green-700">{file.name}</p>
                <p className="text-sm text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} kB — klikněte pro změnu</p>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">📄</div>
                <p className="font-semibold text-gray-600">Přetáhněte PDF nebo klikněte pro výběr</p>
                <p className="text-sm text-gray-400 mt-1">Výsledková listina ve standardním formátu</p>
              </>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Informace o soutěži</h2>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Název soutěže *</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563a8]"
                placeholder="Poděbradská cvička 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Datum</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563a8]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Místo konání</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563a8]"
                  placeholder="Poděbrady" />
              </div>
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

          <div className="flex gap-3">
            <Link href="/" className="flex-1 text-center border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Zrušit
            </Link>
            <button type="submit" disabled={!file || loading}
              className="flex-1 bg-[#1a3a5c] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#2563a8] disabled:opacity-50 transition-colors">
              {loading ? "Zpracovávám PDF…" : "Nahrát a analyzovat"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
