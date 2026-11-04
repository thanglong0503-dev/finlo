// Quét FL Bắt đáy và Quét tín hiệu mỗi ngày một lần rồi lưu vào kho. Website chỉ đọc file kết quả, không tự quét.
//
//   npx tsx --tsconfig scripts/tsconfig.quet.json scripts/quet-ngay.ts
//
// Kết quả ghi vào src/data/*.json (bat-day, quet-tin-hieu, dong-tien-ngoai, ban-tin). Quét lỗi thì giữ nguyên file cũ.
// Thêm --cuoi-phien để chỉ tính lại dòng tiền khối ngoại và bản tin, không quét toàn bộ nến.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BanTin } from "@/lib/cuoi-phien";
import { quetBatDay } from "@/lib/quet-bat-day";
import { quetCuoiPhien } from "@/lib/quet-cuoi-phien";
import { quetTinHieu, type KetQuaQuetTinHieu } from "@/lib/quet-tin-hieu";

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

const docJson = <T,>(ten: string): T | null => {
  const tep = join(process.cwd(), "src/data", `${ten}.json`);
  return existsSync(tep) ? (JSON.parse(readFileSync(tep, "utf8")) as T) : null;
};

// Chạy sau khi quét tín hiệu xong, vì bản tin dùng kết quả quét của đúng phiên đó
async function chayCuoiPhien() {
  const { dongTien, banTin } = await quetCuoiPhien(docJson<{ ds: BanTin[] }>("ban-tin")?.ds ?? [], docJson<KetQuaQuetTinHieu>("quet-tin-hieu"));
  const ngayCu = docJson<{ ngay: string }>("dong-tien-ngoai")?.ngay ?? "";
  if (dongTien.soMa < SO_MA_TOI_THIEU || dongTien.ngay < ngayCu) throw new Error(`cuối phiên: kết quả bất thường (${dongTien.soMa} mã, phiên ${dongTien.ngay}), giữ file cũ`);
  for (const [ten, noiDung] of [["dong-tien-ngoai", dongTien], ["ban-tin", { ds: banTin }]] as const) {
    const chuoi = JSON.stringify(noiDung);
    writeFileSync(join(process.cwd(), "src/data", `${ten}.json`), `${chuoi}\n`);
    console.log(`${ten}: phiên ${dongTien.ngay}, ${chuoi.length} byte`);
  }
}

async function chinh() {
  const ketQua: PromiseSettledResult<void>[] = process.argv.includes("--cuoi-phien") ? [] : await Promise.allSettled([chay("bat-day", quetBatDay), chay("quet-tin-hieu", quetTinHieu)]);
  ketQua.push(...(await Promise.allSettled([chayCuoiPhien()])));
  for (const k of ketQua) if (k.status === "rejected") console.error(k.reason);
  if (ketQua.some((k) => k.status === "rejected")) process.exit(1);
}

void chinh();
