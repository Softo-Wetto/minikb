import { cn } from "@/lib/utils";

type MiniKbLogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

export default function MiniKbLogo({
  className,
  markClassName,
  showWordmark = true,
  wordmarkClassName,
}: MiniKbLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "group/logo relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md border border-orange-300/35 bg-slate-950 shadow-lg shadow-orange-950/30",
          markClassName
        )}
        aria-hidden="true"
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(251,146,60,0.7),transparent_30%),linear-gradient(135deg,rgba(249,115,22,0.32),rgba(15,23,42,0.15)_48%,rgba(56,189,248,0.24))]" />
        <span className="minikb-logo-scan absolute inset-0 opacity-70" />
        <svg
          viewBox="0 0 40 40"
          className="relative h-7 w-7 text-orange-100 transition duration-300 group-hover/logo:scale-105"
          fill="none"
          role="img"
          aria-label="MiniKB"
        >
          <path
            d="M11 9.5h13.5L31 16v14.5H11V9.5Z"
            className="fill-slate-950/70 stroke-orange-200"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M24.5 9.5V16H31"
            className="stroke-cyan-200/90"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M15 17h8M15 22h11M15 26.5h6.5"
            className="stroke-slate-100/85"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M8 14H4.8M8 24H4.8M32 20h3.2M20 32v3.2"
            className="stroke-cyan-200"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="4.8" cy="14" r="1.4" className="fill-cyan-200" />
          <circle cx="4.8" cy="24" r="1.4" className="fill-orange-200" />
          <circle cx="35.2" cy="20" r="1.4" className="fill-cyan-200" />
          <circle cx="20" cy="35.2" r="1.4" className="fill-orange-200" />
        </svg>
      </span>

      {showWordmark && (
        <span
          className={cn(
            "hidden text-sm font-semibold tracking-wide text-white sm:block",
            wordmarkClassName
          )}
        >
          MiniKB
        </span>
      )}
    </span>
  );
}
