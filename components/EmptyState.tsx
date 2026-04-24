type Props = {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
};

export default function EmptyState({ icon = "◎", title, description, action, className = "" }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="mb-4 text-3xl text-[#C5C0B8]">{icon}</div>
      <p className="text-sm font-medium text-[#0A0A0A]">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-[#9E9890]">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <a
              href={action.href}
              className="rounded-full bg-[#0A0A0A] px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-[#2A2A2A] transition-colors"
            >
              {action.label}
            </a>
          ) : (
            <button
              onClick={action.onClick}
              className="rounded-full bg-[#0A0A0A] px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-[#2A2A2A] transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
