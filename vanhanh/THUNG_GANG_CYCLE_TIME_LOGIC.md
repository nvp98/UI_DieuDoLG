# Logic Tính Toán Thời Gian Quay Vòng Thùng Gang

## Tổng Quan

Module phân tích thời gian quay vòng thùng gang (`ThungGangAnalysis.tsx`) theo dõi và phân tích chu kỳ sử dụng thùng gang trong quá trình sản xuất. Hệ thống tính toán thời gian giữa các lượt rót liên tiếp của cùng một thùng để đánh giá hiệu suất vận hành.

## Khái Niệm Cơ Bản

### Thời Gian Quay Vòng (Cycle Time)

**Định nghĩa**: Khoảng thời gian từ khi thùng được rót đầy ở lượt trước đến khi thùng được rót đầy ở lượt hiện tại.

**Công thức**:

```
Cycle Time của lượt rót hiện tại = Thời gian rót đầy hiện tại - Thời gian rót đầy lượt trước
```

**Lưu ý quan trọng**:

- Lượt rót **đầu tiên** của mỗi thùng có `cycleTimeMinutes = 0` (vì không có lượt trước để so sánh)
- Các lượt rót tiếp theo có cycle time = thời gian từ lượt trước đến lượt hiện tại

### Thời Gian Rót Gang (Pour Time)

**Định nghĩa**: Khoảng thời gian từ khi bắt đầu rót gang vào thùng cho đến khi thùng đầy.

**Công thức**:

```
Pour Time = G_RotDayThung - G_BatDauRot
```

## Cấu Trúc Dữ Liệu

### Trường Dữ Liệu Chính

| Trường          | Kiểu              | Mô tả                                  |
| --------------- | ----------------- | -------------------------------------- |
| `ID`            | number            | ID duy nhất của mỗi record             |
| `SoThung`       | string            | Số hiệu thùng gang (ví dụ: "10", "32") |
| `isNM`          | number            | Khu vực sử dụng (1 = DQ1, 2 = DQ2)     |
| `GioBatDau`     | string (ISO 8601) | Thời gian bắt đầu vận chuyển thùng     |
| `G_BatDauRot`   | string (ISO 8601) | Thời gian bắt đầu rót gang vào thùng   |
| `G_RotDayThung` | string (ISO 8601) | Thời gian rót đầy thùng                |
| `DiemDau`       | string            | Điểm xuất phát                         |
| `DiemDen`       | string            | Điểm đến                               |
| `KL_XeGong`     | number            | Khối lượng gang (tấn)                  |

### Composite Key - Khóa Tổng Hợp

Để phân biệt giữa các thùng ở các khu vực khác nhau, hệ thống sử dụng **composite key**:

```typescript
const bucketKey = `${SoThung}-${isNM}`;
```

**Ví dụ**:

- Thùng 10 tại DQ1: `"10-1"`
- Thùng 10 tại DQ2: `"10-2"`
- Thùng 32 tại DQ1: `"32-1"`

Điều này cho phép cùng một số thùng hoạt động độc lập ở hai khu vực khác nhau.

## Flow Xử Lý Dữ Liệu

### Bước 1: Lọc và Sắp Xếp Dữ Liệu

```typescript
const sortedData = data
  .filter((item) => item.GioBatDau) // Loại bỏ record không có thời gian
  .sort((a, b) => {
    const dateA = parseISO(a.GioBatDau!);
    const dateB = parseISO(b.GioBatDau!);
    return dateA.getTime() - dateB.getTime(); // Sắp xếp tăng dần (cũ nhất trước)
  });
```

**Mục đích**: Đảm bảo dữ liệu được sắp xếp theo thứ tự thời gian trước khi nhóm.

### Bước 2: Nhóm Theo Thùng và Khu Vực

```typescript
const bucketGroups = new Map<string, ThungGangData[]>();

sortedData.forEach((item) => {
  const bucketKey = `${item.SoThung}-${item.isNM}`;

  if (!bucketGroups.has(bucketKey)) {
    bucketGroups.set(bucketKey, []);
  }
  bucketGroups.get(bucketKey)!.push(item);
});
```

**Kết quả**: Mỗi nhóm chứa tất cả các lượt rót của cùng một thùng tại cùng một khu vực, đã được sắp xếp theo thời gian.

### Bước 3: Tính Toán Cycle Time

```typescript
bucketGroups.forEach((items) => {
  // items đã được sắp xếp theo GioBatDau (oldest first)

  for (let i = 0; i < items.length; i++) {
    const current = items[i];

    // Tính cycle time
    let cycleTimeMinutes = 0;

    if (i > 0) {
      // Không phải lượt đầu tiên -> tính thời gian từ lượt trước
      const previous = items[i - 1];
      if (previous.GioBatDau && current.GioBatDau) {
        const previousStartTime = parseISO(previous.GioBatDau);
        const currentStartTime = parseISO(current.GioBatDau);
        cycleTimeMinutes = differenceInMinutes(
          currentStartTime,
          previousStartTime,
        );
      }
    }
    // else: i = 0 (lượt đầu tiên) -> cycleTimeMinutes = 0

    // Tính pour time
    let pourTimeMinutes = 0;
    if (current.G_BatDauRot && current.G_RotDayThung) {
      const pourStartTime = parseISO(current.G_BatDauRot);
      const pourEndTime = parseISO(current.G_RotDayThung);
      pourTimeMinutes = differenceInMinutes(pourEndTime, pourStartTime);
    }

    // Lưu kết quả
    cycleData.push({
      id: current.ID,
      soThung: current.SoThung,
      cycleTimeMinutes, // 0 cho lượt đầu, > 0 cho các lượt sau
      pourTimeMinutes,
      fullTime: current.GioBatDau!,
      nextPourStart: i < items.length - 1 ? items[i + 1].GioBatDau! : "",
      // ... các trường khác
    });
  }
});
```

### Bước 4: Sắp Xếp Kết Quả Cuối Cùng

```typescript
return cycleData.sort((a, b) => {
  const dateA = parseISO(a.fullTime);
  const dateB = parseISO(b.fullTime);
  return dateB.getTime() - dateA.getTime(); // Mới nhất trước (cho hiển thị)
});
```

## Ví Dụ Cụ Thể

### Ví Dụ 1: Thùng 32 - DQ1

**Dữ liệu đầu vào** (đã sắp xếp theo thời gian):

| STT | Thời gian rót đầy | Composite Key |
| --- | ----------------- | ------------- |
| 1   | 13/02/2026 05:23  | 32-1          |
| 2   | 13/02/2026 11:32  | 32-1          |
| 3   | 13/02/2026 17:45  | 32-1          |

**Kết quả tính toán**:

| Lượt | Thời gian rót đầy | Cycle Time   | Giải thích                         |
| ---- | ----------------- | ------------ | ---------------------------------- |
| 1    | 05:23             | **0 phút**   | Lượt đầu tiên, không có lượt trước |
| 2    | 11:32             | **369 phút** | 11:32 - 05:23 = 6h 9m = 369 phút   |
| 3    | 17:45             | **373 phút** | 17:45 - 11:32 = 6h 13m = 373 phút  |

### Ví Dụ 2: Cùng Số Thùng, Khác Khu Vực

**Dữ liệu đầu vào**:

| Thời gian | Số thùng | Khu vực      | Composite Key |
| --------- | -------- | ------------ | ------------- |
| 08:00     | 10       | DQ1 (isNM=1) | 10-1          |
| 08:30     | 10       | DQ2 (isNM=2) | 10-2          |
| 14:00     | 10       | DQ1 (isNM=1) | 10-1          |
| 14:30     | 10       | DQ2 (isNM=2) | 10-2          |

**Kết quả tính toán**:

**Nhóm 10-1 (Thùng 10 tại DQ1)**:

- 08:00 → Cycle Time = 0 (lượt đầu)
- 14:00 → Cycle Time = 360 phút (14:00 - 08:00)

**Nhóm 10-2 (Thùng 10 tại DQ2)**:

- 08:30 → Cycle Time = 0 (lượt đầu)
- 14:30 → Cycle Time = 360 phút (14:30 - 08:30)

## Các Chỉ Số Thống Kê

### 1. Thời Gian Quay Vòng Trung Bình (Average Cycle Time)

```typescript
const averageCycleTime = Math.round(
  cycleTimeAnalysis.reduce((sum, item) => sum + item.cycleTimeMinutes, 0) /
    cycleTimeAnalysis.length,
);
```

**Lưu ý**: Bao gồm cả các record có cycleTime = 0 (lượt đầu tiên).

### 2. Thời Gian Quay Vòng Gần Nhất (Recent Cycle Time)

```typescript
const recentCycleTime = cycleTimeAnalysis[0]; // Đã sort descending
```

Hiển thị thông tin lượt rót mới nhất trong hệ thống.

### 3. Phân Loại Cycle Time

- **Nhanh** (Fast): `cycleTime < averageCycleTime * 0.8` → Màu xanh lá
- **Bình thường** (Normal): `0.8 * average ≤ cycleTime ≤ 1.2 * average` → Màu xanh dương
- **Chậm** (Slow): `cycleTime > averageCycleTime * 1.2` → Màu đỏ

### 4. Unique Buckets

Chỉ hiển thị **lượt rót mới nhất** của mỗi thùng-khu vực:

```typescript
const uniqueBuckets = useMemo(() => {
  const bucketMap = new Map<string, CycleData>();

  cycleTimeAnalysis.forEach((item) => {
    const key = `${item.soThung}-${item.isNM}`;
    if (!bucketMap.has(key)) {
      // Chỉ lấy record đầu tiên (mới nhất)
      bucketMap.set(key, item);
    }
  });

  return Array.from(bucketMap.values());
}, [cycleTimeAnalysis]);
```

## Bộ Lọc (Filters)

### 1. Lọc Theo Số Thùng

```typescript
const bucketFilter = "32"; // Tìm tất cả thùng có chứa "32"
filtered = filtered.filter((item) =>
  item.soThung.includes(bucketFilter.trim()),
);
```

### 2. Lọc Theo Khu Vực

```typescript
const areaFilter = "1"; // 1 = DQ1, 2 = DQ2, "all" = tất cả
filtered = filtered.filter((item) => item.isNM === Number(areaFilter));
```

## Khoảng Thời Gian Mặc Định

```typescript
const [dateRange, setDateRange] = useState<DateRange | undefined>({
  from: new Date(new Date().setDate(new Date().getDate() - 1)), // Hôm qua
  to: new Date(), // Hôm nay
});
```

**Mặc định**: Lấy dữ liệu từ hôm qua đến hôm nay (1 ngày).

## Hiển Thị Dữ Liệu

### 1. Biểu Đồ Tổng Quan (Main Chart)

- **Bar Chart**: Hiển thị cycle time của từng lượt rót
- **Area Chart**: Hiển thị đường trung bình cycle time
- **Màu sắc**:
  - Xanh lá: Nhanh hơn trung bình 20%
  - Xanh dương: Bình thường
  - Đỏ: Chậm hơn trung bình 20%

### 2. Bảng Chi Tiết

- Hiển thị các lượt rót mới nhất của mỗi thùng
- Hỗ trợ phân trang
- Có thể lọc theo số thùng và khu vực

### 3. Modal Lịch Sử Chi Tiết

- Khi click "Xem chi tiết" trên một thùng
- Hiển thị **tất cả các lượt rót** của thùng đó tại khu vực đó
- Bao gồm biểu đồ xu hướng riêng cho thùng đó

## Lưu Ý Quan Trọng

### ⚠️ Thay Đổi Logic Mới Nhất

**TRƯỚC ĐÂY** (Logic cũ - SAI):

```
Lượt 1 (05:23) → cycleTime = 369 phút (thời gian đến lượt 2)
Lượt 2 (11:32) → cycleTime = 0 (lượt cuối)
```

**HIỆN TẠI** (Logic mới - ĐÚNG):

```
Lượt 1 (05:23) → cycleTime = 0 (lượt đầu)
Lượt 2 (11:32) → cycleTime = 369 phút (thời gian từ lượt 1)
```

### 📌 Quy Tắc Tính Toán

1. **Lượt đầu tiên** của mỗi thùng-khu vực: `cycleTime = 0`
2. **Các lượt tiếp theo**: `cycleTime = thời gian hiện tại - thời gian lượt trước`
3. Cycle time được lưu trên **record hiện tại** (not previous)
4. Sắp xếp theo thời gian **trước khi** nhóm để đảm bảo thứ tự đúng
5. Composite key đảm bảo cùng số thùng ở các khu vực khác nhau được tính độc lập

### 🔍 Debug và Kiểm Tra

Để kiểm tra logic tính toán:

1. **Xem console log**:

```typescript
console.log("Bucket groups:", bucketGroups);
console.log("Cycle data:", cycleData);
```

2. **Kiểm tra trong modal chi tiết**:
   - Mở modal lịch sử của một thùng
   - Xem record đầu tiên phải có cycleTime = 0
   - Các record sau phải có cycleTime = thời gian hiện tại - thời gian trước

3. **Công thức kiểm tra thủ công**:

```
Record thứ N: cycleTime = GioBatDau[N] - GioBatDau[N-1]
Record đầu tiên: cycleTime = 0
```

## API Endpoint

```typescript
const result = await searchGangNhatTrinh({
  fromDate: "2026-02-12", // yyyy-MM-dd
  toDate: "2026-02-13",
});
```

**Response**: Array of `ThungGangData` objects

## Tham Khảo Code

- **File chính**: `src/pages/ThungGangAnalysis.tsx`
- **Service**: `src/services/ganttService.ts`
- **Function tính toán**: `cycleTimeAnalysis` (useMemo hook, dòng ~107-215)

---

**Phiên bản**: 2.0  
**Cập nhật**: 13/02/2026  
**Thay đổi chính**: Đổi logic tính cycle time từ "forward-looking" sang "backward-looking"
