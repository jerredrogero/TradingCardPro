"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Package, 
  RefreshCw, 
  History, 
  Settings, 
  LogOut,
  Layers,
  Store
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Channels", href: "/channels", icon: Layers },
  { name: "Reconciliation", href: "/reconciliation", icon: RefreshCw },
  { name: "Audit Log", href: "/audit-log", icon: History },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col bg-zinc-950 text-zinc-400 border-r border-zinc-800">
      <div className="flex h-16 items-center px-6 border-b border-zinc-800">
        <Store className="h-6 w-6 text-blue-500 mr-2" />
        <span className="text-lg font-bold text-white tracking-tight">TradingCardPro</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive 
                  ? "bg-zinc-800 text-white" 
                  : "hover:bg-zinc-900 hover:text-zinc-200"
              )}
            >
              <item.icon className={cn(
                "mr-3 h-5 w-5 flex-shrink-0",
                isActive ? "text-blue-500" : "text-zinc-500"
              )} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-zinc-800 space-y-1">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Shop</p>
          <p className="text-sm font-medium text-zinc-300 truncate">
            {user?.active_shop?.name || "No Shop Selected"}
          </p>
        </div>
        
        <Link
          href="/settings"
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
            pathname === "/settings" 
              ? "bg-zinc-800 text-white" 
              : "hover:bg-zinc-900 hover:text-zinc-200"
          )}
        >
          <Settings className="mr-3 h-5 w-5 text-zinc-500" />
          Settings
        </Link>
        
        <button
          onClick={() => logout()}
          className="flex w-full items-center px-3 py-2 text-sm font-medium rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-red-400 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5 text-zinc-500" />
          Logout
        </button>
      </div>
    </div>
  );
}
