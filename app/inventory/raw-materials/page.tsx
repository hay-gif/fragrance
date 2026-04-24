"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type RawMaterial = {
  id: string;
  createdAt: string;
  name: string;
  supplier: string;
  supplierReference: string;
  inciLabelName: string;
  category: string;
  unit: string;
  costPerUnitCents: number;
  stockQuantity: number;
  minimumStockQuantity: number;
  densityGPerMl: number | null;
  notes: string;
  isActive: boolean;
  isApprovedForUse: boolean;
  visibleInAccordBuilder: boolean;
  purityPercent: number | null;
  dilutionPercent: number | null;
  dilutionMedium: string;
  recommendedMaxPercentage: number | null;
  approvalNotes: string;
};

type RawMaterialSubstance = {
  id: string;
  createdAt: string;
  rawMaterialId: string;
  substanceName: string;
  inciName: string;
  percentage: number;
  isAllergen: boolean;
  isDeclarable: boolean;
  notes: string;
};

type DbRawMaterialRow = {
  id: string;
  created_at: string;
  name: string;
  supplier: string | null;
  supplier_reference: string | null;
  inci_label_name: string | null;
  category: string;
  unit: string;
  cost_per_unit_cents: number;
  stock_quantity: number;
  minimum_stock_quantity: number;
  density_g_per_ml: number | null;
  notes: string | null;
  is_active: boolean;
  is_approved_for_use: boolean;
  visible_in_accord_builder: boolean;
  purity_percent: number | null;
  dilution_percent: number | null;
  dilution_medium: string | null;
  recommended_max_percentage: number | null;
  approval_notes: string | null;
};

type DbRawMaterialSubstanceRow = {
  id: string;
  created_at: string;
  raw_material_id: string;
  substance_name: string;
  inci_name: string | null;
  percentage: number;
  is_allergen: boolean;
  is_declarable: boolean;
  notes: string | null;
};

type EditingSubstance = {
  substanceName: string;
  inciName: string;
  percentage: string;
  isAllergen: boolean;
  isDeclarable: boolean;
  notes: string;
};

function centsToEuro(value: number): string {
  return (value / 100).toFixed(4);
}

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [substances, setSubstances] = useState<RawMaterialSubstance[]>([]);
  const [loading, setLoading] = useState(true);

  const [savingMaterial, setSavingMaterial] = useState(false);
  const [savingSubstance, setSavingSubstance] = useState(false);
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);
  const [updatingSubstanceId, setUpdatingSubstanceId] = useState<string | null>(
    null,
  );
  const [deletingSubstanceId, setDeletingSubstanceId] = useState<string | null>(
    null,
  );

  const [isActive, setIsActive] = useState(true);
  const [isApprovedForUse, setIsApprovedForUse] = useState(false);
  const [visibleInAccordBuilder, setVisibleInAccordBuilder] = useState(false);
  const [purityPercent, setPurityPercent] = useState("");
  const [dilutionPercent, setDilutionPercent] = useState("");
  const [dilutionMedium, setDilutionMedium] = useState("");
  const [recommendedMaxPercentage, setRecommendedMaxPercentage] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");

  const [name, setName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [supplierReference, setSupplierReference] = useState("");
  const [inciLabelName, setInciLabelName] = useState("");
  const [category, setCategory] = useState("aroma_chemical");
  const [unit, setUnit] = useState("g");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [minimumStockQuantity, setMinimumStockQuantity] = useState("");
  const [densityGPerMl, setDensityGPerMl] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState("");
  const [substanceName, setSubstanceName] = useState("");
  const [substanceInciName, setSubstanceInciName] = useState("");
  const [substancePercentage, setSubstancePercentage] = useState("");
  const [substanceIsAllergen, setSubstanceIsAllergen] = useState(false);
  const [substanceIsDeclarable, setSubstanceIsDeclarable] = useState(true);
  const [substanceNotes, setSubstanceNotes] = useState("");
  

  const [editingStocks, setEditingStocks] = useState<
    Record<string, { stock: string; minimum: string }>
  >({});

  const [editingSubstances, setEditingSubstances] = useState<
    Record<string, EditingSubstance>
  >({});

  useEffect(() => {
    async function loadData() {
      const { data: rawMaterialRows, error: materialsError } = await supabase
        .from("raw_materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (materialsError) {
        console.error("Fehler beim Laden der Rohstoffe:", materialsError);
        setLoading(false);
        return;
      }

      const { data: substanceRows, error: substancesError } = await supabase
        .from("raw_material_substances")
        .select("*")
        .order("created_at", { ascending: false });

      if (substancesError) {
        console.error(
          "Fehler beim Laden der Rohstoff-Bestandteile:",
          substancesError,
        );
        setLoading(false);
        return;
      }

const mappedMaterials: RawMaterial[] = (rawMaterialRows ?? []).map(
  (row: DbRawMaterialRow) => ({
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    supplier: row.supplier ?? "",
    supplierReference: row.supplier_reference ?? "",
    inciLabelName: row.inci_label_name ?? "",
    category: row.category,
    unit: row.unit,
    costPerUnitCents: Number(row.cost_per_unit_cents),
    stockQuantity: Number(row.stock_quantity),
    minimumStockQuantity: Number(row.minimum_stock_quantity ?? 0),
    densityGPerMl:
      row.density_g_per_ml === null ? null : Number(row.density_g_per_ml),
    notes: row.notes ?? "",
    isActive: row.is_active,
    isApprovedForUse: row.is_approved_for_use,
    visibleInAccordBuilder: row.visible_in_accord_builder,
    purityPercent:
      row.purity_percent === null ? null : Number(row.purity_percent),
    dilutionPercent:
      row.dilution_percent === null ? null : Number(row.dilution_percent),
    dilutionMedium: row.dilution_medium ?? "",
    recommendedMaxPercentage:
      row.recommended_max_percentage === null
        ? null
        : Number(row.recommended_max_percentage),
    approvalNotes: row.approval_notes ?? "",
  }),
);

      const mappedSubstances: RawMaterialSubstance[] = (
        substanceRows ?? []
      ).map((row: DbRawMaterialSubstanceRow) => ({
        id: row.id,
        createdAt: row.created_at,
        rawMaterialId: row.raw_material_id,
        substanceName: row.substance_name,
        inciName: row.inci_name ?? "",
        percentage: Number(row.percentage),
        isAllergen: row.is_allergen,
        isDeclarable: row.is_declarable,
        notes: row.notes ?? "",
      }));

      const initialEditingStocks: Record<
        string,
        { stock: string; minimum: string }
      > = {};
      for (const material of mappedMaterials) {
        initialEditingStocks[material.id] = {
          stock: String(material.stockQuantity),
          minimum: String(material.minimumStockQuantity),
        };
      }

      const initialEditingSubstances: Record<string, EditingSubstance> = {};
      for (const substance of mappedSubstances) {
        initialEditingSubstances[substance.id] = {
          substanceName: substance.substanceName,
          inciName: substance.inciName,
          percentage: String(substance.percentage),
          isAllergen: substance.isAllergen,
          isDeclarable: substance.isDeclarable,
          notes: substance.notes,
        };
      }

      setMaterials(mappedMaterials);
      setSubstances(mappedSubstances);
      setEditingStocks(initialEditingStocks);
      setEditingSubstances(initialEditingSubstances);

      if (mappedMaterials.length > 0) {
        setSelectedRawMaterialId(mappedMaterials[0].id);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  async function addRawMaterial() {
    const parsedPurity =
      purityPercent.trim().length > 0 ? Number(purityPercent) : null;
    const parsedDilution =
      dilutionPercent.trim().length > 0 ? Number(dilutionPercent) : null;
    const parsedRecommendedMax =
      recommendedMaxPercentage.trim().length > 0
        ? Number(recommendedMaxPercentage)
        : null;

    const parsedCost = Number(costPerUnit);
    const parsedStock = Number(stockQuantity);
    const parsedMinimum = Number(minimumStockQuantity || "0");
    const parsedDensity =
      densityGPerMl.trim().length > 0 ? Number(densityGPerMl) : null;


      if (
        parsedPurity !== null &&
        (Number.isNaN(parsedPurity) || parsedPurity < 0 || parsedPurity > 100)
      ) {
        alert("Bitte gib eine gültige Purity in % ein.");
        return;
      }

      if (
        parsedDilution !== null &&
        (Number.isNaN(parsedDilution) ||
          parsedDilution < 0 ||
          parsedDilution > 100)
      ) {
        alert("Bitte gib eine gültige Dilution in % ein.");
        return;
      }

      if (
        parsedRecommendedMax !== null &&
        (Number.isNaN(parsedRecommendedMax) ||
          parsedRecommendedMax < 0 ||
          parsedRecommendedMax > 100)
      ) {
        alert("Bitte gib eine gültige empfohlene Maximalgrenze in % ein.");
        return;
      }

    if (!name.trim()) {
      alert("Bitte gib einen Rohstoffnamen ein.");
      return;
    }

    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      alert("Bitte gib gültige Kosten pro Einheit ein.");
      return;
    }

    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      alert("Bitte gib einen gültigen Bestand ein.");
      return;
    }

    if (Number.isNaN(parsedMinimum) || parsedMinimum < 0) {
      alert("Bitte gib einen gültigen Mindestbestand ein.");
      return;
    }

    if (
      parsedDensity !== null &&
      (Number.isNaN(parsedDensity) || parsedDensity < 0)
    ) {
      alert("Bitte gib eine gültige Dichte ein.");
      return;
    }

    setSavingMaterial(true);

    const id = crypto.randomUUID();
    const costPerUnitCents = Math.round(parsedCost * 100);

    const { error } = await supabase.from("raw_materials").insert({
      id,
      name: name.trim(),
      supplier: supplier.trim(),
      supplier_reference: supplierReference.trim(),
      inci_label_name: inciLabelName.trim(),
      category: category.trim() || "aroma_chemical",
      unit: unit.trim() || "g",
      cost_per_unit_cents: costPerUnitCents,
      stock_quantity: parsedStock,
      minimum_stock_quantity: parsedMinimum,
      density_g_per_ml: parsedDensity,
      notes: notes.trim(),
      is_active: isActive,
      is_approved_for_use: isApprovedForUse,
      visible_in_accord_builder: visibleInAccordBuilder,
      purity_percent: parsedPurity,
      dilution_percent: parsedDilution,
      dilution_medium: dilutionMedium.trim(),
      recommended_max_percentage: parsedRecommendedMax,
      approval_notes: approvalNotes.trim(),
    });

    if (error) {
      console.error("Fehler beim Speichern des Rohstoffs:", error);
      alert("Rohstoff konnte nicht gespeichert werden.");
      setSavingMaterial(false);
      return;
    }

    const newMaterial: RawMaterial = {
      id,
      createdAt: new Date().toISOString(),
      name: name.trim(),
      supplier: supplier.trim(),
      supplierReference: supplierReference.trim(),
      inciLabelName: inciLabelName.trim(),
      category: category.trim() || "aroma_chemical",
      unit: unit.trim() || "g",
      costPerUnitCents,
      stockQuantity: parsedStock,
      minimumStockQuantity: parsedMinimum,
      densityGPerMl: parsedDensity,
      notes: notes.trim(),
      isActive: isActive,
      isApprovedForUse: isApprovedForUse,
      visibleInAccordBuilder: visibleInAccordBuilder,
      purityPercent: parsedPurity,
      dilutionPercent: parsedDilution,
      dilutionMedium: dilutionMedium.trim(),
      recommendedMaxPercentage: parsedRecommendedMax,
      approvalNotes: approvalNotes.trim(),
    };

    setMaterials((prev) => [newMaterial, ...prev]);
    setEditingStocks((prev) => ({
      ...prev,
      [id]: { stock: String(parsedStock), minimum: String(parsedMinimum) },
    }));

    if (!selectedRawMaterialId) {
      setSelectedRawMaterialId(id);
    }

    setName("");
    setSupplier("");
    setSupplierReference("");
    setInciLabelName("");
    setCategory("aroma_chemical");
    setUnit("g");
    setCostPerUnit("");
    setStockQuantity("");
    setMinimumStockQuantity("");
    setDensityGPerMl("");
    setNotes("");
    setSavingMaterial(false);
    setIsActive(true);
    setIsApprovedForUse(false);
    setVisibleInAccordBuilder(false);
    setPurityPercent("");
    setDilutionPercent("");
    setDilutionMedium("");
    setRecommendedMaxPercentage("");
    setApprovalNotes("");
  }

  async function uploadRawMaterialDocument(
    rawMaterialId: string,
    file: File,
    documentType: "sds" | "ifra" | "coa",
  ) {
    const filePath = `${rawMaterialId}/${crypto.randomUUID()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("raw-material-docs")
      .upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);
      alert("Upload fehlgeschlagen");
      return;
    }

    const { data } = supabase.storage
      .from("raw-material-docs")
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase
      .from("raw_material_documents")
      .insert({
        raw_material_id: rawMaterialId,
        document_type: documentType,
        file_url: data.publicUrl,
      });

    if (dbError) {
      console.error(dbError);
      alert("DB speichern fehlgeschlagen");
    } else {
      alert("Dokument hochgeladen");
    }
  }

  async function addSubstance() {
    const parsedPercentage = Number(substancePercentage);

    if (!selectedRawMaterialId) {
      alert("Bitte wähle zuerst einen Rohstoff aus.");
      return;
    }

    if (!substanceName.trim()) {
      alert("Bitte gib einen Stoffnamen ein.");
      return;
    }

    if (Number.isNaN(parsedPercentage) || parsedPercentage < 0) {
      alert("Bitte gib einen gültigen Prozentwert ein.");
      return;
    }

    setSavingSubstance(true);

    const id = crypto.randomUUID();

    const { error } = await supabase.from("raw_material_substances").insert({
      id,
      raw_material_id: selectedRawMaterialId,
      substance_name: substanceName.trim(),
      inci_name: substanceInciName.trim(),
      percentage: parsedPercentage,
      is_allergen: substanceIsAllergen,
      is_declarable: substanceIsDeclarable,
      notes: substanceNotes.trim(),
    });

    if (error) {
      console.error("Fehler beim Speichern des Bestandteils:", error);
      alert("Bestandteil konnte nicht gespeichert werden.");
      setSavingSubstance(false);
      return;
    }

    const newSubstance: RawMaterialSubstance = {
      id,
      createdAt: new Date().toISOString(),
      rawMaterialId: selectedRawMaterialId,
      substanceName: substanceName.trim(),
      inciName: substanceInciName.trim(),
      percentage: parsedPercentage,
      isAllergen: substanceIsAllergen,
      isDeclarable: substanceIsDeclarable,
      notes: substanceNotes.trim(),
    };

    setSubstances((prev) => [newSubstance, ...prev]);
    setEditingSubstances((prev) => ({
      ...prev,
      [id]: {
        substanceName: newSubstance.substanceName,
        inciName: newSubstance.inciName,
        percentage: String(newSubstance.percentage),
        isAllergen: newSubstance.isAllergen,
        isDeclarable: newSubstance.isDeclarable,
        notes: newSubstance.notes,
      },
    }));

    setSubstanceName("");
    setSubstanceInciName("");
    setSubstancePercentage("");
    setSubstanceIsAllergen(false);
    setSubstanceIsDeclarable(true);
    setSubstanceNotes("");
    setSavingSubstance(false);
  }

  async function updateSubstance(substanceId: string) {
    const values = editingSubstances[substanceId];
    if (!values) return;

    const parsedPercentage = Number(values.percentage);

    if (!values.substanceName.trim()) {
      alert("Bitte gib einen Stoffnamen ein.");
      return;
    }

    if (Number.isNaN(parsedPercentage) || parsedPercentage < 0) {
      alert("Bitte gib einen gültigen Prozentwert ein.");
      return;
    }

    setUpdatingSubstanceId(substanceId);

    const { error } = await supabase
      .from("raw_material_substances")
      .update({
        substance_name: values.substanceName.trim(),
        inci_name: values.inciName.trim(),
        percentage: parsedPercentage,
        is_allergen: values.isAllergen,
        is_declarable: values.isDeclarable,
        notes: values.notes.trim(),
      })
      .eq("id", substanceId);

    if (error) {
      console.error("Fehler beim Aktualisieren des Bestandteils:", error);
      alert("Bestandteil konnte nicht aktualisiert werden.");
      setUpdatingSubstanceId(null);
      return;
    }

    setSubstances((prev) =>
      prev.map((substance) =>
        substance.id === substanceId
          ? {
              ...substance,
              substanceName: values.substanceName.trim(),
              inciName: values.inciName.trim(),
              percentage: parsedPercentage,
              isAllergen: values.isAllergen,
              isDeclarable: values.isDeclarable,
              notes: values.notes.trim(),
            }
          : substance,
      ),
    );

    setUpdatingSubstanceId(null);
  }

  async function deleteSubstance(substanceId: string) {
    setDeletingSubstanceId(substanceId);

    const { error } = await supabase
      .from("raw_material_substances")
      .delete()
      .eq("id", substanceId);

    if (error) {
      console.error("Fehler beim Löschen des Bestandteils:", error);
      alert("Bestandteil konnte nicht gelöscht werden.");
      setDeletingSubstanceId(null);
      return;
    }

    setSubstances((prev) =>
      prev.filter((substance) => substance.id !== substanceId),
    );
    setDeletingSubstanceId(null);
  }

  async function saveStockSettings(rawMaterialId: string) {
    const values = editingStocks[rawMaterialId];
    if (!values) return;

    const parsedStock = Number(values.stock);
    const parsedMinimum = Number(values.minimum);

    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      alert("Bitte gib einen gültigen Bestand ein.");
      return;
    }

    if (Number.isNaN(parsedMinimum) || parsedMinimum < 0) {
      alert("Bitte gib einen gültigen Mindestbestand ein.");
      return;
    }

    const currentMaterial = materials.find(
      (material) => material.id === rawMaterialId,
    );
    if (!currentMaterial) return;

    const oldStock = currentMaterial.stockQuantity;
    const delta = parsedStock - oldStock;

    setUpdatingStockId(rawMaterialId);

    const { error } = await supabase
      .from("raw_materials")
      .update({
        stock_quantity: parsedStock,
        minimum_stock_quantity: parsedMinimum,
      })
      .eq("id", rawMaterialId);

    if (error) {
      console.error("Fehler beim Speichern der Lagerwerte:", error);
      alert("Lagerwerte konnten nicht gespeichert werden.");
      setUpdatingStockId(null);
      return;
    }

    if (delta !== 0) {
      const movementId = crypto.randomUUID();

      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert({
          id: movementId,
          item_type: "raw_material",
          item_id: rawMaterialId,
          movement_type: "manual_adjustment",
          quantity_delta: delta,
          unit: currentMaterial.unit,
          reference_type: "manual",
          reference_id: rawMaterialId,
          note: `Manuelle Bestandsanpassung für ${currentMaterial.name}`,
        });

      if (movementError) {
        console.error(
          "Fehler beim Speichern der Bestandsbewegung:",
          movementError,
        );
      }
    }

    setMaterials((prev) =>
      prev.map((material) =>
        material.id === rawMaterialId
          ? {
              ...material,
              stockQuantity: parsedStock,
              minimumStockQuantity: parsedMinimum,
            }
          : material,
      ),
    );

    setUpdatingStockId(null);
  }

  const selectedMaterial = useMemo(
    () =>
      materials.find((material) => material.id === selectedRawMaterialId) ??
      null,
    [materials, selectedRawMaterialId],
  );

  const selectedMaterialSubstances = useMemo(() => {
    return substances
      .filter((substance) => substance.rawMaterialId === selectedRawMaterialId)
      .sort((a, b) => b.percentage - a.percentage);
  }, [substances, selectedRawMaterialId]);

  const selectedMaterialSubstanceSum = useMemo(() => {
    return selectedMaterialSubstances.reduce(
      (sum, substance) => sum + substance.percentage,
      0,
    );
  }, [selectedMaterialSubstances]);

  const selectedMaterialDeclarableSubstances = useMemo(() => {
    return selectedMaterialSubstances.filter(
      (substance) => substance.isDeclarable,
    );
  }, [selectedMaterialSubstances]);

  const selectedMaterialAllergenSubstances = useMemo(() => {
    return selectedMaterialSubstances.filter(
      (substance) => substance.isAllergen,
    );
  }, [selectedMaterialSubstances]);

  const selectedMaterialInciPreview = useMemo(() => {
    return selectedMaterialDeclarableSubstances
      .map(
        (substance) =>
          substance.inciName.trim() || substance.substanceName.trim(),
      )
      .filter(Boolean)
      .join(", ");
  }, [selectedMaterialDeclarableSubstances]);

  const reorderedMaterials = useMemo(() => {
    return [...materials].sort((a, b) => {
      const aCritical = a.stockQuantity < a.minimumStockQuantity ? 1 : 0;
      const bCritical = b.stockQuantity < b.minimumStockQuantity ? 1 : 0;

      if (aCritical !== bCritical) return bCritical - aCritical;

      const aLow =
        a.minimumStockQuantity > 0 &&
        a.stockQuantity >= a.minimumStockQuantity &&
        a.stockQuantity <= a.minimumStockQuantity * 1.2
          ? 1
          : 0;
      const bLow =
        b.minimumStockQuantity > 0 &&
        b.stockQuantity >= b.minimumStockQuantity &&
        b.stockQuantity <= b.minimumStockQuantity * 1.2
          ? 1
          : 0;

      if (aLow !== bLow) return bLow - aLow;

      return a.name.localeCompare(b.name);
    });
  }, [materials]);

  const stats = useMemo(() => {
    return {
      rawMaterialCount: materials.length,
      substanceRowsCount: substances.length,
      allergenRowsCount: substances.filter((item) => item.isAllergen).length,
      criticalCount: materials.filter(
        (item) => item.stockQuantity < item.minimumStockQuantity,
      ).length,
      lowCount: materials.filter(
        (item) =>
          item.minimumStockQuantity > 0 &&
          item.stockQuantity >= item.minimumStockQuantity &&
          item.stockQuantity <= item.minimumStockQuantity * 1.2,
      ).length,
    };
  }, [materials, substances]);

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
          <h1 className="mt-1 text-3xl font-bold text-white">Raw Materials</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/inventory" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Inventory</Link>
            <Link href="/inventory/order-material-demand" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Material Demand</Link>
            <Link href="/inventory/movements" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Movements</Link>
            <Link href="/production" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Produktion</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Rohstoffe</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.rawMaterialCount}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">INCI-/Stoff-Zeilen</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.substanceRowsCount}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Allergen-Zeilen</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.allergenRowsCount}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Kritisch</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.criticalCount}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Bald knapp</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.lowCount}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Neuen Rohstoff anlegen</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="z. B. Bergamot Oil"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Kategorie
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="essential_oil / aroma_chemical / solvent"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Supplier
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Supplier Reference
                </label>
                <input
                  type="text"
                  value={supplierReference}
                  onChange={(e) => setSupplierReference(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  INCI Label Name
                </label>
                <input
                  type="text"
                  value={inciLabelName}
                  onChange={(e) => setInciLabelName(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="z. B. Citrus Aurantium Bergamia Peel Oil"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Einheit
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="g / ml / piece"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Kosten pro Einheit in €
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="0.1250"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Bestand
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Mindestbestand
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={minimumStockQuantity}
                  onChange={(e) => setMinimumStockQuantity(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Dichte g/ml
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={densityGPerMl}
                  onChange={(e) => setDensityGPerMl(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="0.8700"
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Purity %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.0001"
                  value={purityPercent}
                  onChange={(e) => setPurityPercent(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="100.0000"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Dilution %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.0001"
                  value={dilutionPercent}
                  onChange={(e) => setDilutionPercent(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="10.0000"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Dilution Medium
                </label>
                <input
                  type="text"
                  value={dilutionMedium}
                  onChange={(e) => setDilutionMedium(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="z. B. DPG / Ethanol / TEC"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Empfohlene Maximalgrenze %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.0001"
                  value={recommendedMaxPercentage}
                  onChange={(e) => setRecommendedMaxPercentage(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="5.0000"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Aktiv
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isApprovedForUse}
                  onChange={(e) => setIsApprovedForUse(e.target.checked)}
                />
                Für Nutzung freigegeben
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={visibleInAccordBuilder}
                  onChange={(e) => setVisibleInAccordBuilder(e.target.checked)}
                />
                Im Accord Builder sichtbar
              </label>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                Freigabe-Notizen
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="Interne Hinweise zur Freigabe, Einschränkungen, besondere Nutzung"
              />
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

            <button
              onClick={addRawMaterial}
              disabled={savingMaterial}
              className="mt-6 rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
            >
              {savingMaterial ? "Bitte warten..." : "Rohstoff speichern"}
            </button>
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">
              INCI-/Stoff-Zerlegung anlegen
            </h2>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                Rohstoff wählen
              </label>
              <select
                value={selectedRawMaterialId}
                onChange={(e) => setSelectedRawMaterialId(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="">Bitte wählen</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedMaterial && (
              <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3 text-sm text-[#6E6860]">
                <p>
                  <span className="font-medium">Rohstoff:</span>{" "}
                  {selectedMaterial.name}
                </p>
                <p>
                  <span className="font-medium">INCI Label Name:</span>{" "}
                  {selectedMaterial.inciLabelName || "—"}
                </p>
                <p>
                  <span className="font-medium">Summierte Bestandteile:</span>{" "}
                  {selectedMaterialSubstanceSum.toFixed(4)}%
                </p>
                <p>
                  <span className="font-medium">INCI Preview:</span>{" "}
                  {selectedMaterialInciPreview || "—"}
                </p>
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Interner Stoffname
                </label>
                <input
                  type="text"
                  value={substanceName}
                  onChange={(e) => setSubstanceName(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="z. B. Limonene"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  INCI Name
                </label>
                <input
                  type="text"
                  value={substanceInciName}
                  onChange={(e) => setSubstanceInciName(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="z. B. Limonene"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                  Anteil in %
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={substancePercentage}
                  onChange={(e) => setSubstancePercentage(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="12.5000"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={substanceIsAllergen}
                  onChange={(e) => setSubstanceIsAllergen(e.target.checked)}
                />
                Allergen
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={substanceIsDeclarable}
                  onChange={(e) => setSubstanceIsDeclarable(e.target.checked)}
                />
                deklarationsrelevant
              </label>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Notizen</label>
              <textarea
                value={substanceNotes}
                onChange={(e) => setSubstanceNotes(e.target.value)}
                rows={3}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <button
              onClick={addSubstance}
              disabled={savingSubstance}
              className="mt-6 rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
            >
              {savingSubstance ? "Bitte warten..." : "Bestandteil speichern"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Rohstoffliste</h2>

            {reorderedMaterials.length === 0 ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Noch keine Rohstoffe angelegt.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {reorderedMaterials.map((material) => {
                  const isCritical =
                    material.stockQuantity < material.minimumStockQuantity;
                  const isLow =
                    material.minimumStockQuantity > 0 &&
                    material.stockQuantity >= material.minimumStockQuantity &&
                    material.stockQuantity <=
                      material.minimumStockQuantity * 1.2;

                  return (
                    <div key={material.id} className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <button
                            onClick={() =>
                              setSelectedRawMaterialId(material.id)
                            }
                            className="text-left"
                          >
                            <h3 className="text-sm font-semibold text-[#0A0A0A]">
                              {material.name}
                            </h3>
                          </button>
                          <p className="text-sm text-[#9E9890]">
                            Kategorie: {material.category}
                          </p>
                          <p className="text-sm text-[#9E9890]">
                            INCI Label: {material.inciLabelName || "—"}
                          </p>
                          <p className="text-sm text-[#9E9890]">
                            Supplier: {material.supplier || "—"}
                          </p>
                          <p className="text-sm text-[#9E9890]">
                            Kosten: {centsToEuro(material.costPerUnitCents)} € /{" "}
                            {material.unit}
                          </p>
                          {material.densityGPerMl !== null && (
                            <p className="text-sm text-[#9E9890]">
                              Dichte: {material.densityGPerMl} g/ml
                            </p>
                          )}
                          {material.notes && (
                            <p className="mt-2 text-sm text-[#6E6860]">
                              {material.notes}
                            </p>
                          )}

                          <div className="mt-4 space-y-2">
                            <h4 className="font-medium">Dokumente</h4>

                            <div className="flex flex-wrap gap-2">
                              <label className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-[#F0EDE8]">
                                SDS hochladen
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      uploadRawMaterialDocument(
                                        material.id,
                                        file,
                                        "sds",
                                      );
                                    }
                                  }}
                                />
                              </label>

                              <label className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-[#F0EDE8]">
                                IFRA hochladen
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      uploadRawMaterialDocument(
                                        material.id,
                                        file,
                                        "ifra",
                                      );
                                    }
                                  }}
                                />
                              </label>

                              <label className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-[#F0EDE8]">
                                COA hochladen
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      uploadRawMaterialDocument(
                                        material.id,
                                        file,
                                        "coa",
                                      );
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-[#9E9890]">
                          Aktiv: {material.isActive ? "Ja" : "Nein"} ·
                          Freigegeben:{" "}
                          {material.isApprovedForUse ? "Ja" : "Nein"}
                        </p>
                        <p className="text-sm text-[#9E9890]">
                          Accord Builder:{" "}
                          {material.visibleInAccordBuilder ? "Ja" : "Nein"}
                        </p>
                        {material.purityPercent !== null && (
                          <p className="text-sm text-[#9E9890]">
                            Purity: {material.purityPercent.toFixed(4)}%
                          </p>
                        )}
                        {material.dilutionPercent !== null && (
                          <p className="text-sm text-[#9E9890]">
                            Dilution: {material.dilutionPercent.toFixed(4)}%
                            {material.dilutionMedium
                              ? ` in ${material.dilutionMedium}`
                              : ""}
                          </p>
                        )}
                        {material.recommendedMaxPercentage !== null && (
                          <p className="text-sm text-[#9E9890]">
                            Empfohlene Maximalgrenze:{" "}
                            {material.recommendedMaxPercentage.toFixed(4)}%
                          </p>
                        )}
                        {material.approvalNotes && (
                          <p className="mt-2 text-sm text-[#6E6860]">
                            Freigabe: {material.approvalNotes}
                          </p>
                        )}

                        <div className="text-right">
                          <div className="grid gap-2">
                            <input
                              type="number"
                              min={0}
                              step="0.0001"
                              value={editingStocks[material.id]?.stock ?? "0"}
                              onChange={(e) =>
                                setEditingStocks((prev) => ({
                                  ...prev,
                                  [material.id]: {
                                    stock: e.target.value,
                                    minimum: prev[material.id]?.minimum ?? "0",
                                  },
                                }))
                              }
                              className="w-36 rounded-xl border border-[#E5E0D8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                              placeholder="Bestand"
                            />
                            <input
                              type="number"
                              min={0}
                              step="0.0001"
                              value={editingStocks[material.id]?.minimum ?? "0"}
                              onChange={(e) =>
                                setEditingStocks((prev) => ({
                                  ...prev,
                                  [material.id]: {
                                    stock: prev[material.id]?.stock ?? "0",
                                    minimum: e.target.value,
                                  },
                                }))
                              }
                              className="w-36 rounded-xl border border-[#E5E0D8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                              placeholder="Mindestbestand"
                            />
                            <button
                              onClick={() => saveStockSettings(material.id)}
                              disabled={updatingStockId === material.id}
                              className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1.5 text-xs font-medium hover:bg-[#F0EDE8]"
                            >
                              {updatingStockId === material.id
                                ? "Speichert..."
                                : "Lagerwerte speichern"}
                            </button>
                          </div>

                          <div className="mt-3 space-y-1 text-sm">
                            <p>
                              Bestand: {material.stockQuantity.toFixed(4)}{" "}
                              {material.unit}
                            </p>
                            <p>
                              Minimum:{" "}
                              {material.minimumStockQuantity.toFixed(4)}{" "}
                              {material.unit}
                            </p>
                            {isCritical && (
                              <p className="rounded-full border px-3 py-1">
                                Kritisch
                              </p>
                            )}
                            {!isCritical && isLow && (
                              <p className="rounded-full border px-3 py-1">
                                Bald knapp
                              </p>
                            )}
                            {!isCritical && !isLow && (
                              <p className="rounded-full border px-3 py-1">
                                Ausreichend
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">
              INCI-/Stoff-Zerlegung des gewählten Rohstoffs
            </h2>

            {!selectedRawMaterialId ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Wähle links oder oben einen Rohstoff aus.
              </p>
            ) : (
              <>
                <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3 text-sm text-[#6E6860]">
                  <p>
                    <span className="font-medium">
                      Summierte Prozentanteile:
                    </span>{" "}
                    {selectedMaterialSubstanceSum.toFixed(4)}%
                  </p>
                  <p>
                    <span className="font-medium">Deklarierbare Stoffe:</span>{" "}
                    {selectedMaterialDeclarableSubstances.length}
                  </p>
                  <p>
                    <span className="font-medium">Allergene:</span>{" "}
                    {selectedMaterialAllergenSubstances.length}
                  </p>
                  <p>
                    <span className="font-medium">INCI Preview:</span>{" "}
                    {selectedMaterialInciPreview || "—"}
                  </p>
                  {selectedMaterialSubstanceSum > 100 && (
                    <p className="mt-2">
                      Warnung: Summe der Bestandteile liegt über 100%.
                    </p>
                  )}
                </div>

                {selectedMaterialSubstances.length === 0 ? (
                  <p className="mt-4 text-sm text-[#6E6860]">
                    Für diesen Rohstoff sind noch keine Bestandteile gepflegt.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {selectedMaterialSubstances.map((substance) => (
                      <div
                        key={substance.id}
                        className="rounded-2xl bg-white border border-[#E5E0D8] p-5"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                              Interner Stoffname
                            </label>
                            <input
                              type="text"
                              value={
                                editingSubstances[substance.id]
                                  ?.substanceName ?? ""
                              }
                              onChange={(e) =>
                                setEditingSubstances((prev) => ({
                                  ...prev,
                                  [substance.id]: {
                                    ...(prev[substance.id] ?? {
                                      substanceName: "",
                                      inciName: "",
                                      percentage: "0",
                                      isAllergen: false,
                                      isDeclarable: true,
                                      notes: "",
                                    }),
                                    substanceName: e.target.value,
                                  },
                                }))
                              }
                              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                              INCI Name
                            </label>
                            <input
                              type="text"
                              value={
                                editingSubstances[substance.id]?.inciName ?? ""
                              }
                              onChange={(e) =>
                                setEditingSubstances((prev) => ({
                                  ...prev,
                                  [substance.id]: {
                                    ...(prev[substance.id] ?? {
                                      substanceName: "",
                                      inciName: "",
                                      percentage: "0",
                                      isAllergen: false,
                                      isDeclarable: true,
                                      notes: "",
                                    }),
                                    inciName: e.target.value,
                                  },
                                }))
                              }
                              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                              Anteil in %
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="0.0001"
                              value={
                                editingSubstances[substance.id]?.percentage ??
                                "0"
                              }
                              onChange={(e) =>
                                setEditingSubstances((prev) => ({
                                  ...prev,
                                  [substance.id]: {
                                    ...(prev[substance.id] ?? {
                                      substanceName: "",
                                      inciName: "",
                                      percentage: "0",
                                      isAllergen: false,
                                      isDeclarable: true,
                                      notes: "",
                                    }),
                                    percentage: e.target.value,
                                  },
                                }))
                              }
                              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                              Notizen
                            </label>
                            <input
                              type="text"
                              value={
                                editingSubstances[substance.id]?.notes ?? ""
                              }
                              onChange={(e) =>
                                setEditingSubstances((prev) => ({
                                  ...prev,
                                  [substance.id]: {
                                    ...(prev[substance.id] ?? {
                                      substanceName: "",
                                      inciName: "",
                                      percentage: "0",
                                      isAllergen: false,
                                      isDeclarable: true,
                                      notes: "",
                                    }),
                                    notes: e.target.value,
                                  },
                                }))
                              }
                              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-6">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={
                                editingSubstances[substance.id]?.isAllergen ??
                                false
                              }
                              onChange={(e) =>
                                setEditingSubstances((prev) => ({
                                  ...prev,
                                  [substance.id]: {
                                    ...(prev[substance.id] ?? {
                                      substanceName: "",
                                      inciName: "",
                                      percentage: "0",
                                      isAllergen: false,
                                      isDeclarable: true,
                                      notes: "",
                                    }),
                                    isAllergen: e.target.checked,
                                  },
                                }))
                              }
                            />
                            Allergen
                          </label>

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={
                                editingSubstances[substance.id]?.isDeclarable ??
                                true
                              }
                              onChange={(e) =>
                                setEditingSubstances((prev) => ({
                                  ...prev,
                                  [substance.id]: {
                                    ...(prev[substance.id] ?? {
                                      substanceName: "",
                                      inciName: "",
                                      percentage: "0",
                                      isAllergen: false,
                                      isDeclarable: true,
                                      notes: "",
                                    }),
                                    isDeclarable: e.target.checked,
                                  },
                                }))
                              }
                            />
                            deklarationsrelevant
                          </label>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => updateSubstance(substance.id)}
                            disabled={updatingSubstanceId === substance.id}
                            className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1.5 text-xs font-medium hover:bg-[#F0EDE8]"
                          >
                            {updatingSubstanceId === substance.id
                              ? "Speichert..."
                              : "Speichern"}
                          </button>

                          <button
                            onClick={() => deleteSubstance(substance.id)}
                            disabled={deletingSubstanceId === substance.id}
                            className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1.5 text-xs font-medium hover:bg-[#F0EDE8]"
                          >
                            {deletingSubstanceId === substance.id
                              ? "Löscht..."
                              : "Löschen"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
