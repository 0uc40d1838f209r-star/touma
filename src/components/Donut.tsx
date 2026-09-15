// シンプルな円グラフ(ドーナツ)。conic-gradient で描画する。
export interface Segment {
  label: string;
  value: number;
  color: string;
}

export default function Donut({ segments, size = 120, centerLabel }: { segments: Segment[]; size?: number; centerLabel?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const shown = segments.filter((s) => s.value > 0);

  if (total === 0) {
    return <p className="text-sm text-gray-400">まだ記録がありません。</p>;
  }

  // conic-gradient のストップを組み立てる
  let acc = 0;
  const stops = shown
    .map((s) => {
      const start = (acc / total) * 100;
      acc += s.value;
      const end = (acc / total) * 100;
      return `${s.color} ${start}% ${end}%`;
    })
    .join(", ");

  const hole = Math.round(size * 0.58);

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative shrink-0 rounded-full"
        style={{ width: size, height: size, background: `conic-gradient(${stops})` }}
      >
        <div
          className="absolute rounded-full bg-white"
          style={{ width: hole, height: hole, top: (size - hole) / 2, left: (size - hole) / 2 }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none">{total}</span>
          {centerLabel && <span className="text-[10px] text-gray-400">{centerLabel}</span>}
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1">
        {shown.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {s.value}
              <span className="ml-1 font-normal text-gray-400">{Math.round((s.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
