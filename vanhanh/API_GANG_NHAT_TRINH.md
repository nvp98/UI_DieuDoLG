# API Gang Nhật Trình - Tài liệu kỹ thuật

## Endpoint

```
GET https://chart.hoaphatdungquat.vn/api/gang-nhat-trinh/latest
```

## Mô tả

API trả về danh sách các thùng gang đang trong hệ thống với đầy đủ thông tin về 8 công đoạn vận chuyển gang.

## Response Format

```json
[
  {
    "ID": 235,
    "SoThung": "22",
    "NgayTao": "2026-01-29T15:50:18.603",
    "NgaySX": "2026-01-29T00:00:00",
    "CaSX": 1,
    "G_BatDauRot": null,
    "G_RotDayThung": "2026-01-29T14:55:00",
    "GioBatDau": "2026-01-29T14:55:00",
    "GioDucGang": null,
    "GioVaoLT": "2026-01-29T15:50:33.267",
    "GioVaoKR": null,
    "GioRaKR": null,
    "T_BatDauRot": null,
    "GioRotXong": null,
    "GioRaLT": null,
    "DiemDau": "Lò Cao 1",
    "DiemTrungGian": null,
    "GioTrungGian": null,
    "DiemDen": "HRC1",
    "KL_XeGong": 28.780000686645508,
    "TinhTrang": 0,
    "ThuTu": 5,
    "Me": "GBF261A0266022",
    "Mac": null,
    "KhoiLuong": 114.80000305175781,
    "NhietDoThung": 0,
    "G_TongTGRot": null,
    "ID_LoCao": 1,
    "isNM": 1,
    "ID_GiaoNhan": 37746,
    "C": 4.354,
    "Si": 0.355,
    "Mn": 0.257,
    "S": 0.024,
    "P": 0.12,
    "Ti": 0.024,
    "Temp": 0,
    "QuayThung": null
  }
]
```

## 8 Công Đoạn Vận Chuyển Gang

### 1. Bắt đầu rót gang

- **Field**: `G_BatDauRot` hoặc `T_BatDauRot`
- **Mô tả**: Thời điểm bắt đầu rót gang từ lò cao vào thùng

### 2. Rót đầy thùng

- **Field**: `G_RotDayThung`
- **Mô tả**: Thời điểm thùng được rót đầy gang

### 3. Bắt đầu vận chuyển

- **Field**: `GioBatDau`
- **Mô tả**: Thời điểm xe vận chuyển bắt đầu di chuyển thùng

### 4. Đến gian chờ luyện thép

- **Field**: `GioVaoLT`
- **Mô tả**: Thời điểm thùng đến khu vực chờ luyện thép

### 5. Vào KR (Khuấy rót)

- **Field**: `GioVaoKR`
- **Mô tả**: Thời điểm thùng vào trạm KR (chỉ áp dụng cho HRC)

### 6. Ra KR

- **Field**: `GioRaKR`
- **Mô tả**: Thời điểm thùng ra khỏi trạm KR

### 7. Rót xong vào LT (Luyện thép)

- **Field**: `GioRotXong`
- **Mô tả**: Thời điểm hoàn tất việc rót gang vào lò luyện thép

### 8. Ra luyện thép

- **Field**: `GioRaLT`
- **Mô tả**: Thời điểm thùng rời khu vực luyện thép (hoàn tất chu trình)

## Thông tin bổ sung

### Thông tin thùng

- `ID`: ID duy nhất trong hệ thống
- `SoThung`: Số hiệu thùng (ví dụ: "22")
- `NgayTao`: Thời gian tạo bản ghi
- `NgaySX`: Ngày sản xuất
- `CaSX`: Ca sản xuất (1, 2, 3)

### Điểm vận chuyển

- `DiemDau`: Điểm xuất phát (Lò Cao 1-6)
- `DiemDen`: Điểm đến (HRC1, HRC2, hoặc khác)
- `DiemTrungGian`: Điểm trung gian (nếu có)
- `GioTrungGian`: Thời gian đến điểm trung gian

### Khối lượng

- `KL_XeGong`: Khối lượng xe công (tấn)
- `KhoiLuong`: Khối lượng gang thực tế (tấn)

### Mẻ gang

- `Me`: Mã mẻ gang (ví dụ: GBF261A0266022)
- `Mac`: Mác thép (có thể null)

### Thành phần hóa học (%)

- `C`: Carbon
- `Si`: Silicon
- `Mn`: Manganese
- `S`: Sulfur
- `P`: Phosphorus
- `Ti`: Titanium

### Nhiệt độ & Trạng thái

- `NhietDoThung`: Nhiệt độ thùng
- `Temp`: Nhiệt độ bổ sung
- `TinhTrang`: Trạng thái thùng (0: đang xử lý, 1: hoàn thành)
- `ThuTu`: Thứ tự ưu tiên
- `QuayThung`: Trạng thái quay thùng

### Metadata

- `ID_LoCao`: ID lò cao (1-6)
- `ID_GiaoNhan`: ID phiếu giao nhận
- `isNM`: Flag (1: có dữ liệu nước mẫu, 0: không)
- `G_TongTGRot`: Tổng thời gian rót

## Luồng xử lý trong UI

### Xác định công đoạn hiện tại

Hệ thống xác định công đoạn hiện tại bằng cách kiểm tra field cuối cùng có giá trị:

1. Nếu `GioRaLT` có giá trị → Stage 8 (Hoàn thành)
2. Nếu `GioRotXong` có giá trị → Stage 7
3. Nếu `GioRaKR` có giá trị → Stage 6
4. Nếu `GioVaoKR` có giá trị → Stage 5
5. Nếu `GioVaoLT` có giá trị → Stage 4
6. Nếu `GioBatDau` có giá trị → Stage 3
7. Nếu `G_RotDayThung` có giá trị → Stage 2
8. Nếu `G_BatDauRot` hoặc `T_BatDauRot` có giá trị → Stage 1

### Hiển thị trên Sơ đồ vận hành

- Mỗi thùng được đặt vào section tương ứng với công đoạn hiện tại
- Màu sắc:
  - **Xám**: Đang chờ (waiting)
  - **Xanh dương**: Đang thực hiện (in-progress)
  - **Xanh lá**: Hoàn thành (completed - Stage 8)

### Auto refresh

- Polling interval: 10 giây (config: `VITE_BOF_POLL_MS`)
- Hiển thị thời gian cập nhật cuối cùng

## Ví dụ sử dụng

```typescript
import { getGangNhatTrinhLatest, ThungGangData } from "@/services/ganttService";

// Lấy dữ liệu
const data: ThungGangData[] = await getGangNhatTrinhLatest();

// Parse thành sections
const sections = parseGangNhatTrinhData(data);

// Convert sang logs
const logs = convertGangNhatTrinhToLogs(data);
```

## Lưu ý kỹ thuật

1. **Null values**: Các field timestamp có thể là `null` nếu công đoạn chưa thực hiện
2. **Date format**: Tất cả timestamp theo format ISO 8601 (`YYYY-MM-DDTHH:mm:ss.SSS`)
3. **Number precision**: Khối lượng và thành phần hóa học có độ chính xác cao (nhiều chữ số thập phân)
4. **Fallback**: Trường `G_BatDauRot` và `T_BatDauRot` là 2 field khác nhau cho cùng 1 ý nghĩa (fallback)

## Xử lý lỗi

```typescript
try {
  const data = await getGangNhatTrinhLatest();
  // Process data
} catch (error) {
  console.error("❌ Lỗi khi gọi API Gang Nhật Trình Latest:", error);
  // Fallback to empty array or cached data
}
```
