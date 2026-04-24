export type ChallengeStatus = "draft" | "active" | "judging" | "ended";

export type Challenge = {
  id: string;
  title: string;
  description: string | null;
  accordRequired: string | null;
  prizeAmountCents: number;
  prizeDescription: string | null;
  rules: string | null;
  logoUrl: string | null;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  maxEntries: number | null;
};

export type ChallengeEntry = {
  id: string;
  challengeId: string;
  userId: string;
  fragranceId: string | null;
  message: string | null;
  isWinner: boolean;
  createdAt: string;
};

/** Raw DB row from `challenges` table */
export type DbChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  accord_required: string | null;
  prize_amount_cents: number;
  prize_description: string | null;
  rules: string | null;
  logo_url: string | null;
  start_date: string;
  end_date: string;
  status: ChallengeStatus;
  max_entries: number | null;
};

export function mapChallenge(r: DbChallengeRow): Challenge {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    accordRequired: r.accord_required,
    prizeAmountCents: r.prize_amount_cents,
    prizeDescription: r.prize_description,
    rules: r.rules,
    logoUrl: r.logo_url,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    maxEntries: r.max_entries,
  };
}
