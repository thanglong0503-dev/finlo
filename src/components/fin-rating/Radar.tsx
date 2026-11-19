// Biểu đồ mạng nhện của Fin Rating: thang 0 đến 10, mỗi trục một đỉnh. Vẽ bằng SVG phía máy chủ, không cần JavaScript.

export type ChuoiRadar = { ten: string; gt: (number | null)[]; mau: string; to?: boolean; dut?: boolean };

const R = 120;
const TAM = { x: 210, y: 175 };

const diem = (i: number, n: number, r: number) => {
  const goc = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return { x: TAM.x + r * Math.cos(goc), y: TAM.y + r * Math.sin(goc) };
};

// Nhãn dài tách làm hai dòng ở khoảng trắng gần giữa
function tachDong(s: string) {
  if (s.length <= 12) return [s];
  const giua = s.length / 2;
  let cat = -1;
  for (let i = 0; i < s.length; i++) if (s[i] === " " && (cat < 0 || Math.abs(i - giua) < Math.abs(cat - giua))) cat = i;
  return cat < 0 ? [s] : [s.slice(0, cat), s.slice(cat + 1)];
}

export function Radar({ nhan, chuoi, moTa }: { nhan: string[]; chuoi: ChuoiRadar[]; moTa: string }) {
  const n = nhan.length;
  const vong = [2, 4, 6, 8, 10];
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[12px] font-semibold">
        {chuoi.map((c) => (
          <span key={c.ten} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: c.mau, opacity: c.dut ? 0.8 : 1 }} />
            {c.ten}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 420 350" role="img" aria-label={moTa} className="mx-auto mt-1 block w-full max-w-[460px]">
        {vong.map((v) => (
          <polygon
            key={v}
            points={nhan.map((_, i) => diem(i, n, (R * v) / 10)).map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--vien)"
            strokeWidth={1}
          />
        ))}
        {nhan.map((_, i) => {
          const p = diem(i, n, R);
          return <line key={i} x1={TAM.x} y1={TAM.y} x2={p.x} y2={p.y} stroke="var(--vien)" strokeWidth={1} />;
        })}
        {vong.map((v) => (
          <text key={v} x={TAM.x + 3} y={TAM.y - (R * v) / 10 + 3} fontSize={9} fill="var(--chu-phu)" className="tabular-nums">
            {v}
          </text>
        ))}
        {chuoi.map((c) => {
          const dinh = c.gt.map((g, i) => diem(i, n, (R * Math.max(0, g ?? 0)) / 10));
          return (
            <g key={c.ten}>
              <polygon
                points={dinh.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={c.to ? c.mau : "none"}
                fillOpacity={c.to ? 0.22 : 0}
                stroke={c.mau}
                strokeWidth={c.to ? 2.5 : 1.5}
                strokeDasharray={c.dut ? "4 3" : undefined}
                strokeLinejoin="round"
              />
              {c.to && dinh.map((p, i) => (c.gt[i] != null ? <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={c.mau} /> : null))}
            </g>
          );
        })}
        {nhan.map((t, i) => {
          const p = diem(i, n, R + 18);
          const neo = Math.abs(p.x - TAM.x) < 8 ? "middle" : p.x > TAM.x ? "start" : "end";
          const dong = tachDong(t);
          const y0 = p.y - ((dong.length - 1) * 13) / 2 + 4;
          return (
            <text key={t} x={p.x} y={y0} textAnchor={neo} fontSize={12} fontWeight={600} fill="var(--chu)">
              {dong.map((d, j) => (
                <tspan key={j} x={p.x} dy={j === 0 ? 0 : 13}>
                  {d}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
