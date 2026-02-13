# 📋 TỔNG HỢP LOGIC NGHIỆP VỤ - HỆ THỐNG VẬN CHUYỂN THÙNG GANG

## 📌 TỔNG QUAN HỆ THỐNG

Hệ thống quản lý vận chuyển và giám sát thùng gang trong nhà máy thép, theo dõi 6 công đoạn từ lúc bắt đầu vận chuyển đến khi hoàn tất và sẵn sàng cho chu kỳ mới.

---

## 🔄 QUY TRÌNH 6 CÔNG ĐOẠN

### Stage 1: Bắt đầu vận chuyển 🚚

- **Mô tả**: Thùng gang được phân bổ và bắt đầu vận chuyển từ điểm đầu đến điểm đến
- **API Field**: `GioBatDau`
- **Thời gian xử lý**: 10 giây (demo)
- **Hành động tiếp theo**: Xác nhận khi thùng đã đến gian chờ thép

### Stage 2: Vào gian chờ thép ⏳

- **Mô tả**: Thùng gang đã đến và đang chờ tại gian chờ thép
- **API Field**: `GioVaoLT`
- **Thời gian xử lý**: 15 giây (demo)
- **Tính năng đặc biệt**:
  - **Nút "🔄 Chuyển Thùng"** (màu cam): Cho phép thay đổi điểm đến giữa chừng
    - Hiển thị modal chọn điểm đến mới: HRC1, HRC2, Đúc gang
    - Không thể chọn điểm đến hiện tại
    - API cập nhật: `DiemTrungGian` (điểm đến cũ), `GioTrungGian` (giờ chuyển), `DiemDen` (điểm đến mới)
- **Hành động tiếp theo**:
  - **HRC1/HRC2**: Có 2 nút lựa chọn
    - **Nút "Xác nhận vào KR"** (màu tím 🔥): Thùng đi qua KR → Chuyển sang Stage 3
    - **Nút "Xác nhận hoàn tất"** (xanh lá ✓): Thùng KHÔNG qua KR → Bỏ qua Stage 3, chuyển thẳng sang Stage 5 (Rót xong)
  - **Điểm đến khác**: Chỉ có nút "Xác nhận hoàn tất" → Chuyển thẳng sang Stage 5 (tự động skip Stage 3)

  > **💡 Lưu ý**: Với HRC, người dùng quyết định có đưa thùng qua KR hay không. Nếu xác nhận qua KR → Stage 3, nếu không → Stage 5

### Stage 3: Vào KR 🚪 (Chỉ HRC1/HRC2)

- **Mô tả**: Thùng gang vào KR (Kiln Rotation) - chỉ áp dụng cho HRC1 và HRC2
- **API Field**: `GioVaoKR`
- **Thời gian xử lý**: 20 giây (demo)
- **Điều kiện**: `DiemDen === "HRC1" || DiemDen === "HRC2"`
- **Hành động tiếp theo**: Xác nhận ra KR → Stage 4

### Stage 4: Ra KR 🚶 (Chỉ HRC1/HRC2)

- **Mô tả**: Thùng gang đã ra khỏi KR
- **API Field**: `GioRaKR`
- **Thời gian xử lý**: 15 giây (demo)
- **Điều kiện**: `DiemDen === "HRC1" || DiemDen === "HRC2"`
- **Hành động tiếp theo**: Xác nhận rót xong → Stage 5

### Stage 5: Rót xong 🔥

- **Mô tả**: Thùng gang đã rót xong vào lò luyện thép, thùng trống chờ vận chuyển ra
- **API Field**: `GioRotXong`
- **Thời gian xử lý**: 20 giây (demo)
- **Hành động tiếp theo**: Xác nhận ra luyện thép → Stage 6

### Stage 6: Ra luyện thép ✅

- **Mô tả**: Thùng đã ra khỏi khu vực luyện thép, sẵn sàng cho chu kỳ tiếp theo
- **API Field**: `GioRaLT`
- **Thời gian xử lý**: 12 giây (demo)
- **Tính năng đặc biệt**:
  - **Nút "♻️ Xử Lý Thùng"** (màu xanh lá): Chọn điểm quay về cho thùng
    - Hiển thị modal chọn điểm quay về: Lò Cao 1-6, Bảo Dưỡng
    - API cập nhật: `QuayThung` (vị trí quay thùng về)
    - Sau khi xử lý, hiển thị "♻️ Quay về: [tên điểm]" trên thùng
- **Hành động**: Click vào thùng để xem thông tin chi tiết
- **Hoàn tất**: Thùng đã hoàn tất hành trình (TinhTrang = 1)

---

## 🎯 LOGIC ĐẶC BIỆT

### 1️⃣ Điểm đến "Đúc gang"

```
Stage 1 → Xác nhận hoàn tất → Stage 6 (Hoàn tất)
Bỏ qua: Stage 2, 3, 4, 5
API Update: GioDucGang = now, TinhTrang = 1
```

### 2️⃣ HRC1/HRC2 - Có 2 lựa chọn tại Stage 2

**Lựa chọn A: ĐI QUA KR**

```
Stage 2 → Nhấn nút "Xác nhận vào KR" (màu tím 🔥)
       → Stage 3 (Vào KR)
       → Nhấn "Xác nhận hoàn tất"
       → Stage 4 (Ra KR)
       → Nhấn "Xác nhận hoàn tất"
       → Stage 5 (Rót xong)

API Update Stage 2→3: { GioVaoKR: now }
API Update Stage 3→4: { GioRaKR: now }
API Update Stage 4→5: { GioRotXong: now }
```

**Lựa chọn B: KHÔNG QUA KR (Skip Stage 3 & 4)**

```
Stage 2 → Nhấn nút "Xác nhận hoàn tất" (xanh lá ✓)
       → Stage 5 (Rót xong) - BỎ QUA STAGE 3 & 4

API Update Stage 2→5: { GioRotXong: now }
```

> **📌 Quy tắc**: HRC có quyền chọn đi qua KR hay không. Quyết định dựa vào nút nào được nhấn ở Stage 2.

### 3️⃣ Điểm đến khác (không phải HRC) - Tự động skip Stage 3

```
Stage 2 → Chỉ có nút "Xác nhận hoàn tất" → Stage 4
API Update Stage 2→4: { GioRotXong: now }
```

> **📌 Lưu ý**: Điểm đến không phải HRC1/HRC2 sẽ không hiển thị nút "Xác nhận vào KR" và tự động bỏ qua Stage 3.

### 4️⃣ Quy trình bình thường (không phải HRC)

```
Stage 1 → Stage 2 → Stage 5 → Stage 6 → Hoàn tất
(Stage 3 & 4 chỉ dành cho HRC1/HRC2)
```

---

## 🔐 PHÂN QUYỀN HỆ THỐNG

### TRUONGKIP (Trưởng kíp)

- ✅ Phân bổ thùng (tạo mới)
- ✅ Xác nhận công đoạn (tất cả stages)
- ✅ Chỉnh sửa thông tin thùng (ở stage 1)
- ✅ Xóa thùng (ở stage 1)
- ✅ Quay lại công đoạn trước (rollback)
- ✅ Xem toàn bộ dữ liệu

### DIEUDO (Điều độ)

- ❌ Phân bổ thùng
- ✅ Xác nhận công đoạn (tất cả stages)
- ✅ Quay lại công đoạn trước (rollback)
- ✅ Xem toàn bộ dữ liệu

### VIEW (Chỉ xem)

- ❌ Mọi thao tác chỉnh sửa
- ✅ Xem toàn bộ dữ liệu

### LOCAO1 - LOCAO6 (Filter theo lò cao)

- Quyền: DIEUDO
- Filter: Chỉ hiển thị thùng có `DiemDau = "Lò Cao {số}"`
- Ẩn: Stage 1 (Bắt đầu vận chuyển)
- Hiện: Stage 2, 4, 5

### HRC1, HRC2 (Filter theo HRC)

- Quyền: DIEUDO
- Filter: Chỉ hiển thị thùng có `DiemDen = "HRC{số}"`
- Ẩn: Stage 1 (Bắt đầu vận chuyển)
- Hiện: Stage 2, 3 (KR), 4, 5

---

## 📊 API MAPPING

### Detect Current Stage (Độ ưu tiên cao → thấp)

```javascript
if (GioDucGang exists) → Stage 6 (displayStage: 7 - Đúc gang)
if (GioRaLT exists)    → Stage 6
if (GioRotXong exists) → Stage 5
if (GioRaKR exists && isHRC) → Stage 4
if (GioVaoKR exists && isHRC) → Stage 3
if (GioVaoLT exists)   → Stage 2
if (GioBatDau exists)  → Stage 1
if (TinhTrang === 1)   → Hoàn tất (không hiển thị)
```

### Update Payload by Stage

```javascript
Stage 1 → 2: { GioVaoLT: timestamp }
Stage 2 → 3: { GioVaoKR: timestamp } (chỉ HRC, nhấn nút "Xác nhận vào KR")
Stage 2 → 5: { GioRotXong: timestamp } (skip stage 3&4 - nhấn nút "Xác nhận hoàn tất")
Stage 3 → 4: { GioRaKR: timestamp }
Stage 4 → 5: { GioRotXong: timestamp }
Stage 5 → 6: { GioRaLT: timestamp }

// Chuyển điểm đến (Stage 2):
{ DiemTrungGian: oldDestination, GioTrungGian: timestamp, DiemDen: newDestination }

// Xử lý thùng (Stage 6):
{ QuayThung: destination }
```

> **💡 Giải thích Stage 2**:
>
> - Nếu nhấn nút **"Xác nhận vào KR"** (màu tím) → API gửi `GioVaoKR` → Chuyển sang Stage 3
> - Nếu nhấn nút **"Xác nhận hoàn tất"** (xanh lá) → API gửi `GioRotXong` → Chuyển sang Stage 5 (bỏ qua Stage 3 & 4)
> - Nếu nhấn nút **"🔄 Chuyển Thùng"** (cam) → Hiển thị modal chọn điểm đến mới

> **💡 Giải thích Stage 6**:
>
> - Nếu nhấn nút **"♻️ Xử Lý Thùng"** (xanh lá) → Hiển thị modal chọn điểm quay về → API gửi `QuayThung`

### Rollback (Xóa mốc thời gian)

```javascript
Rollback Stage 2: { GioVaoLT: "0001-01-01T00:00:00" }
Rollback Stage 3: { GioVaoKR: "0001-01-01T00:00:00" }
Rollback Stage 4: { GioRaKR: "0001-01-01T00:00:00" }
Rollback Stage 5: { GioRotXong: "0001-01-01T00:00:00" }
Rollback Stage 6: { GioRaLT: "0001-01-01T00:00:00", GioDucGang: "0001-01-01T00:00:00", TinhTrang: 0 }
```

---

## 🎨 GIAO DIỆN & TRẠNG THÁI

### Trạng thái thùng

- **processing** (Đang xử lý): Badge xanh dương
- **waiting-confirm** (Chờ xác nhận): Badge vàng, có thể click
- **completed** (Hoàn tất): Badge xanh lá

### Điều kiện click vào thùng

- Stage 1-5: Chỉ khi `stageStatus === "waiting-confirm"`
- Stage 6: Click được bất kỳ lúc nào (để xem chi tiết)

### Modal xác nhận

**Hiển thị thông tin:**

- Số thùng, điểm đầu, điểm đến
- Thời gian đã ở công đoạn hiện tại
- Timeline 5 công đoạn (highlight stage hiện tại)
- Mô tả tình trạng và hành động

**Nút hành động:**

- **Hủy**: Đóng modal
- **Edit** (chỉ stage 1): Sửa thông tin điểm đầu/đến
- **🔄 Chuyển Thùng** (chỉ stage 2): Thay đổi điểm đến (HRC1, HRC2, Đúc gang)
- **Xác nhận vào KR** (chỉ stage 2 + HRC): Chuyển sang stage 3 (thùng đi qua KR)
- **♻️ Xử Lý Thùng** (chỉ stage 6): Chọn điểm quay về (Lò Cao 1-6, Bảo Dưỡng)
- **Xác nhận hoàn tất**:
  - Stage 1: Chuyển sang stage 2
  - Stage 2 (HRC): Chuyển sang stage 5 (BỎ QUA stage 3&4 - không qua KR)
  - Stage 2 (không HRC): Chuyển sang stage 5 (tự động skip stage 3&4)
  - Stage 3: Chuyển sang stage 4
  - Stage 4: Chuyển sang stage 5
  - Stage 5: Chuyển sang stage 6
- **Nút rollback** (stage > 1): Quay lại công đoạn trước
- **Ẩn nút**: Stage 6 không có nút "Xác nhận hoàn tất" (đã hoàn tất)

**Stage 6 - Hiển thị thông tin:**

- Hiển thị timeline đầy đủ
- Hiển thị TPHH (Thành phần hóa học)
- Không có nút "Xác nhận hoàn tất"
- Có nút "♻️ Xử Lý Thùng" để chọn điểm quay về

---

## 📡 API ENDPOINTS

### GET `/api/gang-nhat-trinh/search`

**Query params:**

- `fromDate`: Ngày bắt đầu (YYYY-MM-DD)
- `toDate`: Ngày kết thúc (YYYY-MM-DD)
- `soThung`: Số thùng
- `idLoCao`: ID lò cao (1-6)

**Response:** Danh sách nhật trình gang (đang chạy + hoàn tất)

### POST `/api/gang-nhat-trinh`

**Body:**

```json
{
  "SoThung": "string",
  "NgayTao": "ISO timestamp",
  "GioBatDau": "ISO timestamp",
  "DiemDau": "string",
  "DiemDen": "string"
}
```

**Response:** Bản ghi vừa tạo (có ID)

### PUT `/api/gang-nhat-trinh/{id}`

**Body:** (Các field tùy chọn)

```json
{
  "SoThung": "string",
  "DiemDau": "string",
  "DiemDen": "string",
  "DiemTrungGian": "string",
  "GioTrungGian": "ISO timestamp",
  "GioVaoLT": "ISO timestamp | 0001-01-01T00:00:00",
  "GioVaoKR": "ISO timestamp | 0001-01-01T00:00:00",
  "GioRaKR": "ISO timestamp | 0001-01-01T00:00:00",
  "GioRotXong": "ISO timestamp | 0001-01-01T00:00:00",
  "GioRaLT": "ISO timestamp | 0001-01-01T00:00:00",
  "GioDucGang": "ISO timestamp | 0001-01-01T00:00:00",
  "QuayThung": "string",
  "TinhTrang": 0 | 1,
  "DiemDauTiepTheo": "string",
  "SuCo": "string",
  "GhiChuSuCo": "string"
}
```

**Response:** Bản ghi đã cập nhật

---

## 🔄 AUTO REFRESH

- **Interval**: 5 giây
- **Dừng khi**: Modal xác nhận/xóa/đăng nhập đang mở
- **Reload từ server**: Sau mỗi lần xác nhận công đoạn

---

## 📋 GHI CHÉP GANG (HISTORY TABLE)

### Hiển thị các cột:

1. STT
2. Ngày tạo
3. Số thùng
4. Thứ tự
5. Mẻ
6. Điểm đầu
7. Điểm đến
8. Điểm trung gian (nếu có chuyển đổi)
9. Khối lượng
10. Nhiệt độ thùng
11. Giờ bắt đầu rót
12. Giờ rót đầy thùng
13. Giờ bắt đầu vận chuyển
14. Giờ vào luyện thép
15. Giờ vào KR (HRC)
16. Giờ ra KR (HRC)
17. Giờ rót xong
18. Giờ ra luyện thép
19. Giờ đúc gang (nếu đúc gang)
20. Quay thùng về (nếu đã xử lý)
21. Tình trạng (Hoàn thành / Đang chạy)

### Filter:

- Ngày từ - đến
- Số thùng
- Lò cao (tự động theo mã đăng nhập)
- HRC (tự động theo mã đăng nhập)

---

## 🚀 CẬP NHẬT GẦN NHẤT

### Version hiện tại

**Ngày**: 23/01/2026

**Thay đổi:**

1. **Cấu trúc 6 công đoạn hoàn chỉnh**
   - Stage 1: Bắt đầu vận chuyển
   - Stage 2: Vào gian chờ thép
   - Stage 3: Vào KR (chỉ HRC)
   - Stage 4: Ra KR (chỉ HRC)
   - Stage 5: Rót xong
   - Stage 6: Ra luyện thép (hoàn tất)

2. **Tính năng "🔄 Chuyển Thùng" tại Stage 2**
   - Cho phép thay đổi điểm đến giữa chừng
   - Modal chọn: HRC1, HRC2, Đúc gang
   - API cập nhật: DiemTrungGian, GioTrungGian, DiemDen
   - Disable điểm đến hiện tại trong modal

3. **Tính năng "♻️ Xử Lý Thùng" tại Stage 6**
   - Chọn điểm quay về cho thùng: Lò Cao 1-6, Bảo Dưỡng
   - API cập nhật: QuayThung
   - Hiển thị "♻️ Quay về: [tên điểm]" trên thùng sau khi xử lý

4. **Button "Xác nhận vào KR"**
   - Chỉ hiển thị ở Stage 2 khi điểm đến là HRC1/HRC2
   - Cập nhật `GioVaoKR` và chuyển sang Stage 3

5. **Skip logic cho Stage 3 & 4**
   - Từ Stage 2, HRC có thể:
     - Click **"Xác nhận vào KR"** (nút màu tím 🔥) → Stage 3 → Stage 4 → Stage 5
     - Click **"Xác nhận hoàn tất"** (nút xanh lá ✓) → Stage 5 (skip Stage 3 & 4)
   - Điểm đến khác chỉ có nút "Xác nhận hoàn tất" → tự động skip Stage 3 & 4
   - Quyết định đi qua KR hay không phụ thuộc vào nút nào được nhấn ở Stage 2

6. **UI Improvements**
   - Giảm font-size nút modal: 1rem → 0.8rem
   - Giảm padding nút modal: 16px 20px → 10px 14px
   - Stage 5 & 6 có màu nền gradient như các stage khác
   - Hiển thị thông tin QuayThung ở công đoạn 6

---

## 📝 LƯU Ý QUAN TRỌNG

### ⚠️ Validation Rules

1. Không thể xóa thùng nếu không ở Stage 1
2. Không thể rollback từ Stage 1
3. Không thể edit thông tin nếu không ở Stage 1
4. Stage 2: Không thể chọn điểm đến hiện tại khi chuyển thùng
5. Stage 6: Phải chọn điểm quay về trước khi xử lý thùng
6. Chỉ HRC1/HRC2 mới có Stage 3, 4 và nút "Xác nhận vào KR"
7. Stage 6 không có nút "Xác nhận hoàn tất" (đã hoàn tất)

### 🔒 Security

1. Mã đăng nhập lưu trong localStorage
2. Không có authentication thật (chỉ kiểm tra mã)
3. Mỗi role có quyền khác nhau (checked ở frontend)

### 🎯 Performance

1. Auto refresh 5s (có thể điều chỉnh)
2. Chỉ load dữ liệu khi không mở modal
3. Filter data ở client-side (HRC) và server-side (lò cao)

---

## 🛠️ TECH STACK

- **Frontend**: Vanilla JavaScript (Single HTML file)
- **Backend API**: ASP.NET Core Web API (assumed)
- **Storage**: LocalStorage (role, filters)
- **Real-time**: setInterval (5s refresh)
- **Timezone**: Vietnam (UTC+7)

---

## 📞 SUPPORT

Nếu có thắc mắc về logic nghiệp vụ, vui lòng liên hệ team phát triển.

**File**: `thung-gang-demo.html` (4900+ lines)
**Last Updated**: 23/01/2026
