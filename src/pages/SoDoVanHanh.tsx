import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getGangNhatTrinhLatest,
  ThungGangData,
  searchGangNhatTrinh,
} from "@/services/ganttService";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import {
  ArrowLeft,
  Truck,
  Hourglass,
  Factory,
  User,
  Flame,
  CheckCircle,
  Droplet,
  Droplets,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type CarStatus = {
  id: string;
  label: string;
  stage: string;
  state: "waiting" | "in-progress" | "completed";
  details: {
    bucketId: string;
    bucketNumber: string;
    furnace: string;
    destination: string;
    KhoiLuong: number;
    me: string;
    mac: string | null;
    timestamps: {
      G_BatDauRot?: string | null; // Bắt đầu rót gang
      G_RotDayThung?: string | null; // Rót đầy thùng
      GioBatDau?: string | null; // Bắt đầu vận chuyển
      GioVaoLT?: string | null; // Đến gian chờ luyện thép
      GioVaoKR?: string | null; // Vào KR
      GioRaKR?: string | null; // Ra KR
      GioRotXong?: string | null; // Rót xong vào LT
      GioRaLT?: string | null; // Ra luyện thép
    };
    chemistry: {
      C: number;
      Si: number;
      Mn: number;
      P: number;
      S: number;
      Ti: number;
    };
  };
};

type Section = {
  title: string;
  items: CarStatus[];
};

const STAGE_SECTIONS = [
  {
    title: "1. Bắt đầu rót gang",
    key: "G_BatDauRot",
    color: "bg-white border-purple-200",
    headerColor: "bg-purple-100 border-l-4 border-l-purple-500",
  },
  {
    title: "2. Rót đầy thùng",
    key: "G_RotDayThung",
    color: "bg-white border-blue-200",
    headerColor: "bg-blue-100 border-l-4 border-l-blue-500",
  },
  {
    title: "3. Bắt đầu vận chuyển",
    key: "GioBatDau",
    color: "bg-white border-cyan-200",
    headerColor: "bg-cyan-100 border-l-4 border-l-cyan-500",
  },
  {
    title: "4. Đến gian chờ luyện thép",
    key: "GioVaoLT",
    color: "bg-white border-teal-200",
    headerColor: "bg-teal-100 border-l-4 border-l-teal-500",
  },
  {
    title: "5. Vào KR",
    key: "GioVaoKR",
    color: "bg-white border-green-200",
    headerColor: "bg-green-100 border-l-4 border-l-green-500",
  },
  {
    title: "6. Ra KR",
    key: "GioRaKR",
    color: "bg-white border-lime-200",
    headerColor: "bg-lime-100 border-l-4 border-l-lime-500",
  },
  {
    title: "7. Rót xong vào LT",
    key: "GioRotXong",
    color: "bg-white border-yellow-200",
    headerColor: "bg-yellow-100 border-l-4 border-l-yellow-500",
  },
  {
    title: "8. Ra luyện thép",
    key: "GioRaLT",
    color: "bg-white border-orange-200",
    headerColor: "bg-orange-100 border-l-4 border-l-orange-500",
  },
];

type LogRow = {
  time: string;
  bucketNumber: string;
  me: string;
  furnace: string;
  destination: string;
  KhoiLuong: number;
  G_BatDauRot: string;
  G_RotDayThung: string;
  GioBatDau: string;
  GioVaoLT: string;
  GioVaoKR: string;
  GioRaKR: string;
  GioRotXong: string;
  GioRaLT: string;
};

// Parse dữ liệu thùng gang thành các sections theo công đoạn
function parseGangNhatTrinhData(data: ThungGangData[]): Section[] {
  // Khởi tạo 8 sections theo công đoạn
  const sections: Section[] = STAGE_SECTIONS.map((stage) => ({
    title: stage.title,
    items: [],
  }));

  data.forEach((item: ThungGangData) => {
    // Xác định công đoạn hiện tại của thùng (công đoạn cuối cùng có dữ liệu)
    let currentStageIndex = -1;

    if (item.GioRaLT)
      currentStageIndex = 7; // Ra luyện thép
    else if (item.GioRotXong)
      currentStageIndex = 6; // Rót xong vào LT
    else if (item.GioRaKR)
      currentStageIndex = 5; // Ra KR
    else if (item.GioVaoKR)
      currentStageIndex = 4; // Vào KR
    else if (item.GioVaoLT)
      currentStageIndex = 3; // Đến gian chờ luyện thép
    else if (item.GioBatDau)
      currentStageIndex = 2; // Bắt đầu vận chuyển
    else if (item.G_RotDayThung)
      currentStageIndex = 1; // Rót đầy thùng
    else if (item.G_BatDauRot || item.T_BatDauRot) currentStageIndex = 0; // Bắt đầu rót gang

    if (currentStageIndex === -1) return; // Bỏ qua nếu không có dữ liệu

    // Xác định trạng thái
    let state: CarStatus["state"] = "waiting";
    if (currentStageIndex === 7)
      state = "completed"; // Hoàn thành
    else if (currentStageIndex >= 0) state = "in-progress"; // Đang thực hiện

    const carStatus: CarStatus = {
      id: item.ID.toString(),
      label: ` ${item.DiemDau} → ${item.DiemDen}`,
      stage: STAGE_SECTIONS[currentStageIndex].title,
      state: state,
      details: {
        bucketId: item.ID.toString(),
        bucketNumber: item.SoThung,
        furnace: item.DiemDau,
        destination: item.DiemDen,
        KhoiLuong: item.KhoiLuong,
        me: item.Me,
        mac: item.Mac,
        timestamps: {
          G_BatDauRot: item.G_BatDauRot || item.T_BatDauRot,
          G_RotDayThung: item.G_RotDayThung,
          GioBatDau: item.GioBatDau,
          GioVaoLT: item.GioVaoLT,
          GioVaoKR: item.GioVaoKR,
          GioRaKR: item.GioRaKR,
          GioRotXong: item.GioRotXong,
          GioRaLT: item.GioRaLT,
        },
        chemistry: {
          C: item.C,
          Si: item.Si,
          Mn: item.Mn,
          P: item.P,
          S: item.S,
          Ti: item.Ti,
        },
      },
    };

    sections[currentStageIndex].items.push(carStatus);
  });

  return sections;
}

// Convert sang format cho bảng log
function convertGangNhatTrinhToLogs(data: ThungGangData[]): LogRow[] {
  return data.map((item: ThungGangData) => ({
    time: item.NgaySX
      ? format(new Date(item.NgaySX), "yyyy-MM-dd", { locale: vi })
      : "",
    bucketNumber: item.SoThung,
    me: item.Me,
    furnace: item.DiemDau,
    destination: item.DiemDen,
    KhoiLuong: item.KhoiLuong,
    G_BatDauRot: item.G_BatDauRot || item.T_BatDauRot || "",
    G_RotDayThung: item.G_RotDayThung || "",
    GioBatDau: item.GioBatDau || "",
    GioVaoLT: item.GioVaoLT || "",
    GioVaoKR: item.GioVaoKR || "",
    GioRaKR: item.GioRaKR || "",
    GioRotXong: item.GioRotXong || "",
    GioRaLT: item.GioRaLT || "",
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
      case "waiting":
        return "bg-gray-500"; // Xám cho đang chờ
      case "in-progress":
        return "bg-blue-600"; // Xanh dương cho đang thực hiện
      case "completed":
        return "bg-green-600"; // Xanh lá cho hoàn thành
      default:
        return "bg-gray-600";
    }
  };

  const getTime = () => {
    const timestamps = item.details.timestamps;
    // Lấy timestamp của công đoạn hiện tại
    if (timestamps.GioRaLT)
      return format(new Date(timestamps.GioRaLT), "HH:mm");
    if (timestamps.GioRotXong)
      return format(new Date(timestamps.GioRotXong), "HH:mm");
    if (timestamps.GioRaKR)
      return format(new Date(timestamps.GioRaKR), "HH:mm");
    if (timestamps.GioVaoKR)
      return format(new Date(timestamps.GioVaoKR), "HH:mm");
    if (timestamps.GioVaoLT)
      return format(new Date(timestamps.GioVaoLT), "HH:mm");
    if (timestamps.GioBatDau)
      return format(new Date(timestamps.GioBatDau), "HH:mm");
    if (timestamps.G_RotDayThung)
      return format(new Date(timestamps.G_RotDayThung), "HH:mm");
    if (timestamps.G_BatDauRot)
      return format(new Date(timestamps.G_BatDauRot), "HH:mm");
    return "";
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
              {item.details.bucketNumber}
            </div>
            <div className="flex flex-col text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">
                  {item.label}
                </Badge>
                <span>{getTime()}</span>
              </div>
              <span>
                {item.details.KhoiLuong
                  ? item.details.KhoiLuong.toFixed(1)
                  : "0"}
                T
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <div className="font-semibold">
              Thùng {item.details.bucketNumber}
            </div>
            <div>Mẻ: {item.details.me}</div>
            <div>Mác: {item.details.mac || "N/A"}</div>
            <div>
              Khối lượng:{" "}
              {item.details.KhoiLuong ? item.details.KhoiLuong.toFixed(1) : "0"}{" "}
              T
            </div>
            <div className="grid grid-cols-6 gap-2 mt-2">
              <div>
                C{" "}
                {item.details.chemistry.C
                  ? item.details.chemistry.C.toFixed(3)
                  : "0.000"}
                %
              </div>
              <div>
                Si{" "}
                {item.details.chemistry.Si
                  ? item.details.chemistry.Si.toFixed(3)
                  : "0.000"}
                %
              </div>
              <div>
                Mn{" "}
                {item.details.chemistry.Mn
                  ? item.details.chemistry.Mn.toFixed(3)
                  : "0.000"}
                %
              </div>
              <div>
                P{" "}
                {item.details.chemistry.P
                  ? item.details.chemistry.P.toFixed(3)
                  : "0.000"}
                %
              </div>
              <div>
                S{" "}
                {item.details.chemistry.S
                  ? item.details.chemistry.S.toFixed(3)
                  : "0.000"}
                %
              </div>
              <div>
                Ti{" "}
                {item.details.chemistry.Ti
                  ? item.details.chemistry.Ti.toFixed(3)
                  : "0.000"}
                %
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function SoDoVanHanh({ onBack }: { onBack?: () => void }) {
  const now = format(new Date(), "dd/MM/yyyy HH:mm", { locale: vi });
  const [selected, setSelected] = useState<CarStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>(
    STAGE_SECTIONS.map((stage) => ({ title: stage.title, items: [] })),
  );
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bucketFilter, setBucketFilter] = useState("");
  const [furnaceFilter, setFurnaceFilter] = useState<number | "">("");
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: today,
    to: today,
  });

  const zoneSections = useMemo(() => {
    return sections;
  }, [sections]);

  const loadData = useCallback(async () => {
    try {
      const gangData = await getGangNhatTrinhLatest();
      if (gangData && gangData.length > 0) {
        const parsedSections = parseGangNhatTrinhData(gangData);
        setSections(parsedSections);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error("❌ Lỗi khi load dữ liệu gang nhật trình:", error);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const params: any = {};

      if (furnaceFilter) {
        params.idLoCao = furnaceFilter;
      }
      if (dateRange?.from) {
        params.fromDate = format(dateRange.from, "yyyy-MM-dd");
      }
      if (dateRange?.to) {
        params.toDate = format(dateRange.to, "yyyy-MM-dd");
      }
      if (bucketFilter.trim()) {
        params.soThung = bucketFilter.trim();
      }

      const logsData = await searchGangNhatTrinh(params);
      const convertedLogs = convertGangNhatTrinhToLogs(logsData);
      setLogs(convertedLogs);
    } catch (error) {
      console.error("❌ Lỗi khi load logs:", error);
    }
  }, [furnaceFilter, dateRange, bucketFilter]);

  useEffect(() => {
    loadData();
    const poll = Number(import.meta.env.VITE_BOF_POLL_MS ?? 10000);
    const id = setInterval(
      () => {
        loadData();
      },
      isNaN(poll) ? 10000 : poll,
    );
    return () => clearInterval(id);
  }, [loadData]);

  const filteredLogs = useMemo(() => {
    return logs;
  }, [logs]);

  const paginatedLogs = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    return filteredLogs.slice(startIdx, endIdx);
  }, [filteredLogs, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, bucketFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <main className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Điều độ Vận Hành
            </h1>
            <p className="text-gray-600 mt-1">
              Theo dõi và quản lý vận hành thùng gang
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Cập nhật:{" "}
            {lastUpdated
              ? format(lastUpdated, "dd/MM/yyyy HH:mm", { locale: vi })
              : now}
          </Badge>
        </div>

        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
        )}

        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">
              Sơ đồ vận hành
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {zoneSections.map((section, idx) => (
                <div
                  key={section.title}
                  className={`rounded-lg border flex flex-col min-w-[200px] shadow-sm ${STAGE_SECTIONS[idx]?.color || "bg-card"}`}
                >
                  <div
                    className={`px-3 py-2 border-b flex items-center justify-between rounded-t-lg ${STAGE_SECTIONS[idx]?.headerColor || "bg-muted"}`}
                  >
                    <span className="text-xs font-semibold whitespace-nowrap">
                      {section.title}
                    </span>
                    <Badge variant="secondary" className="ml-2">
                      {section.items.length}
                    </Badge>
                  </div>
                  <div className="p-3 space-y-3 overflow-y-auto max-h-[400px] min-h-[150px]">
                    {section.items.length > 0 ? (
                      section.items.map((item) => (
                        <StatusChip
                          key={item.id}
                          item={item}
                          onClick={(v) => {
                            setSelected(v);
                            setOpen(true);
                          }}
                        />
                      ))
                    ) : (
                      <div className="text-xs text-gray-600 text-center py-8">
                        Không có dữ liệu
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl">
            {selected && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle>
                    Chi tiết Thùng {selected.details.bucketNumber}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-700">Số thùng</div>
                    <div className="font-medium text-gray-900">
                      {selected.details.bucketNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-700">Mẻ</div>
                    <div className="font-medium text-gray-900">
                      {selected.details.me}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-700">Mác</div>
                    <div className="font-medium text-gray-900">
                      {selected.details.mac || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-700">Khối lượng</div>
                    <div className="font-medium text-gray-900">
                      {selected.details.KhoiLuong
                        ? selected.details.KhoiLuong.toFixed(2)
                        : "0"}{" "}
                      T
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-700">Từ</div>
                    <div className="font-medium text-gray-900">
                      {selected.details.furnace}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-700">Đến</div>
                    <div className="font-medium text-gray-900">
                      {selected.details.destination}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-2 font-semibold text-gray-900">
                    Thành phần hóa học
                  </div>
                  <div className="grid grid-cols-6 gap-3 text-sm">
                    <div className="rounded border p-2">
                      <div className="text-xs text-gray-700">C</div>
                      <div className="font-medium text-gray-900">
                        {selected.details.chemistry.C
                          ? selected.details.chemistry.C.toFixed(3)
                          : "0.000"}
                        %
                      </div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-xs text-gray-700">Si</div>
                      <div className="font-medium text-gray-900">
                        {selected.details.chemistry.Si
                          ? selected.details.chemistry.Si.toFixed(3)
                          : "0.000"}
                        %
                      </div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-xs text-gray-700">Mn</div>
                      <div className="font-medium text-gray-900">
                        {selected.details.chemistry.Mn
                          ? selected.details.chemistry.Mn.toFixed(3)
                          : "0.000"}
                        %
                      </div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-xs text-gray-700">P</div>
                      <div className="font-medium text-gray-900">
                        {selected.details.chemistry.P
                          ? selected.details.chemistry.P.toFixed(3)
                          : "0.000"}
                        %
                      </div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-xs text-gray-700">S</div>
                      <div className="font-medium text-gray-900">
                        {selected.details.chemistry.S
                          ? selected.details.chemistry.S.toFixed(3)
                          : "0.000"}
                        %
                      </div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-xs text-gray-700">Ti</div>
                      <div className="font-medium text-gray-900">
                        {selected.details.chemistry.Ti
                          ? selected.details.chemistry.Ti.toFixed(3)
                          : "0.000"}
                        %
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-3 font-semibold text-gray-900">
                    Lịch sử công đoạn
                  </div>
                  <div className="flex items-start gap-1 overflow-x-auto pb-2">
                    {/* Bắt đầu rót gang */}
                    {selected.details.timestamps.G_BatDauRot && (
                      <>
                        <div className="flex flex-col items-center min-w-[90px]">
                          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-1.5">
                            <Droplet className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                          </div>
                          <div className="text-[10px] font-medium text-center mb-0.5 leading-tight px-1">
                            Bắt đầu rót
                          </div>
                          <div className="text-[10px] text-gray-600 text-center">
                            {format(
                              new Date(selected.details.timestamps.G_BatDauRot),
                              "HH:mm:ss",
                              { locale: vi },
                            )}
                          </div>
                        </div>
                        {selected.details.timestamps.G_RotDayThung && (
                          <div className="flex items-center pt-4">
                            <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Rót đầy thùng */}
                    {selected.details.timestamps.G_RotDayThung && (
                      <>
                        <div className="flex flex-col items-center min-w-[90px]">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-1.5">
                            <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                          </div>
                          <div className="text-[10px] font-medium text-center mb-0.5 leading-tight px-1">
                            Rót đầy
                          </div>
                          <div className="text-[10px] text-gray-600 text-center">
                            {format(
                              new Date(
                                selected.details.timestamps.G_RotDayThung,
                              ),
                              "HH:mm:ss",
                              { locale: vi },
                            )}
                          </div>
                        </div>
                        {selected.details.timestamps.GioBatDau && (
                          <div className="flex items-center pt-4">
                            <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Bắt đầu vận chuyển */}
                    {selected.details.timestamps.GioBatDau && (
                      <>
                        <div className="flex flex-col items-center min-w-[90px]">
                          <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center mb-1.5">
                            <Truck className="w-5 h-5 text-cyan-600 dark:text-cyan-300" />
                          </div>
                          <div className="text-[10px] font-medium text-center mb-0.5 leading-tight px-1">
                            Vận chuyển
                          </div>
                          <div className="text-[10px] text-gray-600 text-center">
                            {format(
                              new Date(selected.details.timestamps.GioBatDau),
                              "HH:mm:ss",
                              { locale: vi },
                            )}
                          </div>
                        </div>
                        {selected.details.timestamps.GioVaoLT && (
                          <div className="flex items-center pt-4">
                            <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Đến gian chờ luyện thép */}
                    {selected.details.timestamps.GioVaoLT && (
                      <>
                        <div className="flex flex-col items-center min-w-[90px]">
                          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center mb-1.5">
                            <Hourglass className="w-5 h-5 text-teal-600 dark:text-teal-300" />
                          </div>
                          <div className="text-[10px] font-medium text-center mb-0.5 leading-tight px-1">
                            Gian chờ
                          </div>
                          <div className="text-[10px] text-gray-600 text-center">
                            {format(
                              new Date(selected.details.timestamps.GioVaoLT),
                              "HH:mm:ss",
                              { locale: vi },
                            )}
                          </div>
                        </div>
                        {selected.details.timestamps.GioVaoKR && (
                          <div className="flex items-center pt-4">
                            <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Vào KR */}
                    {selected.details.timestamps.GioVaoKR && (
                      <>
                        <div className="flex flex-col items-center min-w-[90px]">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-1.5">
                            <Factory className="w-5 h-5 text-green-600 dark:text-green-300" />
                          </div>
                          <div className="text-[10px] font-medium text-center mb-0.5 leading-tight px-1">
                            Vào KR
                          </div>
                          <div className="text-[10px] text-gray-600 text-center">
                            {format(
                              new Date(selected.details.timestamps.GioVaoKR),
                              "HH:mm:ss",
                              { locale: vi },
                            )}
                          </div>
                        </div>
                        {selected.details.timestamps.GioRaKR && (
                          <div className="flex items-center pt-4">
                            <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Ra KR */}
                    {selected.details.timestamps.GioRaKR && (
                      <>
                        <div className="flex flex-col items-center min-w-[90px]">
                          <div className="w-10 h-10 rounded-full bg-lime-100 dark:bg-lime-900 flex items-center justify-center mb-1.5">
                            <User className="w-5 h-5 text-lime-600 dark:text-lime-300" />
                          </div>
                          <div className="text-[10px] font-medium text-center mb-0.5 leading-tight px-1">
                            Ra KR
                          </div>
                          <div className="text-[10px] text-gray-600 text-center">
                            {format(
                              new Date(selected.details.timestamps.GioRaKR),
                              "HH:mm:ss",
                              { locale: vi },
                            )}
                          </div>
                        </div>
                        {selected.details.timestamps.GioRotXong && (
                          <div className="flex items-center pt-4">
                            <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Rót xong vào LT */}
                    {selected.details.timestamps.GioRotXong && (
                      <>
                        <div className="flex flex-col items-center min-w-[90px]">
                          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center mb-1.5">
                            <Flame className="w-5 h-5 text-yellow-600 dark:text-yellow-300" />
                          </div>
                          <div className="text-[10px] font-medium text-center mb-0.5 leading-tight px-1">
                            Rót xong
                          </div>
                          <div className="text-[10px] text-gray-600 text-center">
                            {format(
                              new Date(selected.details.timestamps.GioRotXong),
                              "HH:mm:ss",
                              { locale: vi },
                            )}
                          </div>
                        </div>
                        {selected.details.timestamps.GioRaLT && (
                          <div className="flex items-center pt-4">
                            <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Ra luyện thép */}
                    {selected.details.timestamps.GioRaLT && (
                      <div className="flex flex-col items-center min-w-[90px]">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-1.5">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300" />
                        </div>
                        <div className="text-[10px] font-medium text-center mb-0.5 leading-tight px-1">
                          Hoàn thành
                        </div>
                        <div className="text-[10px] text-gray-600 text-center">
                          {format(
                            new Date(selected.details.timestamps.GioRaLT),
                            "HH:mm:ss",
                            { locale: vi },
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">
              Ghi chép chắt gang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm text-gray-600">
                  Tổng:{" "}
                  <span className="font-semibold text-gray-900">
                    {filteredLogs.length}
                  </span>{" "}
                  bản ghi
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={furnaceFilter}
                    onChange={(e) =>
                      setFurnaceFilter(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả lò cao</option>
                    <option value="1">Lò Cao 1</option>
                    <option value="2">Lò Cao 2</option>
                    <option value="3">Lò Cao 3</option>
                    <option value="4">Lò Cao 4</option>
                    <option value="5">Lò Cao 5</option>
                    <option value="6">Lò Cao 6</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Nhập số thùng"
                    value={bucketFilter}
                    onChange={(e) => setBucketFilter(e.target.value)}
                    className="px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                      >
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
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100 border-b border-gray-200">
                      <TableHead className="text-gray-700 font-semibold">
                        #
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Ngày SX
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Số thùng
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Mẻ
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Từ
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Đến
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        KL (T)
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Bắt đầu rót
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Rót đầy
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Bắt đầu VC
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Đến LT
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Vào KR
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Ra KR
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Rót xong
                      </TableHead>
                      <TableHead className="text-gray-700 font-semibold">
                        Ra LT
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((r, i) => (
                        <TableRow key={i} className="hover:bg-gray-50">
                          <TableCell>
                            {(currentPage - 1) * pageSize + i + 1}
                          </TableCell>
                          <TableCell className="text-gray-900">
                            {r.time}
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {r.bucketNumber}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-900">
                            {r.me}
                          </TableCell>
                          <TableCell className="text-gray-900">
                            {r.furnace}
                          </TableCell>
                          <TableCell className="text-gray-900">
                            {r.destination}
                          </TableCell>
                          <TableCell className="text-right text-gray-900">
                            {r.KhoiLuong ? r.KhoiLuong.toFixed(1) : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-gray-900">
                            {r.G_BatDauRot
                              ? format(new Date(r.G_BatDauRot), "HH:mm:ss")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.G_RotDayThung
                              ? format(new Date(r.G_RotDayThung), "HH:mm:ss")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.GioBatDau
                              ? format(new Date(r.GioBatDau), "HH:mm:ss")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.GioVaoLT
                              ? format(new Date(r.GioVaoLT), "HH:mm:ss")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.GioVaoKR
                              ? format(new Date(r.GioVaoKR), "HH:mm:ss")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.GioRaKR
                              ? format(new Date(r.GioRaKR), "HH:mm:ss")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.GioRotXong
                              ? format(new Date(r.GioRotXong), "HH:mm:ss")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.GioRaLT
                              ? format(new Date(r.GioRaLT), "HH:mm:ss")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={15}
                          className="text-center text-gray-600"
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
                  <span className="text-sm text-gray-600">Số dòng/trang:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
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
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
