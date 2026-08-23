"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { getCompanyIconSources } from "@/lib/company-branding";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-lg",
};

function CompanyAvatarContent({
  name,
  sources,
}: {
  name: string;
  sources: string[];
}) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex];

  if (!source) return (name || "C").slice(0, 1).toUpperCase();

  return (
    <img
      src={source}
      loading="lazy"
      decoding="async"
      alt=""
      referrerPolicy="no-referrer"
      className="h-full w-full bg-white/95 object-contain p-1.5"
      onError={() => setSourceIndex((current) => current + 1)}
    />
  );
}

export default function CompanyAvatar({
  name,
  website,
  size = "md",
  className,
}: {
  name: string;
  website?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const sources = getCompanyIconSources(website);
  const sourceKey = sources.join("|") || "initial";

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-700/80 bg-gradient-to-br from-sky-400 to-orange-500 font-black text-white shadow-lg shadow-sky-950/25",
        sizeClasses[size],
        className,
      )}
      title={name}
    >
      <CompanyAvatarContent key={sourceKey} name={name} sources={sources} />
    </span>
  );
}
