# Bật đăng nhập Google và Facebook

Web dùng **Firebase Authentication** (miễn phí) cho cả hai cách đăng nhập. Làm một lần, khoảng 20 phút. Chưa làm thì nút đăng nhập tự ẩn, mọi thứ khác vẫn chạy bình thường.

## 1. Tạo dự án Firebase (5 phút)

1. Vào https://console.firebase.google.com → **Add project**, đặt tên `ecom-metrics-academy`. Google Analytics không cần bật.
2. Trong dự án, bấm biểu tượng **</>** (Web) để thêm Web app, đặt tên `web`. Bỏ qua phần Hosting.
3. Firebase hiện đoạn `firebaseConfig`. Gửi cho Claude 4 giá trị `apiKey`, `authDomain`, `projectId`, `appId`, hoặc tự dán vào `auth.firebase` trong `src/data/site.json`.
   Các giá trị này là công khai (nằm sẵn trong web), không phải mật khẩu.
4. Vào **Authentication → Settings → Authorized domains**, bấm **Add domain**, thêm `ongchuecom.github.io`.

## 2. Bật đăng nhập Google (1 phút)

**Authentication → Sign-in method → Google → Enable**, chọn email hỗ trợ, rồi **Save**.

## 3. Bật đăng nhập Facebook (15 phút)

1. Vào https://developers.facebook.com/apps → **Create app**, chọn loại cho phép đăng nhập bằng Facebook (Authenticate and request data from users with Facebook Login).
2. Trong app, mở **App settings → Basic**:
   - **Privacy Policy URL:** `https://ongchuecom.github.io/ecom-metrics-academy/chinh-sach-rieng-tu/`
   - **User data deletion → Data deletion instructions URL:** dán cùng link trên. Trang này có sẵn mục "Xóa dữ liệu của anh/chị".
   - Chép **App ID** và **App Secret**.
3. Quay lại Firebase: **Authentication → Sign-in method → Facebook → Enable**, dán App ID và App Secret.
   Firebase hiện một **OAuth redirect URI** (dạng `https://<projectId>.firebaseapp.com/__/auth/handler`); chép link đó lại.
4. Trên Facebook: **Facebook Login → Settings → Valid OAuth Redirect URIs**, dán link vừa chép, rồi **Save**.
5. Chuyển app sang chế độ **Live** (công khai). Facebook có thể yêu cầu xác minh doanh nghiệp tùy loại app.
   Trước khi Live, chỉ tài khoản quản trị app đăng nhập được.

## 4. Bật Firestore cho bảng xếp hạng (3 phút)

Bảng xếp hạng và điểm trắc nghiệm lưu trong **Firestore** (cơ sở dữ liệu của Firebase), chịu được hàng nghìn người cùng lúc.

1. Firebase → **Build → Firestore Database → Create database**. Chọn **Production mode** và vị trí `asia-southeast1` (Singapore, gần Việt Nam).
2. Mở tab **Rules**, xóa hết nội dung cũ, dán **toàn bộ** file `integrations/firestore.rules` vào, rồi bấm **Publish**.
   Quy tắc này bảo đảm:
   - chỉ chủ tài khoản ghi được điểm của mình;
   - điểm lần đầu mỗi Playbook không sửa được;
   - không khai gian được tổng điểm;
   - tên hiển thị không chứa số điện thoại hay đường link.
3. Gói miễn phí (Spark) cho 20.000 lượt ghi và 50.000 lượt đọc mỗi ngày. Hết hạn mức thì Firestore tạm ngừng tới hôm sau, **không tự tính tiền**.
   Khi người dùng đông hơn khoảng 1.000 người/ngày, chuyển sang gói Blaze (trả theo dùng, khoảng 0,06 USD cho mỗi 100.000 lượt đọc).

**Khi thêm hay bớt Playbook:** chạy `npm run data:pack` để sinh lại `firestore.rules`, rồi dán lại vào tab Rules.

## 5. Cấp quyền quản trị (2 phút)

Trang quản trị ở `https://ongchuecom.github.io/ecom-metrics-academy/quan-tri/`.

1. Đăng nhập trên web, mở trang quản trị. Trang hiện **mã tài khoản** của anh. Đây là mã do Firebase cấp, không phải email.
2. Gửi mã đó cho Claude, hoặc tự thêm vào `admin.uids` trong `src/data/site.json`, rồi chạy `npm run data:pack`.
3. Dán lại `integrations/firestore.rules` vào Firebase → Firestore → Rules → **Publish**. Bước này cho phép quản trị viên xóa tên vi phạm trên bảng xếp hạng.
4. Xem góp ý ngay trên trang quản trị: tạo một fine-grained token **chỉ-đọc** (Contents: Read-only) cho repo `ecom-metrics-feedback`, rồi dán vào mục Góp ý. Token chỉ lưu trên máy đó.

## Lưu ý

- **Trình duyệt trong Zalo, Facebook, Messenger:** Google thường chặn đăng nhập ở các trình duyệt nhúng này. Web tự hiện lời nhắc "Mở bằng trình duyệt" cho người dùng.
- **Đổi tên miền** (ví dụ chuyển sang ongchuecom.com): nhớ thêm tên miền mới ở bước 1.4.
