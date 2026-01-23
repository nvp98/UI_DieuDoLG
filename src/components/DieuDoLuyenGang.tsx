import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LadleData {
  id: string;
  soThung: string;
  soMe: string;
  khoiLuong: number;
  gioLayMau: string;
  gioNuocGang: string;
  gioVaoThep: string;
  stage: number; // 1: Lấy mẫu, 2: Nước gang, 3: Vào thép, 4: Hoàn thành
  trangThai: "processing" | "waiting-confirm" | "completed";
  createdAt: Date;
}

const STAGES = [
  { id: 1, name: "Bắt đầu lấy mẫu", icon: "🔬", color: "bg-purple-600" },
  { id: 2, name: "Trạm nước gang", icon: "💧", color: "bg-orange-600" },
  { id: 3, name: "Vào luyện thép", icon: "🔥", color: "bg-teal-600" },
  { id: 4, name: "Hoàn thành", icon: "✅", color: "bg-green-600" },
];

export default function DieuDoLuyenGang() {
  const [ladles, setLadles] = useState<LadleData[]>([]);
  const [selectedLadle, setSelectedLadle] = useState<LadleData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStage, setFilterStage] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    soThung: "",
    soMe: "",
    khoiLuong: "",
  });

  // Load dữ liệu mẫu
  useEffect(() => {
    const sampleData: LadleData[] = [
      {
        id: "1",
        soThung: "29",
        soMe: "GBF261F0192129",
        khoiLuong: 125.45,
        gioLayMau: "10:25",
        gioNuocGang: "",
        gioVaoThep: "",
        stage: 1,
        trangThai: "processing",
        createdAt: new Date(),
      },
      {
        id: "2",
        soThung: "64",
        soMe: "GBF261C2551764",
        khoiLuong: 115.89,
        gioLayMau: "10:43",
        gioNuocGang: "10:48",
        gioVaoThep: "",
        stage: 2,
        trangThai: "waiting-confirm",
        createdAt: new Date(),
      },
      {
        id: "3",
        soThung: "34",
        soMe: "GBF261F0192130",
        khoiLuong: 116.17,
        gioLayMau: "10:23",
        gioNuocGang: "10:28",
        gioVaoThep: "10:35",
        stage: 3,
        trangThai: "completed",
        createdAt: new Date(),
      },
    ];
    setLadles(sampleData);
  }, []);

  const handleAddLadle = (e: React.FormEvent) => {
    e.preventDefault();

    const newLadle: LadleData = {
      id: Date.now().toString(),
      soThung: formData.soThung,
      soMe: formData.soMe,
      khoiLuong: parseFloat(formData.khoiLuong),
      gioLayMau: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      gioNuocGang: "",
      gioVaoThep: "",
      stage: 1,
      trangThai: "processing",
      createdAt: new Date(),
    };

    setLadles([...ladles, newLadle]);
    setFormData({ soThung: "", soMe: "", khoiLuong: "" });
  };

  const handleConfirmNextStage = (ladleId: string) => {
    setLadles(
      ladles.map((ladle) => {
        if (ladle.id === ladleId) {
          const nextStage = ladle.stage + 1;
          const currentTime = new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          });

          let updates: Partial<LadleData> = {
            stage: nextStage,
            trangThai: nextStage === 4 ? "completed" : "processing",
          };

          if (nextStage === 2) {
            updates.gioNuocGang = currentTime;
          } else if (nextStage === 3) {
            updates.gioVaoThep = currentTime;
          }

          return { ...ladle, ...updates };
        }
        return ladle;
      }),
    );
    setIsModalOpen(false);
  };

  const handleDeleteLadle = (ladleId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa thùng này?")) {
      setLadles(ladles.filter((ladle) => ladle.id !== ladleId));
    }
  };

  const getLadlesByStage = (stageId: number) => {
    return ladles.filter((ladle) => ladle.stage === stageId);
  };

  const filteredLadles = filterStage
    ? ladles.filter((l) => l.stage === filterStage)
    : ladles;

  return (
    <div className="space-y-6">
      {/* Form nhập thùng gang mới */}
      <Card>
        <CardHeader>
          <CardTitle className="text-accent-cyan">
            📝 Nhập thùng gang mới
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddLadle} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-muted-foreground uppercase">
                  Số thùng
                </label>
                <input
                  type="text"
                  value={formData.soThung}
                  onChange={(e) =>
                    setFormData({ ...formData, soThung: e.target.value })
                  }
                  className="bg-card border-2 border-border rounded-lg px-4 py-2 text-foreground focus:border-primary focus:outline-none"
                  placeholder="VD: 29"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-muted-foreground uppercase">
                  Số mẻ (BK MIS)
                </label>
                <input
                  type="text"
                  value={formData.soMe}
                  onChange={(e) =>
                    setFormData({ ...formData, soMe: e.target.value })
                  }
                  className="bg-card border-2 border-border rounded-lg px-4 py-2 text-foreground focus:border-primary focus:outline-none"
                  placeholder="VD: GBF261F0192129"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-muted-foreground uppercase">
                  Khối lượng (tấn)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.khoiLuong}
                  onChange={(e) =>
                    setFormData({ ...formData, khoiLuong: e.target.value })
                  }
                  className="bg-card border-2 border-border rounded-lg px-4 py-2 text-foreground focus:border-primary focus:outline-none"
                  placeholder="VD: 125.45"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full md:w-auto">
              ➕ Thêm thùng gang
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Bộ lọc */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterStage === null ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStage(null)}
        >
          Tất cả ({ladles.length})
        </Button>
        {STAGES.map((stage) => (
          <Button
            key={stage.id}
            variant={filterStage === stage.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStage(stage.id)}
          >
            {stage.icon} {stage.name} ({getLadlesByStage(stage.id).length})
          </Button>
        ))}
      </div>

      {/* Hiển thị theo công đoạn */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const stageLadles = getLadlesByStage(stage.id);
          const hasActive = stageLadles.some(
            (l) =>
              l.trangThai === "processing" || l.trangThai === "waiting-confirm",
          );

          return (
            <Card
              key={stage.id}
              className={`${hasActive ? "border-red-500 shadow-lg shadow-red-500/20" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${stage.color}`}
                  >
                    {stage.icon}
                  </div>
                  <CardTitle className="text-sm text-center leading-tight">
                    {stage.name}
                  </CardTitle>
                  <Badge variant="secondary">{stageLadles.length} thùng</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                {stageLadles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm italic">
                    Chưa có thùng gang
                  </div>
                ) : (
                  stageLadles.map((ladle) => (
                    <div
                      key={ladle.id}
                      className={`relative p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/10 ${
                        ladle.trangThai === "waiting-confirm"
                          ? "border-green-500 bg-green-500/10"
                          : "border-border bg-card"
                      }`}
                      onClick={() => {
                        setSelectedLadle(ladle);
                        setIsModalOpen(true);
                      }}
                    >
                      {/* Nút xóa */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLadle(ladle.id);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs transition-all"
                      >
                        ✕
                      </button>

                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${stage.color}`}
                        >
                          {ladle.soThung}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">
                            Thùng {ladle.soThung}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {ladle.gioLayMau || "-"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ladle.khoiLuong} tấn
                          </div>
                        </div>
                      </div>

                      {ladle.trangThai === "waiting-confirm" && (
                        <Badge
                          variant="default"
                          className="mt-2 w-full justify-center bg-green-500 hover:bg-green-600"
                        >
                          ⚡ Chờ xác nhận
                        </Badge>
                      )}
                      {ladle.trangThai === "processing" && (
                        <Badge
                          variant="secondary"
                          className="mt-2 w-full justify-center"
                        >
                          ⏳ Đang xử lý
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal chi tiết và xác nhận */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedLadle && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl text-primary">
                  🏭 Thùng {selectedLadle.soThung}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Thông tin thùng */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Số mẻ (BK MIS)
                    </div>
                    <div className="font-mono font-bold">
                      {selectedLadle.soMe}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Khối lượng
                    </div>
                    <div className="font-mono font-bold">
                      {selectedLadle.khoiLuong} tấn
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-accent/5 border-2 border-primary/30 rounded-lg p-6">
                  <h3 className="font-bold text-lg mb-4 text-primary">
                    ⏱️ Tiến độ công đoạn
                  </h3>
                  <div className="flex items-center justify-between">
                    {STAGES.slice(0, 3).map((stage, idx) => {
                      const isActive = selectedLadle.stage >= stage.id;
                      const time =
                        stage.id === 1
                          ? selectedLadle.gioLayMau
                          : stage.id === 2
                            ? selectedLadle.gioNuocGang
                            : selectedLadle.gioVaoThep;

                      return (
                        <React.Fragment key={stage.id}>
                          <div className="flex flex-col items-center gap-2">
                            <div
                              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
                                isActive
                                  ? `${stage.color} shadow-lg`
                                  : "bg-gray-600 opacity-50"
                              }`}
                            >
                              {stage.icon}
                            </div>
                            <div className="text-xs text-center font-semibold max-w-[100px]">
                              {stage.name}
                            </div>
                            {time && (
                              <div className="text-xs text-green-500 font-mono bg-green-500/10 px-2 py-1 rounded border border-green-500">
                                {time}
                              </div>
                            )}
                          </div>
                          {idx < 2 && (
                            <div className="text-2xl text-muted-foreground">
                              →
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Trạng thái hiện tại */}
                <div className="bg-green-500/10 border-2 border-green-500 rounded-lg p-4 text-center">
                  <div className="text-sm text-muted-foreground mb-2">
                    CÔNG ĐOẠN HIỆN TẠI
                  </div>
                  <div className="text-xl font-bold text-green-500">
                    {STAGES.find((s) => s.id === selectedLadle.stage)?.name}
                  </div>

                  {selectedLadle.stage < 4 && (
                    <>
                      <div className="text-2xl my-3">↓</div>
                      <div className="text-sm text-muted-foreground mb-2">
                        CÔNG ĐOẠN TIẾP THEO
                      </div>
                      <div className="text-lg font-bold">
                        {
                          STAGES.find((s) => s.id === selectedLadle.stage + 1)
                            ?.name
                        }
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                {selectedLadle.stage < 4 && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleConfirmNextStage(selectedLadle.id)}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                      ✅ Xác nhận chuyển công đoạn
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1"
                    >
                      ❌ Hủy
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
