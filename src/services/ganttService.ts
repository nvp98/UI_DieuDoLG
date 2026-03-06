// src/services/ganttService.ts
import axios from "axios";

export interface OperationDto {
  unit: string;
  group: string;
  sequence_Order: number | null;
  startTime: string;
  endTime: string;
  duration_Min: number;
  idleTimeMinutes?: number;
}

export interface GanttHeatDto {
  heat_ID: string;
  steel_Grade: string;
  operations: OperationDto[];
  castingMachine?: string;
  sequenceInCaster?: number | null;
  isComplete: boolean;
  totalDuration: number;
  totalIdleTime: number;
}

// ⚙️ Cấu hình base URL — có thể dùng biến môi trường
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getGanttData = {
  getData: () => api.get("/SteelCycleTimes/demo"),
  getDataDemo: () => api.get("/SteelCycleTimes"),
};

// Lấy dữ liệu thùng gang thời điểm hiện tại từ production API
export interface ProductionBucketData {
  bkmiS_SoMe: string;
  bkmiS_ThungSo: string;
  bkmiS_Gio: string;
  g_Ca: number;
  gio_NM: string;
  ngayTao: string;
  iD_LoCao: number;
  chuyenDen: string;
  g_KLGangLong: number;
  gioChonMe: string;
  g_ID_TrangThai: number;
  t_ID_TrangThai: number;
}

export interface ProductionApiResponse {
  success: boolean;
  message: string;
  total: number;
  data: ProductionBucketData[];
}

export const getProductionDataGang = async (): Promise<ProductionBucketData[]> => {
  try {
    const response = await fetch("https://report.hoaphatdungquat.vn/api/ProductApi/GetDuLieuThungGangThoiDiem", {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch production data: ${response.status}`);
    }

    const apiResponse: ProductionApiResponse = await response.json();
    
    if (apiResponse.success && Array.isArray(apiResponse.data)) {
      return apiResponse.data;
    }

    console.warn("Production API returned unexpected structure:", apiResponse);
    return [];
  } catch (error) {
    console.error("❌ Lỗi khi gọi API Production Data:", error);
    return [];
  }
};

// Lấy dữ liệu thùng gang theo khoảng ngày
export const getProductionDataByDate = async (
  fromDate: string,
  toDate: string
): Promise<ProductionBucketData[]> => {
  try {
    const response = await fetch(
      `https://report.hoaphatdungquat.vn/api/ProductApi/GetDuLieuThungGang?tuNgay=${fromDate}&denNgay=${toDate}`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch production data: ${response.status}`);
    }

    const apiResponse: ProductionApiResponse = await response.json();
    
    if (apiResponse.success && Array.isArray(apiResponse.data)) {
      return apiResponse.data;
    }

    console.warn("Production API returned unexpected structure:", apiResponse);
    return [];
  } catch (error) {
    console.error("❌ Lỗi khi gọi API Production Data By Date:", error);
    return [];
  }
};

// Type definition for Thung Gang Nhat Trinh
export interface ThungGangData {
  ID: number;
  SoThung: string;
  NgayTao: string;
  NgaySX: string;
  CaSX: number;
  G_BatDauRot: string | null;
  G_RotDayThung: string | null;
  GioBatDau: string | null;
  GioDucGang: string | null;
  GioVaoLT: string | null;
  GioVaoKR: string | null;
  GioRaKR: string | null;
  T_BatDauRot: string | null;
  GioRotXong: string | null;
  GioRaLT: string | null;
  DiemDau: string;
  DiemTrungGian: string | null;
  GioTrungGian: string | null;
  DiemDen: string;
  KL_XeGong: number;
  TinhTrang: number;
  ThuTu: number;
  Me: string;
  Mac: string | null;
  KhoiLuong: number;
  NhietDoThung: number;
  G_TongTGRot: string | null;
  ID_LoCao: number;
  isNM: number;
  ID_GiaoNhan: number;
  C: number;
  Si: number;
  Mn: number;
  S: number;
  P: number;
  Ti: number;
  Temp: number;
  QuayThung: string | null;
}

// Get latest gang nhat trinh data
export const getGangNhatTrinhLatest = async (): Promise<ThungGangData[]> => {
  try {
    const response = await fetch("https://chart.hoaphatdungquat.vn/api/gang-nhat-trinh/latest", {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch gang nhat trinh latest: ${response.status}`);
    }

    const data: ThungGangData[] = await response.json();
    
    if (Array.isArray(data)) {
      return data;
    }

    console.warn("Gang nhat trinh API returned unexpected structure:", data);
    return [];
  } catch (error) {
    console.error("❌ Lỗi khi gọi API Gang Nhat Trinh Latest:", error);
    return [];
  }
};

// Search gang nhat trinh by furnace ID
export const getGangNhatTrinhByFurnace = async (idLoCao: number): Promise<ThungGangData[]> => {
  try {
    const response = await fetch(
      `https://chart.hoaphatdungquat.vn/api/gang-nhat-trinh/search?idLoCao=${idLoCao}`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch gang nhat trinh by furnace: ${response.status}`);
    }

    const data: ThungGangData[] = await response.json();
    
    if (Array.isArray(data)) {
      return data;
    }

    console.warn("Gang nhat trinh search API returned unexpected structure:", data);
    return [];
  } catch (error) {
    console.error("❌ Lỗi khi gọi API Gang Nhat Trinh Search:", error);
    return [];
  }
};

// Search gang nhat trinh with filters (date range, furnace, bucket number)
export interface GangNhatTrinhSearchParams {
  fromDate?: string; // Format: YYYY-MM-DD
  toDate?: string; // Format: YYYY-MM-DD
  idLoCao?: number;
  soThung?: string;
  isNM?: number; // 0 for DQ1, 1 for DQ2
}

export const searchGangNhatTrinh = async (params: GangNhatTrinhSearchParams): Promise<ThungGangData[]> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.idLoCao) {
      queryParams.append("idLoCao", params.idLoCao.toString());
    }
    if (params.fromDate) {
      queryParams.append("fromDate", params.fromDate);
    }
    if (params.toDate) {
      queryParams.append("toDate", params.toDate);
    }
    if (params.soThung) {
      queryParams.append("soThung", params.soThung);
    }
    if (params.isNM !== undefined) {
      queryParams.append("isNM", params.isNM.toString());
    }

    const url = `https://chart.hoaphatdungquat.vn/api/gang-nhat-trinh/search${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to search gang nhat trinh: ${response.status}`);
    }

    const data: ThungGangData[] = await response.json();
    
    if (Array.isArray(data)) {
      return data;
    }

    console.warn("Gang nhat trinh search API returned unexpected structure:", data);
    return [];
  } catch (error) {
    console.error("❌ Lỗi khi gọi API Gang Nhat Trinh Search:", error);
    return [];
  }
};
