type Props = {
  /** Additional classes for the outer wrapper */
  className?: string;
  /** Size of the spinner ring (Tailwind h/w class suffix, e.g. "6" → h-6 w-6) */
  size?: string;
  /** Text shown below spinner. Omit to hide. */
  label?: string;
};

export default function LoadingSpinner({ className = "", size = "8", label }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`h-${size} w-${size} rounded-full border-2 border-[#0A0A0A] border-t-transparent animate-spin`} />
      {label && (
        <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">{label}</p>
      )}
    </div>
  );
}
