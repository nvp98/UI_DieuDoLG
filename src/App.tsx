import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getProductionDataGang,
  getProductionDataByDate,
} from "@/services/ganttService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRight, Home, Search, RefreshCw, FileDown } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { isSameDay, startOfDay, isWithinInterval, addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import * as XLSX from "xlsx";
import { FileUploader } from "@/components/file-uploader";
import DieuDoLuyenGang from "@/components/DieuDoLuyenGang";

type CarStatus = {
  id: string;
  label: string;
  duration: string;
  distance: string;
  state: "idle" | "moving" | "loading" | "unloading";
  details: {
    bucketId: string;
    steelGrade: string;
    heatId: string;
    temperature: number;
    weight: number;
    timestamps: {
      BKMIS?: string;
      BF?: string;
      BOF?: string;
    };
    chemistry: {
      C: number;
      Si: number;
      Mn: number;
      P: number;
      S: number;
      Cr?: number;
      Ni?: number;
      Cu?: number;
      Al?: number;
    };
  };
};

type Section = {
  title: string;
  items: CarStatus[];
};

const DEFAULT_SECTIONS: Section[] = [
  {
    title: "Bắt đầu lấy mẫu",
    items: [],
  },
  {
    title: "Trạm nước gang",
    items: [],
  },
  {
    title: "vào luyện thép",
    items: [],
  },
];

type LogRow = {
  time: string;
  furnace: string;
  bof: string;
  car: string;
  amountPlanned: number;
  amountActual: number;
  batch: string;
  depart: string;
  arriveWater: string;
  leaveWater: string;
  arriveSteel: string;
  leaveSteel: string;
  ladle: string;
  toYard: string;
  leaveYard: string;
};

const DEFAULT_LOGS: LogRow[] = [
  {
    time: "2025-11-20",
    furnace: "L06",
    bof: "B1",
    car: "U06",
    amountPlanned: 292.3,
    amountActual: 292.0,
    batch: "TEMP2025 112003",
    depart: "08:51:38",
    arriveWater: "08:56:21",
    leaveWater: "08:56:54",
    arriveSteel: "08:59:24",
    leaveSteel: "09:02:54",
    ladle: "",
    toYard: "",
    leaveYard: "",
  },
  {
    time: "2025-11-20",
    furnace: "L21",
    bof: "B2",
    car: "U21",
    amountPlanned: 287.0,
    amountActual: 286.7,
    batch: "TEMP2025 112005",
    depart: "07:51:20",
    arriveWater: "08:15:21",
    leaveWater: "08:16:01",
    arriveSteel: "08:37:02",
    leaveSteel: "08:52:44",
    ladle: "",
    toYard: "",
    leaveYard: "",
  },
  {
    time: "2025-11-20",
    furnace: "L16",
    bof: "B3",
    car: "U16",
    amountPlanned: 350.0,
    amountActual: 349.2,
    batch: "TEMP2025 112009",
    depart: "09:10:15",
    arriveWater: "09:26:39",
    leaveWater: "09:27:18",
    arriveSteel: "09:37:03",
    leaveSteel: "09:53:46",
    ladle: "",
    toYard: "",
    leaveYard: "",
  },
];

function parseProductionData(data: any[]): Section[] {
  // Initialize 3 sections with empty items
  const sections: Section[] = [
    { title: "Bắt đầu lấy mẫu", items: [] },
    { title: "Trạm nước gang", items: [] },
    { title: "vào luyện thép", items: [] },
  ];

  data.forEach((item: any) => {
    // Check which fields have data
    const hasBkmiSGio = !!item.bkmiS_Gio && item.bkmiS_Gio.trim() !== "";
    const hasGioNm = !!item.gio_NM && item.gio_NM.trim() !== "";
    const hasGioChonMe = !!item.gioChonMe && item.gioChonMe.trim() !== "";

    // Determine section based on rule:
    let sectionIndex = 0;
    if (hasBkmiSGio && hasGioNm && hasGioChonMe) {
      sectionIndex = 2; // vào luyện thép
    } else if (hasBkmiSGio && hasGioNm) {
      sectionIndex = 1; // Trạm nước gang
    } else if (hasBkmiSGio) {
      sectionIndex = 0; // Bắt đầu lấy mẫu
    }

    let state: CarStatus["state"] = "idle";

    // 1) Có giờ lấy mẫu nhưng chưa đến nước gang → đang di chuyển
    if (item.bkmiS_Gio && !item.gio_NM && !item.gioChonMe) {
      state = "moving";
    }

    // 2) Đã có giờ nước gang nhưng chưa vào luyện thép → loading
    if (item.bkmiS_Gio && item.gio_NM && !item.gioChonMe) {
      state = "loading";
    }

    // 3) Đã vào luyện thép BOF → unloading
    if (item.gioChonMe) {
      state = "unloading";
    }

    const carStatus: CarStatus = {
      id: item.bkmiS_ThungSo || "unknown",
      label: `Thùng ${item.bkmiS_ThungSo || ""}`,
      duration: item.gioChonMe || "",
      distance: item.g_KLGangLong?.toString() || "",
      state: state,
      details: {
        bucketId: item.bkmiS_ThungSo || "",
        steelGrade: item.macThep || "",
        heatId: item.bkmiS_SoMe || "",
        temperature: 0,
        weight: item.g_KLGangLong || 0,
        timestamps: {
          BKMIS: item.bkmiS_Gio || "",
          BF: item.gio_NM || "",
          BOF: item.gioChonMe || "",
        },
        chemistry: {
          C: 0,
          Si: 0,
          Mn: 0,
          P: 0,
          S: 0,
          Cr: 0,
          Ni: 0,
          Cu: 0,
          Al: 0,
        },
      },
    };

    sections[sectionIndex].items.push(carStatus);
  });

  return sections;
}

function convertProductionDataToLogs(data: any[]): LogRow[] {
  return data.map((item: any) => ({
    time: item.ngayTao ? format(new Date(item.ngayTao), "yyyy-MM-dd") : "",
    furnace: "",
    bof: item.chuyenDen || "",
    car: item.bkmiS_ThungSo || "",
    amountPlanned: item.g_KLGangLong || 0,
    amountActual: item.g_KLGangLong || 0,
    batch: item.bkmiS_SoMe || "",
    depart: item.bkmiS_Gio || "",
    arriveWater: item.gio_NM || "",
    leaveWater: "",
    arriveSteel: item.gioChonMe || "",
    leaveSteel: "",
    ladle: "",
    toYard: "",
    leaveYard: "",
  }));
}

function StatusChip({
  item,
  onClick,
}: {
  item: CarStatus;
  onClick: (v: CarStatus) => void;
}) {
  const getColor = () => {
    switch (item.state) {
      case "idle":
      case "moving":
        return "bg-purple-600"; // Tím cho Bắt đầu lấy mẫu
      case "loading":
        return "bg-orange-600"; // Cam cho Trạm nước gang
      case "unloading":
        return "bg-teal-600"; // Xanh lá cho vào luyện thép
      default:
        return "bg-gray-600";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onClick(item)}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ${getColor()}`}
            >
              {item.id}
            </div>
            <div className="flex flex-col text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {item.label && (
                  <Badge
                    variant="secondary"
                    className="px-2 py-0.5 text-[10px]"
                  >
                    {item.label}
                  </Badge>
                )}
                {item.duration && <span>{item.duration}</span>}
              </div>
              {item.distance && <span>{item.distance}</span>}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <div className="font-semibold">Thùng {item.details.bucketId}</div>
            <div>Mẻ {item.details.heatId}</div>
            <div>Mác {item.details.steelGrade}</div>
            <div>
              Nhiệt độ {item.details.temperature}°C • Khối lượng{" "}
              {item.details.weight} t
            </div>
            <div className="grid grid-cols-5 gap-2 mt-2">
              <div>C {item.details.chemistry.C}%</div>
              <div>Si {item.details.chemistry.Si}%</div>
              <div>Mn {item.details.chemistry.Mn}%</div>
              <div>P {item.details.chemistry.P}%</div>
              <div>S {item.details.chemistry.S}%</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function App() {
  const now = format(new Date(), "dd/MM/yyyy HH:mm", { locale: vi });
  const [selected, setSelected] = useState<CarStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [logs, setLogs] = useState<LogRow[]>(DEFAULT_LOGS);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [availableLogDates, setAvailableLogDates] = useState<Date[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bucketFilter, setBucketFilter] = useState("");
  const [currentView, setCurrentView] = useState<"dashboard" | "dieu-do">(
    "dashboard",
  );

  const zoneSections = useMemo(() => {
    return sections;
  }, [sections]);

  const loadData = useCallback(async () => {
    try {
      try {
        const productionData = await getProductionDataGang();
        if (productionData && productionData.length > 0) {
          const parsedSections = parseProductionData(productionData);
          if (parsedSections.length > 0) {
            setSections(parsedSections);
          }
        }
      } catch (err) {
        console.warn("Could not fetch production data:", err);
        setSections(DEFAULT_SECTIONS);
      }
      setLastUpdated(new Date());
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
    const poll = Number(import.meta.env.VITE_BOF_POLL_MS ?? 10000);
    const hasAnyUrl =
      !!import.meta.env.VITE_BOF_SECTIONS_URL ||
      !!import.meta.env.VITE_BOF_LOGS_URL;
    if (!hasAnyUrl) return;
    const id = setInterval(
      () => {
        loadData();
      },
      isNaN(poll) ? 10000 : poll,
    );
    return () => clearInterval(id);
  }, [loadData]);

  const handleFileProcess = async (file: File) => {
    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const sectionsSheet = wb.Sheets["Sections"];
      const logsSheet = wb.Sheets["Logs"];
      if (sectionsSheet) {
        const rows = XLSX.utils.sheet_to_json<any[]>(sectionsSheet, {
          header: 1,
          raw: false,
        });
        const header = rows[0] as string[];
        const body = rows.slice(1);
        const idx = (name: string) =>
          header.findIndex(
            (h) => String(h).toLowerCase() === name.toLowerCase(),
          );
        const titleIdx = idx("title");
        const idIdx = idx("id");
        const labelIdx = idx("label");
        const durationIdx = idx("duration");
        const distanceIdx = idx("distance");
        const stateIdx = idx("state");
        const bucketIdx = idx("bucketId");
        const steelIdx = idx("steelGrade");
        const heatIdx = idx("heatId");
        const tempIdx = idx("temperature");
        const weightIdx = idx("weight");
        const departIdx = idx("depart");
        const arriveWaterIdx = idx("arriveWater");
        const leaveWaterIdx = idx("leaveWater");
        const arriveSteelIdx = idx("arriveSteel");
        const leaveSteelIdx = idx("leaveSteel");
        const cIdx = idx("C");
        const siIdx = idx("Si");
        const mnIdx = idx("Mn");
        const pIdx = idx("P");
        const sIdx = idx("S");
        const crIdx = idx("Cr");
        const niIdx = idx("Ni");
        const cuIdx = idx("Cu");
        const alIdx = idx("Al");
        const grouped: Record<string, CarStatus[]> = {};
        for (const r of body) {
          const title = String(r[titleIdx] ?? "");
          if (!title) continue;
          const item: CarStatus = {
            id: String(r[idIdx] ?? ""),
            label: String(r[labelIdx] ?? ""),
            duration: String(r[durationIdx] ?? ""),
            distance: String(r[distanceIdx] ?? ""),
            state: String(
              r[stateIdx] ?? "idle",
            ).toLowerCase() as CarStatus["state"],
            details: {
              bucketId: String(r[bucketIdx] ?? ""),
              steelGrade: String(r[steelIdx] ?? ""),
              heatId: String(r[heatIdx] ?? ""),
              temperature: Number(r[tempIdx] ?? 0),
              weight: Number(r[weightIdx] ?? 0),
              timestamps: {
                BKMIS: String(r[departIdx] ?? "") || undefined,
                BF: String(r[arriveWaterIdx] ?? "") || undefined,
                BOF: String(r[leaveWaterIdx] ?? "") || undefined,
              },
              chemistry: {
                C: Number(r[cIdx] ?? 0),
                Si: Number(r[siIdx] ?? 0),
                Mn: Number(r[mnIdx] ?? 0),
                P: Number(r[pIdx] ?? 0),
                S: Number(r[sIdx] ?? 0),
                Cr: r[crIdx] != null ? Number(r[crIdx]) : undefined,
                Ni: r[niIdx] != null ? Number(r[niIdx]) : undefined,
                Cu: r[cuIdx] != null ? Number(r[cuIdx]) : undefined,
                Al: r[alIdx] != null ? Number(r[alIdx]) : undefined,
              },
            },
          };
          grouped[title] = grouped[title] || [];
          grouped[title].push(item);
        }
        const sec: Section[] = Object.keys(grouped).map((title) => ({
          title,
          items: grouped[title],
        }));
        if (sec.length > 0) setSections(sec);
      }
      if (logsSheet) {
        const rows = XLSX.utils.sheet_to_json<any[]>(logsSheet, {
          header: 1,
          raw: false,
        });
        const header = rows[0] as string[];
        const body = rows.slice(1);
        const idx = (name: string) =>
          header.findIndex(
            (h) => String(h).toLowerCase() === name.toLowerCase(),
          );
        const mapRow = (r: any[]): LogRow => ({
          time: String(r[idx("time")] ?? ""),
          furnace: String(r[idx("furnace")] ?? ""),
          bof: String(r[idx("bof")] ?? ""),
          car: String(r[idx("car")] ?? ""),
          amountPlanned: Number(r[idx("amountPlanned")] ?? 0),
          amountActual: Number(r[idx("amountActual")] ?? 0),
          batch: String(r[idx("batch")] ?? ""),
          depart: String(r[idx("depart")] ?? ""),
          arriveWater: String(r[idx("arriveWater")] ?? ""),
          leaveWater: String(r[idx("leaveWater")] ?? ""),
          arriveSteel: String(r[idx("arriveSteel")] ?? ""),
          leaveSteel: String(r[idx("leaveSteel")] ?? ""),
          ladle: String(r[idx("ladle")] ?? ""),
          toYard: String(r[idx("toYard")] ?? ""),
          leaveYard: String(r[idx("leaveYard")] ?? ""),
        });
        const logRows = body.map(mapRow).filter((l) => l.time);
        if (logRows.length > 0) setLogs(logRows);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (bucketFilter.trim()) {
      result = result.filter((r) =>
        r.car.toLowerCase().includes(bucketFilter.toLowerCase()),
      );
    }
    return result;
  }, [logs, bucketFilter]);

  const paginatedLogs = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    return filteredLogs.slice(startIdx, endIdx);
  }, [filteredLogs, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, pageSize, bucketFilter]);

  useEffect(() => {
    const today = new Date();
    setDateRange({ from: today, to: today });
  }, []);

  useEffect(() => {
    if (!dateRange?.from) return;

    const loadLogsByDate = async () => {
      try {
        const fromDate = format(dateRange.from!, "yyyy-MM-dd");
        const toDate = dateRange.to
          ? format(dateRange.to, "yyyy-MM-dd")
          : fromDate;

        const productionData = await getProductionDataByDate(fromDate, toDate);
        if (productionData && productionData.length > 0) {
          const logsData = convertProductionDataToLogs(productionData);
          setLogs(logsData);

          const dates = Array.from(
            new Set(
              logsData.map((l) => startOfDay(new Date(l.time)).getTime()),
            ),
          ).map((t) => new Date(t));
          setAvailableLogDates(dates);
        } else {
          setLogs([]);
        }
      } catch (error) {
        console.error("Error loading logs by date:", error);
        setLogs([]);
      }
    };

    loadLogsByDate();
  }, [dateRange]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center h-14 px-4 md:px-6 justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Home className="w-4 h-4" />
              <span className="font-semibold">BOF Dashboard</span>
            </div>
            <nav className="flex items-center gap-1">
              <Button
                variant={currentView === "dashboard" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("dashboard")}
              >
                Sơ đồ vận hành
              </Button>
              <Button
                variant={currentView === "dieu-do" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  window.open("/dieu-do-luyen-gang.html", "_blank");
                }}
              >
                Điều độ luyện gang
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Search className="w-4 h-4 mr-2" />
              Tìm kiếm
            </Button>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-headline">Sơ đồ vận hành</CardTitle>
            <Badge variant="outline">
              Cập nhật:{" "}
              {lastUpdated
                ? format(lastUpdated, "dd/MM/yyyy HH:mm", { locale: vi })
                : now}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-3">
              {zoneSections.map((section, idx) => (
                <div
                  key={section.title}
                  className="rounded-md border bg-card flex flex-col"
                >
                  <div className="px-4 py-2 border-b flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {section.title}
                    </span>
                    <Badge variant="secondary">{section.items.length}</Badge>
                  </div>
                  <div className="p-4 space-y-4 overflow-y-auto max-h-96">
                    {section.items.map((item) => (
                      <StatusChip
                        key={item.id}
                        item={item}
                        onClick={(v) => {
                          setSelected(v);
                          setOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-xl">
            {selected && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Thùng {selected.details.bucketId}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Mẻ</div>
                    <div className="font-medium">{selected.details.heatId}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Mác</div>
                    <div className="font-medium">
                      {selected.details.steelGrade}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Nhiệt độ</div>
                    <div className="font-medium">
                      {selected.details.temperature}°C
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Khối lượng</div>
                    <div className="font-medium">
                      {selected.details.weight} t
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-2 font-semibold">Thành phần hóa học</div>
                  <div className="grid grid-cols-5 gap-3 text-sm">
                    <div className="rounded border p-2">
                      C {selected.details.chemistry.C}%
                    </div>
                    <div className="rounded border p-2">
                      Si {selected.details.chemistry.Si}%
                    </div>
                    <div className="rounded border p-2">
                      Mn {selected.details.chemistry.Mn}%
                    </div>
                    <div className="rounded border p-2">
                      P {selected.details.chemistry.P}%
                    </div>
                    <div className="rounded border p-2">
                      S {selected.details.chemistry.S}%
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-2 font-semibold">Mốc thời gian</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sự kiện</TableHead>
                        <TableHead>Thời gian</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(selected.details.timestamps).map(
                        ([k, v]) => (
                          <TableRow key={k}>
                            <TableCell>{k}</TableCell>
                            <TableCell>{v}</TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Ghi chép chắt gang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {dateRange?.from
                    ? dateRange.to && !isSameDay(dateRange.from, dateRange.to)
                      ? `Từ ${format(dateRange.from, "dd/MM")} đến ${format(
                          dateRange.to!,
                          "dd/MM/yyyy",
                        )}`
                      : format(dateRange.from, "dd/MM/yyyy")
                    : "Tất cả dữ liệu"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Tổng:{" "}
                  <span className="font-semibold">{filteredLogs.length}</span>{" "}
                  bản ghi
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Nhập số thùng..."
                      value={bucketFilter}
                      onChange={(e) => setBucketFilter(e.target.value)}
                      className="w-full px-3 py-2 text-black border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="logs-date"
                      variant={"outline"}
                      className="w-auto justify-start text-left font-normal"
                    >
                      {dateRange?.from ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                          {dateRange.to
                            ? format(dateRange.to, "dd/MM/yyyy")
                            : format(dateRange.from, "dd/MM/yyyy")}
                        </>
                      ) : (
                        <span>Chọn khoảng ngày</span>
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
                      disabled={(date) => date > new Date()}
                      modifiers={{ available: availableLogDates }}
                      modifiersClassNames={{
                        available: "bg-primary/20 rounded-md",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>ngày tạo</TableHead>
                      <TableHead>chuyển đến</TableHead>
                      <TableHead>thùng số</TableHead>
                      <TableHead>mẻ gang (BK Mis)</TableHead>
                      <TableHead>khối lượng</TableHead>
                      <TableHead>giờ lấy mẫu BK Mis</TableHead>
                      <TableHead>giờ rót gang</TableHead>
                      <TableHead>giờ vào thép</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {(currentPage - 1) * pageSize + i + 1}
                          </TableCell>
                          <TableCell>{r.time}</TableCell>
                          <TableCell>{r.bof}</TableCell>
                          <TableCell>{r.car}</TableCell>
                          <TableCell>{r.batch}</TableCell>
                          <TableCell>{r.amountPlanned}</TableCell>
                          <TableCell>{r.depart}</TableCell>
                          <TableCell>{r.arriveWater}</TableCell>
                          <TableCell>{r.arriveSteel}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="text-center py-6 text-muted-foreground"
                        >
                          Không có dữ liệu
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Số dòng/trang:
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="text-sm text-muted-foreground">
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
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
