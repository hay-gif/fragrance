type Props = {
  cols?: number;
  rows?: number;
  className?: string;
};

function SkeletonCell({ wide }: { wide?: boolean }) {
  return (
    <div className={`h-3.5 rounded-full bg-[#E8E3DC] animate-pulse ${wide ? "w-32" : "w-20"}`} />
  );
}

/** Table-row skeleton for data-loading states */
export function SkeletonRows({ cols = 4, rows = 5, className = "" }: Props) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className={className}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <SkeletonCell wide={j === 0} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Card skeleton for grid layouts */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#E5E0D8] bg-white p-5 space-y-3 ${className}`}>
      <div className="h-4 w-2/3 rounded-full bg-[#E8E3DC] animate-pulse" />
      <div className="h-3 w-full rounded-full bg-[#F0EDE8] animate-pulse" />
      <div className="h-3 w-4/5 rounded-full bg-[#F0EDE8] animate-pulse" />
    </div>
  );
}

/** Full-page loading overlay */
export function PageLoader({ label = "Lädt" }: { label?: string }) {
  return (
    <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-[#0A0A0A] border-t-transparent animate-spin" />
        <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">{label}</p>
      </div>
    </main>
  );
}

export default SkeletonRows;
