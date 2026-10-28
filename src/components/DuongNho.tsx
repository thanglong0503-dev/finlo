// Biểu đồ đường nhỏ (sparkline) cho thẻ chỉ số, vẽ bằng SVG thuần
export function DuongNho({ diem, tang }: { diem: number[]; tang: boolean }) {
  if (diem.length < 2) return null;
  const min = Math.min(...diem);
  const max = Math.max(...diem);
  const bienDo = max - min || 1;
  const W = 120;
  const H = 32;
  const toaDo = diem
    .map((d, i) => `${((i / (diem.length - 1)) * W).toFixed(1)},${(H - ((d - min) / bienDo) * H).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <polyline
        points={toaDo}
        fill="none"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        className={tang ? "stroke-tang" : "stroke-giam"}
      />
    </svg>
  );
}
