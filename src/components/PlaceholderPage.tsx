import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
}) => {
  return (
    <div className="p-6 space-y-6 bg-gray-100 min-h-screen">
      <Card className="border-dashed bg-white shadow-sm border-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-gray-900">
            <Construction className="w-6 h-6 text-orange-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Construction className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 text-lg mb-2 font-medium">
              {description || "Trang này đang được phát triển"}
            </p>
            <p className="text-gray-500 text-sm">
              Nội dung sẽ được cập nhật sớm
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
