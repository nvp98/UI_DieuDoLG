import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter,
  ZAxis,
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
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  CalendarIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  searchGangNhatTrinh,
  ThungGangData as GangData,
} from "@/services/ganttService";

// Use ThungGangData from ganttService
type ThungGangData = GangData;

const ThungGangAnalysis: React.FC = () => {
  const [data, setData] = useState<ThungGangData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 1)),
    to: new Date(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bucketFilter, setBucketFilter] = useState<string>("");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [selectedBucket, setSelectedBucket] = useState<{
    soThung: string;
    isNM: number;
  } | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Fetch data on mount and when date range changes
  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const fromDate = dateRange?.from
        ? format(dateRange.from, "yyyy-MM-dd")
        : format(
            new Date(new Date().setDate(new Date().getDate() - 1)),
            "yyyy-MM-dd",
          );
      const toDate = dateRange?.to
        ? format(dateRange.to, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");

      // Use searchGangNhatTrinh API instead of old API
      const result = await searchGangNhatTrinh({
        fromDate,
        toDate,
      });
      setData(result);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };
  // Calculate cycle time for each bucket (group by SoThung and isNM to distinguish DQ1/DQ2)
  const cycleTimeAnalysis = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Sort data by GioBatDau first to ensure chronological order
    const sortedData = data
      .filter((item) => item.GioBatDau)
      .sort((a, b) => {
        const dateA = parseISO(a.GioBatDau!);
        const dateB = parseISO(b.GioBatDau!);
        return dateA.getTime() - dateB.getTime();
      });

    // Group data by bucket number AND isNM (to distinguish DQ1 and DQ2)
    const bucketGroups = new Map<string, ThungGangData[]>();
    sortedData.forEach((item) => {
      // Create composite key: SoThung-isNM (e.g., "10-1" for bucket 10 DQ1)
      const bucketKey = `${item.SoThung}-${item.isNM}`;

      if (!bucketGroups.has(bucketKey)) {
        bucketGroups.set(bucketKey, []);
      }
      bucketGroups.get(bucketKey)!.push(item);
    });
    const cycleData: Array<{
      id: number;
      soThung: string;
      ngayTao: string;
      caSX: number;
      cycleTimeMinutes: number;
      pourTimeMinutes: number;
      fullTime: string;
      nextPourStart: string;
      diemDau: string;
      diemDen: string;
      khoiLuong: number;
      isNM: number;
    }> = [];

    // For each bucket, calculate cycle times between consecutive pours
    bucketGroups.forEach((items) => {
      // Items are already sorted by GioBatDau from sortedData (oldest first)

      // Process all items
      for (let i = 0; i < items.length; i++) {
        const current = items[i];

        // Cycle time:
        // - First pour (i=0): 0 (no previous pour)
        // - Subsequent pours: time from previous pour to current pour
        let cycleTimeMinutes = 0;
        if (i > 0) {
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

        // Calculate pouring time for current pour
        // Pour time: from G_BatDauRot (start pouring) to G_RotDayThung (bucket full)
        let pourTimeMinutes = 0;
        if (current.G_BatDauRot && current.G_RotDayThung) {
          const pourStartTime = parseISO(current.G_BatDauRot);
          const pourEndTime = parseISO(current.G_RotDayThung);
          pourTimeMinutes = differenceInMinutes(pourEndTime, pourStartTime);
        }

        cycleData.push({
          id: current.ID,
          soThung: current.SoThung,
          ngayTao: current.NgayTao,
          caSX: current.CaSX,
          cycleTimeMinutes, // Time from previous pour (0 for first pour)
          pourTimeMinutes,
          fullTime: current.GioBatDau!,
          nextPourStart: i < items.length - 1 ? items[i + 1].GioBatDau! : "",
          diemDau: current.DiemDau,
          diemDen: current.DiemDen,
          khoiLuong: current.KhoiLuong,
          isNM: current.isNM,
        });
      }
    });

    // Sort by most recent first
    return cycleData.sort((a, b) => {
      const dateA = parseISO(a.fullTime);
      const dateB = parseISO(b.fullTime);
      return dateB.getTime() - dateA.getTime();
    });
  }, [data]);

  // Most recent cycle time
  const recentCycleTime = useMemo(() => {
    if (cycleTimeAnalysis.length === 0) return null;
    return cycleTimeAnalysis[0];
  }, [cycleTimeAnalysis]);

  // Average cycle time
  const averageCycleTime = useMemo(() => {
    if (cycleTimeAnalysis.length === 0) return 0;
    const total = cycleTimeAnalysis.reduce(
      (sum, item) => sum + item.cycleTimeMinutes,
      0,
    );
    return Math.round(total / cycleTimeAnalysis.length);
  }, [cycleTimeAnalysis]);

  // Chart data for cycle time trend
  const chartData = useMemo(() => {
    return cycleTimeAnalysis
      .slice()
      .reverse()
      .map((item, index) => ({
        index: index + 1,
        soThung: item.soThung,
        isNM: item.isNM,
        cycleTime: item.cycleTimeMinutes,
        pourTime: item.pourTimeMinutes,
        avgCycleTime: averageCycleTime,
        time: format(parseISO(item.fullTime), "HH:mm dd/MM"),
      }));
  }, [cycleTimeAnalysis, averageCycleTime]);

  // Statistics
  const statistics = useMemo(() => {
    if (cycleTimeAnalysis.length === 0) {
      return {
        total: 0,
        minCycleTime: 0,
        maxCycleTime: 0,
        avgPourTime: 0,
        totalCompleted: 0,
      };
    }

    const cycleTimes = cycleTimeAnalysis.map((item) => item.cycleTimeMinutes);
    const pourTimes = cycleTimeAnalysis.map((item) => item.pourTimeMinutes);

    return {
      total: cycleTimeAnalysis.length,
      minCycleTime: Math.min(...cycleTimes),
      maxCycleTime: Math.max(...cycleTimes),
      avgPourTime: Math.round(
        pourTimes.reduce((sum, val) => sum + val, 0) / pourTimes.length,
      ),
      totalCompleted: data.filter((item) => item.TinhTrang === 1).length,
    };
  }, [cycleTimeAnalysis, data]);

  // Unique buckets - only show latest cycle time for each bucket/area combination
  const uniqueBuckets = useMemo(() => {
    const bucketMap = new Map<string, (typeof cycleTimeAnalysis)[0]>();

    cycleTimeAnalysis.forEach((item) => {
      const key = `${item.soThung}-${item.isNM}`;
      if (!bucketMap.has(key)) {
        bucketMap.set(key, item);
      }
    });

    return Array.from(bucketMap.values());
  }, [cycleTimeAnalysis]);

  // Filter by bucket number and area
  const filteredBuckets = useMemo(() => {
    let filtered = uniqueBuckets;

    // Filter by bucket number (text input)
    if (bucketFilter.trim() !== "") {
      filtered = filtered.filter((item) =>
        item.soThung.includes(bucketFilter.trim()),
      );
    }

    // Filter by area
    if (areaFilter !== "all") {
      filtered = filtered.filter((item) => item.isNM === Number(areaFilter));
    }

    return filtered;
  }, [uniqueBuckets, bucketFilter, areaFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredBuckets.length / pageSize);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredBuckets.slice(startIndex, endIndex);
  }, [filteredBuckets, currentPage, pageSize]);

  // Get detailed history for selected bucket
  const bucketDetailHistory = useMemo(() => {
    if (!selectedBucket) return [];
    return cycleTimeAnalysis.filter(
      (item) =>
        item.soThung === selectedBucket.soThung &&
        item.isNM === selectedBucket.isNM,
    );
  }, [selectedBucket, cycleTimeAnalysis]);

  // Distribution by shift
  const shiftDistribution = useMemo(() => {
    const shifts = { 1: 0, 2: 0 };
    data.forEach((item) => {
      if (item.CaSX in shifts) {
        shifts[item.CaSX as keyof typeof shifts]++;
      }
    });
    return [
      { shift: "Ca 1", count: shifts[1] },
      { shift: "Ca 2", count: shifts[2] },
    ];
  }, [data]);

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Phân Tích Thùng Gang
          </h1>
          <p className="text-gray-600 mt-1">
            Theo dõi và phân tích thời gian quay vòng thùng gang
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[280px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                      {format(dateRange.to, "dd/MM/yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy")
                  )
                ) : (
                  <span>Chọn khoảng thời gian</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Button onClick={loadData} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Tổng số lượt
            </CardTitle>
            <Activity className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {statistics.total}
            </div>
            <p className="text-xs text-gray-600">Lượt rót thùng gang</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">
              TG quay vòng TB
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {averageCycleTime} phút
            </div>
            <p className="text-xs text-muted-foreground">
              Thời gian trung bình
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              TG quay vòng min
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.minCycleTime} phút
            </div>
            <p className="text-xs text-gray-600">Nhanh nhất</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              TG quay vòng max
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statistics.maxCycleTime} phút
            </div>
            <p className="text-xs text-gray-600">Chậm nhất</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              TG rót TB
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statistics.avgPourTime} phút
            </div>
            <p className="text-xs text-gray-600">Thời gian rót gang</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cycle Time Card */}
      {recentCycleTime && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <CheckCircle2 className="h-5 w-5 text-gray-900" />
              Thời gian quay vòng gần nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Số thùng</p>
                <p className="text-2xl font-bold text-blue-600">
                  {recentCycleTime.soThung}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Thời gian quay vòng
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {recentCycleTime.cycleTimeMinutes} phút
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ({Math.floor(recentCycleTime.cycleTimeMinutes / 60)}h{" "}
                  {recentCycleTime.cycleTimeMinutes % 60}m)
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Thời gian rót gang</p>
                <p className="text-2xl font-bold text-orange-600">
                  {recentCycleTime.pourTimeMinutes} phút
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Lộ trình</p>
                <div className="flex items-center gap-2">
                  <Badge>{recentCycleTime.diemDau}</Badge>
                  <span className="text-gray-400">→</span>
                  <Badge>{recentCycleTime.diemDen}</Badge>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Rót đầy:{" "}
                  {format(parseISO(recentCycleTime.fullTime), "HH:mm dd/MM")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cycle Time Trend Chart */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">
            Biểu đồ theo dõi thời gian quay vòng thùng tổng quan
          </CardTitle>
          <p className="text-sm text-gray-600">
            Xu hướng thời gian quay vòng theo thời gian
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                label={{
                  value: "Thời gian (phút)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const area =
                      data.isNM === 1
                        ? "DQ1"
                        : data.isNM === 2
                          ? "DQ2"
                          : `DQ${data.isNM}`;
                    return (
                      <div className="bg-white p-4 border rounded-lg shadow-lg">
                        <p className="font-semibold mb-2 text-gray-600">
                          Thùng số {data.soThung} ({area})
                        </p>
                        <p className="text-sm text-gray-600">
                          Thời gian: {data.time}
                        </p>
                        <p className="text-sm text-blue-600 font-medium">
                          TG quay vòng: {data.cycleTime} phút
                        </p>
                        <p className="text-sm text-indigo-600">
                          TB quay vòng: {data.avgCycleTime} phút
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cycleTime"
                stroke="#0ea5e9"
                strokeWidth={3}
                name="TG quay vòng (phút)"
                dot={{ r: 5, fill: "#0ea5e9", strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="avgCycleTime"
                stroke="#f97316"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="TB quay vòng"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribution by Shift */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">
              Phân bố theo ca sản xuất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={shiftDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="shift" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#8b5cf6" name="Số lượt" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cycle Time Distribution */}
        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">
              Phân loại thời gian quay vòng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Nhanh (&lt; 80% TB)
                    </p>
                    <p className="text-sm text-gray-500">
                      &lt; {Math.round(averageCycleTime * 0.8)} phút
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {
                    cycleTimeAnalysis.filter(
                      (item) => item.cycleTimeMinutes < averageCycleTime * 0.8,
                    ).length
                  }
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Bình thường (80-120% TB)
                    </p>
                    <p className="text-sm text-gray-500">
                      {Math.round(averageCycleTime * 0.8)} -{" "}
                      {Math.round(averageCycleTime * 1.2)} phút
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    cycleTimeAnalysis.filter(
                      (item) =>
                        item.cycleTimeMinutes >= averageCycleTime * 0.8 &&
                        item.cycleTimeMinutes <= averageCycleTime * 1.2,
                    ).length
                  }
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Chậm (&gt; 120% TB)
                    </p>
                    <p className="text-sm text-gray-500">
                      &gt; {Math.round(averageCycleTime * 1.2)} phút
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {
                    cycleTimeAnalysis.filter(
                      (item) => item.cycleTimeMinutes > averageCycleTime * 1.2,
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900">
                Chi tiết thời gian quay vòng gần nhất
              </CardTitle>
              <p className="text-sm text-gray-600">
                Danh sách chi tiết các lượt quay vòng thùng gang gần nhất
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Số thùng:</span>
                <input
                  type="text"
                  value={bucketFilter}
                  onChange={(e) => {
                    setBucketFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Nhập số thùng"
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Khu vực:</span>
                <select
                  value={areaFilter}
                  onChange={(e) => {
                    setAreaFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả</option>
                  <option value="1">DQ1</option>
                  <option value="2">DQ2</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100 border-b border-gray-200">
                  <TableHead className="text-gray-700 font-semibold">
                    STT
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    Số thùng
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    Khu vực
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    Rót đầy thùng
                  </TableHead>
                  {/* <TableHead className="text-gray-700 font-semibold">
                    Bắt đầu rót tiếp theo
                  </TableHead> */}
                  <TableHead className="text-gray-700 font-semibold">
                    TG quay vòng
                  </TableHead>
                  {/* <TableHead className="text-gray-700 font-semibold">
                    TG rót gang
                  </TableHead> */}
                  <TableHead className="text-gray-700 font-semibold">
                    Điểm đầu
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    Điểm đến
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    Trạng thái
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item, index) => {
                  const cycleTimeStatus =
                    item.cycleTimeMinutes < averageCycleTime * 0.8
                      ? "fast"
                      : item.cycleTimeMinutes > averageCycleTime * 1.2
                        ? "slow"
                        : "normal";

                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell className="text-gray-900">
                        {(currentPage - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell className="font-bold text-lg text-blue-600 bg-blue-50">
                        {item.soThung}
                      </TableCell>
                      <TableCell>
                        <Badge>
                          {item.isNM === 1
                            ? "DQ1"
                            : item.isNM === 2
                              ? "DQ2"
                              : `DQ${item.isNM}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {format(parseISO(item.fullTime), "HH:mm dd/MM/yyyy")}
                      </TableCell>
                      {/* <TableCell className="text-sm text-gray-900">
                        {format(
                          parseISO(item.nextPourStart),
                          "HH:mm dd/MM/yyyy",
                        )}
                      </TableCell> */}
                      <TableCell>
                        <Badge
                          variant={
                            cycleTimeStatus === "fast"
                              ? "default"
                              : cycleTimeStatus === "slow"
                                ? "destructive"
                                : "secondary"
                          }
                          className={
                            cycleTimeStatus === "fast"
                              ? "bg-green-500"
                              : cycleTimeStatus === "slow"
                                ? "bg-red-500"
                                : "bg-blue-500"
                          }
                        >
                          {item.cycleTimeMinutes} phút
                        </Badge>
                      </TableCell>
                      {/* <TableCell>
                        <span className="text-orange-600 font-medium">
                          {item.pourTimeMinutes} phút
                        </span>
                      </TableCell> */}
                      <TableCell>
                        <Badge>{item.diemDau}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{item.diemDen}</Badge>
                      </TableCell>
                      <TableCell>
                        {cycleTimeStatus === "fast" && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {cycleTimeStatus === "normal" && (
                          <Clock className="h-5 w-5 text-blue-500" />
                        )}
                        {cycleTimeStatus === "slow" && (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBucket({
                              soThung: item.soThung,
                              isNM: item.isNM,
                            });
                            setDetailModalOpen(true);
                          }}
                        >
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {cycleTimeAnalysis.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>Không có dữ liệu trong khoảng thời gian được chọn</p>
              </div>
            )}
          </div>

          {cycleTimeAnalysis.length > 0 && (
            <div className="flex items-center justify-between gap-4 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Số dòng/trang:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="text-sm text-gray-600">
                Trang {currentPage} / {totalPages || 1}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  Tiếp
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail History Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Lịch sử quay vòng - Thùng {selectedBucket?.soThung} (
              {selectedBucket?.isNM === 1
                ? "DQ1"
                : selectedBucket?.isNM === 2
                  ? "DQ2"
                  : `DQ${selectedBucket?.isNM}`}
              )
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {bucketDetailHistory.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="bg-blue-50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-gray-600">Tổng số lượt</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {bucketDetailHistory.length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-gray-600">TB quay vòng</p>
                      <p className="text-2xl font-bold text-green-600">
                        {Math.round(
                          bucketDetailHistory.reduce(
                            (sum, item) => sum + item.cycleTimeMinutes,
                            0,
                          ) / bucketDetailHistory.length,
                        )}{" "}
                        phút
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-gray-600">TB rót gang</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {Math.round(
                          bucketDetailHistory.reduce(
                            (sum, item) => sum + item.pourTimeMinutes,
                            0,
                          ) / bucketDetailHistory.length,
                        )}{" "}
                        phút
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Biểu đồ xu hướng thời gian quay vòng */}
                <Card className="bg-white shadow-sm border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900">
                      Biểu đồ xu hướng thời gian quay vòng
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart
                        data={bucketDetailHistory
                          .slice()
                          .sort(
                            (a, b) =>
                              parseISO(a.fullTime).getTime() -
                              parseISO(b.fullTime).getTime(),
                          )
                          .map((item, index) => ({
                            index: index + 1,
                            cycleTime: item.cycleTimeMinutes,
                            pourTime: item.pourTimeMinutes,
                            time: format(
                              parseISO(item.fullTime),
                              "HH:mm dd/MM",
                            ),
                            avgCycleTime: Math.round(
                              bucketDetailHistory.reduce(
                                (sum, i) => sum + i.cycleTimeMinutes,
                                0,
                              ) / bucketDetailHistory.length,
                            ),
                          }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="time"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          label={{
                            value: "Thời gian (phút)",
                            angle: -90,
                            position: "insideLeft",
                          }}
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border rounded-lg shadow-lg">
                                  <p className="text-sm font-semibold mb-1">
                                    {data.time}
                                  </p>
                                  <p className="text-sm text-blue-600 font-medium">
                                    TG quay vòng: {data.cycleTime} phút
                                  </p>
                                  <p className="text-sm text-orange-600 font-medium">
                                    TG rót gang: {data.pourTime} phút
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    TB: {data.avgCycleTime} phút
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="avgCycleTime"
                          fill="#e0e7ff"
                          stroke="#818cf8"
                          strokeDasharray="5 5"
                          name="TB quay vòng"
                        />
                        <Bar
                          dataKey="cycleTime"
                          fill="#3b82f6"
                          name="TG quay vòng (phút)"
                        >
                          {bucketDetailHistory.map((item, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                item.cycleTimeMinutes < averageCycleTime * 0.8
                                  ? "#22c55e"
                                  : item.cycleTimeMinutes >
                                      averageCycleTime * 1.2
                                    ? "#ef4444"
                                    : "#3b82f6"
                              }
                            />
                          ))}
                        </Bar>
                        <Line
                          type="monotone"
                          dataKey="pourTime"
                          stroke="#f97316"
                          strokeWidth={2}
                          name="TG rót gang (phút)"
                          dot={{ fill: "#f97316" }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="text-gray-700 font-semibold">
                          STT
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          Rót đầy thùng
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          TG quay vòng
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          TG rót gang
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          Điểm đầu
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          Điểm đến
                        </TableHead>
                        <TableHead className="text-gray-700 font-semibold">
                          Khối lượng (T)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bucketDetailHistory.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell className="text-gray-900">
                            {index + 1}
                          </TableCell>
                          <TableCell className="text-sm text-gray-900">
                            {format(
                              parseISO(item.fullTime),
                              "HH:mm dd/MM/yyyy",
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                item.cycleTimeMinutes < averageCycleTime * 0.8
                                  ? "bg-green-500"
                                  : item.cycleTimeMinutes >
                                      averageCycleTime * 1.2
                                    ? "bg-red-500"
                                    : "bg-blue-500"
                              }
                            >
                              {item.cycleTimeMinutes} phút
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-orange-600 font-medium">
                              {item.pourTimeMinutes} phút
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge>{item.diemDau}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge>{item.diemDen}</Badge>
                          </TableCell>
                          <TableCell className="text-gray-900">
                            {item.khoiLuong ? item.khoiLuong.toFixed(1) : "0.0"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Không có lịch sử cho thùng này</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThungGangAnalysis;
