"use client";

import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import api from "@/lib/api";

export function AlertBanner() {
  const [alerts, setAlerts] = useState<{ id: string; message: string; type: "error" | "warning" }[]>([]);

  useEffect(() => {
    // Check for auth or sync issues
    const checkIssues = async () => {
      try {
        const res = await api.get("/inventory/dashboard/summary/");
        const errors = res.data.sync_errors || 0;
        if (errors > 0) {
          setAlerts(prev => [
            ...prev.filter(a => a.id !== "sync"), 
            { id: "sync", message: `You have ${errors} listing(s) with sync errors. Please check the Channels page.`, type: "error" }
          ]);
        }
      } catch (err) {
        // Handle auth errors silently here (axios interceptor handles redirects)
      }
    };

    checkIssues();
    const interval = setInterval(checkIssues, 5 * 60 * 1000); // Check every 5 mins
    return () => clearInterval(interval);
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="w-full flex flex-col items-center z-50">
      {alerts.map(alert => (
        <div 
          key={alert.id} 
          className={`w-full flex items-center justify-between px-4 py-2 text-sm ${
            alert.type === 'error' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
          }`}
        >
          <div className="flex items-center flex-1 justify-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="font-medium text-center">{alert.message}</span>
          </div>
          <button 
            onClick={() => dismissAlert(alert.id)}
            className="p-1 hover:bg-black/10 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}