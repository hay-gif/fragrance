"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type RawMaterial = {
  id: string;
  name: string;
};

type RawMaterialDocument = {
  id: string;
  createdAt: string;
  rawMaterialId: string;
  documentType: string;
  title: string;
  supplierName: string;
  documentVersion: string;
  validFrom: string;
  validUntil: string;
  fileUrl: string;
  filePath: string;
  notes: string;
};

type DbRawMaterialRow = {
  id: string;
  name: string;
};

type DbRawMaterialDocumentRow = {
  id: string;
  created_at: string;
  raw_material_id: string;
  document_type: string;
  title: string;
  supplier_name: string | null;
  document_version: string | null;
  valid_from: string | null;
  valid_until: string | null;
  file_url: string;
  file_path: string;
  notes: string | null;
};

export default function RawMaterialDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [documents, setDocuments] = useState<RawMaterialDocument[]>([]);

  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState("");
  const [documentType, setDocumentType] = useState("sds");
  const [title, setTitle] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [documentVersion, setDocumentVersion] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      const [rawMaterialResult, documentResult] = await Promise.all([
        supabase
          .from("raw_materials")
          .select("id, name")
          .order("name", { ascending: true }),
        supabase
          .from("raw_material_documents")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (rawMaterialResult.error) {
        console.error(
          "Fehler beim Laden der Rohstoffe:",
          rawMaterialResult.error,
        );
        setLoading(false);
        return;
      }

      if (documentResult.error) {
        console.error(
          "Fehler beim Laden der Rohstoff-Dokumente:",
          documentResult.error,
        );
        setLoading(false);
        return;
      }

      setRawMaterials(
        (rawMaterialResult.data ?? []).map((row: DbRawMaterialRow) => ({
          id: row.id,
          name: row.name,
        })),
      );

      setDocuments(
        (documentResult.data ?? []).map((row: DbRawMaterialDocumentRow) => ({
          id: row.id,
          createdAt: row.created_at,
          rawMaterialId: row.raw_material_id,
          documentType: row.document_type,
          title: row.title,
          supplierName: row.supplier_name ?? "",
          documentVersion: row.document_version ?? "",
          validFrom: row.valid_from ?? "",
          validUntil: row.valid_until ?? "",
          fileUrl: row.file_url,
          filePath: row.file_path,
          notes: row.notes ?? "",
        })),
      );

      setLoading(false);
    }

    loadData();
  }, []);

  const rawMaterialMap = useMemo(
    () => new Map(rawMaterials.map((row) => [row.id, row.name])),
    [rawMaterials],
  );

  async function handleUpload(file: File) {
    if (!selectedRawMaterialId) {
      setMessage("Bitte zuerst einen Rohstoff auswählen.");
      return;
    }

    if (!title.trim()) {
      setMessage("Bitte zuerst einen Dokumenttitel eingeben.");
      return;
    }

    setUploading(true);
    setMessage("");

    const sanitizedFileName = file.name.replace(/\s+/g, "-");
    const filePath = `${selectedRawMaterialId}/${crypto.randomUUID()}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("raw-material-documents")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      console.error("Fehler beim Upload:", uploadError);
      setMessage("Datei konnte nicht hochgeladen werden.");
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("raw-material-documents")
      .getPublicUrl(filePath);

    const documentId = crypto.randomUUID();

    const payload = {
      id: documentId,
      raw_material_id: selectedRawMaterialId,
      document_type: documentType,
      title: title.trim(),
      supplier_name: supplierName.trim(),
      document_version: documentVersion.trim(),
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      file_url: publicUrlData.publicUrl,
      file_path: filePath,
      notes: notes.trim(),
    };

    const { error: insertError } = await supabase
      .from("raw_material_documents")
      .insert(payload as never);

    if (insertError) {
      console.error(
        "Fehler beim Speichern des Rohstoff-Dokuments:",
        insertError,
      );
      setMessage(
        "Datei wurde hochgeladen, aber Datensatz konnte nicht gespeichert werden.",
      );
      setUploading(false);
      return;
    }

    setDocuments((prev) => [
      {
        id: documentId,
        createdAt: new Date().toISOString(),
        rawMaterialId: selectedRawMaterialId,
        documentType,
        title: title.trim(),
        supplierName: supplierName.trim(),
        documentVersion: documentVersion.trim(),
        validFrom,
        validUntil,
        fileUrl: publicUrlData.publicUrl,
        filePath,
        notes: notes.trim(),
      },
      ...prev,
    ]);

    setTitle("");
    setSupplierName("");
    setDocumentVersion("");
    setValidFrom("");
    setValidUntil("");
    setNotes("");
    setMessage("Dokument erfolgreich hochgeladen.");
    setUploading(false);
  }

  async function deleteDocument(document: RawMaterialDocument) {
    setDeletingId(document.id);
    setMessage("");

    const { error: storageError } = await supabase.storage
      .from("raw-material-documents")
      .remove([document.filePath]);

    if (storageError) {
      console.error("Fehler beim Löschen aus dem Storage:", storageError);
    }

    const { error: deleteError } = await supabase
      .from("raw_material_documents")
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

  if (loading) {
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
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Raw Material Documents</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/inventory/raw-materials" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Raw Materials</Link>
            <Link href="/inventory" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Inventory</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Dokument hochladen</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Rohstoff</label>
              <select
                value={selectedRawMaterialId}
                onChange={(e) => setSelectedRawMaterialId(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="">Bitte wählen</option>
                {rawMaterials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Dokumenttyp</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="sds">SDS</option>
                <option value="ifra">IFRA</option>
                <option value="coa">COA</option>
                <option value="allergen_statement">Allergen Statement</option>
                <option value="specification">Specification</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Titel</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="z. B. SDS Supplier X 2026"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Lieferant</label>
              <input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Version</label>
              <input
                value={documentVersion}
                onChange={(e) => setDocumentVersion(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Gültig ab</label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Gültig bis</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Notizen</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Datei</label>
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
            <p className="mt-2 text-sm text-[#9E9890]">Datei wird hochgeladen...</p>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Dokumentenliste</h2>

          {documents.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Noch keine Rohstoff-Dokumente vorhanden.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {documents.map((document) => (
                <div key={document.id} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0A0A0A]">{document.title}</h3>
                      <p className="text-xs text-[#9E9890] mt-1">
                        Rohstoff: {rawMaterialMap.get(document.rawMaterialId) ?? "Unbekannt"}
                      </p>
                      <p className="text-xs text-[#9E9890]">Typ: {document.documentType}</p>
                      {document.supplierName && (
                        <p className="text-xs text-[#9E9890]">Lieferant: {document.supplierName}</p>
                      )}
                      {document.documentVersion && (
                        <p className="text-xs text-[#9E9890]">Version: {document.documentVersion}</p>
                      )}
                      {document.validUntil && (
                        <p className="text-xs text-[#9E9890]">Gültig bis: {document.validUntil}</p>
                      )}
                      {document.notes && (
                        <p className="mt-2 text-xs text-[#6E6860]">{document.notes}</p>
                      )}
                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-xs text-[#3A3530] underline underline-offset-2"
                      >
                        Dokument öffnen
                      </a>
                    </div>

                    <button
                      onClick={() => deleteDocument(document)}
                      disabled={deletingId === document.id}
                      className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-[#F0EDE8]"
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
