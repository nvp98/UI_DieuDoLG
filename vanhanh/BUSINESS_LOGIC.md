# 📋 TỔNG HỢP LOGIC NGHIỆP VỤ - HỆ THỐNG VẬN CHUYỂN THÙNG GANG

## 📌 TỔNG QUAN HỆ THỐNG

Hệ thống quản lý vận chuyển và giám sát thùng gang trong nhà máy thép, theo dõi 5 công đoạn từ lúc bắt đầu vận chuyển đến khi hoàn tất và sẵn sàng cho chu kỳ mới.

---

## 🔄 QUY TRÌNH 5 CÔNG ĐOẠN

### Stage 1: Bắt đầu vận chuyển 🚚

- **Mô tả**: Thùng gang được phân bổ và bắt đầu vận chuyển từ điểm đầu đến điểm đến
- **API Field**: `GioBatDau`
- **Thời gian xử lý**: 10 giây (demo)
- **Hành động tiếp theo**: Xác nhận khi thùng đã đến gian chờ thép

### Stage 2: Vào gian chờ thép ⏳

- **Mô tả**: Thùng gang đã đến và đang chờ tại gian chờ thép
- **API Field**: `GioVaoLT`
- **Thời gian xử lý**: 15 giây (demo)
- **Hành động tiếp theo**:
  - **HRC1/HRC2**: Có 2 lựa chọn
    - Xác nhận vào KR → Stage 3
    - Xác nhận hoàn tất rót → Stage 4 (skip stage 3)
  - **Điểm đến khác**: Xác nhận hoàn tất rót → Stage 4

### Stage 3: KR 🧠 (Chỉ HRC1/HRC2)

- **Mô tả**: Thùng gang vào KR (Kiln Rotation) - chỉ áp dụng cho HRC1 và HRC2
- **API Field**: `GioVaoKR`
- **Thời gian xử lý**: 20 giây (demo)
- **Điều kiện**: `DiemDen === "HRC1" || DiemDen === "HRC2"`
- **Hành động tiếp theo**: Xác nhận rót xong → Stage 4

### Stage 4: Rót xong (Trả vỏ) 🔥

- **Mô tả**: Thùng gang đã rót xong vào lò luyện thép, thùng trống chờ vận chuyển ra
- **API Field**: `GioRotXong`
- **Thời gian xử lý**: 20 giây (demo)
- **Hành động tiếp theo**: Xác nhận ra luyện thép → Stage 5

### Stage 5: Ra luyện thép ✅

- **Mô tả**: Thùng đã ra khỏi khu vực luyện thép, sẵn sàng cho chu kỳ tiếp theo
- **API Field**: `GioRaLT`
- **Thời gian xử lý**: 12 giây (demo)
- **Hành động**: Chọn điểm đến cho chu kỳ tiếp theo
- **Hoàn tất**: Cập nhật `TinhTrang = 1` và `DiemDauTiepTheo`

---

## 🎯 LOGIC ĐẶC BIỆT

### 1️⃣ Điểm đến "Đúc gang"

```
Stage 1 → Xác nhận hoàn tất → Hoàn tất ngay (TinhTrang = 1)
Bỏ qua: Stage 2, 3, 4, 5
API Update: GioRaLT = now, TinhTrang = 1
```

### 2️⃣ HRC1/HRC2 - Skip Stage 3

```
Stage 2 → Xác nhận hoàn tất (không vào KR) → Stage 4
API Update: GioRotXong = now
```

### 3️⃣ HRC1/HRC2 - Vào KR

```
Stage 2 → Xác nhận vào KR → Stage 3 → Xác nhận hoàn tất → Stage 4
API Update Stage 2→3: GioVaoKR = now
API Update Stage 3→4: GioRotXong = now
```

### 4️⃣ Quy trình bình thường

```
Stage 1 → Stage 2 → Stage 4 → Stage 5 → Hoàn tất
(Stage 3 chỉ dành cho HRC1/HRC2)
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
if (GioRaLT exists)    → Stage 5
if (GioRotXong exists) → Stage 4
if (GioVaoKR exists && isHRC) → Stage 3
if (GioVaoLT exists)   → Stage 2
if (GioBatDau exists)  → Stage 1
if (TinhTrang === 1)   → Hoàn tất (không hiển thị)
```

### Update Payload by Stage

```javascript
Stage 1 → 2: { GioVaoLT: timestamp }
Stage 2 → 3: { GioVaoKR: timestamp } (chỉ HRC)
Stage 2 → 4: { GioRotXong: timestamp } (skip stage 3)
Stage 3 → 4: { GioRotXong: timestamp }
Stage 4 → 5: { GioRaLT: timestamp }
Stage 5 → End: { TinhTrang: 1, DiemDauTiepTheo: value }
```

### Rollback (Xóa mốc thời gian)

```javascript
Rollback Stage 2: { GioVaoLT: "0001-01-01T00:00:00" }
Rollback Stage 3: { GioVaoKR: "0001-01-01T00:00:00" }
Rollback Stage 4: { GioRotXong: "0001-01-01T00:00:00" }
Rollback Stage 5: { GioRaLT: "0001-01-01T00:00:00", TinhTrang: 0 }
```

---

## 🎨 GIAO DIỆN & TRẠNG THÁI

### Trạng thái thùng

- **processing** (Đang xử lý): Badge xanh dương
- **waiting-confirm** (Chờ xác nhận): Badge vàng, có thể click
- **completed** (Hoàn tất): Badge xanh lá

### Điều kiện click vào thùng

- Stage 1-4: Chỉ khi `stageStatus === "waiting-confirm"`
- Stage 5: Click được bất kỳ lúc nào (để chọn chu kỳ tiếp theo)

### Modal xác nhận

**Hiển thị thông tin:**

- Số thùng, điểm đầu, điểm đến
- Thời gian đã ở công đoạn hiện tại
- Timeline 5 công đoạn (highlight stage hiện tại)
- Mô tả tình trạng và hành động

**Nút hành động:**

- **Hủy**: Đóng modal
- **Edit** (chỉ stage 1): Sửa thông tin điểm đầu/đến
- **Xác nhận vào KR** (chỉ stage 2 + HRC): Chuyển sang stage 3
- **Xác nhận hoàn tất**: Chuyển sang stage tiếp theo
- **Nút rollback** (stage > 1): Quay lại công đoạn trước

**Stage 5 - Chọn chu kỳ tiếp theo:**

- Ẩn thông tin modal body thông thường
- Hiện form chọn điểm đến: Lò Cao 1-6, Bảo Dưỡng
- Required chọn trước khi xác nhận

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
  "GioVaoLT": "ISO timestamp | 0001-01-01T00:00:00",
  "GioVaoKR": "ISO timestamp | 0001-01-01T00:00:00",
  "GioRotXong": "ISO timestamp | 0001-01-01T00:00:00",
  "GioRaLT": "ISO timestamp | 0001-01-01T00:00:00",
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
8. Khối lượng
9. Nhiệt độ thùng
10. Giờ bắt đầu rót
11. Giờ rót đầy thùng
12. Giờ bắt đầu vận chuyển
13. Giờ vào luyện thép
14. Giờ rót xong
15. Giờ ra luyện thép
16. Tình trạng (Hoàn thành / Đang chạy)

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

1. **Fix Stage 4 → Stage 5 logic**
   - Stage 4 chỉ cập nhật `GioRaLT` (chưa hoàn tất)
   - Stage 5 mới cập nhật `TinhTrang = 1` (hoàn tất hành trình)
   - Di chuyển form chọn chu kỳ tiếp theo từ Stage 4 sang Stage 5

2. **Cấu trúc 5 stages**
   - Đã xóa Stage "Ra KR" (không cần thiết)
   - Giữ Stage 3 "KR" chỉ cho HRC1/HRC2
   - Stage 4: Rót xong (Trả vỏ)
   - Stage 5: Ra luyện thép (hoàn tất)

3. **Button "Xác nhận vào KR"**
   - Chỉ hiển thị ở Stage 2 khi điểm đến là HRC1/HRC2
   - Cập nhật `GioVaoKR` và chuyển sang Stage 3

4. **Skip logic cho Stage 3**
   - Từ Stage 2, HRC có thể:
     - Click "Xác nhận vào KR" → Stage 3
     - Click "Xác nhận hoàn tất" → Stage 4 (skip Stage 3)
   - Điểm đến khác tự động skip Stage 3

---

## 📝 LƯU Ý QUAN TRỌNG

### ⚠️ Validation Rules

1. Không thể xóa thùng nếu không ở Stage 1
2. Không thể rollback từ Stage 1
3. Không thể edit thông tin nếu không ở Stage 1
4. Stage 5 phải chọn điểm đến tiếp theo trước khi hoàn tất
5. Chỉ HRC1/HRC2 mới có nút "Xác nhận vào KR" và Stage 3

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

**File**: `thung-gang-demo.html` (3700+ lines)
**Last Updated**: 23/01/2026
