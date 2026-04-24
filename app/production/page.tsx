"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOwnProfile } from "@/lib/profile";
import { authFetch } from "@/lib/authFetch";
import InfoTooltip from "@/components/InfoTooltip";
import { HELP } from "@/lib/helpTexts";
import type { Forecast } from "@/lib/resourcePredictor";

type OrderStatus =
  | "created"
  | "in_production"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled";

type SampleStatus = "not_requested" | "requested" | "shipped" | "tested";
type SampleRequestStatus = "requested" | "shipped" | "received" | "tested";
type PayoutStatus = "pending" | "payable" | "paid" | "reversed";

type OrderItem = {
  id: string;
  fragranceId: string;
  name: string;
  priceCents: number;
  sizeMl: number;
  quantity: number;
};

type Order = {
  id: string;
  userId: string | null;
  createdAt: string;
  status: OrderStatus;
  totalCents: number;
  customerName: string;
  customerEmail: string;
  shippingAddressLine1?: string;
  shippingCity?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  trackingNumber?: string | null;
  shippingLabelUrl?: string | null;
  items: OrderItem[];
};

type SavedFragrance = {
  id: string;
  name: string;
  composition: Record<string, number>;
  total: number;
  createdAt: string;
  creatorId: string | null;
  ownerId: string | null;
  isPublic: boolean;
  priceCents: number;
  status: "draft" | "active";
  sizeMl: number;
  description: string;
  category: string;
  sampleStatus: SampleStatus;
  imageUrl: string;
};

type SampleRequest = {
  id: string;
  fragranceId: string;
  creatorId: string;
  status: SampleRequestStatus;
  createdAt: string;
  fragranceName: string;
  creatorEmail: string | null;
};

type DbOrderRow = {
  id: string;
  user_id: string | null;
  created_at: string;
  status: OrderStatus;
  total_cents: number;
  customer_name: string;
  customer_email: string;
  shipping_address_line1?: string;
  shipping_city?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  tracking_number?: string | null;
  shipping_label_url?: string | null;
};

type DbOrderItemRow = {
  id: string;
  order_id: string;
  fragrance_id: string;
  name: string;
  price_cents: number;
  size_ml: number;
  quantity: number;
  payout_status: PayoutStatus;
};

type DbFragranceRow = {
  id: string;
  name: string;
  composition: Record<string, number>;
  total: number;
  created_at: string;
  creator_id: string | null;
  owner_id: string | null;
  is_public: boolean;
  price_cents: number;
  status: "draft" | "active";
  size_ml: number;
  description: string | null;
  category: string | null;
  sample_status: SampleStatus;
  image_url: string | null;
};

type DbSampleRequestRow = {
  id: string;
  fragrance_id: string;
  creator_id: string;
  status: SampleRequestStatus;
  created_at: string;
};

type DbProfileRow = {
  id: string;
  email: string | null;
};

function mapDbFragrance(row: DbFragranceRow): SavedFragrance {
  return {
    id: row.id,
    name: row.name,
    composition: row.composition,
    total: row.total,
    createdAt: row.created_at,
    creatorId: row.creator_id,
    ownerId: row.owner_id,
    isPublic: row.is_public,
    priceCents: row.price_cents,
    status: row.status,
    sizeMl: row.size_ml,
    description: row.description ?? "",
    category: row.category ?? "",
    sampleStatus: row.sample_status,
    imageUrl: row.image_url ?? "",
  };
}

function getSampleStatusLabel(status: SampleStatus): string {
  if (status === "not_requested") return "nicht angefordert";
  if (status === "requested") return "angefordert";
  if (status === "shipped") return "versendet";
  return "getestet";
}

function getOrderStatusLabel(status: OrderStatus): string {
  if (status === "created") return "erstellt";
  if (status === "in_production") return "in Produktion";
  if (status === "shipped") return "versendet";
  if (status === "delivered") return "zugestellt";
  if (status === "returned") return "retourniert";
  return "storniert";
}

function getSampleRequestStatusLabel(status: SampleRequestStatus): string {
  if (status === "requested") return "angefordert";
  if (status === "shipped") return "versendet";
  if (status === "received") return "erhalten";
  return "getestet";
}

export default function ProductionPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [fragrances, setFragrances] = useState<SavedFragrance[]>([]);
  const [sampleRequests, setSampleRequests] = useState<SampleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updatingFragranceId, setUpdatingFragranceId] = useState<string | null>(
    null,
  );
  const [updatingSampleRequestId, setUpdatingSampleRequestId] = useState<
    string | null
  >(null);
  const [fragranceAccordMap, setFragranceAccordMap] = useState<
    Map<string, { accord_id: string; accord_name: string; percentage: number }[]>
  >(new Map());
  const [dhlLoading, setDhlLoading] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [accordComponentMap, setAccordComponentMap] = useState<
    Map<string, { raw_material_id: string; material_name: string; percentage: number }[]>
  >(new Map());
  const [activeTab, setActiveTab] = useState<"queue" | "production" | "shipping" | "done">("queue");
  const [batchStarting, setBatchStarting] = useState<string | null>(null);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [forecastHorizon, setForecastHorizon] = useState<7 | 30 | 90>(30);

  // Ressourcen-Vorhersage laden (on-demand, da teurer API-Call)
  async function loadForecast() {
    setForecastLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setForecastLoading(false); return; }
    try {
      const res = await fetch("/api/resource-predictor", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.forecasts) setForecasts(json.forecasts);
    } catch (err) {
      console.error("Vorhersage fehlgeschlagen:", err);
    }
    setForecastLoading(false);
  }

  useEffect(() => {
    async function loadProductionData() {
      const profile = await getOwnProfile();
      if (!profile || !["production", "admin"].includes(profile.role)) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);

      const { data: orderRows, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Fehler beim Laden der Orders:", ordersError);
        setLoading(false);
        return;
      }

      const orderIds = (orderRows ?? []).map((row: DbOrderRow) => row.id);

      let itemRows: DbOrderItemRow[] = [];

      if (orderIds.length > 0) {
        const { data: dbItemRows, error: itemsError } = await supabase
          .from("order_items")
          .select("*")
          .in("order_id", orderIds);

        if (itemsError) {
          console.error("Fehler beim Laden der Order-Items:", itemsError);
          setLoading(false);
          return;
        }

        itemRows = dbItemRows ?? [];
      }

      const mappedOrders: Order[] = (orderRows ?? []).map(
        (order: DbOrderRow) => ({
          id: order.id,
          userId: order.user_id,
          createdAt: order.created_at,
          status: order.status,
          totalCents: order.total_cents,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          shippingAddressLine1: order.shipping_address_line1,
          shippingCity: order.shipping_city,
          shippingPostalCode: order.shipping_postal_code,
          shippingCountry: order.shipping_country,
          trackingNumber: order.tracking_number ?? null,
          shippingLabelUrl: order.shipping_label_url ?? null,
          items: itemRows
            .filter((item) => item.order_id === order.id)
            .map((item) => ({
              id: item.id,
              fragranceId: item.fragrance_id,
              name: item.name,
              priceCents: item.price_cents,
              sizeMl: item.size_ml,
              quantity: item.quantity,
            })),
        }),
      );

      setOrders(mappedOrders);

      const { data: fragranceRows, error: fragrancesError } = await supabase
        .from("fragrances")
        .select("*")
        .order("created_at", { ascending: false });

      if (fragrancesError) {
        console.error("Fehler beim Laden der Düfte:", fragrancesError);
        setLoading(false);
        return;
      }

      setFragrances((fragranceRows ?? []).map(mapDbFragrance));

      // Accord-Daten für Mixing Guide laden
      const orderFragranceIds = Array.from(
        new Set(itemRows.map((item) => item.fragrance_id)),
      );

      if (orderFragranceIds.length > 0) {
        const { data: faRows, error: faError } = await supabase
          .from("fragrance_accords")
          .select("fragrance_id, accord_id, percentage")
          .in("fragrance_id", orderFragranceIds);

        if (!faError && faRows && faRows.length > 0) {
          const accordIds = Array.from(new Set(faRows.map((r: { accord_id: string }) => r.accord_id)));

          const [accordsRes, componentsRes] = await Promise.all([
            supabase.from("accords").select("id, name").in("id", accordIds),
            supabase
              .from("accord_components")
              .select("accord_id, raw_material_id, percentage")
              .in("accord_id", accordIds),
          ]);

          const accordNameLookup: Record<string, string> = {};
          if (accordsRes.data) {
            for (const a of accordsRes.data as { id: string; name: string }[]) {
              accordNameLookup[a.id] = a.name;
            }
          }

          const components: { accord_id: string; raw_material_id: string; percentage: number }[] =
            componentsRes.data ?? [];

          const materialNameLookup: Record<string, string> = {};
          if (components.length > 0) {
            const materialIds = Array.from(new Set(components.map((c) => c.raw_material_id)));
            const { data: matData } = await supabase
              .from("raw_materials")
              .select("id, name")
              .in("id", materialIds);
            if (matData) {
              for (const m of matData as { id: string; name: string }[]) {
                materialNameLookup[m.id] = m.name;
              }
            }
          }

          const newFragranceAccordMap = new Map<string, { accord_id: string; accord_name: string; percentage: number }[]>();
          for (const row of faRows as { fragrance_id: string; accord_id: string; percentage: number }[]) {
            const existing = newFragranceAccordMap.get(row.fragrance_id) ?? [];
            existing.push({
              accord_id: row.accord_id,
              accord_name: accordNameLookup[row.accord_id] ?? row.accord_id,
              percentage: row.percentage,
            });
            newFragranceAccordMap.set(row.fragrance_id, existing);
          }
          setFragranceAccordMap(newFragranceAccordMap);

          const newAccordComponentMap = new Map<string, { raw_material_id: string; material_name: string; percentage: number }[]>();
          for (const comp of components) {
            const existing = newAccordComponentMap.get(comp.accord_id) ?? [];
            existing.push({
              raw_material_id: comp.raw_material_id,
              material_name: materialNameLookup[comp.raw_material_id] ?? comp.raw_material_id,
              percentage: comp.percentage,
            });
            newAccordComponentMap.set(comp.accord_id, existing);
          }
          setAccordComponentMap(newAccordComponentMap);
        }
      }

      const { data: requestRows, error: requestError } = await supabase
        .from("sample_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestError) {
        console.error("Fehler beim Laden der Sample-Requests:", requestError);
        setLoading(false);
        return;
      }

      const requestFragranceIds = Array.from(
        new Set(
          (requestRows ?? []).map(
            (row: DbSampleRequestRow) => row.fragrance_id,
          ),
        ),
      );
      const requestCreatorIds = Array.from(
        new Set(
          (requestRows ?? []).map((row: DbSampleRequestRow) => row.creator_id),
        ),
      );

      let requestFragranceMap = new Map<string, string>();
      let creatorEmailMap = new Map<string, string | null>();

      if (requestFragranceIds.length > 0) {
        const { data: requestFragranceRows, error: requestFragranceError } =
          await supabase
            .from("fragrances")
            .select("id, name")
            .in("id", requestFragranceIds);

        if (requestFragranceError) {
          console.error(
            "Fehler beim Laden der Sample-Duftnamen:",
            requestFragranceError,
          );
          setLoading(false);
          return;
        }

        requestFragranceMap = new Map(
          (requestFragranceRows ?? []).map(
            (row: { id: string; name: string }) => [row.id, row.name],
          ),
        );
      }

      if (requestCreatorIds.length > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", requestCreatorIds);

        if (profileError) {
          console.error("Fehler beim Laden der Creator-Profile:", profileError);
          setLoading(false);
          return;
        }

        creatorEmailMap = new Map(
          (profileRows ?? []).map((row: DbProfileRow) => [row.id, row.email]),
        );
      }

      const mappedSampleRequests: SampleRequest[] = (requestRows ?? []).map(
        (row: DbSampleRequestRow) => ({
          id: row.id,
          fragranceId: row.fragrance_id,
          creatorId: row.creator_id,
          status: row.status,
          createdAt: row.created_at,
          fragranceName:
            requestFragranceMap.get(row.fragrance_id) ?? "Unbekannter Duft",
          creatorEmail: creatorEmailMap.get(row.creator_id) ?? null,
        }),
      );

      setSampleRequests(mappedSampleRequests);
      setLoading(false);
    }

    loadProductionData();
  }, []);

  function findFragrance(fragranceId: string) {
    return fragrances.find((fragrance) => fragrance.id === fragranceId) ?? null;
  }

  async function syncOrderItemPayouts(
    orderId: string,
    nextStatus: OrderStatus,
  ) {
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("id, payout_status")
      .eq("order_id", orderId);

    if (itemsError) {
      console.error(
        "Fehler beim Laden der Order-Items für Payout-Sync:",
        itemsError,
      );
      return false;
    }

    for (const item of orderItems ?? []) {
      const current = item.payout_status as PayoutStatus;
      let nextPayoutStatus: PayoutStatus | null = null;

      if (nextStatus === "delivered") {
        if (current === "pending") {
          nextPayoutStatus = "payable";
        }
      }

      if (nextStatus === "returned" || nextStatus === "cancelled") {
        if (current !== "paid") {
          nextPayoutStatus = "reversed";
        }
      }

      if (!nextPayoutStatus) continue;

      const payload: { payout_status: PayoutStatus; paid_at?: string | null } =
        {
          payout_status: nextPayoutStatus,
        };
        payload.paid_at = null;
      const { error: updateError } = await supabase
        .from("order_items")
        .update(payload)
        .eq("id", item.id);

      if (updateError) {
        console.error(
          "Fehler beim Aktualisieren des Payout-Status:",
          updateError,
        );
        return false;
      }
    }

    return true;
  }
  async function consumeInventoryForOrder(order: Order) {
    const { data: existingBooking, error: bookingCheckError } = await supabase
      .from("production_inventory_bookings")
      .select("id")
      .eq("order_id", order.id)
      .eq("booking_type", "consume")
      .maybeSingle();

    if (bookingCheckError) {
      console.error(
        "Fehler beim Prüfen der Produktionsbuchung:",
        bookingCheckError,
      );
      return {
        ok: false,
        message: "Produktionsbuchung konnte nicht geprüft werden.",
      };
    }

    if (existingBooking) {
      return {
        ok: true,
        skipped: true,
        message: "Bestand wurde für diese Order bereits abgebucht.",
      };
    }

    const fragranceIds = Array.from(
      new Set(order.items.map((item) => item.fragranceId)),
    );

    const { data: fragranceAccords, error: fragranceAccordsError } =
      await supabase
        .from("fragrance_accords")
        .select("fragrance_id, accord_id, percentage")
        .in("fragrance_id", fragranceIds);

    if (fragranceAccordsError) {
      console.error(
        "Fehler beim Laden der Duft-Accorde:",
        fragranceAccordsError,
      );
      return {
        ok: false,
        message: "Duft-Accorde konnten nicht geladen werden.",
      };
    }

    const accordIds = Array.from(
      new Set((fragranceAccords ?? []).map((entry) => entry.accord_id)),
    );

    let accordComponents: {
      accord_id: string;
      raw_material_id: string;
      percentage: number;
    }[] = [];

    if (accordIds.length > 0) {
      const { data, error } = await supabase
        .from("accord_components")
        .select("accord_id, raw_material_id, percentage")
        .in("accord_id", accordIds);

      if (error) {
        console.error("Fehler beim Laden der Accord-Komponenten:", error);
        return {
          ok: false,
          message: "Accord-Komponenten konnten nicht geladen werden.",
        };
      }

      accordComponents = data ?? [];
    }

    const rawMaterialIds = Array.from(
      new Set(accordComponents.map((component) => component.raw_material_id)),
    );

    let rawMaterials: {
      id: string;
      name: string;
      unit: string;
      stock_quantity: number;
    }[] = [];

    if (rawMaterialIds.length > 0) {
      const { data, error } = await supabase
        .from("raw_materials")
        .select("id, name, unit, stock_quantity")
        .in("id", rawMaterialIds);

      if (error) {
        console.error("Fehler beim Laden der Rohstoffe:", error);
        return {
          ok: false,
          message: "Rohstoffe konnten nicht geladen werden.",
        };
      }

      rawMaterials = data ?? [];
    }

    const rawMaterialMap = new Map(
      rawMaterials.map((material) => [material.id, material]),
    );
      const { data: fragranceResourceRows, error: fragranceResourcesError } =
        await supabase
          .from("fragrance_resources")
          .select("fragrance_id, resource_id, quantity_per_unit")
          .in("fragrance_id", fragranceIds);

      if (fragranceResourcesError) {
        console.error(
          "Fehler beim Laden der Duft-Ressourcen:",
          fragranceResourcesError,
        );
        return {
          ok: false,
          message: "Duft-Ressourcen konnten nicht geladen werden.",
        };
      }

      const resourceIds = Array.from(
        new Set((fragranceResourceRows ?? []).map((row) => row.resource_id)),
      );

      let resources: {
        id: string;
        name: string;
        unit: string;
        stock_quantity: number;
      }[] = [];

      if (resourceIds.length > 0) {
        const { data, error } = await supabase
          .from("resources")
          .select("id, name, unit, stock_quantity")
          .in("id", resourceIds);

        if (error) {
          console.error("Fehler beim Laden der Ressourcen:", error);
          return {
            ok: false,
            message: "Ressourcen konnten nicht geladen werden.",
          };
        }

        resources = data ?? [];
      }

      const resourceMap = new Map(
        resources.map((resource) => [resource.id, resource]),
      );

    const demandMap = new Map<
      string,
      { name: string; unit: string; quantity: number; oldStock: number }
    >();
      const resourceDemandMap = new Map<
        string,
        { name: string; unit: string; quantity: number; oldStock: number }
      >();

      for (const item of order.items) {
        const linkedResources = (fragranceResourceRows ?? []).filter(
          (row) => row.fragrance_id === item.fragranceId,
        );

        for (const linkedResource of linkedResources) {
          const resource = resourceMap.get(linkedResource.resource_id);
          if (!resource) continue;

          const requiredQuantity =
            Number(linkedResource.quantity_per_unit) * item.quantity;

          const existing = resourceDemandMap.get(linkedResource.resource_id);

          if (!existing) {
            resourceDemandMap.set(linkedResource.resource_id, {
              name: resource.name,
              unit: resource.unit,
              quantity: requiredQuantity,
              oldStock: Number(resource.stock_quantity),
            });
            continue;
          }

          existing.quantity += requiredQuantity;
        }
      }

    for (const item of order.items) {
      const formula = (fragranceAccords ?? []).filter(
        (entry) => entry.fragrance_id === item.fragranceId,
      );

      for (const fragranceAccord of formula) {
        const components = accordComponents.filter(
          (component) => component.accord_id === fragranceAccord.accord_id,
        );

        for (const component of components) {
          const rawMaterial = rawMaterialMap.get(component.raw_material_id);
          if (!rawMaterial) continue;

          const requiredQuantity =
            item.sizeMl *
            item.quantity *
            (fragranceAccord.percentage / 100) *
            (component.percentage / 100);

          const existing = demandMap.get(component.raw_material_id);

          if (!existing) {
            demandMap.set(component.raw_material_id, {
              name: rawMaterial.name,
              unit: rawMaterial.unit,
              quantity: requiredQuantity,
              oldStock: Number(rawMaterial.stock_quantity),
            });
            continue;
          }

          existing.quantity += requiredQuantity;
        }
      }
    }

    for (const [rawMaterialId, demand] of demandMap.entries()) {
      const newStock = demand.oldStock - demand.quantity;

      const { error: updateError } = await supabase
        .from("raw_materials")
        .update({
          stock_quantity: newStock,
        })
        .eq("id", rawMaterialId);

      if (updateError) {
        console.error("Fehler beim Abbuchen des Rohstoffs:", updateError);
        return {
          ok: false,
          message: `Rohstoff ${demand.name} konnte nicht abgebucht werden.`,
        };
      }

      const movementId = crypto.randomUUID();

      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert({
          id: movementId,
          item_type: "raw_material",
          item_id: rawMaterialId,
          movement_type: "production_consumption",
          quantity_delta: -demand.quantity,
          unit: demand.unit,
          reference_type: "order",
          reference_id: order.id,
          note: `Produktionsverbrauch für Order ${order.id} (${demand.name})`,
        });

      if (movementError) {
        console.error(
          "Fehler beim Schreiben der Lagerbewegung:",
          movementError,
        );
        return {
          ok: false,
          message: `Lagerbewegung für ${demand.name} konnte nicht gespeichert werden.`,
        };
      }
    }
      for (const [resourceId, demand] of resourceDemandMap.entries()) {
        const newStock = demand.oldStock - demand.quantity;

        const { error: updateError } = await supabase
          .from("resources")
          .update({
            stock_quantity: newStock,
          })
          .eq("id", resourceId);

        if (updateError) {
          console.error("Fehler beim Abbuchen der Ressource:", updateError);
          return {
            ok: false,
            message: `Ressource ${demand.name} konnte nicht abgebucht werden.`,
          };
        }

        const movementId = crypto.randomUUID();

        const { error: movementError } = await supabase
          .from("inventory_movements")
          .insert({
            id: movementId,
            item_type: "resource",
            item_id: resourceId,
            movement_type: "production_consumption",
            quantity_delta: -demand.quantity,
            unit: demand.unit,
            reference_type: "order",
            reference_id: order.id,
            note: `Produktionsverbrauch für Order ${order.id} (${demand.name})`,
          });

        if (movementError) {
          console.error(
            "Fehler beim Schreiben der Ressourcen-Bewegung:",
            movementError,
          );
          return {
            ok: false,
            message: `Lagerbewegung für Ressource ${demand.name} konnte nicht gespeichert werden.`,
          };
        }
      }

    const bookingId = crypto.randomUUID();

    const { error: bookingInsertError } = await supabase
      .from("production_inventory_bookings")
      .insert({
        id: bookingId,
        order_id: order.id,
        booking_type: "consume",
        note: `Automatische Abbuchung bei Produktionsstart für Order ${order.id}`,
      });

    if (bookingInsertError) {
      console.error(
        "Fehler beim Speichern der Produktionsbuchung:",
        bookingInsertError,
      );
      return {
        ok: false,
        message: "Produktionsbuchung konnte nicht gespeichert werden.",
      };
    }

    return {
      ok: true,
      skipped: false,
      message: "Bestand wurde erfolgreich abgebucht.",
    };
  }

async function createDhlLabel(order: Order) {
    if (!order.shippingAddressLine1 || !order.shippingCity || !order.shippingPostalCode) {
      alert("Lieferadresse unvollständig.");
      return;
    }
    setDhlLoading(order.id);
    const res = await authFetch("/api/dhl/create-label", {
      method: "POST",
      body: JSON.stringify({
        orderId: order.id,
        recipientName: order.customerName,
        street: order.shippingAddressLine1,
        city: order.shippingCity,
        postalCode: order.shippingPostalCode,
        country: order.shippingCountry ?? "DEU",
      }),
    });
    const data = await res.json();
    setDhlLoading(null);
    if (!res.ok || !data.trackingNumber) {
      alert("DHL-Label konnte nicht erstellt werden: " + (data.error ?? "Unbekannter Fehler"));
      return;
    }
    const { error } = await supabase
      .from("orders")
      .update({ tracking_number: data.trackingNumber, shipping_label_url: data.labelUrl ?? null })
      .eq("id", order.id);
    if (!error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, trackingNumber: data.trackingNumber, shippingLabelUrl: data.labelUrl ?? null }
            : o,
        ),
      );
    }
  }

  async function startBatch(batch: { fragranceId: string; fragranceName: string; sizeMl: number; orderIds: string[] }) {
    setBatchStarting(batch.fragranceId + batch.sizeMl);
    for (const orderId of batch.orderIds) {
      await updateOrderStatus(orderId, "in_production");
    }
    setBatchStarting(null);
  }

  async function saveTrackingNumber(orderId: string) {
    const tracking = (trackingInputs[orderId] ?? "").trim();
    if (!tracking) return;
    const { error } = await supabase
      .from("orders")
      .update({ tracking_number: tracking })
      .eq("id", orderId);
    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, trackingNumber: tracking } : o)),
      );
      setTrackingInputs((prev) => { const n = { ...prev }; delete n[orderId]; return n; });
    }
  }

  async function updateOrderStatus(orderId: string, nextStatus: OrderStatus) {
  setUpdatingOrderId(orderId);

  const currentOrder = orders.find((order) => order.id === orderId);

  if (!currentOrder) {
    alert("Order konnte nicht gefunden werden.");
    setUpdatingOrderId(null);
    return;
  }

  if (
    nextStatus === "in_production" &&
    currentOrder.status !== "in_production"
  ) {
    const inventoryResult = await consumeInventoryForOrder(currentOrder);

    if (!inventoryResult.ok) {
      alert(inventoryResult.message);
      setUpdatingOrderId(null);
      return;
    }

    if (inventoryResult.skipped) {
      console.warn(inventoryResult.message);
    }
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", orderId);

  if (error) {
    console.error("Fehler beim Aktualisieren des Order-Status:", error);
    alert("Order-Status konnte nicht aktualisiert werden.");
    setUpdatingOrderId(null);
    return;
  }

  const payoutSyncOk = await syncOrderItemPayouts(orderId, nextStatus);

  if (!payoutSyncOk) {
    alert(
      "Order-Status wurde geändert, aber Payout-Status konnte nicht vollständig synchronisiert werden.",
    );
  }

  setOrders((prev) =>
    prev.map((order) =>
      order.id === orderId ? { ...order, status: nextStatus } : order,
    ),
  );

  if (nextStatus === "shipped" || nextStatus === "delivered") {
    if (currentOrder.userId) {
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentOrder.userId,
          type: "order_status",
          data: { order_id: orderId, status: nextStatus, tracking_number: currentOrder.trackingNumber },
        }),
      }).catch(() => {});
    }
  }

  if (nextStatus === "shipped") {
    authFetch("/api/email/shipping-notification", {
      method: "POST",
      body: JSON.stringify({
        to: currentOrder.customerEmail,
        customerName: currentOrder.customerName,
        orderNumber: orderId.slice(0, 8).toUpperCase(),
        trackingNumber: currentOrder.trackingNumber ?? undefined,
      }),
    }).catch(() => {});
  }

  setUpdatingOrderId(null);
}

  async function markSampleAsShipped(fragranceId: string) {
    setUpdatingFragranceId(fragranceId);

    const { error } = await supabase
      .from("fragrances")
      .update({ sample_status: "shipped" })
      .eq("id", fragranceId);

    if (error) {
      console.error("Fehler beim Aktualisieren des Sample-Status:", error);
      alert("Sample-Status konnte nicht auf versendet gesetzt werden.");
      setUpdatingFragranceId(null);
      return;
    }

    setFragrances((prev) =>
      prev.map((fragrance) =>
        fragrance.id === fragranceId
          ? { ...fragrance, sampleStatus: "shipped" }
          : fragrance,
      ),
    );

    setUpdatingFragranceId(null);
  }

  async function updateSampleRequestStatus(
    requestId: string,
    fragranceId: string,
    nextStatus: SampleRequestStatus,
  ) {
    setUpdatingSampleRequestId(requestId);

    const { error: requestError } = await supabase
      .from("sample_requests")
      .update({ status: nextStatus })
      .eq("id", requestId);

    if (requestError) {
      console.error(
        "Fehler beim Aktualisieren des Sample-Request-Status:",
        requestError,
      );
      alert("Sample-Request-Status konnte nicht aktualisiert werden.");
      setUpdatingSampleRequestId(null);
      return;
    }

    let nextFragranceSampleStatus: SampleStatus = "requested";

    if (nextStatus === "shipped") nextFragranceSampleStatus = "shipped";
    if (nextStatus === "received" || nextStatus === "tested") {
      nextFragranceSampleStatus = "tested";
    }

    const { error: fragranceError } = await supabase
      .from("fragrances")
      .update({ sample_status: nextFragranceSampleStatus })
      .eq("id", fragranceId);

    if (fragranceError) {
      console.error(
        "Fehler beim Aktualisieren des Duft-Sample-Status:",
        fragranceError,
      );
      alert("Sample-Request wurde aktualisiert, aber Duftstatus nicht.");
      setUpdatingSampleRequestId(null);
      return;
    }

    setSampleRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? { ...request, status: nextStatus } : request,
      ),
    );

    setFragrances((prev) =>
      prev.map((fragrance) =>
        fragrance.id === fragranceId
          ? { ...fragrance, sampleStatus: nextFragranceSampleStatus }
          : fragrance,
      ),
    );

    setUpdatingSampleRequestId(null);
  }

  const stats = useMemo(() => {
    const created = orders.filter((o) => o.status === "created").length;
    const inProduction = orders.filter(
      (o) => o.status === "in_production",
    ).length;
    const shipped = orders.filter((o) => o.status === "shipped").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const returned = orders.filter((o) => o.status === "returned").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;

    const sampleRequested = sampleRequests.filter(
      (r) => r.status === "requested",
    ).length;
    const sampleShipped = sampleRequests.filter(
      (r) => r.status === "shipped",
    ).length;
    const sampleReceived = sampleRequests.filter(
      (r) => r.status === "received",
    ).length;
    const sampleTested = sampleRequests.filter(
      (r) => r.status === "tested",
    ).length;

    return {
      created,
      inProduction,
      shipped,
      delivered,
      returned,
      cancelled,
      sampleRequested,
      sampleShipped,
      sampleReceived,
      sampleTested,
    };
  }, [orders, sampleRequests]);

  const batchMaterialDemand = useMemo(() => {
    const activeOrders = orders.filter(
      (o) => o.status === "created" || o.status === "in_production",
    );
    const demandMap = new Map<string, { name: string; totalMl: number }>();

    for (const order of activeOrders) {
      for (const item of order.items) {
        const accordEntries = fragranceAccordMap.get(item.fragranceId) ?? [];
        for (const accordEntry of accordEntries) {
          const components = accordComponentMap.get(accordEntry.accord_id) ?? [];
          for (const component of components) {
            const ml =
              item.sizeMl *
              item.quantity *
              (accordEntry.percentage / 100) *
              (component.percentage / 100);
            const existing = demandMap.get(component.raw_material_id);
            if (!existing) {
              demandMap.set(component.raw_material_id, {
                name: component.material_name,
                totalMl: ml,
              });
            } else {
              existing.totalMl += ml;
            }
          }
        }
      }
    }

    return Array.from(demandMap.entries())
      .map(([id, v]) => ({ id, name: v.name, totalMl: v.totalMl }))
      .sort((a, b) => b.totalMl - a.totalMl);
  }, [orders, fragranceAccordMap, accordComponentMap]);

  // Batch-Produktion: gruppiere wartende Bestellungen nach Duft + Größe
  const productionBatches = useMemo(() => {
    const waiting = orders.filter((o) => o.status === "created");
    const batchMap = new Map<string, {
      key: string;
      fragranceId: string;
      fragranceName: string;
      sizeMl: number;
      totalQuantity: number;
      totalVolumeMl: number;
      orderIds: Set<string>;
    }>();

    for (const order of waiting) {
      for (const item of order.items) {
        const k = `${item.fragranceId}__${item.sizeMl}`;
        const existing = batchMap.get(k);
        if (existing) {
          existing.totalQuantity += item.quantity;
          existing.totalVolumeMl += item.sizeMl * item.quantity;
          existing.orderIds.add(order.id);
        } else {
          batchMap.set(k, {
            key: k,
            fragranceId: item.fragranceId,
            fragranceName: item.name,
            sizeMl: item.sizeMl,
            totalQuantity: item.quantity,
            totalVolumeMl: item.sizeMl * item.quantity,
            orderIds: new Set([order.id]),
          });
        }
      }
    }

    return Array.from(batchMap.values())
      .map((b) => ({ ...b, orderIds: Array.from(b.orderIds) }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeTab === "queue") return orders.filter((o) => o.status === "created");
    if (activeTab === "production") return orders.filter((o) => o.status === "in_production");
    if (activeTab === "shipping") return orders.filter((o) => o.status === "shipped");
    if (activeTab === "done") return orders.filter((o) => o.status === "delivered" || o.status === "returned" || o.status === "cancelled");
    return orders;
  }, [orders, activeTab]);

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

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#0A0A0A]">Kein Zugriff</p>
          <p className="mt-1 text-sm text-[#9E9890]">Diese Seite ist nur für Produktions-Mitarbeiter und Admins.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-[#C9A96E] hover:underline">Zurück zur Startseite</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="text-3xl font-bold text-white">Produktion</h1>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-6">

        {/* ── Ressourcen-Vorhersage Widget ── */}
        <div className="mb-8 rounded-2xl border border-[#E5E0D8] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E0D8]">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#0A0A0A]">Ressourcen-Vorhersage</p>
              <InfoTooltip text={HELP.production.resourceForecast} />
            </div>
            <div className="flex items-center gap-2">
              {showForecast && (
                <div className="flex rounded-full border border-[#E5E0D8] overflow-hidden text-[11px]">
                  {([7, 30, 90] as const).map((h) => (
                    <button key={h} onClick={() => setForecastHorizon(h)}
                      className={`px-3 py-1 transition-colors ${forecastHorizon === h ? "bg-[#0A0A0A] text-white" : "text-[#6E6860] hover:bg-[#F0EDE8]"}`}>
                      {h}T
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => { setShowForecast((v) => !v); if (!showForecast && forecasts.length === 0) loadForecast(); }}
                className="rounded-full border border-[#E5E0D8] px-3 py-1.5 text-[11px] text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
              >
                {showForecast ? "Ausblenden" : "Bedarfsvorhersage anzeigen"}
              </button>
            </div>
          </div>

          {showForecast && (
            <div className="px-5 py-4">
              {forecastLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#9E9890]">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#C9A96E] border-t-transparent" />
                  Berechne Vorhersage…
                </div>
              ) : forecasts.length === 0 ? (
                <p className="text-sm text-[#9E9890]">Keine Daten – mindestens eine bestätigte Bestellung wird benötigt.</p>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <p className="text-xs text-[#9E9890]">
                      Benötigte Accord-Mengen für die nächsten <strong>{forecastHorizon} Tage</strong> basierend auf Bestelltrends.
                    </p>
                    <InfoTooltip text={HELP.production.forecastHorizon} />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {forecasts.map((f) => {
                      const amount = forecastHorizon === 7 ? f.horizon7 : forecastHorizon === 30 ? f.horizon30 : f.horizon90;
                      const confidenceColor = f.confidence === "high" ? "text-emerald-600" : f.confidence === "medium" ? "text-amber-500" : "text-[#9E9890]";
                      const confidenceLabel = f.confidence === "high" ? "Hoch" : f.confidence === "medium" ? "Mittel" : "Niedrig";
                      return (
                        <div key={f.accordId} className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-[#0A0A0A] leading-snug">{f.accordName}</p>
                            <span className={`shrink-0 text-[10px] uppercase tracking-wider ${confidenceColor}`}>{confidenceLabel}</span>
                          </div>
                          <p className="mt-1.5 text-xl font-bold text-[#C9A96E]">{amount.toFixed(0)} g</p>
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-[#9E9890]">
                            <span>{f.dailyRate.toFixed(1)} g/Tag</span>
                            {f.trend !== 0 && (
                              <span className={f.trend > 0 ? "text-emerald-500" : "text-red-400"}>
                                {f.trend > 0 ? "↑" : "↓"} {Math.abs(f.trend * 30).toFixed(1)} g/Mon. Trend
                              </span>
                            )}
                            <InfoTooltip text={HELP.production.forecastTrend} compact />
                          </div>
                          {f.modelState.mape !== null && (
                            <p className="mt-1 text-[10px] text-[#C5C0B8]">
                              Modellgenauigkeit: {((1 - f.modelState.mape) * 100).toFixed(0)} %
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={loadForecast} disabled={forecastLoading}
                    className="mt-3 text-[11px] text-[#C9A96E] hover:underline disabled:opacity-50">
                    Neu berechnen & Modell aktualisieren
                  </button>
                </>
              )}
            </div>
          )}
        </div>


        <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Erstellt</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">{stats.created}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">In Produktion</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">{stats.inProduction}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Versendet</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">{stats.shipped}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Zugestellt</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">{stats.delivered}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Retouren</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">{stats.returned}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Storniert</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">{stats.cancelled}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Samples angefordert</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">{stats.sampleRequested}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Samples versendet</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">{stats.sampleShipped}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Samples erhalten</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">{stats.sampleReceived}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Samples getestet</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">{stats.sampleTested}</p>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-light tracking-tight text-[#0A0A0A]">Rohstoffbedarf (offene Orders)</h2>
          <p className="mt-1 text-sm text-[#9E9890]">
            Aggregierter Bedarf aller Orders mit Status „Erstellt" oder „In
            Produktion".
          </p>

          {batchMaterialDemand.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <p className="text-sm text-[#6E6860]">
                Kein Bedarf berechenbar — entweder keine offenen Orders oder
                noch keine Accord-Komponenten in der DB hinterlegt.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#FAFAF8] text-left text-xs text-[#9E9890]">
                    <th className="px-4 py-3 font-medium">Rohstoff</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Benötigt (ml)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batchMaterialDemand.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {row.totalMl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Batch-Produktion */}
        {productionBatches.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-light tracking-tight text-[#0A0A0A]">Batch-Produktion</h2>
            <p className="mt-1 text-sm text-[#9E9890]">Offene Bestellungen nach Duft & Größe gruppiert — starte alle auf einmal.</p>
            <div className="mt-4 space-y-3">
              {productionBatches.map((batch) => (
                <div key={batch.key} className="flex items-center gap-4 rounded-2xl bg-white border border-[#E5E0D8] p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#0A0A0A] truncate">{batch.fragranceName}</p>
                    <p className="text-[11px] text-[#9E9890] mt-0.5">
                      {batch.sizeMl} ml · {batch.totalQuantity}× · <span className="font-medium text-[#0A0A0A]">{batch.totalVolumeMl} ml mischen</span> · {batch.orderIds.length} {batch.orderIds.length === 1 ? "Bestellung" : "Bestellungen"}
                    </p>
                  </div>
                  <button
                    onClick={() => startBatch(batch)}
                    disabled={batchStarting === batch.fragranceId + batch.sizeMl}
                    className="shrink-0 rounded-full bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white hover:bg-[#2A2520] transition-colors disabled:opacity-40"
                  >
                    {batchStarting === batch.fragranceId + batch.sizeMl ? "Starte…" : "▶ Produktion starten"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
            <h2 className="text-2xl font-light tracking-tight text-[#0A0A0A]">Kundenbestellungen</h2>
            <InfoTooltip text={HELP.production.orderQueue} />
          </div>
            <div className="flex gap-2">
              {([
                ["queue", "Warteschlange", stats.created],
                ["production", "In Produktion", stats.inProduction],
                ["shipping", "Versandbereit", stats.shipped],
                ["done", "Abgeschlossen", stats.delivered + stats.returned + stats.cancelled],
              ] as [typeof activeTab, string, number][]).map(([tab, label, count]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${activeTab === tab ? "bg-[#0A0A0A] text-white" : "border border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"}`}
                >
                  {label} {count > 0 && <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === tab ? "bg-white/20" : "bg-[#F0EDE8]"}`}>{count}</span>}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <p className="text-sm text-[#9E9890]">Keine Bestellungen in dieser Kategorie.</p>
              {orders.length === 0 && (
                <Link href="/create" className="mt-4 inline-block text-sm underline">
                  Zum Configurator
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-8">
              {filteredOrders.map((order) => (
                <section key={order.id} className="rounded-2xl border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">
                        Order {order.id}
                      </h2>
                      <p className="text-sm text-[#9E9890]">
                        Erstellt am:{" "}
                        {new Date(order.createdAt).toLocaleString("de-DE")}
                      </p>
                      <p className="text-sm text-[#9E9890]">
                        Kunde: {order.customerName} ({order.customerEmail})
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        Gesamt: {(order.totalCents / 100).toFixed(2)} €
                      </p>
                      <p className="text-sm text-[#9E9890]">
                        Status: {getOrderStatusLabel(order.status)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9E9890]">
                      Status setzen
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["created", "Bestellt"],
                          ["in_production", "In Produktion"],
                          ["shipped", "Versendet"],
                          ["delivered", "Zugestellt"],
                          ["returned", "Retoure"],
                          ["cancelled", "Storniert"],
                        ] as [OrderStatus, string][]
                      ).map(([s, label]) => (
                        <button
                          key={s}
                          onClick={() => updateOrderStatus(order.id, s)}
                          disabled={updatingOrderId === order.id || order.status === s}
                          className={`rounded-xl border px-3 py-1.5 text-sm transition-colors disabled:cursor-default ${
                            order.status === s
                              ? "border-black bg-[#0A0A0A] text-white"
                              : "hover:border-gray-600 disabled:opacity-40"
                          }`}
                        >
                          {label}
                          {order.status === s && " ✓"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DHL Versand */}
                  <div className="mt-5 rounded-xl bg-[#F0EDE8] p-4">
                    <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">DHL Versand</p>
                    {order.trackingNumber ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs text-[#3A3530]">
                          Tracking: <span className="font-mono font-semibold text-[#0A0A0A]">{order.trackingNumber}</span>
                        </span>
                        <a
                          href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${order.trackingNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-[#E5E0D8] bg-white px-3 py-1 text-[11px] text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                        >
                          Verfolgen ↗
                        </a>
                        {order.shippingLabelUrl && (
                          <a
                            href={order.shippingLabelUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-[#E5E0D8] bg-white px-3 py-1 text-[11px] text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                          >
                            Label ↗
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => createDhlLabel(order)}
                          disabled={dhlLoading === order.id}
                          className="rounded-full bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white transition-all active:scale-95 disabled:opacity-40"
                        >
                          {dhlLoading === order.id ? "Erstelle Label…" : "DHL-Label erstellen"}
                        </button>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Tracking-Nr. manuell"
                            value={trackingInputs[order.id] ?? ""}
                            onChange={(e) => setTrackingInputs((prev) => ({ ...prev, [order.id]: e.target.value }))}
                            className="rounded-full border border-[#E5E0D8] bg-white px-3 py-2 text-xs text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none w-44"
                          />
                          <button
                            onClick={() => saveTrackingNumber(order.id)}
                            disabled={!trackingInputs[order.id]?.trim()}
                            className="rounded-full border border-[#E5E0D8] bg-white px-3 py-2 text-xs text-[#6E6860] hover:border-[#0A0A0A] transition-colors disabled:opacity-40"
                          >
                            Speichern
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 space-y-6">
                    {order.items.map((item) => {
                      const fragrance = findFragrance(item.fragranceId);

                      return (
                        <div key={item.id} className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold">
                                {item.name}
                              </h3>
                              <p className="text-sm text-[#9E9890]">
                                Größe: {item.sizeMl} ml · Menge: {item.quantity}
                              </p>

                              {fragrance && (
                                <>
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full border px-2 py-1">
                                      {fragrance.isPublic
                                        ? "Öffentlich"
                                        : "Privat"}
                                    </span>
                                    <span className="rounded-full border px-2 py-1">
                                      Sample:{" "}
                                      {getSampleStatusLabel(
                                        fragrance.sampleStatus,
                                      )}
                                    </span>
                                    <span className="rounded-full border px-2 py-1">
                                      Status: {fragrance.status}
                                    </span>
                                    {fragrance.category ? (
                                      <span className="rounded-full border px-2 py-1">
                                        Kategorie: {fragrance.category}
                                      </span>
                                    ) : (
                                      <span className="rounded-full border px-2 py-1 text-[#C5C0B8]">
                                        Keine Kategorie
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-3 text-xs text-[#9E9890]">
                                    Release-Ready:{" "}
                                    {fragrance.sampleStatus === "tested" &&
                                    fragrance.category.trim().length > 0 &&
                                    fragrance.description.trim().length > 0
                                      ? "Ja"
                                      : "Nein"}
                                  </p>

                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {fragrance.sampleStatus === "requested" && (
                                      <button
                                        onClick={() =>
                                          markSampleAsShipped(fragrance.id)
                                        }
                                        disabled={
                                          updatingFragranceId === fragrance.id
                                        }
                                        className="rounded-xl border px-3 py-2 text-sm"
                                      >
                                        Als versendet markieren
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              <Link
                                href={`/fragrance/${item.fragranceId}`}
                                className="text-sm underline"
                              >
                                Duft ansehen
                              </Link>
                            </div>
                          </div>

                          {!fragrance ? (
                            <p className="mt-4 text-sm text-red-600">
                              Duftdaten konnten nicht geladen werden.
                            </p>
                          ) : (
                            <div className="mt-4">
                              <p className="font-medium">Mischanweisung</p>
                              <div className="mt-2 space-y-2">
                                {(
                                  fragranceAccordMap.get(item.fragranceId) ??
                                  Object.entries(fragrance.composition)
                                    .filter(([, pct]) => pct > 0)
                                    .map(([accordId, pct]) => ({
                                      accord_id: accordId,
                                      accord_name: accordId,
                                      percentage: pct,
                                    }))
                                ).map((accordEntry) => {
                                  const accordAmountMl =
                                    ((item.sizeMl * accordEntry.percentage) /
                                      100) *
                                    item.quantity;
                                  const components =
                                    accordComponentMap.get(
                                      accordEntry.accord_id,
                                    ) ?? [];

                                  return (
                                    <div
                                      key={accordEntry.accord_id}
                                      className="rounded-xl border p-3"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">
                                          {accordEntry.accord_name}
                                        </span>
                                        <span className="font-semibold">
                                          {accordEntry.percentage}% ·{" "}
                                          {accordAmountMl.toFixed(2)} ml
                                        </span>
                                      </div>

                                      {components.length > 0 && (
                                        <ul className="mt-3 space-y-2">
                                          {components.map((component) => {
                                            const componentMl =
                                              (accordAmountMl *
                                                component.percentage) /
                                              100;
                                            return (
                                              <li
                                                key={`${accordEntry.accord_id}-${component.raw_material_id}`}
                                                className="flex items-center justify-between text-sm text-[#6E6860]"
                                              >
                                                <span>
                                                  {component.material_name}
                                                </span>
                                                <span>
                                                  {component.percentage}% des
                                                  Accords ·{" "}
                                                  {componentMl.toFixed(2)} ml
                                                </span>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-light tracking-tight text-[#0A0A0A]">Sample Queue</h2>

          {sampleRequests.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <p>Aktuell keine Sample-Anfragen vorhanden.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {sampleRequests.map((request) => (
                <div key={request.id} className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {request.fragranceName}
                      </h3>
                      <p className="text-sm text-[#9E9890]">
                        Angefragt am:{" "}
                        {new Date(request.createdAt).toLocaleString("de-DE")}
                      </p>
                      <p className="text-sm text-[#9E9890]">
                        Creator: {request.creatorEmail ?? "unbekannt"}
                      </p>
                      <p className="text-sm text-[#9E9890]">
                        Status: {getSampleRequestStatusLabel(request.status)}
                      </p>
                    </div>

                    <Link
                      href={`/fragrance/${request.fragranceId}`}
                      className="text-sm underline"
                    >
                      Duft ansehen
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        updateSampleRequestStatus(
                          request.id,
                          request.fragranceId,
                          "requested",
                        )
                      }
                      disabled={updatingSampleRequestId === request.id}
                      className="rounded-xl border px-3 py-2 text-sm"
                    >
                      Angefordert
                    </button>
                    <button
                      onClick={() =>
                        updateSampleRequestStatus(
                          request.id,
                          request.fragranceId,
                          "shipped",
                        )
                      }
                      disabled={updatingSampleRequestId === request.id}
                      className="rounded-xl border px-3 py-2 text-sm"
                    >
                      Versendet
                    </button>
                    <button
                      onClick={() =>
                        updateSampleRequestStatus(
                          request.id,
                          request.fragranceId,
                          "received",
                        )
                      }
                      disabled={updatingSampleRequestId === request.id}
                      className="rounded-xl border px-3 py-2 text-sm"
                    >
                      Erhalten
                    </button>
                    <button
                      onClick={() =>
                        updateSampleRequestStatus(
                          request.id,
                          request.fragranceId,
                          "tested",
                        )
                      }
                      disabled={updatingSampleRequestId === request.id}
                      className="rounded-xl border px-3 py-2 text-sm"
                    >
                      Getestet
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
