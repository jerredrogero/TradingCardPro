"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMismatches, resolveMismatch } from "@/lib/api/reconciliation";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, UploadCloud, DownloadCloud, XCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";

type Mismatch = {
  id: number;
  integration: number;
  internal_quantity: number;
  channel_quantity: number;
  external_sku: string;
  external_title: string;
  status: "pending" | "push_internal" | "pull_channel" | "ignore";
  created_at: string;
  lot_details: any;
  listing_details: any;
};

export default function ReconciliationPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("pending");

  const { data: mismatches, isLoading } = useQuery<Mismatch[]>({
    queryKey: ["mismatches", filter],
    queryFn: () => fetchMismatches(filter === "all" ? undefined : filter),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: number; resolution: string }) =>
      resolveMismatch(id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mismatches"] });
      toast.success("Mismatch resolved successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to resolve mismatch");
    },
  });

  const columns: ColumnDef<Mismatch>[] = [
    {
      accessorKey: "external_sku",
      header: "SKU / Item",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.external_sku || "N/A"}</div>
          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
            {row.original.external_title || row.original.lot_details?.card?.name || "Unknown"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "internal_quantity",
      header: "Internal Qty",
      cell: ({ row }) => (
        <div className="font-semibold text-center">
          {row.original.internal_quantity ?? "N/A"}
        </div>
      ),
    },
    {
      accessorKey: "channel_quantity",
      header: "Channel Qty",
      cell: ({ row }) => (
        <div className="font-semibold text-center">
          {row.original.channel_quantity ?? "N/A"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
        let label: string = status;

        if (status === "pending") {
          variant = "destructive";
          label = "Pending Action";
        } else if (status === "push_internal" || status === "pull_channel") {
          variant = "default";
          label = "Resolved";
        } else if (status === "ignore") {
          variant = "secondary";
          label = "Ignored";
        }

        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      accessorKey: "created_at",
      header: "Detected",
      cell: ({ row }) => (
        <div className="text-sm">
          {formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const mismatch = row.original;
        
        if (mismatch.status !== "pending") return null;

        return (
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => resolveMutation.mutate({ id: mismatch.id, resolution: "push_internal" })}
              disabled={resolveMutation.isPending}
              title="Push Internal Qty to Channel"
            >
              <UploadCloud className="h-4 w-4 mr-1" /> Push
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resolveMutation.mutate({ id: mismatch.id, resolution: "pull_channel" })}
              disabled={resolveMutation.isPending}
              title="Pull Channel Qty to Internal"
            >
              <DownloadCloud className="h-4 w-4 mr-1" /> Pull
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => resolveMutation.mutate({ id: mismatch.id, resolution: "ignore" })}
              disabled={resolveMutation.isPending}
              title="Ignore Mismatch"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Reconciliation</h1>
          <p className="text-zinc-400">
            Resolve inventory mismatches between your internal database and external channels like eBay.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filter === "pending" ? "default" : "outline"} 
            onClick={() => setFilter("pending")}
            className={filter === "pending" ? "" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}
          >
            Pending
          </Button>
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            onClick={() => setFilter("all")}
            className={filter === "all" ? "" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}
          >
            All
          </Button>
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex justify-center items-center h-64 bg-zinc-900/50 border border-zinc-800 rounded-md">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        ) : (
          <DataTable columns={columns} data={mismatches || []} />
        )}
      </div>
    </div>
  );
}
