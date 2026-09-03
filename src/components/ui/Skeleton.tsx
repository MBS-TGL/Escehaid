function shimmer(cls: string) {
  return `${cls} relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent`;
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={shimmer(`rounded-lg bg-slate-200 ${className}`)} />;
}

export function SkeletonCircle({ className = "" }: { className?: string }) {
  return <div className={shimmer(`rounded-full bg-slate-200 ${className}`)} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={shimmer(`h-3 rounded bg-slate-200 ${i === lines - 1 ? "w-3/5" : "w-full"}`)}
        />
      ))}
    </div>
  );
}
