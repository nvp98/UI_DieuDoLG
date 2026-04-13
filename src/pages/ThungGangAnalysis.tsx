import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Line,
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
import { da, it } from "date-fns/locale";

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
  const [deltaPage, setDeltaPage] = useState(1);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<
    "thung-gang" | "cong-doan" | "delta-t"
  >("thung-gang");

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
      // lọc bỏ các TH đã hoàn thành mà k có giờ kết raLT (GioRaLT),
      //  không có mẻ của isNM =1 để đảm bảo tính chính xác của phân tích

      const filteredData = result.filter(
        (item) =>
          (item.GioRaLT &&
            item.isNM === 1 &&
            item.TinhTrang === 1 &&
            item.Me != null) ||
          item.isNM === 2, //
      );
      setData(filteredData);
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
    // Keep all records, even those without GioBatDau
    const sortedData = [...data].sort((a, b) => {
      // Items without GioBatDau go to the end
      if (!a.GioBatDau && !b.GioBatDau) return 0;
      if (!a.GioBatDau) return 1;
      if (!b.GioBatDau) return -1;

      const dateA = parseISO(a.GioBatDau);
      const dateB = parseISO(b.GioBatDau);
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
          fullTime: current.GioBatDau || "", // Handle null GioBatDau
          nextPourStart:
            i < items.length - 1 ? items[i + 1].GioBatDau || "" : "",
          diemDau: current.DiemDau,
          diemDen: current.DiemDen,
          khoiLuong: current.KhoiLuong,
          isNM: current.isNM,
        });
      }
    });

    // Sort by most recent first (handle empty fullTime)
    return cycleData.sort((a, b) => {
      if (!a.fullTime && !b.fullTime) return 0;
      if (!a.fullTime) return 1; // Put empty at end
      if (!b.fullTime) return -1; // Put empty at end

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

  // Average cycle time (exclude first pour with cycleTime = 0)
  const averageCycleTime = useMemo(() => {
    if (cycleTimeAnalysis.length === 0) return 0;
    const validCycleTimes = cycleTimeAnalysis.filter(
      (item) => item.cycleTimeMinutes > 0,
    );
    if (validCycleTimes.length === 0) return 0;
    const total = validCycleTimes.reduce(
      (sum, item) => sum + item.cycleTimeMinutes,
      0,
    );
    return Math.round(total / validCycleTimes.length);
  }, [cycleTimeAnalysis]);

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

    // Filter out first pours (cycleTime = 0) for accurate min/max
    const validCycleTimes = cycleTimeAnalysis
      .map((item) => item.cycleTimeMinutes)
      .filter((t) => t > 0);
    const pourTimes = cycleTimeAnalysis.map((item) => item.pourTimeMinutes);

    return {
      total: cycleTimeAnalysis.length,
      minCycleTime:
        validCycleTimes.length > 0 ? Math.min(...validCycleTimes) : 0,
      maxCycleTime:
        validCycleTimes.length > 0 ? Math.max(...validCycleTimes) : 0,
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

  // Regional analysis by location/furnace
  const bucketAnalysis = useMemo(() => {
    console.log(data);
    if (!data || data.length === 0) return [];

    // Helper function to parse time to minutes from midnight
    const parseTimeToMinutes = (timeStr: string | null): number | null => {
      if (!timeStr) return null;
      try {
        const date = parseISO(timeStr);
        return date.getHours() * 60 + date.getMinutes();
      } catch {
        return null;
      }
    };

    // Helper function to format minutes to HH:mm
    const formatMinutesToTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };

    // Helper function to calculate stats
    const calculateStats = (values: number[]) => {
      if (values.length === 0) return { avg: "", min: "", max: "" };
      const avg = Math.round(
        values.reduce((sum, v) => sum + v, 0) / values.length,
      );
      const min = Math.min(...values);
      const max = Math.max(...values);
      return { avg, min, max };
    };

    // Helper function to calculate time stats with formatting
    const calculateTimeStats = (values: number[]) => {
      if (values.length === 0) return { avg: "", min: "", max: "" };
      const stats = calculateStats(values);
      return {
        avg: formatMinutesToTime(stats.avg as number),
        min: formatMinutesToTime(stats.min as number),
        max: formatMinutesToTime(stats.max as number),
      };
    };

    // Helper function to calculate cycle time stats (in minutes)
    const calculateCycleStats = (values: number[]) => {
      if (values.length === 0) return { avg: "", min: "", max: "" };
      const stats = calculateStats(values);
      return {
        avg: `${stats.avg} phút`,
        min: `${stats.min} phút`,
        max: `${stats.max} phút`,
      };
    };

    // Group data by bucket number AND area (to show each bucket-area combination)
    const bucketAreaGroups = new Map<string, ThungGangData[]>();
    data.forEach((item) => {
      const bucketNumber = item.SoThung;
      const areaKey = `${bucketNumber}-${item.isNM}`; // Composite key: bucket-area
      if (!bucketAreaGroups.has(areaKey)) {
        bucketAreaGroups.set(areaKey, []);
      }
      bucketAreaGroups.get(areaKey)!.push(item);
    });

    // Also group data by bucket number only (for cycle time calculation)
    const bucketOnlyGroups = new Map<string, ThungGangData[]>();
    data.forEach((item) => {
      const bucketNumber = item.SoThung;
      if (!bucketOnlyGroups.has(bucketNumber)) {
        bucketOnlyGroups.set(bucketNumber, []);
      }
      bucketOnlyGroups.get(bucketNumber)!.push(item);
    });

    // Get unique bucket-area combinations and sort them
    const uniqueBucketAreas = Array.from(bucketAreaGroups.keys()).sort(
      (a, b) => {
        const [numA, areaA] = a.split("-");
        const [numB, areaB] = b.split("-");
        const bucketCompare = (parseInt(numA) || 0) - (parseInt(numB) || 0);
        if (bucketCompare !== 0) return bucketCompare;
        return (parseInt(areaA) || 0) - (parseInt(areaB) || 0);
      },
    );

    return uniqueBucketAreas.map((bucketAreaKey) => {
      const [bucketNumber, areaValue] = bucketAreaKey.split("-");
      const bucketData = bucketAreaGroups.get(bucketAreaKey) || [];
      // For cycle time calculation, use all data for this bucket (aggregated across areas)
      const bucketDataAllAreas = bucketOnlyGroups.get(bucketNumber) || [];

      const isNM = parseInt(areaValue);
      const area = isNM === 1 ? "DQ1" : isNM === 2 ? "DQ2" : `DQ${isNM}`;

      // Sort bucket data chronologically by GioBatDau
      const sortedBucketData = [...bucketData].sort((a, b) => {
        if (!a.GioBatDau || !b.GioBatDau) return 0;
        return (
          parseISO(a.GioBatDau).getTime() - parseISO(b.GioBatDau).getTime()
        );
      });

      // For cycle time, use all data for this bucket across all areas
      const sortedBucketDataAllAreas = [...bucketDataAllAreas].sort((a, b) => {
        if (!a.GioBatDau || !b.GioBatDau) return 0;
        return (
          parseISO(a.GioBatDau).getTime() - parseISO(b.GioBatDau).getTime()
        );
      });

      // Calculate pour finish time deltas from CURRENT AREA data
      // (delta = lần rót xong thứ 2 - lần rót xong gần nhất trước đó)
      const pourFinishDeltas: number[] = [];
      for (let i = 1; i < sortedBucketData.length; i++) {
        const prevTime = sortedBucketData[i - 1].G_RotDayThung;
        const currTime = sortedBucketData[i].G_RotDayThung;
        if (prevTime && currTime) {
          const delta = differenceInMinutes(
            parseISO(currTime),
            parseISO(prevTime),
          );
          if (delta > 0) pourFinishDeltas.push(delta);
        }
      }
      const pourFinishStats = calculateCycleStats(pourFinishDeltas);

      // Calculate enter LT time deltas from CURRENT AREA data
      // (delta = lần vào LT thứ 2 - lần vào LT gần nhất trước đó)
      const enterLTDeltas: number[] = [];
      for (let i = 1; i < sortedBucketData.length; i++) {
        const prevTime = sortedBucketData[i - 1].GioVaoLT;
        const currTime = sortedBucketData[i].GioVaoLT;
        if (prevTime && currTime) {
          const delta = differenceInMinutes(
            parseISO(currTime),
            parseISO(prevTime),
          );
          if (delta > 0) enterLTDeltas.push(delta);
        }
      }
      const enterLTStats = calculateCycleStats(enterLTDeltas);

      // Calculate cycle time deltas from CURRENT AREA data ONLY
      // (delta = lần bắt đầu rót thứ 2 - lần bắt đầu rót gần nhất trước đó)
      // Ví dụ: 07-DQ2 tính từ 07-DQ2 data only, không gom 07-DQ1 vào
      const cycleTimeDeltas: number[] = [];
      for (let i = 1; i < sortedBucketData.length; i++) {
        const prevTime = sortedBucketData[i - 1].GioBatDau;
        const currTime = sortedBucketData[i].GioBatDau;
        if (prevTime && currTime) {
          const delta = differenceInMinutes(
            parseISO(currTime),
            parseISO(prevTime),
          );
          if (delta > 0) cycleTimeDeltas.push(delta);
        }
      }
      const cycleTimeStats = calculateCycleStats(cycleTimeDeltas);

      // Count actual valid cycles
      const cycleCount = cycleTimeDeltas.length;

      return {
        bucketNumber: `Thùng ${bucketNumber.padStart(2, "0")}`,
        rawBucketNumber: bucketNumber,
        area,
        cycleCount,
        pourFinish: pourFinishStats,
        enterLT: enterLTStats,
        cycleTime: cycleTimeStats,
      };
    });
  }, [data, cycleTimeAnalysis]);

  // Chart data for bucket analysis overview - show average cycle time per bucket
  const bucketChartData = useMemo(() => {
    return bucketAnalysis.map((bucket) => {
      // Extract avg value from cycleTime string (format: "XX phút" or "")
      const avgString = bucket.cycleTime.avg as string;
      const avgValue =
        avgString && avgString !== ""
          ? parseInt(avgString.replace(" phút", ""))
          : 0;

      return {
        bucketLabel: `${bucket.rawBucketNumber}-${bucket.area}`, // Short format: "01-DQ1"
        bucketNumber: bucket.bucketNumber, // Full format: "Thùng 01"
        area: bucket.area,
        avgCycleTime: avgValue,
        cycleCount: bucket.cycleCount,
        overallAvg: averageCycleTime, // Overall average for reference line
      };
    });
  }, [bucketAnalysis, averageCycleTime]);

  // Filter bucket analysis based on filters
  const filteredBucketAnalysis = useMemo(() => {
    let filtered = [...bucketAnalysis];

    // Filter by bucket number
    if (bucketFilter) {
      filtered = filtered.filter((item) =>
        item.rawBucketNumber.includes(bucketFilter),
      );
    }

    // Filter by area (DQ1 or DQ2)
    if (areaFilter !== "all") {
      const filterIsNM = parseInt(areaFilter);
      const targetArea =
        filterIsNM === 1 ? "DQ1" : filterIsNM === 2 ? "DQ2" : `DQ${filterIsNM}`;
      filtered = filtered.filter((item) => item.area === targetArea);
    }

    return filtered;
  }, [bucketAnalysis, bucketFilter, areaFilter]);

  // Paginate filtered data
  const paginatedBucketAnalysis = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredBucketAnalysis.slice(startIndex, endIndex);
  }, [filteredBucketAnalysis, currentPage, pageSize]);

  // Calculate total pages for bucket analysis
  const totalBucketPages = Math.ceil(filteredBucketAnalysis.length / pageSize);

  // ─── Heatmap: phân bố thùng gang theo lò cao (tổng hợp) ─────────────────
  const furnaceHeatmapData = useMemo(() => {
    const furnaces = [1, 2, 3, 4, 5, 6];
    const result = furnaces.map((lc) => {
      // Lấy tất cả bản ghi của lò cao này, có G_RotDayThung
      const items = data
        .filter((d) => d.ID_LoCao === lc && !!d.G_RotDayThung)
        .sort(
          (a, b) =>
            parseISO(a.G_RotDayThung!).getTime() -
            parseISO(b.G_RotDayThung!).getTime(),
        );

      // Chu kỳ ra gang = khoảng cách giữa 2 lần rót xong liên tiếp
      const cycles: number[] = [];
      for (let i = 1; i < items.length; i++) {
        const t = differenceInMinutes(
          parseISO(items[i].G_RotDayThung!),
          parseISO(items[i - 1].G_RotDayThung!),
        );
        if (t > 0 && t < 600) cycles.push(t);
      }
      const avgCycle =
        cycles.length > 0
          ? Math.round(cycles.reduce((s, v) => s + v, 0) / cycles.length)
          : 0;

      return { furnace: lc, count: items.length, avgTime: avgCycle };
    });
    const maxCount = Math.max(...result.map((r) => r.count), 1);
    const maxAvgTime = Math.max(...result.map((r) => r.avgTime), 1);
    return { stats: result, maxCount, maxAvgTime };
  }, [data]);

  // ─── Phân tích theo từng công đoạn ───────────────────────────────────────
  const STAGE_COLORS = [
    "#8b5cf6",
    "#3b82f6",
    "#06b6d4",
    "#f59e0b",
    "#ef4444",
    "#10b981",
  ];

  const stageAnalysis = useMemo(() => {
    if (!data || data.length === 0) return [];

    const stages = [
      {
        name: "Bắt đầu rót gang → Gang rót xong",
        shortName: "LG Rót xong",
        getT1: (d: ThungGangData) => d.G_BatDauRot,
        getT2: (d: ThungGangData) => d.G_RotDayThung,
      },
      {
        name: "Gang rót xong → Vào gian LT",
        shortName: "Vào gian chờ LT",
        getT1: (d: ThungGangData) => d.G_RotDayThung,
        getT2: (d: ThungGangData) => d.GioVaoLT,
      },
      {
        name: "Vào gian LT → Vào KR",
        shortName: "Vào KR",
        getT1: (d: ThungGangData) => d.GioVaoLT,
        getT2: (d: ThungGangData) => d.GioVaoKR,
      },
      {
        name: "Vào KR → Ra KR",
        shortName: "Ra KR",
        getT1: (d: ThungGangData) => d.GioVaoKR,
        getT2: (d: ThungGangData) => d.GioRaKR,
      },
      {
        name: "Ra KR → Rót xong (trả vỏ)",
        shortName: "Rót xong (trả vỏ)",
        getT1: (d: ThungGangData) => d.GioRaKR,
        getT2: (d: ThungGangData) => d.GioRotXong,
      },
      {
        name: "Rót thép xong → Ra LT",
        shortName: "Ra LT",
        getT1: (d: ThungGangData) => d.GioRotXong,
        getT2: (d: ThungGangData) => d.GioRaLT,
      },
    ];

    return stages.map((stage, idx) => {
      const times = data
        .filter((item) => stage.getT1(item) && stage.getT2(item))
        .map((item) =>
          differenceInMinutes(
            parseISO(stage.getT2(item)!),
            parseISO(stage.getT1(item)!),
          ),
        )
        .filter((t) => t >= 0 && t < 600);

      const avg =
        times.length > 0
          ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
          : 0;
      const min = times.length > 0 ? Math.min(...times) : 0;
      const max = times.length > 0 ? Math.max(...times) : 0;

      return {
        name: stage.name,
        shortName: stage.shortName,
        avg,
        min,
        max,
        count: times.length,
        color: STAGE_COLORS[idx],
      };
    });
  }, [data]);

  // ─── Phân tích Delta T ────────────────────────────────────────────────────
  const deltaTData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data
      .map((item) => {
        const delta1 =
          item.G_RotDayThung && item.GioVaoLT
            ? differenceInMinutes(
                parseISO(item.GioVaoLT),
                parseISO(item.G_RotDayThung),
              )
            : null;
        const delta2 =
          item.GioVaoLT && item.GioRotXong
            ? differenceInMinutes(
                parseISO(item.GioRotXong),
                parseISO(item.GioVaoLT),
              )
            : null;
        return {
          id: item.ID,
          soThung: item.SoThung,
          isNM: item.isNM,
          area:
            item.isNM === 1
              ? "DQ1"
              : item.isNM === 2
                ? "DQ2"
                : `DQ${item.isNM}`,
          delta1:
            delta1 !== null && delta1 >= 0 && delta1 < 600 ? delta1 : null,
          delta2:
            delta2 !== null && delta2 >= 0 && delta2 < 600 ? delta2 : null,
          time: item.GioBatDau || item.NgayTao,
        };
      })
      .filter((item) => item.delta1 !== null || item.delta2 !== null);
  }, [data]);

  const bucketDeltaStats = useMemo(() => {
    const bucketMap = new Map<
      string,
      { soThung: string; isNM: number; d1: number[]; d2: number[] }
    >();

    deltaTData.forEach((item) => {
      const key = `${item.soThung}-${item.isNM}`;
      if (!bucketMap.has(key))
        bucketMap.set(key, {
          soThung: item.soThung,
          isNM: item.isNM,
          d1: [],
          d2: [],
        });
      const bucket = bucketMap.get(key)!;
      if (item.delta1 !== null) bucket.d1.push(item.delta1);
      if (item.delta2 !== null) bucket.d2.push(item.delta2);
    });

    const calcStat = (arr: number[]) =>
      arr.length > 0
        ? {
            avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
            min: Math.min(...arr),
            max: Math.max(...arr),
          }
        : { avg: 0, min: 0, max: 0 };

    return Array.from(bucketMap.values())
      .map(({ soThung, isNM, d1, d2 }) => ({
        key: `${soThung}-${isNM}`,
        soThung,
        isNM,
        area: isNM === 1 ? "DQ1" : isNM === 2 ? "DQ2" : `DQ${isNM}`,
        bucketLabel: `${soThung}-${isNM === 1 ? "DQ1" : "DQ2"}`,
        delta1: calcStat(d1),
        delta2: calcStat(d2),
        count: Math.max(d1.length, d2.length),
      }))
      .sort(
        (a, b) => parseInt(a.soThung) - parseInt(b.soThung) || a.isNM - b.isNM,
      );
  }, [deltaTData]);

  const deltaTSummary = useMemo(() => {
    const allD1 = deltaTData
      .filter((d) => d.delta1 !== null)
      .map((d) => d.delta1!);
    const allD2 = deltaTData
      .filter((d) => d.delta2 !== null)
      .map((d) => d.delta2!);
    const calc = (arr: number[]) =>
      arr.length > 0
        ? {
            avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
            min: Math.min(...arr),
            max: Math.max(...arr),
            count: arr.length,
          }
        : { avg: 0, min: 0, max: 0, count: 0 };
    return { delta1: calc(allD1), delta2: calc(allD2) };
  }, [deltaTData]);

  const totalDeltaPages = Math.ceil(bucketDeltaStats.length / pageSize);
  const paginatedDeltaStats = useMemo(() => {
    const start = (deltaPage - 1) * pageSize;
    return bucketDeltaStats.slice(start, start + pageSize);
  }, [bucketDeltaStats, deltaPage, pageSize]);

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
              Tổng lượt rót
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
                  {recentCycleTime.fullTime
                    ? format(parseISO(recentCycleTime.fullTime), "HH:mm dd/MM")
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Phân tích đa chiều (công đoạn / Delta T) ───────────────────────── */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-gray-900">
                Phân tích đa chiều thùng gang
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {activeAnalysisTab === "thung-gang"
                  ? "Biểu đồ và bảng thống kê thời gian quay vòng theo từng số thùng gang."
                  : activeAnalysisTab === "cong-doan"
                    ? "Thống kê thời gian trung bình cho từng công đoạn."
                    : "Δ1: Rót gang xong → Vào gian chờ thép  |  Δ2: Vào gian chờ thép → Rót xong trả vỏ"}
              </p>
            </div>
            {/* Tab selector */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg border border-gray-200 self-start">
              <button
                onClick={() => setActiveAnalysisTab("thung-gang")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeAnalysisTab === "thung-gang"
                    ? "bg-white text-green-700 shadow-sm border border-green-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Theo thùng gang
              </button>
              <button
                onClick={() => setActiveAnalysisTab("cong-doan")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeAnalysisTab === "cong-doan"
                    ? "bg-white text-blue-700 shadow-sm border border-blue-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Theo công đoạn
              </button>
              <button
                onClick={() => setActiveAnalysisTab("delta-t")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeAnalysisTab === "delta-t"
                    ? "bg-white text-purple-700 shadow-sm border border-purple-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Delta T (Δ1 / Δ2)
              </button>
            </div>
          </div>
        </CardHeader>
        {activeAnalysisTab === "thung-gang" && (
          <CardContent>
            {/* Biểu đồ quay vòng */}
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Biểu đồ thời gian quay vòng trung bình theo số thùng và khu vực
            </p>
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={bucketChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="bucketLabel"
                  angle={-45}
                  textAnchor="end"
                  height={90}
                  tick={{ fontSize: 11 }}
                  interval={0}
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
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-4 border rounded-lg shadow-lg">
                          <p className="font-semibold mb-2 text-gray-900">
                            {d.bucketNumber} ({d.area})
                          </p>
                          <p className="text-sm text-blue-600 font-medium">
                            TB quay vòng: {d.avgCycleTime} phút
                          </p>
                          <p className="text-sm text-gray-600">
                            Số lần quay vòng: {d.cycleCount}
                          </p>
                          <p className="text-sm text-orange-600">
                            TB tổng quát: {d.overallAvg} phút
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
                  dataKey="avgCycleTime"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="TB quay vòng (phút)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const color =
                      payload.avgCycleTime < averageCycleTime * 0.8
                        ? "#22c55e"
                        : payload.avgCycleTime > averageCycleTime * 1.2
                          ? "#ef4444"
                          : "#3b82f6";
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={color}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="overallAvg"
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="TB tổng quát"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Heatmap tổng hợp theo lò cao */}
            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Phân bổ số lần ra gang theo lò cao
              </p>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="border-collapse text-xs w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th
                        className="px-4 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300"
                        style={{ minWidth: 90 }}
                      >
                        Chỉ số
                      </th>
                      {furnaceHeatmapData.stats.map((lc) => (
                        <th
                          key={lc.furnace}
                          className="py-2 text-center font-semibold text-gray-700 border-b border-r border-gray-300"
                          style={{ minWidth: 90 }}
                        >
                          Lò cao {lc.furnace}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row: Số lần */}
                    <tr>
                      <td className="px-4 py-2 font-semibold text-gray-700 border-b border-r border-gray-200 bg-gray-50 text-xs">
                        Số lần ra gang
                      </td>
                      {furnaceHeatmapData.stats.map((lc) => {
                        const ratio =
                          furnaceHeatmapData.maxCount > 0
                            ? lc.count / furnaceHeatmapData.maxCount
                            : 0;
                        const bg =
                          lc.count === 0
                            ? "#f8fafc"
                            : ratio < 0.15
                              ? "#dbeafe"
                              : ratio < 0.35
                                ? "#93c5fd"
                                : ratio < 0.55
                                  ? "#60a5fa"
                                  : ratio < 0.75
                                    ? "#3b82f6"
                                    : "#1d4ed8";
                        const textColor = ratio >= 0.55 ? "#ffffff" : "#1e293b";
                        return (
                          <td
                            key={lc.furnace}
                            className="border-b border-r border-gray-200 text-center py-3"
                            style={{ backgroundColor: bg }}
                            title={`Lò cao ${lc.furnace}: ${lc.count} lần ra gang`}
                          >
                            {lc.count > 0 ? (
                              <span
                                style={{ color: textColor }}
                                className="font-bold text-base"
                              >
                                {lc.count}
                              </span>
                            ) : (
                              <span className="text-gray-300">–</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {/* Row: TB thời gian ra gang */}
                    <tr>
                      <td className="px-4 py-2 font-semibold text-gray-700 border-r border-gray-200 bg-gray-50 text-xs">
                        TB chu kỳ ra gang (phút)
                      </td>
                      {furnaceHeatmapData.stats.map((lc) => {
                        const ratio =
                          furnaceHeatmapData.maxAvgTime > 0 && lc.avgTime > 0
                            ? lc.avgTime / furnaceHeatmapData.maxAvgTime
                            : 0;
                        const bg =
                          lc.avgTime === 0
                            ? "#f8fafc"
                            : ratio < 0.15
                              ? "#dbeafe"
                              : ratio < 0.35
                                ? "#93c5fd"
                                : ratio < 0.55
                                  ? "#60a5fa"
                                  : ratio < 0.75
                                    ? "#3b82f6"
                                    : "#1d4ed8";
                        const textColor = ratio >= 0.55 ? "#ffffff" : "#1e293b";
                        return (
                          <td
                            key={lc.furnace}
                            className="border-r border-gray-200 text-center py-2 font-semibold"
                            style={{ backgroundColor: bg }}
                            title={`Lò cao ${lc.furnace}: TB chu kỳ ${lc.avgTime} phút`}
                          >
                            {lc.avgTime > 0 ? (
                              <span style={{ color: textColor }}>
                                {lc.avgTime}
                              </span>
                            ) : (
                              <span className="text-gray-300">–</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs text-gray-500 mr-1">
                  Số lần ra gang:
                </span>
                {[
                  { bg: "#f8fafc", label: "0" },
                  { bg: "#dbeafe", label: "Ít" },
                  { bg: "#93c5fd", label: "" },
                  { bg: "#60a5fa", label: "" },
                  { bg: "#3b82f6", label: "" },
                  { bg: "#1d4ed8", label: "Nhiều" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <div
                      className="w-5 h-4 rounded border border-gray-200"
                      style={{ backgroundColor: item.bg }}
                    />
                    {item.label && (
                      <span className="text-xs text-gray-500">
                        {item.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mt-6 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 font-medium">
                  Số thùng:
                </span>
                <input
                  type="text"
                  value={bucketFilter}
                  onChange={(e) => {
                    setBucketFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Nhập số thùng"
                  className="px-3 py-2 border-2 border-gray-400 bg-white rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 font-medium">
                  Khu vực:
                </span>
                <select
                  value={areaFilter}
                  onChange={(e) => {
                    setAreaFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border-2 border-gray-400 bg-white rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả</option>
                  <option value="1">DQ1</option>
                  <option value="2">DQ2</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 ml-auto">
                Kết quả lọc:{" "}
                <span className="font-semibold text-gray-900">
                  {filteredBucketAnalysis.length}
                </span>{" "}
                thùng
              </div>
            </div>

            {/* Bucket analysis table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 border-b border-gray-200">
                    <TableHead
                      rowSpan={2}
                      className="text-gray-700 font-semibold border-r text-center align-middle"
                    >
                      Số thùng
                    </TableHead>
                    <TableHead
                      rowSpan={2}
                      className="text-gray-700 font-semibold border-r text-center align-middle"
                    >
                      Khu vực
                    </TableHead>
                    <TableHead
                      rowSpan={2}
                      className="text-gray-700 font-semibold border-r text-center align-middle"
                    >
                      Số lần quay vòng
                    </TableHead>
                    <TableHead
                      colSpan={3}
                      className="text-gray-700 font-semibold border-r text-center"
                    >
                      Rót xong
                    </TableHead>
                    <TableHead
                      colSpan={3}
                      className="text-gray-700 font-semibold border-r text-center"
                    >
                      Vào LT
                    </TableHead>
                    <TableHead
                      colSpan={3}
                      className="text-gray-700 font-semibold text-center"
                    >
                      TG quay vòng
                    </TableHead>
                  </TableRow>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="text-gray-600 text-center border-r">
                      TB
                    </TableHead>
                    <TableHead className="text-gray-600 text-center border-r">
                      Min
                    </TableHead>
                    <TableHead className="text-gray-600 text-center border-r">
                      Max
                    </TableHead>
                    <TableHead className="text-gray-600 text-center border-r">
                      TB
                    </TableHead>
                    <TableHead className="text-gray-600 text-center border-r">
                      Min
                    </TableHead>
                    <TableHead className="text-gray-600 text-center border-r">
                      Max
                    </TableHead>
                    <TableHead className="text-gray-600 text-center border-r">
                      TB
                    </TableHead>
                    <TableHead className="text-gray-600 text-center border-r">
                      Min
                    </TableHead>
                    <TableHead className="text-gray-600 text-center">
                      Max
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBucketAnalysis.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-center py-8 text-gray-500"
                      >
                        Không có dữ liệu phù hợp với bộ lọc
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedBucketAnalysis.map((bucket, index) => (
                      <TableRow
                        key={`${bucket.bucketNumber}-${bucket.area}`}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <TableCell className="font-semibold text-gray-900 border-r">
                          {bucket.bucketNumber}
                        </TableCell>
                        <TableCell className="text-center border-r">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${bucket.area === "DQ1" ? "bg-blue-100 text-blue-700" : bucket.area === "DQ2" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"}`}
                          >
                            {bucket.area}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-blue-600 font-bold border-r">
                          {bucket.cycleCount || "-"}
                        </TableCell>
                        <TableCell className="text-center text-gray-900 border-r">
                          {bucket.pourFinish.avg || "-"}
                        </TableCell>
                        <TableCell className="text-center text-green-600 border-r">
                          {bucket.pourFinish.min || "-"}
                        </TableCell>
                        <TableCell className="text-center text-red-600 border-r">
                          {bucket.pourFinish.max || "-"}
                        </TableCell>
                        <TableCell className="text-center text-gray-900 border-r">
                          {bucket.enterLT.avg || "-"}
                        </TableCell>
                        <TableCell className="text-center text-green-600 border-r">
                          {bucket.enterLT.min || "-"}
                        </TableCell>
                        <TableCell className="text-center text-red-600 border-r">
                          {bucket.enterLT.max || "-"}
                        </TableCell>
                        <TableCell className="text-center text-gray-900 font-medium border-r">
                          {bucket.cycleTime.avg || "-"}
                        </TableCell>
                        <TableCell className="text-center text-green-600 border-r">
                          {bucket.cycleTime.min || "-"}
                        </TableCell>
                        <TableCell className="text-center text-red-600">
                          {bucket.cycleTime.max || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredBucketAnalysis.length > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Hiển thị {(currentPage - 1) * pageSize + 1} –{" "}
                  {Math.min(
                    currentPage * pageSize,
                    filteredBucketAnalysis.length,
                  )}{" "}
                  trong tổng số {filteredBucketAnalysis.length} kết quả
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Trước
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalBucketPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalBucketPages ||
                          Math.abs(page - currentPage) <= 1,
                      )
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="min-w-[2.5rem]"
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
                      setCurrentPage((prev) =>
                        Math.min(totalBucketPages, prev + 1),
                      )
                    }
                    disabled={currentPage === totalBucketPages}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
        {activeAnalysisTab === "cong-doan" && (
          <CardContent>
            {/* Summary mini-cards for each stage */}
            {(() => {
              const maxAvg = Math.max(...stageAnalysis.map((s) => s.avg));
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  {stageAnalysis.map((stage) => {
                    const isMax = stage.count > 0 && stage.avg === maxAvg;
                    return (
                      <div
                        key={stage.name}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isMax
                            ? "border-orange-400 bg-orange-50 shadow-md ring-2 ring-orange-300"
                            : "border-gray-200 bg-gray-50"
                        }`}
                        style={{
                          borderLeftColor: stage.color,
                          borderLeftWidth: 4,
                        }}
                        title={stage.name}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-gray-600 truncate">
                            {stage.shortName}
                          </p>
                          {isMax && (
                            <span className="text-xs font-bold text-orange-500 whitespace-nowrap">
                              ⏱ Max
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xl font-bold ${isMax ? "text-orange-600" : "text-gray-900"}`}
                        >
                          {stage.avg}{" "}
                          <span className="text-xs font-normal">ph</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          {stage.min} – {stage.max} ph
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Bar chart: TB thực tế */}
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={stageAnalysis}
                margin={{ top: 10, right: 30, left: 0, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="shortName"
                  angle={-30}
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
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
                          <p className="font-semibold mb-1 text-gray-900">
                            {d.name}
                          </p>
                          <p className="text-blue-600">TB: {d.avg} phút</p>
                          <p className="text-green-600">Min: {d.min} phút</p>
                          <p className="text-red-500">Max: {d.max} phút</p>
                          <p className="text-gray-500">Số mẫu: {d.count}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar
                  dataKey="avg"
                  name="TB thực tế (phút)"
                  radius={[4, 4, 0, 0]}
                >
                  {stageAnalysis.map((entry, index) => (
                    <Cell key={`stage-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>

            {/* Stage detail table */}
            <div className="overflow-x-auto mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="text-gray-700 font-semibold">
                      Công đoạn
                    </TableHead>
                    <TableHead className="text-center text-gray-700 font-semibold">
                      Số mẫu
                    </TableHead>
                    <TableHead className="text-center text-gray-700 font-semibold">
                      TB (phút)
                    </TableHead>
                    <TableHead className="text-center text-gray-700 font-semibold">
                      Min (phút)
                    </TableHead>
                    <TableHead className="text-center text-gray-700 font-semibold">
                      Max (phút)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stageAnalysis.map((stage, idx) => (
                    <TableRow
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                            style={{ background: stage.color }}
                          />
                          <span className="text-gray-900 text-sm">
                            {stage.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-gray-700">
                        {stage.count}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-gray-900">
                        {stage.avg || "-"}
                      </TableCell>
                      <TableCell className="text-center text-green-600">
                        {stage.min || "-"}
                      </TableCell>
                      <TableCell className="text-center text-red-500">
                        {stage.max || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
        {/* ─── Tab: Delta T ─────────────────────────────────────────────────── */}
        {activeAnalysisTab === "delta-t" && (
          <CardContent>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-blue-600 mb-1">
                    Δ1 – Trung bình
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {deltaTSummary.delta1.avg} phút
                  </p>
                  <p className="text-xs text-gray-500">
                    {deltaTSummary.delta1.count} mẫu
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-purple-600 mb-1">
                    Δ2 – Trung bình
                  </p>
                  <p className="text-2xl font-bold text-purple-700">
                    {deltaTSummary.delta2.avg} phút
                  </p>
                  <p className="text-xs text-gray-500">
                    {deltaTSummary.delta2.count} mẫu
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-green-600 mb-1">
                    Δ1 – Min / Max
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {deltaTSummary.delta1.min}
                    <span className="text-sm font-normal text-gray-500">
                      {" "}
                      /{" "}
                    </span>
                    {deltaTSummary.delta1.max}
                    <span className="text-sm font-normal text-gray-500">
                      {" "}
                      ph
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Nhanh nhất / Chậm nhất
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-indigo-50 border-indigo-200">
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-indigo-600 mb-1">
                    Δ2 – Min / Max
                  </p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {deltaTSummary.delta2.min}
                    <span className="text-sm font-normal text-gray-500">
                      {" "}
                      /{" "}
                    </span>
                    {deltaTSummary.delta2.max}
                    <span className="text-sm font-normal text-gray-500">
                      {" "}
                      ph
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Nhanh nhất / Chậm nhất
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Line chart Δ1 vs Δ2 by bucket */}
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={bucketDeltaStats.map((b) => ({
                  name: b.bucketLabel,
                  delta1: b.delta1.avg,
                  delta2: b.delta2.avg,
                  count: b.count,
                }))}
                margin={{ top: 10, right: 20, left: 0, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  label={{ value: "Phút", angle: -90, position: "insideLeft" }}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
                          <p className="font-semibold mb-1 text-gray-900">
                            {d.name}
                          </p>
                          <p className="text-blue-600">
                            Δ1 (Rót xong → Vào LT): {d.delta1} phút
                          </p>
                          <p className="text-purple-600">
                            Δ2 (Vào LT → Rót xong): {d.delta2} phút
                          </p>
                          <p className="text-gray-500">Số mẫu: {d.count}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="delta1"
                  name="Δ1 Rót xong → Vào gian chờ LT (phút)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="delta2"
                  name="Δ2 Vào gian chờ LT → Rót xong (trả vỏ) (phút)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Delta T table (paginated) */}
            <div className="overflow-x-auto mt-6">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 border-b border-gray-200">
                    <TableHead
                      rowSpan={2}
                      className="text-gray-700 font-semibold border-r text-center align-middle"
                    >
                      Số thùng
                    </TableHead>
                    <TableHead
                      rowSpan={2}
                      className="text-gray-700 font-semibold border-r text-center align-middle"
                    >
                      Khu vực
                    </TableHead>
                    <TableHead
                      rowSpan={2}
                      className="text-gray-700 font-semibold border-r text-center align-middle"
                    >
                      Số mẫu
                    </TableHead>
                    <TableHead
                      colSpan={3}
                      className="text-blue-700 font-semibold border-r text-center"
                    >
                      Δ1: Rót xong → Vào LT (phút)
                    </TableHead>
                    <TableHead
                      colSpan={3}
                      className="text-purple-700 font-semibold text-center"
                    >
                      Δ2: Vào LT → Rót xong (phút)
                    </TableHead>
                  </TableRow>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="text-gray-600 text-center border-r">
                      TB
                    </TableHead>
                    <TableHead className="text-gray-600 text-center border-r">
                      Min
                    </TableHead>
                    <TableHead className="text-gray-600 text-center border-r">
                      Max
                    </TableHead>
                    <TableHead className="text-gray-600 text-center border-r">
                      TB
                    </TableHead>
                    <TableHead className="text-gray-600 text-center border-r">
                      Min
                    </TableHead>
                    <TableHead className="text-gray-600 text-center">
                      Max
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDeltaStats.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-8 text-gray-500"
                      >
                        Không có dữ liệu Delta T
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDeltaStats.map((row, idx) => (
                      <TableRow
                        key={row.key}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <TableCell className="font-semibold text-gray-900 border-r text-center">
                          Thùng {row.soThung.padStart(2, "0")}
                        </TableCell>
                        <TableCell className="text-center border-r">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              row.isNM === 1
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {row.area}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-gray-700 border-r">
                          {row.count}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-blue-700 border-r">
                          {row.delta1.avg || "-"}
                        </TableCell>
                        <TableCell className="text-center text-green-600 border-r">
                          {row.delta1.min || "-"}
                        </TableCell>
                        <TableCell className="text-center text-red-500 border-r">
                          {row.delta1.max || "-"}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-purple-700 border-r">
                          {row.delta2.avg || "-"}
                        </TableCell>
                        <TableCell className="text-center text-green-600 border-r">
                          {row.delta2.min || "-"}
                        </TableCell>
                        <TableCell className="text-center text-red-500">
                          {row.delta2.max || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination for Delta T */}
            {bucketDeltaStats.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Hiển thị {(deltaPage - 1) * pageSize + 1}–
                  {Math.min(deltaPage * pageSize, bucketDeltaStats.length)}{" "}
                  trong {bucketDeltaStats.length} kết quả
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeltaPage((p) => Math.max(1, p - 1))}
                    disabled={deltaPage === 1}
                  >
                    Trước
                  </Button>
                  <span className="text-sm text-gray-600 px-2">
                    Trang {deltaPage} / {totalDeltaPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDeltaPage((p) => Math.min(totalDeltaPages, p + 1))
                    }
                    disabled={
                      deltaPage === totalDeltaPages || totalDeltaPages === 0
                    }
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Detailed Table */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">
            Chi tiết thời gian quay vòng gần nhất
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Danh sách chi tiết các lượt quay vòng thùng gang gần nhất
          </p>
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
                        {item.fullTime
                          ? format(parseISO(item.fullTime), "HH:mm dd/MM/yyyy")
                          : "N/A"}
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
                      <p className="text-sm text-gray-600">Số lần quay vòng</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {(() => {
                          const validCycles = bucketDetailHistory.filter(
                            (item) => item.cycleTimeMinutes > 0,
                          );
                          return validCycles.length;
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        (Tổng {bucketDetailHistory.length} lượt rót)
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-gray-600">TB quay vòng</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(() => {
                          const validCycles = bucketDetailHistory.filter(
                            (item) => item.cycleTimeMinutes > 0,
                          );
                          if (validCycles.length === 0) return "0";
                          return Math.round(
                            validCycles.reduce(
                              (sum, item) => sum + item.cycleTimeMinutes,
                              0,
                            ) / validCycles.length,
                          );
                        })()}{" "}
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
                        data={(() => {
                          const validCycles = bucketDetailHistory.filter(
                            (item) => item.cycleTimeMinutes > 0,
                          );
                          const avgCycle =
                            validCycles.length > 0
                              ? Math.round(
                                  validCycles.reduce(
                                    (sum, i) => sum + i.cycleTimeMinutes,
                                    0,
                                  ) / validCycles.length,
                                )
                              : 0;
                          return bucketDetailHistory
                            .filter((item) => item.fullTime) // Only show items with valid time
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
                              avgCycleTime: avgCycle,
                            }));
                        })()}
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
                            {item.fullTime
                              ? format(
                                  parseISO(item.fullTime),
                                  "HH:mm dd/MM/yyyy",
                                )
                              : "N/A"}
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
