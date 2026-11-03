// Quét FL Bắt đáy và Quét tín hiệu mỗi ngày một lần rồi lưu vào kho. Website chỉ đọc file kết quả, không tự quét.
//
//   npx tsx --tsconfig scripts/tsconfig.quet.json scripts/quet-ngay.ts
//
// Kết quả ghi vào src/data/bat-day.json và src/data/quet-tin-hieu.json. Quét lỗi thì giữ nguyên file cũ.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { quetBatDay } from "@/lib/quet-bat-day";
import { quetTinHieu } from "@/lib/quet-tin-hieu";

const SO_MA_TOI_THIEU = 100; // ít hơn nghĩa là nguồn dữ liệu đang lỗi, không ghi đè kết quả cũ

// Làm tròn để file gọn và không đổi vì những chữ số lẻ vô nghĩa
const lamTron = (_: string, v: unknown) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v);

async function chay(ten: string, quet: () => Promise<{ ngay: number; soMa: number }>) {
  const tep = join(process.cwd(), "src/data", `${ten}.json`);
  const kq = await quet();
  const ngayCu = existsSync(tep) ? (JSON.parse(readFileSync(tep, "utf8")) as { ngay: number }).ngay : 0;
  if (kq.soMa < SO_MA_TOI_THIEU || kq.ngay < ngayCu) throw new Error(`${ten}: kết quả bất thường (${kq.soMa} mã, phiên ${kq.ngay}), giữ file cũ`);
  const noiDung = JSON.stringify(kq, lamTron);
  writeFileSync(tep, `${noiDung}\n`);
  console.log(`${ten}: ${kq.soMa} mã, phiên ${new Date(kq.ngay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}, ${noiDung.length} byte`);
}

async function chinh() {
  const ketQua = await Promise.allSettled([chay("bat-day", quetBatDay), chay("quet-tin-hieu", quetTinHieu)]);
  for (const k of ketQua) if (k.status === "rejected") console.error(k.reason);
  if (ketQua.some((k) => k.status === "rejected")) process.exit(1);
}

void chinh();
