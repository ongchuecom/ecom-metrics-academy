import site from '../data/site.json'

// Chính sách riêng tư: cần cho đăng nhập Facebook (Privacy Policy URL và hướng dẫn xóa dữ liệu)
const S = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="font-display text-lg font-extrabold text-ink">{title}</h2>
    <div className="space-y-2 text-[15px] leading-relaxed text-body">{children}</div>
  </section>
)

export default function Privacy() {
  const contact = site.contact?.website
  return (
    <article className="max-w-3xl space-y-7">
      <header>
        <p className="eyebrow text-brand-600">Ecom Metrics Academy</p>
        <h1 className="mt-1.5 font-display text-2xl font-black text-ink sm:text-3xl">Chính sách riêng tư</h1>
        <p className="mt-2 text-sm text-muted">Cập nhật ngày 19/11/2026</p>
      </header>

      <S title="Trang này thu thập gì">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><b>Khi đăng nhập bằng Google hoặc Facebook:</b> mã tài khoản do Google/Facebook cấp, tên hiển thị và ảnh đại diện. Không lấy danh sách bạn bè, không đăng bài thay anh/chị, không đọc tin nhắn.</li>
          <li><b>Điểm trắc nghiệm:</b> điểm lần làm đầu tiên của mỗi Playbook và tên hiển thị anh/chị chọn cho bảng xếp hạng.</li>
          <li><b>Góp ý dưới mỗi bài:</b> số sao, nội dung góp ý, loại thiết bị. Góp ý là ẩn danh, không gắn với tài khoản.</li>
          <li><b>Form để lại Zalo (nếu anh/chị điền):</b> tên gọi, số Zalo, kênh bán, doanh thu tháng, nội dung cần hỗ trợ, tóm tắt khám sức khỏe shop nếu anh/chị chọn gửi kèm.</li>
          <li><b>Trên máy của anh/chị:</b> trình duyệt lưu điểm trắc nghiệm, số sao đã chấm và trạng thái đăng nhập để lần sau không phải làm lại.</li>
        </ul>
      </S>

      <S title="Dùng để làm gì">
        <p>Hiện điểm và tên hiển thị trên bảng xếp hạng; giữ điểm khi anh/chị đổi máy; đọc góp ý để sửa bài cho dễ hiểu hơn; liên hệ qua Zalo khi anh/chị yêu cầu tư vấn. Không bán hay chia sẻ dữ liệu cho bên thứ ba để quảng cáo.</p>
      </S>

      <S title="Lưu ở đâu">
        <p>Đăng nhập do Firebase Authentication (Google) xử lý. Điểm trắc nghiệm và góp ý lưu trong kho dữ liệu riêng tư của Ông chú Ecom trên GitHub. Thông tin form Zalo lưu trong Google Sheet riêng tư. Chỉ Ông chú Ecom và đội A1demy xem được.</p>
      </S>

      <S title="Xóa dữ liệu của anh/chị">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><b>Điểm và tên trên bảng xếp hạng:</b> đăng nhập, vào trang Bảng xếp hạng, bấm “Xóa điểm của tôi khỏi bảng xếp hạng”. Dữ liệu bị xóa ngay.</li>
          <li><b>Gỡ quyền đăng nhập Facebook:</b> vào Facebook → Cài đặt → Ứng dụng và trang web → chọn Ecom Metrics Academy → Gỡ.</li>
          <li><b>Gỡ quyền đăng nhập Google:</b> vào myaccount.google.com → Bảo mật → Kết nối với ứng dụng bên thứ ba → chọn Ecom Metrics Academy → Xóa.</li>
          <li><b>Thông tin form Zalo hoặc yêu cầu khác:</b> nhắn qua kênh liên hệ ở trang chủ{contact ? <> hoặc <a href={contact} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">{contact.replace(/^https?:\/\//, '')}</a></> : null}, ghi rõ “xóa dữ liệu”. Yêu cầu được xử lý trong 7 ngày làm việc.</li>
          <li><b>Dữ liệu trên máy:</b> xóa dữ liệu trang web trong cài đặt trình duyệt.</li>
        </ul>
      </S>
    </article>
  )
}
