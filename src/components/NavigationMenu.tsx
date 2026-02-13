import React from "react";
import { cn } from "@/lib/utils";

interface NavigationMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface NavigationMenuProps {
  items: NavigationMenuItem[];
  activeItem: string;
  onItemClick: (itemId: string) => void;
  logo?: React.ReactNode;
  rightActions?: React.ReactNode;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  items,
  activeItem,
  onItemClick,
  logo,
  rightActions,
}) => {
  return (
    <nav className="bg-[#2c3e60] border-b border-[#1a2332] shadow-lg sticky top-0 z-50">
      <div className="flex items-center justify-between h-11">
        {/* Logo/Brand */}
        {logo && (
          <div className="flex items-center px-4 h-full border-r border-[#1a2332]">
            {logo}
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex items-center flex-1 h-full overflow-x-auto scrollbar-hide">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={cn(
                "px-4 h-full text-sm font-medium whitespace-nowrap transition-all duration-200 border-r border-[#1a2332]",
                "hover:bg-[#3d5172] flex items-center gap-2",
                activeItem === item.id
                  ? "bg-[#ff8c42] text-white"
                  : "text-gray-200 hover:text-white",
              )}
            >
              {item.icon && <span className="text-base">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Right Actions */}
        {rightActions && (
          <div className="flex items-center gap-2 px-4 h-full border-l border-[#1a2332]">
            {rightActions}
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavigationMenu;
