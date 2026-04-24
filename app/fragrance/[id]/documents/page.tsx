"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Fragrance = {
  id: string;
  name: string;
};

type FragranceDocument = {
  id: string;
  createdAt: string;
  fragranceId: string;
  documentType: string;
  title: string;
  fileUrl: string;
  filePath: string;
  notes: string;
};

type DbFragranceRow = {
  id: string;
  name: string;
};

type DbFragranceDocumentRow = {
  id: string;
  created_at: string;
  fragrance_id: string;
  document_type: string;
  title: string;
  file_url: string;
  file_path: string;
  notes: string | null;
};

export default function FragranceDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [fragrance, setFragrance] = useState<Fragrance | null>(null);
  const [documents, setDocuments] = useState<FragranceDocument[]>([]);
  const [message, setMessage] = useState("");

  const [documentType, setDocumentType] = useState("ifra");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await params;

      const { data: fragranceRow, error: fragranceError } = await supabase
        .from("fragrances")
        .select("id, name")
        .eq("id", resolvedParams.id)
        .single();

      if (fragranceError || !fragranceRow) {
        console.error("Fehler beim Laden des Dufts:", fragranceError);
        setLoading(false);
        return;
      }

      setFragrance({
        id: (fragranceRow as DbFragranceRow).id,
        name: (fragranceRow as DbFragranceRow).name,
      });

      const { data: documentRows, error: documentsError } = await supabase
        .from("fragrance_documents")
        .select("*")
        .eq("fragrance_id", resolvedParams.id)
        .order("created_at", { ascending: false });

      if (documentsError) {
        console.error("Fehler beim Laden der Dokumente:", documentsError);
        setLoading(false);
        return;
      }

      const mappedDocuments: FragranceDocument[] = (documentRows ?? []).map(
        (row: DbFragranceDocumentRow) => ({
          id: row.id,
          createdAt: row.created_at,
          fragranceId: row.fragrance_id,
          documentType: row.document_type,
          title: row.title,
          fileUrl: row.file_url,
          filePath: row.file_path,
          notes: row.notes ?? "",
        }),
      );

      setDocuments(mappedDocuments);
      setLoading(false);
    }

    loadData();
  }, [params]);

  async function handleUpload(file: File) {
    if (!fragrance) return;

    if (!title.trim()) {
      setMessage("Bitte gib zuerst einen Dokumenttitel ein.");
      return;
    }

    setUploading(true);
    setMessage("");

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const filePath = `${fragrance.id}/${crypto.randomUUID()}-${file.name.replace(/\s+/g, "-")}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("fragrance-documents")
      .upload(filePath, file, {
        upsert: false,
      });

    if (uploadError) {
      console.error("Fehler beim Hochladen des Dokuments:", uploadError);
      setMessage("Dokument konnte nicht hochgeladen werden.");
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("fragrance-documents")
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData.publicUrl;
    const documentId = crypto.randomUUID();

    const { error: insertError } = await supabase
      .from("fragrance_documents")
      .insert({
        id: documentId,
        fragrance_id: fragrance.id,
        document_type: documentType,
        title: title.trim(),
        file_url: fileUrl,
        file_path: filePath,
        notes: notes.trim(),
      });

    if (insertError) {
      console.error("Fehler beim Speichern des Dokuments:", insertError);
      setMessage(
        "Datei wurde hochgeladen, aber nicht in der Datenbank gespeichert.",
      );
      setUploading(false);
      return;
    }

    setDocuments((prev) => [
      {
        id: documentId,
        createdAt: new Date().toISOString(),
        fragranceId: fragrance.id,
        documentType,
        title: title.trim(),
        fileUrl,
        filePath,
        notes: notes.trim(),
      },
      ...prev,
    ]);

    setTitle("");
    setNotes("");
    setMessage("Dokument erfolgreich hochgeladen.");
    setUploading(false);
  }

  async function deleteDocument(document: FragranceDocument) {
    setDeletingId(document.id);
    setMessage("");

    const { error: storageError } = await supabase.storage
      .from("fragrance-documents")
      .remove([document.filePath]);

    if (storageError) {
      console.error("Fehler beim Löschen aus dem Storage:", storageError);
    }

    const { error: deleteError } = await supabase
      .from("fragrance_documents")
      .delete()
      .eq("id", document.id);

    if (deleteError) {
      console.error("Fehler beim Löschen des Dokuments:", deleteError);
      setMessage("Dokument konnte nicht gelöscht werden.");
      setDeletingId(null);
      return;
    }

    setDocuments((prev) => prev.filter((row) => row.id !== document.id));
    setMessage("Dokument gelöscht.");
    setDeletingId(null);
  }

  const groupedCounts = useMemo(() => {
    return {
      ifra: documents.filter((d) => d.documentType === "ifra").length,
      sds: documents.filter((d) => d.documentType === "sds").length,
      cpsr: documents.filter((d) => d.documentType === "cpsr").length,
      label: documents.filter((d) => d.documentType === "label_review").length,
      packaging: documents.filter((d) => d.documentType === "packaging_review")
        .length,
      stability: documents.filter((d) => d.documentType === "stability").length,
      other: documents.filter((d) => d.documentType === "other").length,
    };
  }, [documents]);

  if (loading || !fragrance) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#0A0A0A] border-t-transparent animate-spin" />
          <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Lädt</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8 relative">
        <Link
          href={`/fragrance/${fragrance.id}/documentation`}
          className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] text-white/70 backdrop-blur-sm transition-all hover:bg-white/20"
        >
          ← Zurück
        </Link>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Duft-Dokumente</h1>
        <p className="mt-1 text-sm text-white/50">{fragrance.name}</p>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="grid gap-4 grid-cols-4 xl:grid-cols-7">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">IFRA</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{groupedCounts.ifra}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">SDS</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{groupedCounts.sds}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">CPSR</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{groupedCounts.cpsr}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Label</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{groupedCounts.label}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Pack.</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{groupedCounts.packaging}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Stab.</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{groupedCounts.stability}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Sonst.</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{groupedCounts.other}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Dokument hochladen</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Dokumenttyp
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="ifra">IFRA</option>
                <option value="sds">SDS</option>
                <option value="cpsr">CPSR</option>
                <option value="label_review">Label Review</option>
                <option value="packaging_review">Packaging Review</option>
                <option value="stability">Stability</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">Titel</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="z. B. IFRA Certificate Supplier X"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">Notizen</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">Datei</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              className="block w-full text-sm text-[#6E6860]"
            />
          </div>

          {message && <p className="mt-4 text-sm text-[#6E6860]">{message}</p>}
          {uploading && (
            <p className="mt-2 text-[10px] uppercase tracking-widest text-[#9E9890]">
              Wird hochgeladen...
            </p>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Dokumentenliste</h2>

          {documents.length === 0 ? (
            <p className="mt-4 text-sm text-[#9E9890]">
              Noch keine Dokumente vorhanden.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {documents.map((document) => (
                <div key={document.id} className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-4 transition-all hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0A0A0A]">
                        {document.title}
                      </h3>
                      <p className="mt-1 text-xs text-[#9E9890] uppercase tracking-widest">
                        {document.documentType}
                      </p>
                      <p className="text-xs text-[#C5C0B8]">
                        {new Date(document.createdAt).toLocaleString("de-DE")}
                      </p>
                      {document.notes && (
                        <p className="mt-2 text-sm text-[#6E6860]">
                          {document.notes}
                        </p>
                      )}
                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-xs underline text-[#3A3530]"
                      >
                        Dokument öffnen
                      </a>
                    </div>

                    <button
                      onClick={() => deleteDocument(document)}
                      disabled={deletingId === document.id}
                      className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs text-[#6E6860] transition-all hover:border-[#0A0A0A] hover:text-[#0A0A0A] active:scale-95 disabled:opacity-40"
                    >
                      {deletingId === document.id ? "Löscht..." : "Löschen"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
