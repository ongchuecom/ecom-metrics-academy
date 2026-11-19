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

## 4. Bảo vệ bảng xếp hạng (1 phút)

Trong Apps Script của Sheet Zalo, vào **Cài đặt dự án → Thuộc tính tập lệnh**, thêm `FIREBASE_API_KEY` = `apiKey` ở bước 1.

Từ lúc đó, bảng xếp hạng chỉ nhận điểm của người đã đăng nhập: không ai gửi điểm thay người khác được, và mỗi người tự xóa được điểm của mình.

## Lưu ý

- **Trình duyệt trong Zalo, Facebook, Messenger:** Google thường chặn đăng nhập ở các trình duyệt nhúng này. Web tự hiện lời nhắc "Mở bằng trình duyệt" cho người dùng.
- **Đổi tên miền** (ví dụ chuyển sang ongchuecom.com): nhớ thêm tên miền mới ở bước 1.4.
