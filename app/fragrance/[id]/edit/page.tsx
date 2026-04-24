"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getReleaseBlockers } from "@/lib/releaseGuard";
import ImageEditor from "@/components/ImageEditor";

type SampleStatus = "not_requested" | "requested" | "shipped" | "tested";
type SampleRequestStatus = "requested" | "shipped" | "received" | "tested";

type Fragrance = {
  id: string;
  name: string;
  description: string;
  category: string;
  sampleStatus: SampleStatus;
  ownerId: string | null;
  imageUrl: string;
  isPublic: boolean;
};

type DbFragranceRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  sample_status: SampleStatus;
  owner_id: string | null;
  image_url: string | null;
  is_public: boolean;
};

type SampleRequest = {
  id: string;
  fragranceId: string;
  creatorId: string;
  status: SampleRequestStatus;
  createdAt: string;
};

type DbSampleRequestRow = {
  id: string;
  fragrance_id: string;
  creator_id: string;
  status: SampleRequestStatus;
  created_at: string;
};

type Accord = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

type FragranceAccord = {
  id: string;
  fragranceId: string;
  accordId: string;
  percentage: number;
};

type DbAccordRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type DbFragranceAccordRow = {
  id: string;
  fragrance_id: string;
  accord_id: string;
  percentage: number;
};

type ComplianceProfile = {
  productName: string;
  intendedUse: string;
  responsiblePerson: string;
  hasIfraDocument: boolean;
  hasSdsDocuments: boolean;
  hasCpsr: boolean;
  hasAllergenReview: boolean;
  hasLabelReview: boolean;
  hasPackagingReview: boolean;
  hasStabilityReview: boolean;
};

type FragranceDocument = {
  id: string;
  documentType: string;
};

type Intensity = "edt" | "edp" | "extrait" | "edc" | "mist";

type FragranceVariant = {
  id: string;
  fragranceId: string;
  sizeMl: number;
  intensity: Intensity;
  priceCents: number;
  stockQty: number;
  isActive: boolean;
};

type DbFragranceVariantRow = {
  id: string;
  fragrance_id: string;
  size_ml: number;
  intensity: string;
  price_cents: number;
  stock_qty: number;
  is_active: boolean;
};

type DbComplianceRow = {
  product_name: string | null;
  intended_use: string | null;
  responsible_person: string | null;
  has_ifra_document: boolean;
  has_sds_documents: boolean;
  has_cpsr: boolean;
  has_allergen_review: boolean;
  has_label_review: boolean;
  has_packaging_review: boolean;
  has_stability_review: boolean;
};

function mapDbFragrance(row: DbFragranceRow): Fragrance {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: row.category ?? "",
    sampleStatus: row.sample_status,
    ownerId: row.owner_id,
    imageUrl: row.image_url ?? "",
    isPublic: row.is_public,
  };
}

function defaultComplianceProfile(fragranceName: string): ComplianceProfile {
  return {
    productName: fragranceName,
    intendedUse: "Parfüm zur äußeren Anwendung auf der Haut.",
    responsiblePerson: "",
    hasIfraDocument: false,
    hasSdsDocuments: false,
    hasCpsr: false,
    hasAllergenReview: false,
    hasLabelReview: false,
    hasPackagingReview: false,
    hasStabilityReview: false,
  };
}

function getSampleStatusLabel(status: SampleStatus): string {
  if (status === "not_requested") return "nicht angefordert";
  if (status === "requested") return "angefordert";
  if (status === "shipped") return "versendet";
  return "getestet";
}

function getSampleRequestStatusLabel(status: SampleRequestStatus): string {
  if (status === "requested") return "angefordert";
  if (status === "shipped") return "versendet";
  if (status === "received") return "erhalten";
  return "getestet";
}

export default function EditFragrancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [fragrance, setFragrance] = useState<Fragrance | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageEditorFile, setImageEditorFile] = useState<File | null>(null);
  const [sampleRequest, setSampleRequest] = useState<SampleRequest | null>(
    null,
  );
  const [requestingSample, setRequestingSample] = useState(false);

  const [accords, setAccords] = useState<Accord[]>([]);
  const [fragranceAccords, setFragranceAccords] = useState<FragranceAccord[]>(
    [],
  );
  const [selectedAccordId, setSelectedAccordId] = useState("");
  const [newAccordPercentage, setNewAccordPercentage] = useState("");
  const [editingAccordPercentages, setEditingAccordPercentages] = useState<
    Record<string, string>
  >({});
  const [savingAccordRowId, setSavingAccordRowId] = useState<string | null>(
    null,
  );
  const [deletingAccordRowId, setDeletingAccordRowId] = useState<string | null>(
    null,
  );
  const [addingAccord, setAddingAccord] = useState(false);

  const [profile, setProfile] = useState<ComplianceProfile | null>(null);
  const [documents, setDocuments] = useState<FragranceDocument[]>([]);

  const [variants, setVariants] = useState<FragranceVariant[]>([]);
  const [variantSizeMl, setVariantSizeMl] = useState("50");
  const [variantIntensity, setVariantIntensity] = useState<Intensity>("edp");
  const [variantPriceCents, setVariantPriceCents] = useState("");
  const [variantStockQty, setVariantStockQty] = useState("0");
  const [savingVariant, setSavingVariant] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [editingVariants, setEditingVariants] = useState<Record<string, { priceCents: string; stockQty: string; isActive: boolean }>>({});
  const [updatingVariantId, setUpdatingVariantId] = useState<string | null>(null);

  useEffect(() => {
    async function loadFragrance() {
      const resolvedParams = await params;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("fragrances")
        .select(
          "id, name, description, category, sample_status, owner_id, image_url, is_public",
        )
        .eq("id", resolvedParams.id)
        .single();

      if (error || !data) {
        console.error("Fehler beim Laden des Dufts:", error);
        setLoading(false);
        return;
      }

      const mapped = mapDbFragrance(data);

      if (mapped.ownerId !== user.id) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }

      setFragrance(mapped);
      setDescription(mapped.description);
      setCategory(mapped.category);

      const { data: complianceRow, error: complianceError } = await supabase
        .from("fragrance_compliance_profiles")
        .select(
          "product_name, intended_use, responsible_person, has_ifra_document, has_sds_documents, has_cpsr, has_allergen_review, has_label_review, has_packaging_review, has_stability_review",
        )
        .eq("fragrance_id", resolvedParams.id)
        .maybeSingle();

      if (complianceError) {
        console.error(
          "Fehler beim Laden des Compliance-Profils:",
          complianceError,
        );
        setProfile(defaultComplianceProfile(mapped.name));
      } else if (!complianceRow) {
        setProfile(defaultComplianceProfile(mapped.name));
      } else {
        const row = complianceRow as DbComplianceRow;

        setProfile({
          productName: row.product_name ?? mapped.name,
          intendedUse: row.intended_use ?? "",
          responsiblePerson: row.responsible_person ?? "",
          hasIfraDocument: row.has_ifra_document,
          hasSdsDocuments: row.has_sds_documents,
          hasCpsr: row.has_cpsr,
          hasAllergenReview: row.has_allergen_review,
          hasLabelReview: row.has_label_review,
          hasPackagingReview: row.has_packaging_review,
          hasStabilityReview: row.has_stability_review,
        });
      }

      const { data: documentRows, error: documentsError } = await supabase
        .from("fragrance_documents")
        .select("id, document_type")
        .eq("fragrance_id", resolvedParams.id);

      if (documentsError) {
        console.error("Fehler beim Laden der Dokumente:", documentsError);
        setDocuments([]);
      } else {
        setDocuments(
          (documentRows ?? []).map(
            (row: { id: string; document_type: string }) => ({
              id: row.id,
              documentType: row.document_type,
            }),
          ),
        );
      }

      const { data: requestData, error: requestError } = await supabase
        .from("sample_requests")
        .select("*")
        .eq("fragrance_id", resolvedParams.id)
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (requestError) {
        console.error("Fehler beim Laden des Sample-Requests:", requestError);
      } else if (requestData) {
        const mappedRequest: SampleRequest = {
          id: (requestData as DbSampleRequestRow).id,
          fragranceId: (requestData as DbSampleRequestRow).fragrance_id,
          creatorId: (requestData as DbSampleRequestRow).creator_id,
          status: (requestData as DbSampleRequestRow).status,
          createdAt: (requestData as DbSampleRequestRow).created_at,
        };
        setSampleRequest(mappedRequest);
      }

      const { data: accordRows, error: accordError } = await supabase
        .from("accords")
        .select("id, name, description, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (accordError) {
        console.error("Fehler beim Laden der Accorde:", accordError);
      } else {
        const mappedAccords: Accord[] = (accordRows ?? []).map(
          (row: DbAccordRow) => ({
            id: row.id,
            name: row.name,
            description: row.description ?? "",
            isActive: row.is_active,
          }),
        );
        setAccords(mappedAccords);
      }

      const { data: fragranceAccordRows, error: fragranceAccordError } =
        await supabase
          .from("fragrance_accords")
          .select("id, fragrance_id, accord_id, percentage")
          .eq("fragrance_id", resolvedParams.id)
          .order("created_at", { ascending: false });

      if (fragranceAccordError) {
        console.error(
          "Fehler beim Laden der Duft-Accorde:",
          fragranceAccordError,
        );
      } else {
        const mappedFragranceAccords: FragranceAccord[] = (
          fragranceAccordRows ?? []
        ).map((row: DbFragranceAccordRow) => ({
          id: row.id,
          fragranceId: row.fragrance_id,
          accordId: row.accord_id,
          percentage: Number(row.percentage),
        }));

        setFragranceAccords(mappedFragranceAccords);

        const initialEditing: Record<string, string> = {};
        for (const row of mappedFragranceAccords) {
          initialEditing[row.id] = String(row.percentage);
        }
        setEditingAccordPercentages(initialEditing);
      }

      const { data: variantRows } = await supabase
        .from("fragrance_variants")
        .select("*")
        .eq("fragrance_id", resolvedParams.id)
        .order("size_ml", { ascending: true });

      const mappedVariants: FragranceVariant[] = (variantRows ?? []).map(
        (row: DbFragranceVariantRow) => ({
          id: row.id,
          fragranceId: row.fragrance_id,
          sizeMl: row.size_ml,
          intensity: row.intensity as Intensity,
          priceCents: row.price_cents,
          stockQty: row.stock_qty,
          isActive: row.is_active,
        }),
      );
      setVariants(mappedVariants);

      const initialEditingVariants: Record<string, { priceCents: string; stockQty: string; isActive: boolean }> = {};
      for (const v of mappedVariants) {
        initialEditingVariants[v.id] = {
          priceCents: String(v.priceCents),
          stockQty: String(v.stockQty),
          isActive: v.isActive,
        };
      }
      setEditingVariants(initialEditingVariants);

      setLoading(false);
    }

    loadFragrance();
  }, [params]);

  const accordMap = useMemo(() => {
    return new Map(accords.map((accord) => [accord.id, accord]));
  }, [accords]);

  const accordPercentageSum = useMemo(() => {
    return fragranceAccords.reduce((sum, row) => sum + row.percentage, 0);
  }, [fragranceAccords]);

  const canPublishByMetadata = useMemo(() => {
    if (!fragrance) return false;

    return (
      fragrance.sampleStatus === "tested" &&
      category.trim().length > 0 &&
      description.trim().length > 0
    );
  }, [fragrance, category, description]);

  const formulaSum = useMemo(() => {
    return fragranceAccords.reduce((sum, row) => sum + row.percentage, 0);
  }, [fragranceAccords]);

  const releaseBlockers = useMemo(() => {
    if (!fragrance || !profile) return [];

    return getReleaseBlockers({
      fragrance: {
        description: description,
        category: category,
        imageUrl: fragrance.imageUrl,
        sampleStatus: fragrance.sampleStatus,
      },
      accords: fragranceAccords.map((row) => ({
        percentage: row.percentage,
      })),
      formulaSum,
      profile: {
        productName: profile.productName,
        intendedUse: profile.intendedUse,
        responsiblePerson: profile.responsiblePerson,
        hasIfraDocument: profile.hasIfraDocument,
        hasSdsDocuments: profile.hasSdsDocuments,
        hasCpsr: profile.hasCpsr,
        hasAllergenReview: profile.hasAllergenReview,
        hasLabelReview: profile.hasLabelReview,
        hasPackagingReview: profile.hasPackagingReview,
        hasStabilityReview: profile.hasStabilityReview,
      },
      documents: documents.map((doc) => ({
        documentType: doc.documentType,
      })),
    });
  }, [
    fragrance,
    fragranceAccords,
    formulaSum,
    profile,
    documents,
    description,
    category,
  ]);

  async function saveMetadata() {
    if (!fragrance) return;

    setMessage("");

    const trimmedDescription = description.trim();
    const trimmedCategory = category.trim();

    const shouldStayPublic =
      fragrance.isPublic &&
      fragrance.sampleStatus === "tested" &&
      trimmedCategory.length > 0 &&
      trimmedDescription.length > 0;

    const { error } = await supabase
      .from("fragrances")
      .update({
        description: trimmedDescription,
        category: trimmedCategory,
        is_public: shouldStayPublic,
      })
      .eq("id", fragrance.id);

    if (error) {
      console.error("Fehler beim Speichern:", error);
      setMessage("Speichern fehlgeschlagen.");
      return;
    }

    setFragrance((prev) =>
      prev
        ? {
            ...prev,
            description: trimmedDescription,
            category: trimmedCategory,
            isPublic: shouldStayPublic,
          }
        : prev,
    );

    if (fragrance.isPublic && !shouldStayPublic) {
      setMessage(
        "Metadaten gespeichert. Der Duft wurde automatisch privat gesetzt, weil Pflichtangaben für eine Veröffentlichung fehlen.",
      );
    } else {
      setMessage("Metadaten gespeichert.");
    }
  }

  async function requestSample() {
    if (!fragrance) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Bitte logge dich ein.");
      return;
    }

    if (fragrance.sampleStatus !== "not_requested" || sampleRequest) {
      alert(
        "Für diesen Duft existiert bereits eine Sample-Anfrage oder er wurde schon verarbeitet.",
      );
      return;
    }

    setRequestingSample(true);
    setMessage("");

    const requestId = crypto.randomUUID();

    const { error: requestError } = await supabase
      .from("sample_requests")
      .insert({
        id: requestId,
        fragrance_id: fragrance.id,
        creator_id: user.id,
        status: "requested",
      });

    if (requestError) {
      console.error("Fehler beim Anlegen der Sample-Anfrage:", requestError);
      setMessage("Sample konnte nicht angefordert werden.");
      setRequestingSample(false);
      return;
    }

    const { error: fragranceError } = await supabase
      .from("fragrances")
      .update({ sample_status: "requested" })
      .eq("id", fragrance.id);

    if (fragranceError) {
      console.error(
        "Fehler beim Aktualisieren des Duft-Status:",
        fragranceError,
      );
      setMessage(
        "Sample-Anfrage wurde erstellt, aber der Duftstatus konnte nicht aktualisiert werden.",
      );
      setRequestingSample(false);
      return;
    }

    setSampleRequest({
      id: requestId,
      fragranceId: fragrance.id,
      creatorId: user.id,
      status: "requested",
      createdAt: new Date().toISOString(),
    });

    setFragrance((prev) =>
      prev ? { ...prev, sampleStatus: "requested" } : prev,
    );

    setMessage("Sample erfolgreich angefordert.");
    setRequestingSample(false);
  }

  async function addVariant() {
    if (!fragrance) return;

    const priceCents = Number(variantPriceCents);
    const stockQty = Number(variantStockQty);
    const sizeMl = Number(variantSizeMl);

    if (!variantSizeMl || isNaN(sizeMl) || sizeMl <= 0) {
      alert("Bitte gültige Größe in ml eingeben.");
      return;
    }
    if (isNaN(priceCents) || priceCents < 0) {
      alert("Bitte gültigen Preis in Cent eingeben.");
      return;
    }

    const existing = variants.find(
      (v) => v.sizeMl === sizeMl && v.intensity === variantIntensity,
    );
    if (existing) {
      alert(
        `Diese Kombination (${sizeMl}ml · ${variantIntensity.toUpperCase()}) existiert bereits.`,
      );
      return;
    }

    setSavingVariant(true);
    const id = crypto.randomUUID();

    const { error } = await supabase.from("fragrance_variants").insert({
      id,
      fragrance_id: fragrance.id,
      size_ml: sizeMl,
      intensity: variantIntensity,
      price_cents: priceCents,
      stock_qty: stockQty,
      is_active: true,
    });

    if (error) {
      alert("Variante konnte nicht gespeichert werden.");
      setSavingVariant(false);
      return;
    }

    const newVariant: FragranceVariant = {
      id,
      fragranceId: fragrance.id,
      sizeMl,
      intensity: variantIntensity,
      priceCents,
      stockQty,
      isActive: true,
    };

    setVariants((prev) =>
      [...prev, newVariant].sort((a, b) => a.sizeMl - b.sizeMl),
    );
    setEditingVariants((prev) => ({
      ...prev,
      [id]: { priceCents: String(priceCents), stockQty: String(stockQty), isActive: true },
    }));
    setVariantPriceCents("");
    setVariantStockQty("0");
    setSavingVariant(false);
  }

  async function updateVariant(variantId: string) {
    const vals = editingVariants[variantId];
    if (!vals) return;

    const priceCents = Number(vals.priceCents);
    const stockQty = Number(vals.stockQty);

    if (isNaN(priceCents) || priceCents < 0) {
      alert("Ungültiger Preis.");
      return;
    }

    setUpdatingVariantId(variantId);

    const { error } = await supabase
      .from("fragrance_variants")
      .update({ price_cents: priceCents, stock_qty: stockQty, is_active: vals.isActive })
      .eq("id", variantId);

    if (error) {
      alert("Variante konnte nicht aktualisiert werden.");
      setUpdatingVariantId(null);
      return;
    }

    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? { ...v, priceCents, stockQty, isActive: vals.isActive }
          : v,
      ),
    );
    setUpdatingVariantId(null);
  }

  async function deleteVariant(variantId: string) {
    if (!window.confirm("Variante löschen?")) return;

    setDeletingVariantId(variantId);

    const { error } = await supabase
      .from("fragrance_variants")
      .delete()
      .eq("id", variantId);

    if (error) {
      alert("Variante konnte nicht gelöscht werden.");
      setDeletingVariantId(null);
      return;
    }

    setVariants((prev) => prev.filter((v) => v.id !== variantId));
    setDeletingVariantId(null);
  }

  async function handleImageUpload(file: File) {
    if (!fragrance) return;

    setUploadingImage(true);
    setMessage("");

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${fragrance.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("fragrance-images")
      .upload(filePath, file, {
        upsert: false,
      });

    if (uploadError) {
      console.error("Fehler beim Hochladen:", uploadError);
      setMessage("Bild konnte nicht hochgeladen werden.");
      setUploadingImage(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("fragrance-images")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("fragrances")
      .update({
        image_url: publicUrl,
      })
      .eq("id", fragrance.id);

    if (updateError) {
      console.error("Fehler beim Speichern der Bild-URL:", updateError);
      setMessage(
        "Bild wurde hochgeladen, aber URL konnte nicht gespeichert werden.",
      );
      setUploadingImage(false);
      return;
    }

    setFragrance((prev) =>
      prev
        ? {
            ...prev,
            imageUrl: publicUrl,
          }
        : prev,
    );

    setMessage("Bild erfolgreich hochgeladen.");
    setUploadingImage(false);
  }

  function normalizeAccordRows(rows: FragranceAccord[]): FragranceAccord[] {
    const total = rows.reduce((sum, row) => sum + row.percentage, 0);

    if (total <= 0) return rows;

    return rows.map((row) => ({
      ...row,
      percentage: Number(((row.percentage / total) * 100).toFixed(4)),
    }));
  }

  function buildCompositionObject(rows: FragranceAccord[]) {
    return Object.fromEntries(
      rows.map((row) => [row.accordId, row.percentage]),
    );
  }

  async function syncFragranceCompositionSnapshot(
    nextRows: FragranceAccord[],
    fragranceId: string,
  ) {
    const composition = buildCompositionObject(nextRows);
    const total = Number(
      nextRows.reduce((sum, row) => sum + row.percentage, 0).toFixed(4),
    );

    const { error } = await supabase
      .from("fragrances")
      .update({
        composition,
        total,
      })
      .eq("id", fragranceId);

    if (error) {
      console.error(
        "Fehler beim Synchronisieren des Composition-Snapshots:",
        error,
      );
      return false;
    }

    return true;
  }

  async function addAccordToFragrance() {
    if (!fragrance) return;

    const parsed = Number(newAccordPercentage);

    if (!selectedAccordId) {
      setMessage("Bitte wähle einen Accord aus.");
      return;
    }

    if (Number.isNaN(parsed) || parsed <= 0) {
      setMessage("Bitte gib einen gültigen Prozentwert ein.");
      return;
    }

    const exists = fragranceAccords.find(
      (row) => row.accordId === selectedAccordId,
    );
    if (exists) {
      setMessage("Dieser Accord ist bereits im Duft enthalten.");
      return;
    }

    setAddingAccord(true);

    const id = crypto.randomUUID();

    const { error } = await supabase.from("fragrance_accords").insert({
      id,
      fragrance_id: fragrance.id,
      accord_id: selectedAccordId,
      percentage: parsed,
    });

    if (error) {
      console.error("Fehler beim Hinzufügen des Accords:", error);
      setMessage("Accord konnte nicht hinzugefügt werden.");
      setAddingAccord(false);
      return;
    }

    const newRow: FragranceAccord = {
      id,
      fragranceId: fragrance.id,
      accordId: selectedAccordId,
      percentage: parsed,
    };

    const nextRows = [newRow, ...fragranceAccords];
    const syncOk = await syncFragranceCompositionSnapshot(
      nextRows,
      fragrance.id,
    );

    if (!syncOk) {
      setMessage(
        "Accord wurde hinzugefügt, aber Snapshot nicht vollständig synchronisiert.",
      );
      setAddingAccord(false);
      return;
    }

    setFragranceAccords(nextRows);
    setEditingAccordPercentages((prev) => ({
      ...prev,
      [id]: String(parsed),
    }));
    setSelectedAccordId("");
    setNewAccordPercentage("");
    setMessage("Accord hinzugefügt.");
    setAddingAccord(false);
  }

  async function updateAccordRow(rowId: string) {
    if (!fragrance) return;

    const value = editingAccordPercentages[rowId];
    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      setMessage("Bitte gib einen gültigen Prozentwert ein.");
      return;
    }

    setSavingAccordRowId(rowId);

    const { error } = await supabase
      .from("fragrance_accords")
      .update({ percentage: parsed })
      .eq("id", rowId);

    if (error) {
      console.error("Fehler beim Speichern des Accord-Anteils:", error);
      setMessage("Accord-Anteil konnte nicht gespeichert werden.");
      setSavingAccordRowId(null);
      return;
    }

    const nextRows = fragranceAccords.map((row) =>
      row.id === rowId ? { ...row, percentage: parsed } : row,
    );

    const syncOk = await syncFragranceCompositionSnapshot(
      nextRows,
      fragrance.id,
    );

    if (!syncOk) {
      setMessage(
        "Accord-Anteil gespeichert, aber Snapshot nicht vollständig synchronisiert.",
      );
      setSavingAccordRowId(null);
      return;
    }

    setFragranceAccords(nextRows);
    setMessage("Accord-Anteil gespeichert.");
    setSavingAccordRowId(null);
  }

  async function normalizeAccordsTo100() {
    if (!fragrance) return;

    if (fragranceAccords.length === 0) {
      setMessage("Keine Accorde zum Normalisieren vorhanden.");
      return;
    }

    const normalizedRows = normalizeAccordRows(fragranceAccords);

    for (const row of normalizedRows) {
      const { error } = await supabase
        .from("fragrance_accords")
        .update({ percentage: row.percentage })
        .eq("id", row.id);

      if (error) {
        console.error("Fehler beim Normalisieren der Accorde:", error);
        setMessage("Accorde konnten nicht normalisiert werden.");
        return;
      }
    }

    const syncOk = await syncFragranceCompositionSnapshot(
      normalizedRows,
      fragrance.id,
    );

    if (!syncOk) {
      setMessage(
        "Accorde wurden normalisiert, aber Snapshot nicht vollständig synchronisiert.",
      );
      return;
    }

    setFragranceAccords(normalizedRows);

    const nextEditing: Record<string, string> = {};
    for (const row of normalizedRows) {
      nextEditing[row.id] = String(row.percentage);
    }
    setEditingAccordPercentages(nextEditing);

    setMessage("Accorde wurden auf 100% normalisiert.");
  }

  async function deleteAccordRow(rowId: string) {
    if (!fragrance) return;

    setDeletingAccordRowId(rowId);

    const { error } = await supabase
      .from("fragrance_accords")
      .delete()
      .eq("id", rowId);

    if (error) {
      console.error("Fehler beim Entfernen des Accords:", error);
      setMessage("Accord konnte nicht entfernt werden.");
      setDeletingAccordRowId(null);
      return;
    }

    const nextRows = fragranceAccords.filter((row) => row.id !== rowId);
    const syncOk = await syncFragranceCompositionSnapshot(
      nextRows,
      fragrance.id,
    );

    if (!syncOk) {
      setMessage(
        "Accord wurde entfernt, aber Snapshot nicht vollständig synchronisiert.",
      );
      setDeletingAccordRowId(null);
      return;
    }

    setFragranceAccords(nextRows);
    setMessage("Accord entfernt.");
    setDeletingAccordRowId(null);
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

  if (notAllowed || !fragrance) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <h1 className="text-3xl font-bold text-[#0A0A0A]">Kein Zugriff</h1>
          <p className="mt-3 text-sm text-[#6E6860]">
            Du kannst diesen Duft nicht bearbeiten.
          </p>
          <Link href="/my-fragrances" className="mt-4 inline-block text-sm text-[#6E6860] underline">
            Zurück zu meinen Düften
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8 relative">
        <Link
          href="/my-fragrances"
          className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] text-white/70 backdrop-blur-sm transition-all hover:bg-white/20"
        >
          ← Zurück
        </Link>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Duft bearbeiten</h1>
        <p className="mt-1 text-sm text-white/50">{fragrance.name}</p>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/fragrance/${fragrance.id}/documentation`}
            className="rounded-full border border-[#E5E0D8] px-4 py-2 text-sm text-[#6E6860] transition-all hover:shadow-md active:scale-95"
          >
            Dokumentation
          </Link>
          <Link
            href={`/fragrance/${fragrance.id}/documents`}
            className="rounded-full border border-[#E5E0D8] px-4 py-2 text-sm text-[#6E6860] transition-all hover:shadow-md active:scale-95"
          >
            Duft-Dokumente
          </Link>
          <Link
            href={`/fragrance/${fragrance.id}/dossier`}
            className="rounded-full border border-[#E5E0D8] px-4 py-2 text-sm text-[#6E6860] transition-all hover:shadow-md active:scale-95"
          >
            PIF / Dossier
          </Link>
          <Link
            href={`/fragrance/${fragrance.id}/inci`}
            className="rounded-full border border-[#E5E0D8] px-4 py-2 text-sm text-[#6E6860] transition-all hover:shadow-md active:scale-95"
          >
            INCI-Generator
          </Link>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Release-Center</h2>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-[#E5E0D8] px-3 py-1 text-[#6E6860]">
              Öffentlich: {fragrance.isPublic ? "Ja" : "Nein"}
            </span>
            <span className="rounded-full border border-[#E5E0D8] px-3 py-1 text-[#6E6860]">
              Sample: {getSampleStatusLabel(fragrance.sampleStatus)}
            </span>
            <span className="rounded-full border border-[#E5E0D8] px-3 py-1 text-[#6E6860]">
              Metadaten: {canPublishByMetadata ? "OK" : "Unvollständig"}
            </span>
            <span className="rounded-full border border-[#E5E0D8] px-3 py-1 text-[#6E6860]">
              Blocker: {releaseBlockers.length}
            </span>
          </div>

          {releaseBlockers.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Auf Basis der aktuell geladenen Edit-Daten wurden keine direkten
              Blocker erkannt. Die finale Freigabe bitte im Dossier prüfen.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {releaseBlockers.map((blocker, index) => (
                <div key={index} className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3 text-sm text-[#3A3530]">
                  {blocker}
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-[#9E9890]">
            Die finale Release-Freigabe erfolgt über das Dossier, weil dort
            zusätzlich SDS/IFRA-Coverage, Toxikologie und Dokumentstatus
            zusammenlaufen.
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Sample-Queue</h2>

          <p className="mt-2 text-sm text-[#6E6860]">
            Creator fordert das Sample an. Produktion verarbeitet und versendet
            es.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-[#E5E0D8] px-3 py-1 text-[#6E6860]">
              Duftstatus: {getSampleStatusLabel(fragrance.sampleStatus)}
            </span>

            {sampleRequest ? (
              <span className="rounded-full border border-[#E5E0D8] px-3 py-1 text-[#6E6860]">
                Queue-Status:{" "}
                {getSampleRequestStatusLabel(sampleRequest.status)}
              </span>
            ) : (
              <span className="rounded-full border border-[#E5E0D8] px-3 py-1 text-[#9E9890]">
                Noch kein Queue-Eintrag
              </span>
            )}
          </div>

          <div className="mt-4">
            {!sampleRequest && fragrance.sampleStatus === "not_requested" ? (
              <button
                onClick={requestSample}
                disabled={requestingSample}
                className="rounded-full bg-[#0A0A0A] px-6 py-2.5 text-sm text-white transition-all active:scale-95 disabled:opacity-40"
              >
                {requestingSample ? "Bitte warten..." : "Sample anfordern"}
              </button>
            ) : (
              <div className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3 text-sm text-[#6E6860]">
                {sampleRequest
                  ? "Für diesen Duft existiert bereits eine Sample-Anfrage oder das Sample befindet sich im Prozess."
                  : "Für diesen Duft wurde bereits ein Sample-Prozess gestartet."}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Bild</h2>

          {fragrance.imageUrl ? (
            <img
              src={fragrance.imageUrl}
              alt={fragrance.name}
              className="mt-4 h-56 w-full rounded-xl object-cover"
            />
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-[#E5E0D8] p-6 text-sm text-[#9E9890]">
              Noch kein Bild hochgeladen.
            </div>
          )}

          <div className="mt-4">
            <label className="block text-xs font-medium uppercase tracking-widest text-[#9E9890]">Bild hochladen</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setImageEditorFile(file);
                e.target.value = "";
              }}
              className="mt-2 block w-full text-sm text-[#6E6860]"
            />
            <p className="mt-2 text-xs text-[#9E9890]">
              Erlaubt: JPG, PNG, WebP · Bild wird vor dem Upload bearbeitet
            </p>
          </div>

          {imageEditorFile && (
            <ImageEditor
              file={imageEditorFile}
              aspectRatio={1}
              outputSize={800}
              title="Produktbild zuschneiden"
              onCancel={() => setImageEditorFile(null)}
              onConfirm={(blob) => {
                setImageEditorFile(null);
                handleImageUpload(new File([blob], "fragrance.jpg", { type: "image/jpeg" }));
              }}
            />
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Duft-Komposition</h2>
          <p className="mt-2 text-sm text-[#6E6860]">
            Hier stellst du die Mischung deines Dufts auf Accord-Ebene zusammen.
          </p>

          <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3 text-sm text-[#6E6860]">
            <p>
              <span className="font-medium text-[#0A0A0A]">Accord-Summe:</span>{" "}
              {accordPercentageSum.toFixed(4)}%
            </p>
            {accordPercentageSum > 100 && (
              <p className="mt-2 text-orange-600">Warnung: Die Summe liegt über 100%.</p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={normalizeAccordsTo100}
              className="rounded-full border border-[#E5E0D8] px-4 py-2 text-sm text-[#6E6860] transition-all hover:shadow-md active:scale-95"
            >
              Auf 100% normalisieren
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">Accord</label>
              <select
                value={selectedAccordId}
                onChange={(e) => setSelectedAccordId(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="">Bitte wählen</option>
                {accords.map((accord) => (
                  <option key={accord.id} value={accord.id}>
                    {accord.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Anteil in %
              </label>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={newAccordPercentage}
                onChange={(e) => setNewAccordPercentage(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>
          </div>

          <button
            onClick={addAccordToFragrance}
            disabled={addingAccord}
            className="mt-4 rounded-full bg-[#0A0A0A] px-6 py-2.5 text-sm text-white transition-all active:scale-95 disabled:opacity-40"
          >
            {addingAccord ? "Bitte warten..." : "Accord hinzufügen"}
          </button>

          <div className="mt-6 space-y-3">
            {fragranceAccords.length === 0 ? (
              <p className="text-sm text-[#9E9890]">
                Noch keine Accorde in diesem Duft hinterlegt.
              </p>
            ) : (
              fragranceAccords.map((row) => {
                const accord = accordMap.get(row.accordId);

                return (
                  <div key={row.id} className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-[#0A0A0A]">
                          {accord?.name ?? "Unbekannter Accord"}
                        </h3>
                        {accord?.description && (
                          <p className="mt-1 text-xs text-[#6E6860]">
                            {accord.description}
                          </p>
                        )}
                      </div>

                      <div className="w-44">
                        <input
                          type="number"
                          min={0}
                          step="0.0001"
                          value={editingAccordPercentages[row.id] ?? ""}
                          onChange={(e) =>
                            setEditingAccordPercentages((prev) => ({
                              ...prev,
                              [row.id]: e.target.value,
                            }))
                          }
                          className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                        />

                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => updateAccordRow(row.id)}
                            disabled={savingAccordRowId === row.id}
                            className="rounded-full border border-[#E5E0D8] px-3 py-1.5 text-xs text-[#6E6860] transition-all active:scale-95"
                          >
                            {savingAccordRowId === row.id ? "..." : "Speichern"}
                          </button>
                          <button
                            onClick={() => deleteAccordRow(row.id)}
                            disabled={deletingAccordRowId === row.id}
                            className="rounded-full border border-[#E5E0D8] px-3 py-1.5 text-xs text-[#6E6860] transition-all active:scale-95"
                          >
                            {deletingAccordRowId === row.id
                              ? "..."
                              : "Entfernen"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">Kategorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            >
              <option value="">Bitte wählen</option>
              <option value="fresh">Fresh</option>
              <option value="sweet">Sweet</option>
              <option value="woody">Woody</option>
              <option value="floral">Floral</option>
              <option value="clean">Clean</option>
              <option value="spicy">Spicy</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Beschreibe hier den Duft nach deinem Test."
              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            />
          </div>

          <button
            onClick={saveMetadata}
            className="mt-6 rounded-full bg-[#0A0A0A] px-6 py-2.5 text-sm text-white transition-all active:scale-95"
          >
            Metadaten speichern
          </button>

          {(message || uploadingImage) && (
            <p className="mt-3 text-sm text-[#6E6860]">
              {uploadingImage ? "Bild wird hochgeladen..." : message}
            </p>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Varianten</h2>
          <p className="mt-1 text-sm text-[#9E9890]">
            Größen und Konzentrationen, die zum Kauf angeboten werden.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">Größe (ml)</label>
              <select
                value={variantSizeMl}
                onChange={(e) => setVariantSizeMl(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="10">10 ml</option>
                <option value="30">30 ml</option>
                <option value="50">50 ml</option>
                <option value="100">100 ml</option>
                <option value="200">200 ml</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">Konzentration</label>
              <select
                value={variantIntensity}
                onChange={(e) => setVariantIntensity(e.target.value as Intensity)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="edc">Eau de Cologne (EdC)</option>
                <option value="edt">Eau de Toilette (EdT)</option>
                <option value="edp">Eau de Parfum (EdP)</option>
                <option value="extrait">Extrait de Parfum</option>
                <option value="mist">Body Mist</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">Preis (Cent)</label>
              <input
                type="number"
                min={0}
                value={variantPriceCents}
                onChange={(e) => setVariantPriceCents(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="z.B. 8900 = 89,00 €"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">Lagerbestand</label>
              <input
                type="number"
                min={0}
                value={variantStockQty}
                onChange={(e) => setVariantStockQty(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>
          </div>

          <button
            onClick={addVariant}
            disabled={savingVariant}
            className="mt-4 rounded-full bg-[#0A0A0A] px-6 py-2.5 text-sm text-white transition-all active:scale-95 disabled:opacity-40"
          >
            {savingVariant ? "Bitte warten..." : "Variante hinzufügen"}
          </button>

          {variants.length === 0 ? (
            <p className="mt-6 text-sm text-[#9E9890]">Noch keine Varianten angelegt.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {variants.map((v) => (
                <div key={v.id} className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-4 transition-all hover:shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[#0A0A0A]">
                        {v.sizeMl} ml ·{" "}
                        <span className="text-[#9E9890]">
                          {v.intensity === "extrait"
                            ? "Extrait de Parfum"
                            : v.intensity === "edp"
                              ? "Eau de Parfum"
                              : v.intensity === "edt"
                                ? "Eau de Toilette"
                                : v.intensity === "edc"
                                  ? "Eau de Cologne"
                                  : "Body Mist"}
                        </span>
                      </p>
                      <p className="text-xs text-[#9E9890]">
                        {(v.priceCents / 100).toFixed(2)} € · Bestand: {v.stockQty}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={editingVariants[v.id]?.priceCents ?? ""}
                          onChange={(e) =>
                            setEditingVariants((prev) => ({
                              ...prev,
                              [v.id]: { ...(prev[v.id] ?? { priceCents: "", stockQty: "0", isActive: true }), priceCents: e.target.value },
                            }))
                          }
                          className="w-28 rounded-xl border border-[#E5E0D8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          placeholder="Preis (ct)"
                        />
                        <input
                          type="number"
                          min={0}
                          value={editingVariants[v.id]?.stockQty ?? ""}
                          onChange={(e) =>
                            setEditingVariants((prev) => ({
                              ...prev,
                              [v.id]: { ...(prev[v.id] ?? { priceCents: "", stockQty: "0", isActive: true }), stockQty: e.target.value },
                            }))
                          }
                          className="w-20 rounded-xl border border-[#E5E0D8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          placeholder="Bestand"
                        />
                        <label className="flex items-center gap-1 text-xs text-[#6E6860]">
                          <input
                            type="checkbox"
                            checked={editingVariants[v.id]?.isActive ?? true}
                            onChange={(e) =>
                              setEditingVariants((prev) => ({
                                ...prev,
                                [v.id]: { ...(prev[v.id] ?? { priceCents: "", stockQty: "0", isActive: true }), isActive: e.target.checked },
                              }))
                            }
                          />
                          Aktiv
                        </label>
                      </div>

                      <button
                        onClick={() => updateVariant(v.id)}
                        disabled={updatingVariantId === v.id}
                        className="rounded-full border border-[#E5E0D8] px-3 py-1.5 text-xs text-[#6E6860] transition-all active:scale-95"
                      >
                        {updatingVariantId === v.id ? "..." : "Speichern"}
                      </button>
                      <button
                        onClick={() => deleteVariant(v.id)}
                        disabled={deletingVariantId === v.id}
                        className="rounded-full border border-[#E5E0D8] px-3 py-1.5 text-xs text-red-600 transition-all active:scale-95"
                      >
                        {deletingVariantId === v.id ? "..." : "Löschen"}
                      </button>
                    </div>
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
