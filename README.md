# BOF Dashboard

Hệ thống giám sát và theo dõi vận hành luyện thép BOF (Basic Oxygen Furnace) thời gian thực.

## Tính năng

- 📊 **Sơ đồ vận hành**: Theo dõi trạng thái thùng gang qua các giai đoạn
  - Bắt đầu lấy mẫu
  - Trạm nước gang
  - Vào luyện thép
  
- 📝 **Ghi chép chắt gang**: Lịch sử chi tiết các lần chắt gang
  - Lọc theo ngày tháng
  - Tìm kiếm theo số thùng
  - Xuất dữ liệu Excel
  
- 🔄 **Cập nhật tự động**: Dữ liệu được làm mới định kỳ từ API

## Công nghệ sử dụng

- **React 18** + **Vite** - Framework và build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI Components
- **date-fns** - Date manipulation
- **xlsx** - Excel import/export
- **Lucide React** - Icons

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build production
npm run build

# Preview production build
npm run preview
```

## Cấu hình

Tạo file `.env` với các biến môi trường sau:

```env
# API configuration
VITE_API_URL=https://api.example.com

# Polling interval (ms)
VITE_BOF_POLL_MS=10000

# API endpoints
VITE_BOF_SECTIONS_URL=https://api.example.com/bof/sections
VITE_BOF_LOGS_URL=https://api.example.com/bof/logs
```

## API Endpoints

### Dữ liệu thùng gang thời điểm hiện tại
```
GET https://report.hoaphatdungquat.vn/api/ProductApi/GetDuLieuThungGangThoiDiem
```

### Dữ liệu thùng gang theo khoảng ngày
```
GET https://report.hoaphatdungquat.vn/api/ProductApi/GetDuLieuThungGang?tuNgay={fromDate}&denNgay={toDate}
```

## Cấu trúc dự án

```
bof-dashboard/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   └── file-uploader.tsx
│   ├── services/
│   │   └── ganttService.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── App.tsx          # Main component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## License

MIT
