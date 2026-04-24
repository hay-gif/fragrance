type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  // Orders
  pending_payment: { label: "Zahlung ausstehend", className: "bg-amber-50 text-amber-700 border-amber-200" },
  created:         { label: "Erstellt",            className: "bg-sky-50 text-sky-700 border-sky-200" },
  processing:      { label: "In Bearbeitung",      className: "bg-blue-50 text-blue-700 border-blue-200" },
  shipped:         { label: "Versandt",             className: "bg-violet-50 text-violet-700 border-violet-200" },
  delivered:       { label: "Zugestellt",           className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled:       { label: "Storniert",            className: "bg-[#F0EDE8] text-[#6E6860] border-[#E5E0D8]" },
  refunded:        { label: "Erstattet",            className: "bg-[#F0EDE8] text-[#6E6860] border-[#E5E0D8]" },
  // Subscriptions
  active:          { label: "Aktiv",               className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paused:          { label: "Pausiert",             className: "bg-amber-50 text-amber-700 border-amber-200" },
  past_due:        { label: "Zahlung offen",        className: "bg-red-50 text-red-700 border-red-200" },
  // Payouts
  pending:         { label: "Ausstehend",           className: "bg-amber-50 text-amber-700 border-amber-200" },
  payable:         { label: "Auszahlbar",           className: "bg-sky-50 text-sky-700 border-sky-200" },
  paid:            { label: "Ausgezahlt",           className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  none:            { label: "–",                    className: "bg-[#F0EDE8] text-[#9E9890] border-[#E5E0D8]" },
  // Fragrances
  draft:           { label: "Entwurf",              className: "bg-[#F0EDE8] text-[#6E6860] border-[#E5E0D8]" },
  // Challenges
  judging:         { label: "Bewertung",            className: "bg-violet-50 text-violet-700 border-violet-200" },
  ended:           { label: "Beendet",              className: "bg-[#F0EDE8] text-[#6E6860] border-[#E5E0D8]" },
  // Creator applications
  approved:        { label: "Genehmigt",            className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected:        { label: "Abgelehnt",            className: "bg-red-50 text-red-700 border-red-200" },
};

type Props = {
  status: string;
  /** Override the label */
  label?: string;
  className?: string;
};

export default function StatusBadge({ status, label, className = "" }: Props) {
  const config = STATUS_MAP[status] ?? { label: status, className: "bg-[#F0EDE8] text-[#6E6860] border-[#E5E0D8]" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.className} ${className}`}>
      {label ?? config.label}
    </span>
  );
}
