import type { IChartApi, IPrimitivePaneView, ISeriesApi, ISeriesPrimitive, SeriesAttachedParameter, SeriesType, Time } from "lightweight-charts";
import type { Chuoi } from "@/lib/chi-bao";

// Tô phần giữa hai đường bậc thang, nằm dưới nến, không ảnh hưởng thang giá.
// Thư viện biểu đồ chỉ tô được từ một đường tới mép khung nên phải tự vẽ.
// Mỗi phần tử của hai chuỗi ứng với một cây nến theo đúng thứ tự trên biểu đồ.
export class VungGiuaHaiDuong implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<SeriesType> | null = null;
  private capNhat: (() => void) | null = null;
  private tren: Chuoi = [];
  private duoi: Chuoi = [];

  constructor(private mau: string) {}

  attached({ chart, series, requestUpdate }: SeriesAttachedParameter<Time>) {
    this.chart = chart;
    this.series = series;
    this.capNhat = requestUpdate;
  }

  detached() {
    this.chart = this.series = this.capNhat = null;
  }

  datDuLieu(tren: Chuoi, duoi: Chuoi) {
    this.tren = tren;
    this.duoi = duoi;
    this.capNhat?.();
  }

  // Các đoạn nến liên tục đang nhìn thấy, đã đổi sang toạ độ màn hình
  private cacDoan() {
    const { chart, series, tren, duoi } = this;
    const khoang = chart?.timeScale().getVisibleLogicalRange();
    if (!chart || !series || !khoang) return [];
    const dau = Math.max(0, Math.floor(khoang.from) - 1);
    const cuoi = Math.min(tren.length - 1, Math.ceil(khoang.to) + 1);
    const doan: { x: number; tren: number; duoi: number }[][] = [];
    let hienTai: (typeof doan)[number] | null = null;
    for (let i = dau; i <= cuoi; i++) {
      const [a, b] = [tren[i], duoi[i]];
      const x = chart.timeScale().logicalToCoordinate(i as never);
      const yTren = a == null ? null : series.priceToCoordinate(a);
      const yDuoi = b == null ? null : series.priceToCoordinate(b);
      if (x == null || yTren == null || yDuoi == null) {
        hienTai = null;
        continue;
      }
      if (!hienTai) doan.push((hienTai = []));
      hienTai.push({ x, tren: yTren, duoi: yDuoi });
    }
    return doan;
  }

  paneViews(): IPrimitivePaneView[] {
    return [
      {
        zOrder: () => "bottom",
        renderer: () => ({
          draw: (target) =>
            target.useBitmapCoordinateSpace(({ context: c, horizontalPixelRatio: ngang, verticalPixelRatio: doc }) => {
              c.fillStyle = this.mau;
              for (const d of this.cacDoan()) {
                c.beginPath();
                c.moveTo(d[0].x * ngang, d[0].tren * doc);
                // Đi ngang trước rồi mới đổi mức, khớp cách thư viện vẽ đường bậc thang
                for (let i = 1; i < d.length; i++) {
                  c.lineTo(d[i].x * ngang, d[i - 1].tren * doc);
                  c.lineTo(d[i].x * ngang, d[i].tren * doc);
                }
                c.lineTo(d[d.length - 1].x * ngang, d[d.length - 1].duoi * doc);
                for (let i = d.length - 1; i > 0; i--) {
                  c.lineTo(d[i].x * ngang, d[i - 1].duoi * doc);
                  c.lineTo(d[i - 1].x * ngang, d[i - 1].duoi * doc);
                }
                c.closePath();
                c.fill();
              }
            }),
        }),
      },
    ];
  }
}
