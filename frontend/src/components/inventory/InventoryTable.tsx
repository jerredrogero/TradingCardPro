"use client";

import { useState, useEffect } from "react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { inventoryApi } from "@/lib/api-inventory";
import { toast } from "sonner";

export function InventoryTable() {
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLots = async () => {
      try {
        const data = await inventoryApi.getLots();
        setLots(data.results || data);
      } catch (error) {
        console.error("Failed to fetch inventory:", error);
        toast.error("Failed to load inventory.");
      } finally {
        setLoading(false);
      }
    };
    fetchLots();
  }, []);

  const filteredLots = lots.filter((lot) => 
    lot.sku?.toLowerCase().includes(search.toLowerCase()) ||
    lot.card?.name?.toLowerCase().includes(search.toLowerCase()) ||
    lot.card?.set_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search SKU, name, or set..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm border-zinc-800 bg-zinc-950 text-zinc-300"
        />
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white border-none">
          <Link href="/inventory/new">Add Inventory</Link>
        </Button>
      </div>

      <div className="rounded-md border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-950">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">SKU</TableHead>
              <TableHead className="text-zinc-400">Card</TableHead>
              <TableHead className="text-zinc-400">Condition</TableHead>
              <TableHead className="text-zinc-400">Available</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-right text-zinc-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="text-center py-12 text-zinc-500">
                  Loading inventory...
                </TableCell>
              </TableRow>
            ) : filteredLots.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="text-center py-12 text-zinc-500">
                  No inventory found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLots.map((lot) => (
                <TableRow key={lot.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                  <TableCell className="font-medium text-zinc-200">{lot.sku}</TableCell>
                  <TableCell>
                    <div className="text-zinc-200">{lot.card?.name || 'Unknown Card'}</div>
                    <div className="text-xs text-zinc-500">{lot.card?.set_name}</div>
                  </TableCell>
                  <TableCell className="text-zinc-400">{lot.condition}</TableCell>
                  <TableCell className="text-zinc-300 font-semibold">{lot.quantity_available}</TableCell>
                  <TableCell>
                    <Badge variant={lot.status === 'available' ? 'default' : 'secondary'} className={
                      lot.status === 'available' 
                        ? "bg-green-900/20 text-green-400 border-green-900/50" 
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }>
                      {lot.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20">
                      <Link href={`/inventory/${lot.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
