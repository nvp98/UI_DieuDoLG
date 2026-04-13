import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import {
  TrendingUp,
  Activity,
  CalendarIcon,
  Download,
  Clock,
  Target,
  MapPin,
  Package,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThungGangData, searchGangNhatTrinh } from "@/services/ganttService";
import * as XLSX from "xlsx";

type ReportType = "overview" | "thunggang" | "vitri";

// Helper function để chuyển đổi dữ liệu ThungGangData sang format báo cáo
const convertThungGangDataToReport = (data: ThungGangData) => {
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "";
    try {
      const date = new Date(timeStr);
      return format(date, "HH:mm");
    } catch {
      return timeStr;
    }
  };

  // Helper function to calculate delta time between two timestamps (in minutes)
  const calculateDelta = (
    currentTime: string | null,
    previousTime: string | null,
  ) => {
    if (!currentTime || !previousTime) return "";

    try {
      const current = new Date(currentTime);
      const previous = new Date(previousTime);
      const diffMs = current.getTime() - previous.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));

      if (diffMinutes === 0) return "0";

      const hours = Math.floor(Math.abs(diffMinutes) / 60);
      const minutes = Math.abs(diffMinutes) % 60;

      if (hours > 0) {
        return `${diffMinutes < 0 ? "-" : ""}${hours}h${minutes}m`;
      }
      return `${diffMinutes}m`;
    } catch {
      return "";
    }
  };

  // Tính tổng thời gian = thời gian lớn nhất - thời gian nhỏ nhất
  const calculateTotalTime = () => {
    const timestamps = [
      data.G_BatDauRot,
      data.GioRotXong,
      data.GioBatDau,
      data.GioTrungGian,
      data.GioVaoKR,
      data.GioRaKR,
      data.GioRaLT,
    ].filter((t): t is string => !!t);

    if (timestamps.length < 2) return "";

    try {
      const dates = timestamps.map((t) => new Date(t).getTime());
      const minTime = Math.min(...dates);
      const maxTime = Math.max(...dates);
      const diffMs = maxTime - minTime;

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return `${hours}:${minutes.toString().padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  // Create result object with delta calculations
  const result = {
    ngayLo: data.NgaySX ? format(new Date(data.NgaySX), "d/M/yyyy") : "",
    id: data.Me?.toString(),
    soThung: data.SoThung,
    viTri1: {
      congDoan: "Bắt đầu ra gang",
      vitri: data.DiemDau || "",
      time: formatTime(data.G_BatDauRot),
      delta: "", // First position has no delta
    },
    viTri2: {
      congDoan: "Ra gang xong",
      vitri: data.DiemDau || "",
      time: formatTime(data.G_RotDayThung),
      delta: calculateDelta(data.G_RotDayThung, data.G_BatDauRot),
    },
    viTri3: {
      congDoan: "BĐ Vận chuyển",
      vitri: data.DiemDau || "",
      time: formatTime(data.GioBatDau),
      delta: calculateDelta(data.GioBatDau, data.G_RotDayThung),
    },
    viTri4: {
      congDoan: "Gian chờ thép",
      vitri: data.DiemDen || "",
      time: formatTime(data.GioVaoLT),
      delta: calculateDelta(data.GioVaoLT, data.GioBatDau),
    },
    viTri5: {
      congDoan: "Vào KR",
      vitri: data.DiemDen || "",
      time: formatTime(data.GioVaoKR),
      delta: calculateDelta(data.GioVaoKR, data.GioVaoLT),
    },
    viTri6: {
      congDoan: "Ra KR",
      vitri: data.DiemDen || "",
      time: formatTime(data.GioRaKR),
      delta: calculateDelta(data.GioRaKR, data.GioVaoKR),
    },
    viTri7: {
      congDoan: "Bắt đầu rót",
      vitri: data.DiemDen || "",
      time: formatTime(data.T_BatDauRot),
      delta: calculateDelta(data.T_BatDauRot, data.GioRaKR),
    },
    viTri8: {
      congDoan: "Rót xong",
      vitri: data.DiemDen || "",
      time: formatTime(data.GioRotXong),
      delta: calculateDelta(data.GioRotXong, data.T_BatDauRot),
    },
    viTri9: {
      congDoan: "Ra LT",
      vitri: data.DiemDen || "",
      time: formatTime(data.GioRaLT),
      delta: calculateDelta(data.GioRaLT, data.GioRotXong),
    },
    viTri10: { congDoan: "", vitri: "", time: "", delta: "" },
    viTri11: { congDoan: "", vitri: "", time: "", delta: "" },
    tongThoiGian: calculateTotalTime(),
    chiTiet: "Chi tiết",
  };

  return result;
};

export const BaoCaoThongKe: React.FC = () => {
  // Set default date range: yesterday to today
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: yesterday,
    to: today,
  });
  const [reportType, setReportType] = useState<ReportType>("overview");
  const [thungGangData, setThungGangData] = useState<ThungGangData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  // Filters for thung gang report
  const [filterSoThung, setFilterSoThung] = useState<string>("");
  const [filterLoCao, setFilterLoCao] = useState<string>("");
  const [filterKhuVuc, setFilterKhuVuc] = useState<string>("");

  // Fetch data from API when dateRange changes
  useEffect(() => {
    const fetchData = async () => {
      if (!dateRange?.from || !dateRange?.to) return;

      setLoading(true);
      setError(null);

      try {
        const startDate = format(dateRange.from, "yyyy-MM-dd");
        const endDate = format(dateRange.to, "yyyy-MM-dd");

        const params: any = {
          fromDate: startDate,
          toDate: endDate,
        };

        // Add optional filters
        if (filterSoThung) {
          params.soThung = filterSoThung;
        }
        if (filterLoCao) {
          params.idLoCao = parseInt(filterLoCao);
        }
        if (filterKhuVuc) {
          params.isNM = parseInt(filterKhuVuc);
        }

        const data = await searchGangNhatTrinh(params);
        setThungGangData(data);
        setCurrentPage(1); // Reset to first page when data changes
      } catch (err) {
        setError("Không thể tải dữ liệu. Vui lòng thử lại.");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, filterSoThung, filterLoCao, filterKhuVuc]);

  // Reset page when switching report types
  useEffect(() => {
    setCurrentPage(1);
  }, [reportType]);

  // Calculate summary statistics from real data
  const summaryStats = React.useMemo(() => {
    if (!thungGangData || thungGangData.length === 0) {
      return {
        totalBuckets: 0,
        activeFurnaces: 0,
        totalProduction: 0,
        avgTransportTime: "0:00",
      };
    }

    // Total number of buckets
    const totalBuckets = thungGangData.length;

    // Count unique active furnaces
    const uniqueFurnaces = new Set(
      thungGangData.map((d) => d.ID_LoCao).filter((id) => id),
    );
    const activeFurnaces = uniqueFurnaces.size;

    // Calculate total production (sum of KhoiLuong)
    const totalProduction = thungGangData.reduce(
      (sum, d) => sum + (d.KhoiLuong || 0),
      0,
    );

    // Calculate average transport time (G_TongTGRot)
    const validTimes = thungGangData
      .map((d) => d.G_TongTGRot)
      .filter(
        (time): time is string =>
          typeof time === "string" && time !== "00:00:00",
      );

    let avgTransportTime = "0:00";
    if (validTimes.length > 0) {
      // Convert times to minutes and calculate average
      const totalMinutes = validTimes.reduce((sum, timeStr) => {
        const parts = timeStr.split(":");
        const hours = parseInt(parts[0] || "0");
        const minutes = parseInt(parts[1] || "0");
        return sum + hours * 60 + minutes;
      }, 0);

      const avgMinutes = Math.round(totalMinutes / validTimes.length);
      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = avgMinutes % 60;
      avgTransportTime = `${avgHours}:${avgMins.toString().padStart(2, "0")}`;
    }

    return {
      totalBuckets,
      activeFurnaces,
      totalProduction,
      avgTransportTime,
    };
  }, [thungGangData]);

  // Phân tích dữ liệu theo khu vực (DQ1/DQ2)
  const areaAnalysis = React.useMemo(() => {
    if (!thungGangData || thungGangData.length === 0) {
      return [];
    }

    const dq1Count = thungGangData.filter((d) => d.isNM === 1).length;
    const dq2Count = thungGangData.filter((d) => d.isNM === 2).length;

    return [
      { name: "DQ1", value: dq1Count, color: "#3b82f6" },
      { name: "DQ2", value: dq2Count, color: "#8b5cf6" },
    ].filter((item) => item.value > 0);
  }, [thungGangData]);

  // Phân tích theo lò cao
  const furnaceAnalysis = React.useMemo(() => {
    if (!thungGangData || thungGangData.length === 0) {
      return [];
    }

    const furnaceMap: Record<string, { count: number; production: number }> =
      {};

    thungGangData.forEach((d) => {
      const furnaceId = d.ID_LoCao?.toString() || "Không xác định";
      if (!furnaceMap[furnaceId]) {
        furnaceMap[furnaceId] = { count: 0, production: 0 };
      }
      furnaceMap[furnaceId].count++;
      furnaceMap[furnaceId].production += d.KhoiLuong || 0;
    });

    return Object.entries(furnaceMap)
      .map(([furnaceId, data]) => ({
        name: `Lò cao ${furnaceId}`,
        soLuong: data.count,
        sanLuong: Math.round(data.production * 10) / 10,
      }))
      .sort((a, b) => b.soLuong - a.soLuong)
      .slice(0, 6);
  }, [thungGangData]);

  // Phân tích thời gian vận chuyển
  const transportTimeAnalysis = React.useMemo(() => {
    if (!thungGangData || thungGangData.length === 0) {
      return [
        { name: "< 1h", value: 0, color: "#22c55e" },
        { name: "1-2h", value: 0, color: "#3b82f6" },
        { name: "2-3h", value: 0, color: "#f59e0b" },
        { name: "> 3h", value: 0, color: "#ef4444" },
      ];
    }

    const validTimes = thungGangData
      .map((d) => d.G_TongTGRot)
      .filter(
        (time): time is string =>
          typeof time === "string" && time !== "00:00:00",
      );

    let under1h = 0;
    let between1and2h = 0;
    let between2and3h = 0;
    let over3h = 0;

    validTimes.forEach((timeStr) => {
      const parts = timeStr.split(":");
      const hours = parseInt(parts[0] || "0");
      const minutes = parseInt(parts[1] || "0");
      const totalMinutes = hours * 60 + minutes;

      if (totalMinutes < 60) under1h++;
      else if (totalMinutes < 120) between1and2h++;
      else if (totalMinutes < 180) between2and3h++;
      else over3h++;
    });

    return [
      { name: "< 1h", value: under1h, color: "#22c55e" },
      { name: "1-2h", value: between1and2h, color: "#3b82f6" },
      { name: "2-3h", value: between2and3h, color: "#f59e0b" },
      { name: "> 3h", value: over3h, color: "#ef4444" },
    ].filter((item) => item.value > 0);
  }, [thungGangData]);

  const handleExportReport = () => {
    if (!thungGangData || thungGangData.length === 0) {
      window.alert("Không có dữ liệu để xuất báo cáo.");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const fromLabel = dateRange?.from
      ? format(dateRange.from, "yyyyMMdd")
      : "from";
    const toLabel = dateRange?.to ? format(dateRange.to, "yyyyMMdd") : "to";

    if (reportType === "overview") {
      const summarySheet = XLSX.utils.json_to_sheet([
        {
          "Tổng số thùng": summaryStats.totalBuckets,
          "Lò cao hoạt động": summaryStats.activeFurnaces,
          "Tổng sản lượng (tấn)": summaryStats.totalProduction,
          "TG vận chuyển TB": summaryStats.avgTransportTime,
        },
      ]);

      const furnaceSheet = XLSX.utils.json_to_sheet(
        furnaceAnalysis.map((item) => ({
          "Lò cao": item.name,
          "Số lượng": item.soLuong,
          "Sản lượng (tấn)": item.sanLuong,
        })),
      );

      const areaSheet = XLSX.utils.json_to_sheet(
        areaAnalysis.map((item) => ({
          "Khu vực": item.name,
          "Số lượt": item.value,
        })),
      );

      const transportSheet = XLSX.utils.json_to_sheet(
        transportTimeAnalysis.map((item) => ({
          "Khoảng thời gian": item.name,
          "Số lượng": item.value,
        })),
      );

      XLSX.utils.book_append_sheet(workbook, summarySheet, "TongQuan");
      XLSX.utils.book_append_sheet(workbook, furnaceSheet, "TheoLoCao");
      XLSX.utils.book_append_sheet(workbook, areaSheet, "TheoKhuVuc");
      XLSX.utils.book_append_sheet(workbook, transportSheet, "TGVanChuyen");

      XLSX.writeFile(
        workbook,
        `bao-cao-tong-quan_${fromLabel}_${toLabel}.xlsx`,
      );
      return;
    }

    if (reportType === "thunggang") {
      const reportData = thungGangData.map(convertThungGangDataToReport);
      const exportRows = reportData.map((row, index) => ({
        STT: index + 1,
        "Ngày LG": row.ngayLo,
        ID: row.id,
        "Số thùng": row.soThung,
        "VT1 - Vị trí": row.viTri1.vitri,
        "VT1 - Công đoạn": row.viTri1.congDoan,
        "VT1 - Thời gian": row.viTri1.time,
        "VT1 - Delta": row.viTri1.delta,
        "VT2 - Vị trí": row.viTri2.vitri,
        "VT2 - Công đoạn": row.viTri2.congDoan,
        "VT2 - Thời gian": row.viTri2.time,
        "VT2 - Delta": row.viTri2.delta,
        "VT3 - Vị trí": row.viTri3.vitri,
        "VT3 - Công đoạn": row.viTri3.congDoan,
        "VT3 - Thời gian": row.viTri3.time,
        "VT3 - Delta": row.viTri3.delta,
        "VT4 - Vị trí": row.viTri4.vitri,
        "VT4 - Công đoạn": row.viTri4.congDoan,
        "VT4 - Thời gian": row.viTri4.time,
        "VT4 - Delta": row.viTri4.delta,
        "VT5 - Vị trí": row.viTri5.vitri,
        "VT5 - Công đoạn": row.viTri5.congDoan,
        "VT5 - Thời gian": row.viTri5.time,
        "VT5 - Delta": row.viTri5.delta,
        "VT6 - Vị trí": row.viTri6.vitri,
        "VT6 - Công đoạn": row.viTri6.congDoan,
        "VT6 - Thời gian": row.viTri6.time,
        "VT6 - Delta": row.viTri6.delta,
        "VT7 - Vị trí": row.viTri7.vitri,
        "VT7 - Công đoạn": row.viTri7.congDoan,
        "VT7 - Thời gian": row.viTri7.time,
        "VT7 - Delta": row.viTri7.delta,
        "VT8 - Vị trí": row.viTri8.vitri,
        "VT8 - Công đoạn": row.viTri8.congDoan,
        "VT8 - Thời gian": row.viTri8.time,
        "VT8 - Delta": row.viTri8.delta,
        "VT9 - Vị trí": row.viTri9.vitri,
        "VT9 - Công đoạn": row.viTri9.congDoan,
        "VT9 - Thời gian": row.viTri9.time,
        "VT9 - Delta": row.viTri9.delta,
        "VT10 - Vị trí": row.viTri10.vitri,
        "VT10 - Công đoạn": row.viTri10.congDoan,
        "VT10 - Thời gian": row.viTri10.time,
        "VT10 - Delta": row.viTri10.delta,
        "VT11 - Vị trí": row.viTri11.vitri,
        "VT11 - Công đoạn": row.viTri11.congDoan,
        "VT11 - Thời gian": row.viTri11.time,
        "VT11 - Delta": row.viTri11.delta,
        "Tổng thời gian": row.tongThoiGian,
      }));

      const sheet = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(workbook, sheet, "TheoThungGang");
      XLSX.writeFile(
        workbook,
        `bao-cao-thung-gang_${fromLabel}_${toLabel}.xlsx`,
      );
      return;
    }

    window.alert("Báo cáo theo vị trí chưa hỗ trợ xuất Excel.");
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Báo cáo thống kê</h1>
          <p className="text-gray-500 mt-1">
            Tổng quan và phân tích dữ liệu sản xuất
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {dateRange?.from && dateRange?.to ? (
                  <>
                    {format(dateRange.from, "dd/MM/yyyy", { locale: vi })} -{" "}
                    {format(dateRange.to, "dd/MM/yyyy", { locale: vi })}
                  </>
                ) : (
                  "Chọn khoảng thời gian"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={vi}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={handleExportReport} className="gap-2">
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <Button
          variant={reportType === "overview" ? "default" : "ghost"}
          onClick={() => setReportType("overview")}
          className={`gap-2 ${
            reportType === "overview" ? "" : "text-gray-700 hover:text-gray-900"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Tổng quan
        </Button>
        <Button
          variant={reportType === "thunggang" ? "default" : "ghost"}
          onClick={() => setReportType("thunggang")}
          className={`gap-2 ${
            reportType === "thunggang"
              ? ""
              : "text-gray-700 hover:text-gray-900"
          }`}
        >
          <Package className="w-4 h-4" />
          Báo cáo theo thùng gang
        </Button>
        <Button
          variant={reportType === "vitri" ? "default" : "ghost"}
          onClick={() => setReportType("vitri")}
          className={`gap-2 ${
            reportType === "vitri" ? "" : "text-gray-700 hover:text-gray-900"
          }`}
        >
          <MapPin className="w-4 h-4" />
          Báo cáo theo vị trí
        </Button>
      </div>

      {/* Conditional Rendering based on Report Type */}
      {reportType === "overview" && renderOverviewReport()}
      {reportType === "thunggang" && renderThungGangReport()}
      {reportType === "vitri" && renderViTriReport()}

      {/* Dialog for Flow Visualization */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Sơ đồ vận hành thùng gang - {selectedRow?.soThung}
            </DialogTitle>
          </DialogHeader>
          {dialogOpen && selectedRow && renderFlowVisualization(selectedRow)}
        </DialogContent>
      </Dialog>
    </div>
  );

  // Render Flow Visualization for selected bucket
  function renderFlowVisualization(row: any) {
    // Extract all positions with data
    const allPositions = [
      { label: "Vị trí 1", ...row.viTri1 },
      { label: "Vị trí 2", ...row.viTri2 },
      { label: "Vị trí 3", ...row.viTri3 },
      { label: "Vị trí 4", ...row.viTri4 },
      { label: "Vị trí 5", ...row.viTri5 },
      { label: "Vị trí 6", ...row.viTri6 },
      { label: "Vị trí 7", ...row.viTri7 },
      { label: "Vị trí 8", ...row.viTri8 },
      { label: "Vị trí 9", ...row.viTri9 },
      { label: "Vị trí 10", ...row.viTri10 },
      { label: "Vị trí 11", ...row.viTri11 },
    ].filter((pos) => pos.vitri || pos.time || pos.congDoan);

    // Group positions by location (vitri)
    const groupedByLocation: Record<
      string,
      Array<{ label: string; congDoan: string; time: string }>
    > = {};
    allPositions.forEach((pos) => {
      const location = pos.vitri || "Khác";
      if (!groupedByLocation[location]) {
        groupedByLocation[location] = [];
      }
      groupedByLocation[location].push({
        label: pos.label,
        congDoan: pos.congDoan,
        time: pos.time,
      });
    });

    // Convert to array for rendering
    const locationNodes = Object.entries(groupedByLocation).map(
      ([location, activities]) => ({
        location,
        activities,
      }),
    );

    // Calculate horizontal layout based on number of nodes
    const nodeCount = locationNodes.length;
    const containerWidth = 1000;
    const containerHeight = 600;

    // Determine rows layout
    let nodesPerRow = Math.min(nodeCount, 4); // Max 4 nodes per row
    let rows = Math.ceil(nodeCount / nodesPerRow);

    // If only 1-3 nodes, put them in one row
    if (nodeCount <= 3) {
      nodesPerRow = nodeCount;
      rows = 1;
    }

    const horizontalSpacing = containerWidth / (nodesPerRow + 1);
    const verticalSpacing =
      rows > 1 ? containerHeight / (rows + 1) : containerHeight / 2;

    const getNodePosition = (idx: number) => {
      const row = Math.floor(idx / nodesPerRow);
      const col = idx % nodesPerRow;

      // Calculate x position with centering for incomplete last row
      const nodesInThisRow = Math.min(
        nodesPerRow,
        nodeCount - row * nodesPerRow,
      );
      const rowStartX =
        (containerWidth - (nodesInThisRow - 1) * horizontalSpacing) / 2;

      return {
        x: rowStartX + col * horizontalSpacing,
        y: verticalSpacing * (row + 1),
      };
    };

    return (
      <div className="space-y-6 p-4">
        {/* Summary Info */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50">
            <CardContent className="pt-4">
              <div className="text-sm text-gray-600">Ngày sản xuất</div>
              <div className="text-lg font-bold text-gray-900">
                {row.ngayLo}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="pt-4">
              <div className="text-sm text-gray-600">ID Gang</div>
              <div className="text-lg font-bold text-gray-900">{row.id}</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50">
            <CardContent className="pt-4">
              <div className="text-sm text-gray-600">Số thùng</div>
              <div className="text-lg font-bold text-gray-900">
                {row.soThung}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50">
            <CardContent className="pt-4">
              <div className="text-sm text-gray-600">Tổng thời gian</div>
              <div className="text-lg font-bold text-gray-900">
                {row.tongThoiGian}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flow Timeline */}
        <div className="relative">
          <div className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Biểu đồ chu trình vận chuyển theo vị trí
          </div>

          {/* Cycle Diagram Container */}
          <div
            className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8"
            style={{ minHeight: rows > 1 ? "700px" : "400px" }}
          >
            <svg
              width="100%"
              height={rows > 1 ? "700" : "400"}
              viewBox={`0 0 ${containerWidth} ${containerHeight}`}
              className="overflow-visible"
            >
              {/* Arrow marker definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                </marker>
              </defs>

              {/* Draw connecting arrows between nodes */}
              {locationNodes.map((node, index) => {
                if (index === locationNodes.length - 1) return null;

                const pos1 = getNodePosition(index);
                const pos2 = getNodePosition(index + 1);

                const dx = pos2.x - pos1.x;
                const dy = pos2.y - pos1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Offset distance from node center (card width is ~130px, so offset by ~140px)
                const offsetDistance = 140;
                const offsetX = (dx / distance) * offsetDistance;
                const offsetY = (dy / distance) * offsetDistance;

                return (
                  <line
                    key={`arrow-${index}`}
                    x1={pos1.x + offsetX}
                    y1={pos1.y + offsetY}
                    x2={pos2.x - offsetX}
                    y2={pos2.y - offsetY}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
            </svg>

            {/* Position nodes as cards */}
            {locationNodes.map((node, index) => {
              const nodePos = getNodePosition(index);

              return (
                <div
                  key={index}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${nodePos.x}px`,
                    top: `${nodePos.y}px`,
                    zIndex: 10,
                  }}
                >
                  <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow border-2 border-blue-400 w-64">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Location header */}
                        <div className="flex items-center justify-between border-b pb-2">
                          <Badge className="bg-blue-500 text-white text-sm">
                            📍 {node.location}
                          </Badge>
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {index + 1}
                          </div>
                        </div>

                        {/* Activities list */}
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {node.activities.map((activity, actIdx) => (
                            <div
                              key={actIdx}
                              className="bg-gray-50 rounded p-2 border border-gray-200"
                            >
                              {/* Process name */}
                              <div className="text-xs font-semibold text-gray-700 mb-1">
                                {activity.congDoan}
                              </div>

                              {/* Time */}
                              {activity.time && (
                                <div className="flex items-center gap-1 bg-yellow-100 rounded px-2 py-1">
                                  <Clock className="w-3 h-3 text-orange-500" />
                                  <span className="text-xs font-bold text-orange-600">
                                    {activity.time}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Total activities count */}
                        <div className="text-xs text-center text-gray-500 bg-gray-100 rounded px-2 py-1 mt-2">
                          {node.activities.length} công đoạn
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Helper function to calculate time difference
  function calculateTimeDiff(time1: string, time2: string): string {
    try {
      const [h1, m1] = time1.split(":").map(Number);
      const [h2, m2] = time2.split(":").map(Number);
      const diff = h2 * 60 + m2 - (h1 * 60 + m1);

      if (diff < 0) return "";

      const hours = Math.floor(diff / 60);
      const minutes = diff % 60;

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    } catch {
      return "";
    }
  }

  // Render Overview Report
  function renderOverviewReport() {
    return (
      <>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tổng số thùng gang
              </CardTitle>
              <Package className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {summaryStats.totalBuckets.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">
                  Trong khoảng thời gian đã chọn
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Số lò cao hoạt động
              </CardTitle>
              <Target className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {summaryStats.activeFurnaces}
              </div>
              <div className="flex items-center gap-1 mt-2">
                <BarChart3 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">
                  Lò cao đang vận hành
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tổng sản lượng gang
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {summaryStats.totalProduction.toLocaleString()} tấn
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Package className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-600">Sản lượng lũy kế</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Thời gian vận chuyển TB
              </CardTitle>
              <Clock className="w-5 h-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {summaryStats.avgTransportTime}
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-600">
                  Thời gian trung bình (giờ:phút)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Phân tích theo khu vực và lò cao */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Phân tích theo khu vực */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <MapPin className="w-5 h-5 text-blue-500" />
                Phân bố theo khu vực (DQ1/DQ2)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {areaAnalysis.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={areaAnalysis}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) =>
                        `${name}: ${value} (${((percent || 0) * 100).toFixed(1)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {areaAnalysis.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Không có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phân tích thời gian vận chuyển */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Clock className="w-5 h-5 text-orange-500" />
                Phân bố thời gian vận chuyển
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transportTimeAnalysis.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={transportTimeAnalysis}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) =>
                        `${name}: ${value} (${((percent || 0) * 100).toFixed(1)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {transportTimeAnalysis.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Không có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Phân tích theo lò cao */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Target className="w-5 h-5 text-green-500" />
              Thống kê theo lò cao
            </CardTitle>
          </CardHeader>
          <CardContent>
            {furnaceAnalysis.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={furnaceAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="soLuong"
                    fill="#3b82f6"
                    name="Số lượt ra gang"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="sanLuong"
                    fill="#8b5cf6"
                    name="Sản lượng (tấn)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Không có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bảng tổng hợp chi tiết */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Activity className="w-5 h-5 text-gray-700" />
              Bảng tổng hợp chi tiết
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-900">Chỉ tiêu</TableHead>
                  <TableHead className="text-right text-gray-900">
                    Giá trị
                  </TableHead>
                  <TableHead className="text-center text-gray-900">
                    Đánh giá
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-gray-900">
                    Tổng số lượt ra gang
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {summaryStats.totalBuckets.toLocaleString()} lượt
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-blue-500 text-white hover:bg-blue-600">
                      Hoạt động
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-gray-900">
                    Số lò cao hoạt động
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {summaryStats.activeFurnaces} lò
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-green-500 text-white hover:bg-green-600">
                      Bình thường
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-gray-900">
                    Tổng sản lượng gang
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {summaryStats.totalProduction.toLocaleString()} tấn
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-purple-500 text-white hover:bg-purple-600">
                      Đạt kế hoạch
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-gray-900">
                    Thời gian vận chuyển TB
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {summaryStats.avgTransportTime}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={
                        summaryStats.avgTransportTime.split(":")[0] &&
                        parseInt(summaryStats.avgTransportTime.split(":")[0]) <
                          2
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-yellow-500 text-white hover:bg-yellow-600"
                      }
                    >
                      {summaryStats.avgTransportTime.split(":")[0] &&
                      parseInt(summaryStats.avgTransportTime.split(":")[0]) < 2
                        ? "Tốt"
                        : "Trung bình"}
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-gray-900">
                    Khu vực DQ1
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {areaAnalysis.find((a) => a.name === "DQ1")?.value || 0}{" "}
                    lượt
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-blue-500 text-white hover:bg-blue-600">
                      {areaAnalysis.length > 0
                        ? (
                            ((areaAnalysis.find((a) => a.name === "DQ1")
                              ?.value || 0) /
                              summaryStats.totalBuckets) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-gray-900">
                    Khu vực DQ2
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {areaAnalysis.find((a) => a.name === "DQ2")?.value || 0}{" "}
                    lượt
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-purple-500 text-white hover:bg-purple-600">
                      {areaAnalysis.length > 0
                        ? (
                            ((areaAnalysis.find((a) => a.name === "DQ2")
                              ?.value || 0) /
                              summaryStats.totalBuckets) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </>
    );
  }

  // Render Báo cáo theo thùng gang
  function renderThungGangReport() {
    // Convert API data to report format
    const reportData = thungGangData.map(convertThungGangDataToReport);

    // Pagination logic
    const totalItems = reportData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = reportData.slice(startIndex, endIndex);

    return (
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Package className="w-5 h-5 text-blue-500" />
            Báo cáo thời gian vận chuyển theo thùng gang
          </CardTitle>

          {/* Filter Controls */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Số thùng
              </label>
              <input
                type="text"
                placeholder="Nhập số thùng..."
                value={filterSoThung}
                onChange={(e) => setFilterSoThung(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-400 rounded-md text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Lò cao
              </label>
              <select
                value={filterLoCao}
                onChange={(e) => setFilterLoCao(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-400 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="1">Lò cao 1</option>
                <option value="2">Lò cao 2</option>
                <option value="3">Lò cao 3</option>
                <option value="4">Lò cao 4</option>
                <option value="5">Lò cao 5</option>
                <option value="6">Lò cao 6</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Khu vực
              </label>
              <select
                value={filterKhuVuc}
                onChange={(e) => setFilterKhuVuc(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-400 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="1">DQ1</option>
                <option value="2">DQ2</option>
              </select>
            </div>
          </div>

          {/* Clear filters button */}
          {(filterSoThung || filterLoCao || filterKhuVuc) && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterSoThung("");
                  setFilterLoCao("");
                  setFilterKhuVuc("");
                }}
                className="text-xs"
              >
                Xóa bộ lọc
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8 text-gray-600">
              Đang tải dữ liệu...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">{error}</div>
          )}

          {!loading && !error && reportData.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              Không có dữ liệu trong khoảng thời gian đã chọn
            </div>
          )}

          {!loading && !error && reportData.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead
                      className="border font-semibold text-center text-gray-900"
                      rowSpan={2}
                    >
                      STT
                    </TableHead>
                    <TableHead
                      className="border font-semibold text-center text-gray-900"
                      rowSpan={2}
                    >
                      Ngày LG
                    </TableHead>
                    <TableHead
                      className="border font-semibold text-center text-gray-900"
                      rowSpan={2}
                    >
                      ID
                    </TableHead>
                    <TableHead
                      className="border font-semibold text-center text-gray-900"
                      rowSpan={2}
                    >
                      Số thùng
                    </TableHead>
                    <TableHead className="border font-semibold text-center text-gray-900"></TableHead>
                    <TableHead className="border font-semibold text-center text-gray-900">
                      Vị trí 1
                    </TableHead>
                    <TableHead className="border font-semibold text-center text-gray-900">
                      Vị trí 2
                    </TableHead>
                    <TableHead className="border font-semibold text-center text-gray-900">
                      Vị trí 3
                    </TableHead>
                    <TableHead className="border font-semibold text-center text-gray-900">
                      Vị trí 4
                    </TableHead>
                    <TableHead className="border font-semibold text-center text-gray-900">
                      Vị trí 5
                    </TableHead>
                    <TableHead className="border font-semibold text-center text-gray-900">
                      Vị trí 6
                    </TableHead>
                    <TableHead className="border font-semibold text-center text-gray-900">
                      Vị trí 7
                    </TableHead>
                    <TableHead className="border font-semibold text-center text-gray-900">
                      Vị trí 8
                    </TableHead>
                    <TableHead className="border font-semibold text-center text-gray-900">
                      Vị trí 9
                    </TableHead>
                    <TableHead className="border font-semibold text-center text-gray-900">
                      Vị trí 10
                    </TableHead>
                    <TableHead className="border font-semibold text-center text-gray-900">
                      Vị trí 11
                    </TableHead>
                    <TableHead
                      className="border font-semibold text-center text-gray-900"
                      rowSpan={2}
                    >
                      Tổng thời gian
                    </TableHead>
                    <TableHead
                      className="border font-semibold text-center text-gray-900"
                      rowSpan={2}
                    >
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row, index) => (
                    <React.Fragment key={index}>
                      <TableRow>
                        <TableCell
                          className="border text-center text-gray-900"
                          rowSpan={4}
                        >
                          {startIndex + index + 1}
                        </TableCell>
                        <TableCell
                          className="border text-center text-gray-900"
                          rowSpan={4}
                        >
                          {row.ngayLo}
                        </TableCell>
                        <TableCell
                          className="border text-center text-gray-900"
                          rowSpan={4}
                        >
                          {row.id}
                        </TableCell>
                        <TableCell
                          className="border text-center text-gray-900"
                          rowSpan={4}
                        >
                          {row.soThung}
                        </TableCell>
                        <TableCell className="border text-center font-medium text-gray-900">
                          Vị trí
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri1.vitri}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri2.vitri}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri3.vitri}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri4.vitri}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri5.vitri}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri6.vitri}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri7.vitri}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri8.vitri}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri9.vitri}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri10.vitri}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri11.vitri}
                        </TableCell>
                        <TableCell
                          className="border text-center font-semibold"
                          rowSpan={4}
                        >
                          <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
                            {row.tongThoiGian}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="border text-center font-semibold"
                          rowSpan={4}
                        >
                          <Button
                            className="bg-blue-500 text-white hover:bg-blue-600"
                            onClick={() => {
                              setSelectedRow(row);
                              setDialogOpen(true);
                            }}
                          >
                            Xem chi tiết
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="border text-center font-medium text-gray-900">
                          Công đoạn
                        </TableCell>

                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri1.congDoan}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri2.congDoan}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri3.congDoan}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri4.congDoan}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri5.congDoan}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri6.congDoan}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri7.congDoan}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri8.congDoan}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri9.congDoan}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri10.congDoan}
                        </TableCell>
                        <TableCell className="border text-center text-gray-900 text-xs">
                          {row.viTri11.congDoan}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="border text-center font-medium text-gray-900">
                          Thời gian
                        </TableCell>
                        <TableCell className="border text-center bg-yellow-100 text-gray-900">
                          {row.viTri1.time}
                        </TableCell>
                        <TableCell className="border text-center bg-yellow-100 text-gray-900">
                          {row.viTri2.time}
                        </TableCell>
                        <TableCell className="border text-center bg-yellow-100 text-gray-900">
                          {row.viTri3.time}
                        </TableCell>
                        <TableCell className="border text-center bg-yellow-100 text-gray-900">
                          {row.viTri4.time}
                        </TableCell>
                        <TableCell className="border text-center bg-yellow-100 text-gray-900">
                          {row.viTri5.time}
                        </TableCell>
                        <TableCell className="border text-center bg-yellow-100 text-gray-900">
                          {row.viTri6.time}
                        </TableCell>
                        <TableCell className="border text-center bg-yellow-100 text-gray-900">
                          {row.viTri7.time}
                        </TableCell>
                        <TableCell className="border text-center bg-yellow-100 text-gray-900">
                          {row.viTri8.time}
                        </TableCell>
                        <TableCell className="border text-center bg-yellow-100 text-gray-900">
                          {row.viTri9.time}
                        </TableCell>
                        <TableCell className="border text-center bg-yellow-100 text-gray-900">
                          {row.viTri10.time}
                        </TableCell>
                        <TableCell className="border text-center bg-yellow-100 text-gray-900">
                          {row.viTri11.time}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="border text-center font-medium text-blue-700 bg-blue-50">
                          Delta
                        </TableCell>
                        <TableCell className="border text-center bg-blue-50 text-gray-900 text-xs font-semibold">
                          {row.viTri1.delta || "-"}
                        </TableCell>
                        <TableCell className="border text-center bg-blue-50 text-gray-900 text-xs font-semibold">
                          {row.viTri2.delta || "-"}
                        </TableCell>
                        <TableCell className="border text-center bg-blue-50 text-gray-900 text-xs font-semibold">
                          {row.viTri3.delta || "-"}
                        </TableCell>
                        <TableCell className="border text-center bg-blue-50 text-gray-900 text-xs font-semibold">
                          {row.viTri4.delta || "-"}
                        </TableCell>
                        <TableCell className="border text-center bg-blue-50 text-gray-900 text-xs font-semibold">
                          {row.viTri5.delta || "-"}
                        </TableCell>
                        <TableCell className="border text-center bg-blue-50 text-gray-900 text-xs font-semibold">
                          {row.viTri6.delta || "-"}
                        </TableCell>
                        <TableCell className="border text-center bg-blue-50 text-gray-900 text-xs font-semibold">
                          {row.viTri7.delta || "-"}
                        </TableCell>
                        <TableCell className="border text-center bg-blue-50 text-gray-900 text-xs font-semibold">
                          {row.viTri8.delta || "-"}
                        </TableCell>
                        <TableCell className="border text-center bg-blue-50 text-gray-900 text-xs font-semibold">
                          {row.viTri9.delta || "-"}
                        </TableCell>
                        <TableCell className="border text-center bg-blue-50 text-gray-900 text-xs font-semibold">
                          {row.viTri10.delta || "-"}
                        </TableCell>
                        <TableCell className="border text-center bg-blue-50 text-gray-900 text-xs font-semibold">
                          {row.viTri11.delta || "-"}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Hiển thị {startIndex + 1} - {Math.min(endIndex, totalItems)}{" "}
                    trong tổng số {totalItems} bản ghi
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Trước
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          // Show first, last, current, and adjacent pages
                          return (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          );
                        })
                        .map((page, idx, arr) => (
                          <React.Fragment key={page}>
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <Button
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-9 h-9 p-0"
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="gap-1"
                    >
                      Sau
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render Báo cáo theo vị trí
  function renderViTriReport() {
    return (
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <MapPin className="w-5 h-5 text-green-500" />
            Báo cáo thời gian vận chuyển thùng gang theo vị trí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Chức năng đang phát triển
            </h3>
            <p className="text-gray-500">
              Báo cáo theo vị trí sẽ được cập nhật trong phiên bản tiếp theo
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
};

export default BaoCaoThongKe;
