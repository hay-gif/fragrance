export type SampleStatus = "not_requested" | "requested" | "shipped" | "tested";
export type FragranceStatus = "draft" | "active" | "archived";

export type Fragrance = {
  id: string;
  name: string;
  description: string;
  category: string;
  sizeMl: number;
  priceCents: number;
  status: FragranceStatus;
  isPublic: boolean;
  imageUrl: string | null;
  ownerId: string | null;
  creatorId: string | null;
  sampleStatus: SampleStatus;
  createdAt: string;
};

/** Raw DB row from `fragrances` table */
export type DbFragranceRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  size_ml: number;
  price_cents: number;
  status: FragranceStatus;
  is_public: boolean;
  image_url: string | null;
  owner_id: string | null;
  creator_id: string | null;
  sample_status: SampleStatus;
  created_at: string;
};

export function mapFragrance(r: DbFragranceRow): Fragrance {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    category: r.category ?? "",
    sizeMl: r.size_ml,
    priceCents: r.price_cents,
    status: r.status,
    isPublic: r.is_public,
    imageUrl: r.image_url,
    ownerId: r.owner_id,
    creatorId: r.creator_id,
    sampleStatus: r.sample_status,
    createdAt: r.created_at,
  };
}
