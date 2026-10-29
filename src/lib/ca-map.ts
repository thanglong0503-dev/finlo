// Giao dịch Bitcoin lớn trong các khối gần đây (mempool.space). Chưa gắn nhãn ví (sàn, quỹ…): dữ liệu nhãn đều là dịch vụ trả phí.
// "Số chuyển thật" = tổng đầu ra gửi tới địa chỉ KHÔNG nằm trong đầu vào, để loại phần tiền thừa trả về chính ví gửi.

import { cacheLife } from "next/cache";
import { type GiaoDichLon, NGUONG_BTC, phanLoai, soChuyenThat } from "@/lib/ca-map-chung";

const GOC = "https://mempool.space/api";
const DAU = { "user-agent": "FinloBot/1.0 (+https://www.finlo.id.vn)" };

async function nap<T>(duong: string): Promise<T> {
  const r = await fetch(GOC + duong, { headers: DAU, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`mempool ${r.status}`);
  return r.json() as Promise<T>;
}

type TxDayDu = {
  txid: string;
  vin: { prevout: { scriptpubkey_address?: string; value: number } | null }[];
  vout: { scriptpubkey_address?: string; value: number }[];
};

// Một khối đã xác nhận không đổi nữa: lưu đệm lâu theo hash
async function giaoDichLonTrongKhoi(hash: string, cao: number, luc: number): Promise<GiaoDichLon[]> {
  "use cache";
  cacheLife("max");
  const tom = await nap<{ txid: string; value: number }[]>(`/v1/block/${hash}/summary`);
  // Chỉ mở chi tiết 30 giao dịch có tổng đầu ra lớn nhất để tiết kiệm request
  const ung = tom.slice(1).filter((x) => x.value >= NGUONG_BTC * 1e8).sort((a, b) => b.value - a.value).slice(0, 30);
  const kq: GiaoDichLon[] = [];
  for (const u of ung) {
    const tx = await nap<TxDayDu>(`/tx/${u.txid}`).catch(() => null);
    if (!tx) continue;
    const btc = soChuyenThat(
      tx.vin.map((v) => v.prevout?.scriptpubkey_address),
      tx.vout.map((o) => ({ diaChi: o.scriptpubkey_address, sat: o.value })),
    );
    if (btc >= NGUONG_BTC) kq.push({ txid: tx.txid, khoi: cao, luc: luc * 1000, btc, vao: tx.vin.length, ra: tx.vout.length, kieu: phanLoai(tx.vin.length, tx.vout.length) });
  }
  return kq;
}

export async function layCaMapBtc(soKhoi = 6): Promise<{ khoi: { cao: number; luc: number }[]; giaoDich: GiaoDichLon[] } | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 120, expire: 900 });
  try {
    const khoi = (await nap<{ id: string; height: number; timestamp: number }[]>("/v1/blocks")).slice(0, soKhoi);
    const theoKhoi = await Promise.all(khoi.map((k) => giaoDichLonTrongKhoi(k.id, k.height, k.timestamp).catch(() => [])));
    return {
      khoi: khoi.map((k) => ({ cao: k.height, luc: k.timestamp * 1000 })),
      giaoDich: theoKhoi.flat().sort((a, b) => b.luc - a.luc || b.btc - a.btc),
    };
  } catch {
    return null;
  }
}
