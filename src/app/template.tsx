// Bọc nội dung mỗi trang để có hiệu ứng hiện mờ khi chuyển trang (template dựng lại mỗi lần đổi trang)
export default function MauTrang({ children }: { children: React.ReactNode }) {
  return <div className="vao-trang">{children}</div>;
}
