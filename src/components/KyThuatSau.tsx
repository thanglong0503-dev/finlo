import { BieuDoSo } from "@/components/BieuDoSo";
import { giaNghin } from "@/lib/dinh-dang";
import type { KyThuatSau as KetQua, MucGia } from "@/lib/ky-thuat-sau";

const so = (x: number | null, le = 1) => (x == null || !Number.isFinite(x) ? "—" : x.toLocaleString("vi-VN", { maximumFractionDigits: le, minimumFractionDigits: le }));
const dau = (x: number | null, le = 1) => (x == null ? "—" : `${x > 0 ? "+" : x < 0 ? "−" : ""}${so(Math.abs(x), le)}%`);
const mau = (x: number | null) => (x == null || x === 0 ? "" : x > 0 ? "text-tang" : "text-giam");
const MAU_KL = { Tăng: "text-tang", Giảm: "text-giam", "Đi ngang": "text-dung", "Chưa đủ dữ liệu": "text-chu-phu" } as const;

function Khung({ ten, moTa, children }: { ten: string; moTa: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-vien">
      <div className="border-b border-vien px-4 py-3">
        <h2 className="font-semibold">{ten}</h2>
        <p className="mt-0.5 text-[12px] text-chu-phu">{moTa}</p>
      </div>
      {children}
    </section>
  );
}

function DongMuc({ loai, m }: { loai: string; m: MucGia }) {
  return (
    <tr className="border-b border-vien last:border-0">
      <td className={`px-4 py-2 text-left font-medium ${loai === "Kháng cự" ? "text-giam" : "text-tang"}`}>{loai}</td>
      <td className="px-3 py-2 font-semibold">{giaNghin(m.gia)}</td>
      <td className="px-3 py-2">{dau(m.cach)}</td>
      <td className="px-4 py-2 text-chu-phu">{m.cham} lần quay đầu</td>
    </tr>
  );
}

export function KyThuatSau({ kq }: { kq: KetQua }) {
  const { xuHuong, xepHang, soSanh, muc, vungKl, fibo, quanTri } = kq;
  const soTang = xuHuong.filter((k) => k.ketLuan === "Tăng").length;
  const soGiam = xuHuong.filter((k) => k.ketLuan === "Giảm").length;
  const namLech = soSanh[3]?.lech ?? soSanh[2]?.lech ?? null;

  return (
    <div className="mt-8 space-y-4">
      <div>
        <p className="nhan-muc">Phân tích chuyên sâu</p>
        <h2 className="mt-1 text-xl font-bold tracking-[-0.03em]">Cấu trúc xu hướng, vùng giá và quản trị rủi ro</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Khung
          ten="Xu hướng theo ba khung thời gian"
          moTa={`${soTang}/3 khung đang tăng, ${soGiam}/3 khung đang giảm. ${xepHang === "tang" ? "Ba đường trung bình xếp tầng tăng (MA20 trên MA50 trên MA200)." : xepHang === "giam" ? "Ba đường trung bình xếp tầng giảm (MA20 dưới MA50 dưới MA200)." : xepHang === "lan" ? "Ba đường trung bình đang đan xen, xu hướng chưa rõ." : ""}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-right text-[13px] tabular-nums">
              <thead className="text-[12px] text-chu-phu">
                <tr className="border-b border-vien">
                  <th className="px-4 py-2 text-left font-medium">Khung</th>
                  <th className="px-3 py-2 font-medium">Đường</th>
                  <th className="px-3 py-2 font-medium">Giá so với đường</th>
                  <th className="px-3 py-2 font-medium">Độ dốc</th>
                  <th className="px-4 py-2 font-medium">Xu hướng</th>
                </tr>
              </thead>
              <tbody>
                {xuHuong.map((k) => (
                  <tr key={k.ten} className="border-b border-vien last:border-0">
                    <td className="px-4 py-2 text-left">{k.ten}</td>
                    <td className="px-3 py-2">
                      {k.duong} <span className="text-chu-phu">{k.giaTri != null ? giaNghin(k.giaTri) : ""}</span>
                    </td>
                    <td className={`px-3 py-2 ${k.giaTri != null ? mau(kq.gia - k.giaTri) : ""}`}>{k.giaTri != null ? dau((kq.gia / k.giaTri - 1) * 100) : "—"}</td>
                    <td className={`px-3 py-2 ${mau(k.doc)}`}>{dau(k.doc)}</td>
                    <td className={`px-4 py-2 font-semibold ${MAU_KL[k.ketLuan]}`}>{k.ketLuan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Khung>

        <Khung
          ten="Sức mạnh so với VN-Index"
          moTa={namLech == null ? "Chưa đủ lịch sử để so sánh." : `Trong ${soSanh[3]?.lech != null ? "1 năm" : "6 tháng"} qua, mã ${namLech >= 0 ? "mạnh hơn" : "yếu hơn"} VN-Index ${so(Math.abs(namLech))} điểm phần trăm.`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-right text-[13px] tabular-nums">
              <thead className="text-[12px] text-chu-phu">
                <tr className="border-b border-vien">
                  <th className="px-4 py-2 text-left font-medium">Kỳ</th>
                  <th className="px-3 py-2 font-medium">Mã</th>
                  <th className="px-3 py-2 font-medium">VN-Index</th>
                  <th className="px-4 py-2 font-medium">Chênh lệch</th>
                </tr>
              </thead>
              <tbody>
                {soSanh.map((x) => (
                  <tr key={x.ten} className="border-b border-vien last:border-0">
                    <td className="px-4 py-2 text-left">{x.ten}</td>
                    <td className={`px-3 py-2 ${mau(x.ma)}`}>{dau(x.ma)}</td>
                    <td className={`px-3 py-2 ${mau(x.cs)}`}>{dau(x.cs)}</td>
                    <td className={`px-4 py-2 font-semibold ${mau(x.lech)}`}>{x.lech == null ? "—" : `${x.lech > 0 ? "+" : x.lech < 0 ? "−" : ""}${so(Math.abs(x.lech))} điểm`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Khung>
      </div>

      {kq.duongRs.length > 60 && (
        <Khung ten="Đường sức mạnh tương đối, 1 năm" moTa="Giá cổ phiếu chia cho VN-Index, quy về 100 ở đầu kỳ. Đường đi lên là mã đang mạnh hơn thị trường, kể cả khi giá giảm.">
          <div className="p-4">
            <BieuDoSo donVi="diem" cao={220} duong={[{ ten: "Sức mạnh tương đối", diem: kq.duongRs }, { ten: "Trung bình 50 phiên", diem: kq.duongRsTb }]} />
          </div>
        </Khung>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Khung ten="Hỗ trợ và kháng cự gần nhất" moTa="Các mức giá mà trong 1 năm qua giá đã quay đầu, gom những mức cách nhau dưới 1,5%. Càng nhiều lần quay đầu, mức càng đáng chú ý.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-right text-[13px] tabular-nums">
              <thead className="text-[12px] text-chu-phu">
                <tr className="border-b border-vien">
                  <th className="px-4 py-2 text-left font-medium">Loại</th>
                  <th className="px-3 py-2 font-medium">Mức giá</th>
                  <th className="px-3 py-2 font-medium">Cách giá hiện tại</th>
                  <th className="px-4 py-2 font-medium">Độ tin cậy</th>
                </tr>
              </thead>
              <tbody>
                {[...muc.khangCu].reverse().map((m) => (
                  <DongMuc key={`k${m.gia}`} loai="Kháng cự" m={m} />
                ))}
                <tr className="border-b border-vien bg-nen-phu">
                  <td className="px-4 py-2 text-left font-semibold">Giá hiện tại</td>
                  <td className="px-3 py-2 font-bold">{giaNghin(kq.gia)}</td>
                  <td colSpan={2} />
                </tr>
                {muc.hoTro.map((m) => (
                  <DongMuc key={`h${m.gia}`} loai="Hỗ trợ" m={m} />
                ))}
              </tbody>
            </table>
          </div>
          {muc.khangCu.length === 0 && <p className="px-4 py-2 text-[12px] text-chu-phu">Không còn kháng cự phía trên trong 1 năm: giá đang ở vùng cao nhất của kỳ.</p>}
          {muc.hoTro.length === 0 && <p className="px-4 py-2 text-[12px] text-chu-phu">Không còn hỗ trợ phía dưới trong 1 năm: giá đang ở vùng thấp nhất của kỳ.</p>}
        </Khung>

        <Khung
          ten="Khối lượng theo vùng giá, 6 tháng"
          moTa={vungKl.poc != null ? `Giá được giao dịch nhiều nhất quanh ${giaNghin(vungKl.poc)}. 70% khối lượng nằm trong vùng ${giaNghin(vungKl.vungTu ?? 0)} đến ${giaNghin(vungKl.vungDen ?? 0)}.` : "Chưa đủ dữ liệu."}
        >
          <div className="space-y-0.5 p-4">
            {vungKl.o.map((x) => (
              <div key={x.tu} className="flex items-center gap-2 text-[11px] tabular-nums">
                <span className={`w-12 shrink-0 text-right ${x.coGia ? "font-bold text-chu" : "text-chu-phu"}`}>{giaNghin((x.tu + x.den) / 2)}</span>
                <div className="h-3 flex-1">
                  <div className={`h-full rounded-r-sm ${x.poc ? "bg-nhan" : x.trongVung ? "bg-nhan/45" : "bg-chu-phu/25"}`} style={{ width: `${Math.max(x.pt, 0.5)}%` }} />
                </div>
                <span className="w-16 shrink-0 text-chu-phu">{x.coGia ? "Giá hiện tại" : x.poc ? "Nhiều nhất" : ""}</span>
              </div>
            ))}
            <p className="pt-2 text-[11px] text-chu-phu">Thanh đậm: mức giá có khối lượng lớn nhất. Thanh nhạt màu xanh: vùng chứa 70% khối lượng. Vùng nhiều khối lượng thường níu giá lại, vùng thưa giá đi qua nhanh.</p>
          </div>
        </Khung>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Khung
          ten="Fibonacci thoái lui"
          moTa={`Nhịp ${fibo.nhipTang ? "tăng" : "giảm"} lớn nhất 6 tháng: ${fibo.nhipTang ? `từ ${giaNghin(fibo.thap)} lên ${giaNghin(fibo.cao)}` : `từ ${giaNghin(fibo.cao)} xuống ${giaNghin(fibo.thap)}`}. Giá đã ${fibo.nhipTang ? "điều chỉnh" : "hồi lại"} ${so(fibo.daHoi, 0)}% nhịp đó.`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-right text-[13px] tabular-nums">
              <thead className="text-[12px] text-chu-phu">
                <tr className="border-b border-vien">
                  <th className="px-4 py-2 text-left font-medium">Mức</th>
                  <th className="px-3 py-2 font-medium">Giá</th>
                  <th className="px-4 py-2 font-medium">Cách giá hiện tại</th>
                </tr>
              </thead>
              <tbody>
                {fibo.muc.map((m) => (
                  <tr key={m.tyLe} className={`border-b border-vien last:border-0 ${Math.abs(m.cach) < 1.5 ? "bg-nen-phu font-semibold" : ""}`}>
                    <td className="px-4 py-2 text-left">{so(m.tyLe)}%</td>
                    <td className="px-3 py-2">{giaNghin(m.gia)}</td>
                    <td className={`px-4 py-2 ${mau(m.cach)}`}>{dau(m.cach)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Khung>

        <Khung ten="Biến động và mức dừng lỗ tham khảo" moTa="Mức dừng lỗ đặt cách giá 2 lần biên độ dao động bình quân (ATR 14 phiên), để dao động thường ngày không chạm tới.">
          <dl className="space-y-2 p-4 text-[13px] tabular-nums">
            {[
              ["Biên độ dao động bình quân mỗi phiên (ATR 14)", quanTri.atr != null ? `${giaNghin(quanTri.atr)} (${so(quanTri.atrPt)}% giá)` : "—"],
              ["Mức dừng lỗ theo 2 × ATR", quanTri.dungLo != null ? `${giaNghin(quanTri.dungLo)} (${dau((quanTri.dungLo / kq.gia - 1) * 100)})` : "—"],
              ["Hỗ trợ gần nhất", quanTri.hoTroGan != null ? `${giaNghin(quanTri.hoTroGan)} (${dau((quanTri.hoTroGan / kq.gia - 1) * 100)})` : "Không có trong 1 năm"],
              ["Kháng cự gần nhất", quanTri.khangCuGan != null ? `${giaNghin(quanTri.khangCuGan)} (${dau((quanTri.khangCuGan / kq.gia - 1) * 100)})` : "Không có trong 1 năm"],
              ["Lợi nhuận tới kháng cự / rủi ro tới dừng lỗ", quanTri.tyLe != null ? `${so(quanTri.tyLe, 2)} lần` : "—"],
            ].map(([a, b]) => (
              <div key={a} className="flex justify-between gap-3">
                <dt className="text-chu-phu">{a}</dt>
                <dd className="text-right font-medium">{b}</dd>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-chu-phu">
              Tỷ lệ trên 2 lần thường được coi là đáng cân nhắc về mặt kỹ thuật. Đây là phép tính minh hoạ theo quy tắc cố định, không phải điểm mua bán được khuyến nghị.
            </p>
          </dl>
        </Khung>
      </div>
    </div>
  );
}
