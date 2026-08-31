"use client";

import type { ReactNode } from "react";

type StatVariant = "brand" | "success" | "warning" | "danger" | "info" | "purple";

const variantStyles: Record<StatVariant, { bg: string; iconBg: string; iconColor: string; ring: string }> = {
  brand:    { bg: "bg-[#082b59]/[0.03]", iconBg: "bg-[#082b59]/10", iconColor: "text-[#082b59]", ring: "ring-[#082b59]/10" },
  success:  { bg: "bg-emerald-50/60",     iconBg: "bg-emerald-100",   iconColor: "text-emerald-600", ring: "ring-emerald-200" },
  warning:  { bg: "bg-amber-50/60",       iconBg: "bg-amber-100",     iconColor: "text-amber-600",   ring: "ring-amber-200" },
  danger:   { bg: "bg-red-50/60",         iconBg: "bg-red-100",       iconColor: "text-red-600",     ring: "ring-red-200" },
  info:     { bg: "bg-blue-50/60",        iconBg: "bg-blue-100",      iconColor: "text-blue-600",    ring: "ring-blue-200" },
  purple:   { bg: "bg-purple-50/60",      iconBg: "bg-purple-100",    iconColor: "text-purple-600",  ring: "ring-purple-200" },
};

type StatCardProps = {
  label: string;
  value: number | string;
  variant?: StatVariant;
  icon?: React.ElementType;
  children?: ReactNode;
  className?: string;
};

export function StatCard({
  label,
  value,
  variant = "brand",
  icon: Icon,
  className = "",
}: StatCardProps) {
  const v = variantStyles[variant];

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-slate-200/60 ${v.bg} p-4 transition-all duration-200 hover:shadow-md hover:ring-1 ${v.ring} sm:p-5 ${className}`}
    >
      {Icon && (
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${v.iconBg} transition-transform duration-200 group-hover:scale-110`}>
          <Icon className={`h-5 w-5 ${v.iconColor}`} />
        </div>
      )}
      <p className="text-2xl font-extrabold tracking-tight text-slate-800 tabular-nums sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

export function StatCardGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6 ${className}`}>
      {children}
    </div>
  );
}

export function StatCardRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-6 grid grid-cols-3 gap-3 ${className}`}>
      {children}
    </div>
  );
}
