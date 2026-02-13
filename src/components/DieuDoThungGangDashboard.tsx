import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import {
  AlertCircle,
  TrendingUp,
  Clock,
  Package,
  ArrowLeft,
} from "lucide-react";
import { type ThungGangData } from "@/services/ganttService";

// Temporary function until the service is properly implemented
const getThungGangDashboardData = async (
  fromDate?: string,
  toDate?: string,
): Promise<ThungGangData[]> => {
  // This will be replaced when the actual service function is available
  return [];
};

type KPI = {
  title: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  trend?: number;
  color: string;
};

type BottleneckData = {
  stage: string;
  avgTime: number;
  threshold: number;
  isAlert: boolean;
};

type GanttItem = {
  bucket: string;
  start: Date;
  end: Date;
  stages: {
    name: string;
    start: Date;
    end: Date;
    duration: number;
  }[];
};

export default function DieuDoThungGangDashboard({
  onBack,
}: {
  onBack?: () => void;
}) {
  const [data, setData] = useState<ThungGangData[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Load data từ API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const fromDate = dateRange?.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : undefined;
        const toDate = dateRange?.to
          ? format(dateRange.to, "yyyy-MM-dd")
          : undefined;

        const result = await getThungGangDashboardData(fromDate, toDate);

        // Mock data để test - xóa khi có API thật
        if (!result || result.length === 0) {
          console.log("📊 Using mock data for dashboard");
          const mockData: ThungGangData[] = [
            {
              ID: 1,
              SoThung: "21",
              NgayTao: "2026-01-29T13:36:04.963",
              NgaySX: "2026-01-29T00:00:00",
              CaSX: 1,
              G_BatDauRot: "2026-01-29T08:00:00",
              G_RotDayThung: "2026-01-29T08:45:00",
              GioBatDau: "2026-01-29T08:00:00",
              GioDucGang: "2026-01-29T08:15:00",
              GioVaoLT: "2026-01-29T08:30:00",
              GioVaoKR: "2026-01-29T08:45:00",
              GioRaKR: "2026-01-29T09:30:00",
              T_BatDauRot: "2026-01-29T09:35:00",
              GioRotXong: "2026-01-29T10:00:00",
              GioRaLT: "2026-01-29T10:15:00",
              DiemDau: "Lò Cao 1",
              DiemTrungGian: null,
              GioTrungGian: null,
              DiemDen: "HRC1",
              KL_XeGong: 28.78,
              TinhTrang: 0,
              ThuTu: 2,
              Me: "GBF261A0265921",
              Mac: null,
              KhoiLuong: 0,
              NhietDoThung: 0,
              G_TongTGRot: null,
              ID_LoCao: 1,
              isNM: 1,
              ID_GiaoNhan: 37729,
              C: 4.417,
              Si: 0.289,
              Mn: 0.214,
              S: 0.033,
              P: 0.096,
              Ti: 0.019,
              Temp: 0,
              QuayThung: "135",
            },
            {
              ID: 2,
              SoThung: "06",
              NgayTao: "2026-01-29T14:00:00",
              NgaySX: "2026-01-29T00:00:00",
              CaSX: 1,
              G_BatDauRot: "2026-01-29T09:00:00",
              G_RotDayThung: "2026-01-29T09:50:00",
              GioBatDau: "2026-01-29T09:00:00",
              GioDucGang: "2026-01-29T09:18:00",
              GioVaoLT: "2026-01-29T09:35:00",
              GioVaoKR: "2026-01-29T09:50:00",
              GioRaKR: "2026-01-29T10:45:00",
              T_BatDauRot: "2026-01-29T10:50:00",
              GioRotXong: "2026-01-29T11:20:00",
              GioRaLT: "2026-01-29T11:40:00",
              DiemDau: "Lò Cao 2",
              DiemTrungGian: null,
              GioTrungGian: null,
              DiemDen: "HRC2",
              KL_XeGong: 32.5,
              TinhTrang: 0,
              ThuTu: 1,
              Me: "GBF261A0265922",
              Mac: null,
              KhoiLuong: 0,
              NhietDoThung: 0,
              G_TongTGRot: null,
              ID_LoCao: 2,
              isNM: 1,
              ID_GiaoNhan: 37730,
              C: 4.5,
              Si: 0.3,
              Mn: 0.22,
              S: 0.03,
              P: 0.09,
              Ti: 0.02,
              Temp: 0,
              QuayThung: "160",
            },
            {
              ID: 3,
              SoThung: "16",
              NgayTao: "2026-01-29T15:00:00",
              NgaySX: "2026-01-29T00:00:00",
              CaSX: 1,
              G_BatDauRot: "2026-01-29T10:30:00",
              G_RotDayThung: "2026-01-29T11:15:00",
              GioBatDau: "2026-01-29T10:30:00",
              GioDucGang: "2026-01-29T10:45:00",
              GioVaoLT: "2026-01-29T11:00:00",
              GioVaoKR: "2026-01-29T11:20:00",
              GioRaKR: "2026-01-29T12:25:00",
              T_BatDauRot: "2026-01-29T12:30:00",
              GioRotXong: "2026-01-29T13:05:00",
              GioRaLT: "2026-01-29T13:25:00",
              DiemDau: "Lò Cao 1",
              DiemTrungGian: null,
              GioTrungGian: null,
              DiemDen: "HRC1",
              KL_XeGong: 30.2,
              TinhTrang: 0,
              ThuTu: 3,
              Me: "GBF261A0265923",
              Mac: null,
              KhoiLuong: 0,
              NhietDoThung: 0,
              G_TongTGRot: null,
              ID_LoCao: 1,
              isNM: 1,
              ID_GiaoNhan: 37731,
              C: 4.38,
              Si: 0.28,
              Mn: 0.21,
              S: 0.032,
              P: 0.095,
              Ti: 0.018,
              Temp: 0,
              QuayThung: "145",
            },
            {
              ID: 4,
              SoThung: "11",
              NgayTao: "2026-01-29T16:00:00",
              NgaySX: "2026-01-29T00:00:00",
              CaSX: 2,
              G_BatDauRot: "2026-01-29T12:00:00",
              G_RotDayThung: "2026-01-29T12:40:00",
              GioBatDau: "2026-01-29T12:00:00",
              GioDucGang: "2026-01-29T12:12:00",
              GioVaoLT: "2026-01-29T12:28:00",
              GioVaoKR: "2026-01-29T12:45:00",
              GioRaKR: "2026-01-29T13:20:00",
              T_BatDauRot: "2026-01-29T13:25:00",
              GioRotXong: "2026-01-29T13:55:00",
              GioRaLT: "2026-01-29T14:10:00",
              DiemDau: "Lò Cao 2",
              DiemTrungGian: null,
              GioTrungGian: null,
              DiemDen: "HRC2",
              KL_XeGong: 29.5,
              TinhTrang: 0,
              ThuTu: 4,
              Me: "GBF261A0265924",
              Mac: null,
              KhoiLuong: 0,
              NhietDoThung: 0,
              G_TongTGRot: null,
              ID_LoCao: 2,
              isNM: 1,
              ID_GiaoNhan: 37732,
              C: 4.42,
              Si: 0.29,
              Mn: 0.215,
              S: 0.031,
              P: 0.097,
              Ti: 0.019,
              Temp: 0,
              QuayThung: "130",
            },
            {
              ID: 5,
              SoThung: "08",
              NgayTao: "2026-01-29T16:30:00",
              NgaySX: "2026-01-29T00:00:00",
              CaSX: 2,
              G_BatDauRot: "2026-01-29T13:30:00",
              G_RotDayThung: "2026-01-29T14:20:00",
              GioBatDau: "2026-01-29T13:30:00",
              GioDucGang: "2026-01-29T13:50:00",
              GioVaoLT: "2026-01-29T14:10:00",
              GioVaoKR: "2026-01-29T14:30:00",
              GioRaKR: "2026-01-29T15:40:00",
              T_BatDauRot: "2026-01-29T15:45:00",
              GioRotXong: "2026-01-29T16:25:00",
              GioRaLT: "2026-01-29T16:50:00",
              DiemDau: "Lò Cao 1",
              DiemTrungGian: null,
              GioTrungGian: null,
              DiemDen: "HRC1",
              KL_XeGong: 31.8,
              TinhTrang: 0,
              ThuTu: 5,
              Me: "GBF261A0265925",
              Mac: null,
              KhoiLuong: 0,
              NhietDoThung: 0,
              G_TongTGRot: null,
              ID_LoCao: 1,
              isNM: 1,
              ID_GiaoNhan: 37733,
              C: 4.45,
              Si: 0.31,
              Mn: 0.22,
              S: 0.034,
              P: 0.098,
              Ti: 0.021,
              Temp: 0,
              QuayThung: "200",
            },
          ];
          setData(mockData);
        } else {
          setData(result);
        }
      } catch (error) {
        console.error("Error loading thung gang data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dateRange]);

  // Tính toán KPIs
  const kpis = useMemo<KPI[]>(() => {
    console.log("🔍 Data length:", data.length);
    if (data.length === 0) {
      console.log("⚠️ No data available for KPIs");
      return [];
    }

    // 1. Thời gian trung bình một chu trình
    const cycleTimesInMinutes = data
      .filter((item) => item.GioBatDau && item.GioRaLT)
      .map((item) => {
        const start = parseISO(item.GioBatDau!);
        const end = parseISO(item.GioRaLT!);
        return differenceInMinutes(end, start);
      });

    const avgCycleTime =
      cycleTimesInMinutes.length > 0
        ? cycleTimesInMinutes.reduce((a, b) => a + b, 0) /
          cycleTimesInMinutes.length
        : 0;

    // 2. Tỷ lệ phản hồi vỏ thùng chậm (giả sử > 150 phút là chậm)
    const slowBuckets = cycleTimesInMinutes.filter((t) => t > 150).length;
    const slowRate =
      cycleTimesInMinutes.length > 0
        ? (slowBuckets / cycleTimesInMinutes.length) * 100
        : 0;

    // 3. Số lượng thùng đang ở HRC vs LG
    const bucketsAtHRC = data.filter(
      (item) => item.DiemDen?.includes("HRC") && !item.GioRaLT,
    ).length;
    const bucketsAtLG = data.filter(
      (item) => item.DiemDau?.includes("Lò Cao") && item.GioRaLT,
    ).length;

    return [
      {
        title: "Thời gian chu trình TB",
        value: Math.round(avgCycleTime).toString(),
        unit: "phút",
        icon: <Clock className="w-5 h-5" />,
        trend: -5,
        color: "text-blue-600",
      },
      {
        title: "Tỷ lệ trả vỏ chậm",
        value: slowRate.toFixed(1),
        unit: "%",
        icon: <AlertCircle className="w-5 h-5" />,
        trend: slowRate > 20 ? 10 : -3,
        color: slowRate > 20 ? "text-red-600" : "text-green-600",
      },
      {
        title: "Thùng tại HRC",
        value: bucketsAtHRC.toString(),
        unit: "thùng",
        icon: <Package className="w-5 h-5" />,
        color: "text-orange-600",
      },
      {
        title: "Thùng tại LG",
        value: bucketsAtLG.toString(),
        unit: "thùng",
        icon: <TrendingUp className="w-5 h-5" />,
        color: "text-purple-600",
      },
    ];
  }, [data]);

  // Tính toán Bottleneck Analysis (Delta t cho các công đoạn)
  const bottleneckData = useMemo<BottleneckData[]>(() => {
    if (data.length === 0) return [];

    const stages = [
      {
        name: "Ra gang → Đúc gang (T2-T1)",
        getT1: (item: ThungGangData) => item.GioBatDau,
        getT2: (item: ThungGangData) => item.GioDucGang,
        threshold: 20,
      },
      {
        name: "Đúc gang → Vào LT (T3-T2)",
        getT1: (item: ThungGangData) => item.GioDucGang,
        getT2: (item: ThungGangData) => item.GioVaoLT,
        threshold: 20,
      },
      {
        name: "Vào LT → Vào KR (T4-T3)",
        getT1: (item: ThungGangData) => item.GioVaoLT,
        getT2: (item: ThungGangData) => item.GioVaoKR,
        threshold: 20,
      },
      {
        name: "Vào KR → Ra KR (T5-T4)",
        getT1: (item: ThungGangData) => item.GioVaoKR,
        getT2: (item: ThungGangData) => item.GioRaKR,
        threshold: 50,
      },
      {
        name: "Ra KR → Bắt đầu rót (T6-T5)",
        getT1: (item: ThungGangData) => item.GioRaKR,
        getT2: (item: ThungGangData) => item.T_BatDauRot,
        threshold: 10,
      },
      {
        name: "Bắt đầu rót → Rót xong (T7-T6)",
        getT1: (item: ThungGangData) => item.T_BatDauRot,
        getT2: (item: ThungGangData) => item.GioRotXong,
        threshold: 30,
      },
      {
        name: "Rót xong → Ra LT",
        getT1: (item: ThungGangData) => item.GioRotXong,
        getT2: (item: ThungGangData) => item.GioRaLT,
        threshold: 20,
      },
    ];

    return stages.map((stage) => {
      const times = data
        .filter((item) => stage.getT1(item) && stage.getT2(item))
        .map((item) => {
          const t1 = parseISO(stage.getT1(item)!);
          const t2 = parseISO(stage.getT2(item)!);
          return differenceInMinutes(t2, t1);
        });

      const avgTime =
        times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

      return {
        stage: stage.name,
        avgTime: Math.round(avgTime),
        threshold: stage.threshold,
        isAlert: avgTime > stage.threshold,
      };
    });
  }, [data]);

  console.log("📊 Bottleneck Data:", bottleneckData);

  // Tính toán Gantt Chart Data
  const ganttData = useMemo<GanttItem[]>(() => {
    return data
      .filter((item) => item.GioBatDau && item.GioRaLT)
      .map((item) => {
        const stages = [];

        if (item.GioBatDau && item.GioDucGang) {
          stages.push({
            name: "Ra gang",
            start: parseISO(item.GioBatDau),
            end: parseISO(item.GioDucGang),
            duration: differenceInMinutes(
              parseISO(item.GioDucGang),
              parseISO(item.GioBatDau),
            ),
          });
        }

        if (item.GioDucGang && item.GioVaoLT) {
          stages.push({
            name: "Di chuyển đến LT",
            start: parseISO(item.GioDucGang),
            end: parseISO(item.GioVaoLT),
            duration: differenceInMinutes(
              parseISO(item.GioVaoLT),
              parseISO(item.GioDucGang),
            ),
          });
        }

        if (item.GioVaoKR && item.GioRaKR) {
          stages.push({
            name: "Tại KR",
            start: parseISO(item.GioVaoKR),
            end: parseISO(item.GioRaKR),
            duration: differenceInMinutes(
              parseISO(item.GioRaKR),
              parseISO(item.GioVaoKR),
            ),
          });
        }

        if (item.T_BatDauRot && item.GioRotXong) {
          stages.push({
            name: "Rót gang",
            start: parseISO(item.T_BatDauRot),
            end: parseISO(item.GioRotXong),
            duration: differenceInMinutes(
              parseISO(item.GioRotXong),
              parseISO(item.T_BatDauRot),
            ),
          });
        }

        if (item.GioRotXong && item.GioRaLT) {
          stages.push({
            name: "Trả vỏ",
            start: parseISO(item.GioRotXong),
            end: parseISO(item.GioRaLT),
            duration: differenceInMinutes(
              parseISO(item.GioRaLT),
              parseISO(item.GioRotXong),
            ),
          });
        }

        return {
          bucket: `Thùng ${item.SoThung}`,
          start: parseISO(item.GioBatDau!),
          end: parseISO(item.GioRaLT!),
          stages,
        };
      });
  }, [data]);

  console.log("📊 Gantt Data:", ganttData);

  // Phân tích điều tiết (Histogram) - khoảng cách thời gian giữa các thùng
  const pacingData = useMemo(() => {
    if (data.length < 2) return [];

    const sortedData = [...data]
      .filter((item) => item.GioVaoKR)
      .sort(
        (a, b) =>
          parseISO(a.GioVaoKR!).getTime() - parseISO(b.GioVaoKR!).getTime(),
      );

    const intervals = [];
    for (let i = 1; i < sortedData.length; i++) {
      const prevTime = parseISO(sortedData[i - 1].GioVaoKR!);
      const currTime = parseISO(sortedData[i].GioVaoKR!);
      const interval = differenceInMinutes(currTime, prevTime);
      intervals.push({
        interval: `${sortedData[i - 1].SoThung}-${sortedData[i].SoThung}`,
        minutes: interval,
      });
    }

    // Tạo histogram bins
    const bins: { range: string; count: number }[] = [
      { range: "0-10 phút", count: 0 },
      { range: "10-20 phút", count: 0 },
      { range: "20-30 phút", count: 0 },
      { range: "30-45 phút", count: 0 },
      { range: "45-60 phút", count: 0 },
      { range: ">60 phút", count: 0 },
    ];

    intervals.forEach((item) => {
      if (item.minutes <= 10) bins[0].count++;
      else if (item.minutes <= 20) bins[1].count++;
      else if (item.minutes <= 30) bins[2].count++;
      else if (item.minutes <= 45) bins[3].count++;
      else if (item.minutes <= 60) bins[4].count++;
      else bins[5].count++;
    });

    return bins;
  }, [data]);

  console.log("📊 Pacing Data:", pacingData);

  // Phân tích thời gian quay đầu
  const turnAroundData = useMemo(() => {
    const bucketsWithTurnaround = data
      .filter((item) => item.QuayThung !== null && item.QuayThung !== undefined)
      .map((item) => ({
        bucket: `Thùng ${item.SoThung}`,
        turnAroundTime: parseFloat(item.QuayThung!) || 0,
        me: item.Me,
      }))
      .sort((a, b) => b.turnAroundTime - a.turnAroundTime)
      .slice(0, 15); // Top 15

    return bucketsWithTurnaround;
  }, [data]);

  console.log("📊 Turn Around Data:", turnAroundData);
  console.log("📊 KPIs:", kpis);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background p-6 items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Đang tải dữ liệu...</div>
          <div className="text-sm text-muted-foreground">Vui lòng đợi</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">Dashboard Điều Độ Thùng Gang</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Phân tích hiệu suất & nghẽn cổ chai
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                {dateRange?.from
                  ? dateRange.to
                    ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(
                        dateRange.to,
                        "dd/MM/yyyy",
                      )}`
                    : format(dateRange.from, "dd/MM/yyyy")
                  : "Chọn khoảng ngày"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Badge variant="outline">
            {data.length} thùng | Cập nhật:{" "}
            {format(new Date(), "HH:mm dd/MM/yyyy")}
          </Badge>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.length > 0 ? (
          kpis.map((kpi, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className={kpi.color}>{kpi.icon}</div>
                  {kpi.trend !== undefined && (
                    <Badge
                      variant={kpi.trend > 0 ? "destructive" : "default"}
                      className="ml-auto"
                    >
                      {kpi.trend > 0 ? "+" : ""}
                      {kpi.trend}%
                    </Badge>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold">
                    {kpi.value}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {kpi.unit}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {kpi.title}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-4 text-center py-8 text-muted-foreground">
            Đang tải dữ liệu...
          </div>
        )}
      </div>

      {/* Biểu đồ Bottleneck */}
      <Card>
        <CardHeader>
          <CardTitle>Phân tích nghẽn cổ chai (Δt các công đoạn)</CardTitle>
        </CardHeader>
        <CardContent>
          {bottleneckData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={bottleneckData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="stage"
                    angle={-15}
                    textAnchor="end"
                    height={120}
                    fontSize={12}
                  />
                  <YAxis label={{ value: "Thời gian (phút)", angle: -90 }} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar
                    dataKey="avgTime"
                    name="Thời gian TB"
                    radius={[8, 8, 0, 0]}
                  >
                    {bottleneckData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isAlert ? "#ef4444" : "#3b82f6"}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="threshold"
                    name="Ngưỡng"
                    fill="#94a3b8"
                    opacity={0.3}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-semibold">Cảnh báo:</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {bottleneckData.filter((d) => d.isAlert).length > 0
                    ? `${
                        bottleneckData.filter((d) => d.isAlert).length
                      } công đoạn vượt ngưỡng: ${bottleneckData
                        .filter((d) => d.isAlert)
                        .map((d) => d.stage)
                        .join(", ")}`
                    : "Tất cả công đoạn đều trong ngưỡng cho phép"}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Không có dữ liệu để hiển thị
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ Gantt */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline thùng gang (Gantt)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {ganttData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="text-sm font-semibold flex items-center justify-between">
                    <span>{item.bucket}</span>
                    <span className="text-xs text-muted-foreground">
                      {differenceInMinutes(item.end, item.start)} phút
                    </span>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded-md overflow-hidden">
                    {item.stages.map((stage, sIndex) => {
                      const totalDuration = differenceInMinutes(
                        item.end,
                        item.start,
                      );
                      const stageStart = differenceInMinutes(
                        stage.start,
                        item.start,
                      );
                      const stageWidth = (stage.duration / totalDuration) * 100;
                      const stageLeft = (stageStart / totalDuration) * 100;

                      const colors = [
                        "#8b5cf6",
                        "#3b82f6",
                        "#f59e0b",
                        "#10b981",
                        "#ef4444",
                      ];

                      return (
                        <div
                          key={sIndex}
                          className="absolute h-full flex items-center justify-center text-xs text-white font-medium"
                          style={{
                            left: `${stageLeft}%`,
                            width: `${stageWidth}%`,
                            backgroundColor: colors[sIndex % colors.length],
                          }}
                          title={`${stage.name}: ${stage.duration} phút`}
                        >
                          {stageWidth > 10 && stage.duration}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Phân tích điều tiết (Pacing) */}
        <Card>
          <CardHeader>
            <CardTitle>Phân tích nhịp điều (Histogram khoảng cách)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={pacingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" fontSize={12} />
                <YAxis label={{ value: "Số lượng", angle: -90 }} />
                <RechartsTooltip />
                <Bar
                  dataKey="count"
                  fill="#8b5cf6"
                  name="Số lượng thùng"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-muted-foreground">
              Biểu đồ thể hiện khoảng cách thời gian giữa các thùng đến HRC để
              đánh giá tính đều đặn
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phân tích thời gian quay đầu */}
      <Card>
        <CardHeader>
          <CardTitle>
            Phân tích thời gian quay đầu thùng (Turnaround Time)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={turnAroundData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                label={{ value: "Phút", position: "bottom" }}
              />
              <YAxis
                dataKey="bucket"
                type="category"
                width={80}
                fontSize={12}
              />
              <RechartsTooltip />
              <Bar
                dataKey="turnAroundTime"
                fill="#06b6d4"
                name="Thời gian quay đầu"
                radius={[0, 8, 8, 0]}
              >
                {turnAroundData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.turnAroundTime > 150 ? "#ef4444" : "#06b6d4"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 text-sm text-muted-foreground">
            Thời gian quay đầu được tính từ lúc thùng hoàn thành một chu trình
            đến khi bắt đầu chu trình tiếp theo
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
