# Báo Cáo Hệ Thống Dashboard Thùng Gang BOF

## 📊 Tóm Tắt Hệ Thống

**Tên dự án**: Dashboard BOF - Hệ thống quản lý và phân tích thùng gang  
**Mục đích**: Theo dõi, phân tích hiệu suất và báo cáo vận hành thùng gang trong sản xuất thép  
**Công nghệ**: React 18 + TypeScript, Recharts, Tailwind CSS, shadcn/ui

---

## 🎯 Mục Đích Chính

1. **Theo dõi thời gian thực** - Giám sát vận chuyển và sử dụng thùng gang
2. **Phân tích hiệu suất** - Đánh giá thời gian quay vòng (cycle time)
3. **Báo cáo tổng hợp** - Cung cấp insights cho cấp quản lý
4. **Tối ưu hóa quy trình** - Phát hiện điểm nghẽn và cải thiện

---

## 🏗️ Kiến Trúc Hệ Thống

### Công Nghệ Core

- **Frontend**: React 18 + TypeScript, Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Utils**: date-fns

### Cấu Trúc Chính

```
src/
├── pages/
│   ├── ThungGangAnalysis.tsx      # Phân tích cycle time
│   └── BaoCaoThongKe.tsx          # Báo cáo tổng hợp
├── services/
│   └── ganttService.ts            # API integration
└── components/ui/                 # UI components
```

### Dữ Liệu Chính (ThungGangData)

- **Thông tin thùng**: SoThung, isNM (khu vực 1=DQ1, 2=DQ2)
- **Timestamps**: G_BatDauRot, G_RotDayThung, GioBatDau, GioVaoLT, GioVaoKR, GioRaKR, T_BatDauRot, GioRotXong, GioRaLT
- **Địa điểm**: DiemDau, DiemDen
- **Khối lượng**: KhoiLuong (tấn), ID_LoCao

---

## 📦 Các Module Chính

### 1. Module Phân Tích Thời Gian Quay Vòng

**File**: `ThungGangAnalysis.tsx`

**Chức năng**:

- ✅ Tính cycle time của từng thùng gang
- ✅ Phân tích hiệu suất theo thùng và khu vực
- ✅ Biểu đồ xu hướng và bảng chi tiết
- ✅ Lịch sử chi tiết từng thùng

**Logic Cycle Time**:

```
Lượt N: Cycle Time = Thời gian lượt N - Thời gian lượt N-1
Lượt đầu tiên: Cycle Time = 0
Composite Key: ${SoThung}-${isNM}
```

**Phân loại hiệu suất**:

- 🟢 Nhanh: < 80% trung bình
- 🔵 Bình thường: 80-120% trung bình
- 🔴 Chậm: > 120% trung bình

### 2. Module Báo Cáo Thống Kê

**File**: `BaoCaoThongKe.tsx`

#### A. Báo Cáo Tổng Quan

**4 Chỉ số chính (Summary Cards)**:

1. 📦 Tổng số thùng gang (lượt)
2. 🎯 Số lò cao hoạt động
3. 📈 Tổng sản lượng gang (tấn)
4. ⏱️ Thời gian vận chuyển trung bình

**3 Biểu đồ phân tích**:

1. **Phân bố theo khu vực** (DQ1/DQ2) - Pie chart
2. **Phân bố thời gian vận chuyển** - Pie chart (< 1h, 1-2h, 2-3h, > 3h)
3. **Thống kê theo lò cao** - Bar chart (số lượt + sản lượng)

**Bảng tổng hợp chi tiết**: 6 chỉ tiêu với đánh giá và tỷ lệ %

#### B. Báo Cáo Theo Thùng Gang

**Bảng chi tiết 11 vị trí**:

1. Bắt đầu ra gang → 2. Ra gang xong → 3. Bắt đầu vận chuyển → 4. Gian chờ thép → 5. Vào KR → 6. Ra KR → 7. Bắt đầu rót → 8. Rót xong → 9. Ra LT → 10-11. Dự phòng

**Dòng Delta**: Thời gian chênh lệch giữa các bước

**Tính năng**:

- Lọc: số thùng, lò cao, khu vực
- Phân trang (10 records/trang)
- Xem sơ đồ vận hành chi tiết
- Export báo cáo

#### C. Sơ Đồ Vận Hành Chi Tiết

**Flow Visualization**:

- Summary info cards (4 chỉ số)
- Biểu đồ chu trình theo vị trí
- Timeline công đoạn với thời gian
- Kết nối bằng mũi tên

---

## 📊 Phân Tích Dữ Liệu

### 1. Cycle Time Analysis

- **Công thức**: `CycleTime[i] = StartTime[i] - StartTime[i-1]`
- **Average**: `Sum(CycleTime) / Count(Records)`
- **Classification**: Fast (< 0.8×Avg), Normal (0.8-1.2×Avg), Slow (> 1.2×Avg)

### 2. Phân Tích Theo Khu Vực

- DQ1 (isNM=1) vs DQ2 (isNM=2)
- So sánh: số lượt, tỷ lệ %, cycle time TB, sản lượng

### 3. Phân Tích Theo Lò Cao

- Số lượt ra gang/lò
- Tổng sản lượng (tấn)
- Top 6 lò hoạt động hiệu quả

### 4. Phân Tích Thời Gian Vận Chuyển

- < 1h (Rất nhanh), 1-2h (Bình thường), 2-3h (Cần cải thiện), > 3h (Có vấn đề)

---

## 📈 Hệ Thống Báo Cáo

### Báo Cáo Định Kỳ

- **Ca** (3×/ngày): Số lượt, thùng tốt/chậm, sự cố
- **Ngày** (00:00): Tổng hợp ca, sản lượng, top thùng
- **Tuần** (Thứ 2): Xu hướng, so sánh, đề xuất
- **Tháng** (Đầu tháng): KPI, so sánh tháng trước, báo cáo lãnh đạo

### Export

- 📄 PDF (Báo cáo trình chiếu)
- 📊 Excel (Dữ liệu chi tiết)
- 📈 CSV (Dữ liệu thô)

---

## 🔄 Luồng Dữ Liệu

```
Database → REST API → ganttService.ts → React State →
useMemo Calculations → UI (Charts, Tables)
```

**API Request**:

```typescript
searchGangNhatTrinh({
  fromDate: "yyyy-MM-dd",
  toDate: "yyyy-MM-dd",
  soThung: "optional",
  idLoCao: optional,
  isNM: optional,
});
```

---

## 📱 Hướng Dẫn Sử Dụng

### Nhân Viên Vận Hành

1. Xem dashboard → Chọn khoảng thời gian
2. Kiểm tra chi tiết thùng → Click "Xem chi tiết"
3. Lọc dữ liệu: thời gian, số thùng, lò cao, khu vực

### Quản Đốc Ca

1. Theo dõi hiệu suất ca → Báo cáo tổng quan
2. Xác định cycle time cao → Kiểm tra delta time
3. Export báo cáo cuối ca

### Cấp Quản Lý

1. Xem 4 summary cards
2. Phân tích biểu đồ (khu vực, thời gian, lò cao)
3. Đọc bảng tổng hợp → Ra quyết định

---

## 🚀 Roadmap

### v2.0 (Q2/2026)

- Real-time dashboard
- Alert system
- Mobile responsive
- Multi-format export

### v2.5 (Q3/2026)

- Machine learning predictions
- Advanced analytics
- Custom report builder

---

## 📚 Tài Liệu Tham Khảo

- [THUNG_GANG_CYCLE_TIME_LOGIC.md](./THUNG_GANG_CYCLE_TIME_LOGIC.md) - Logic tính toán chi tiết
- [API_GANG_NHAT_TRINH.md](./API_GANG_NHAT_TRINH.md) - API documentation
- [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) - Business logic

---

## 📝 Version History

**v1.2.0** (05/03/2026) - Current

- ✅ Báo cáo tổng quan với biểu đồ phân tích
- ✅ Bảng tổng hợp chi tiết
- ✅ Phân tích theo khu vực và lò cao
- ✅ Dòng Delta trong báo cáo

---

**Tài liệu**: v1.2.0 | **Cập nhật**: 05/03/2026 | **Team**: BOF Dashboard Development
