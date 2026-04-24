export type OrderStatus =
  | "pending_payment"
  | "created"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PayoutStatus = "pending" | "payable" | "paid";
export type AffiliatePayoutStatus = "none" | "pending" | "payable" | "paid";

export type OrderItem = {
  id: string;
  orderId: string;
  fragranceId: string;
  fragranceName: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
  creatorId: string | null;
  payoutStatus: PayoutStatus;
  affiliateUserId: string | null;
  affiliateCommissionCents: number;
  affiliateCommissionPercent: number;
  affiliatePayoutStatus: AffiliatePayoutStatus;
};

export type Order = {
  id: string;
  userId: string | null;
  customerEmail: string | null;
  status: OrderStatus;
  totalCents: number;
  stripePaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
  items: OrderItem[];
};

/** Raw DB row from `orders` table */
export type DbOrderRow = {
  id: string;
  user_id: string | null;
  customer_email: string | null;
  status: OrderStatus;
  total_cents: number;
  stripe_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
};

/** Raw DB row from `order_items` table */
export type DbOrderItemRow = {
  id: string;
  order_id: string;
  fragrance_id: string;
  quantity: number;
  unit_cents: number;
  total_cents: number;
  creator_id: string | null;
  payout_status: PayoutStatus;
  affiliate_user_id: string | null;
  affiliate_commission_cents: number;
  affiliate_commission_percent: number;
  affiliate_payout_status: AffiliatePayoutStatus;
};
