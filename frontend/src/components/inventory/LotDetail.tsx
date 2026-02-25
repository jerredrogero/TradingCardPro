"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inventoryApi } from "@/lib/api-inventory";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface LotDetailProps {
  lot: any;
  initialEvents: any[];
}

export function LotDetail({ lot: initialLot, initialEvents }: LotDetailProps) {
  const [lot, setLot] = useState<any>(initialLot);
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await inventoryApi.adjustLotQuantity(
        lot.id, 
        parseInt(delta), 
        reason || "Manual adjustment"
      );
      setLot(response);
      // Refresh events after adjustment
      const updatedEvents = await inventoryApi.getLotEvents(lot.id);
      setEvents(updatedEvents.results || updatedEvents);
      setIsAdjusting(false);
      setDelta("0");
      setReason("");
      toast.success("Quantity adjusted successfully");
    } catch (error) {
      console.error("Adjustment failed", error);
      toast.error("Failed to adjust quantity");
    }
  };

  if (!lot) return null;

  const card = lot.card || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{card.name || 'Unknown Card'}</h1>
          <p className="text-xl text-zinc-400">{card.set_name} {card.card_number ? `#${card.card_number}` : ''}</p>
        </div>
        <Badge variant={lot.status === 'available' ? 'default' : 'secondary'} className={
          lot.status === 'available' 
            ? "bg-green-900/20 text-green-400 border-green-900/50" 
            : "bg-zinc-800 text-zinc-400 border-zinc-700"
        }>
          {lot.status?.toUpperCase()}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-sm font-medium uppercase tracking-wider opacity-70">Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-400">Available</span>
              <span className="text-3xl font-bold text-white">{lot.quantity_available}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-400">Reserved</span>
              <span className="text-xl text-zinc-300">{lot.quantity_reserved}</span>
            </div>

            <Dialog open={isAdjusting} onOpenChange={setIsAdjusting}>
              <DialogTrigger asChild>
                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white border-none">Adjust Quantity</Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                  <DialogTitle>Adjust Inventory</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Manually adjust the available quantity for {lot.sku}. Use negative numbers to deduct.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdjustment} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="delta" className="text-zinc-300">Adjustment Amount (+/-)</Label>
                    <Input 
                      id="delta" 
                      type="number" 
                      value={delta} 
                      onChange={(e) => setDelta(e.target.value)} 
                      className="bg-zinc-950 border-zinc-800 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason" className="text-zinc-300">Reason / Note</Label>
                    <Input 
                      id="reason" 
                      value={reason} 
                      onChange={(e) => setReason(e.target.value)} 
                      placeholder="e.g. Found in back room, damaged" 
                      className="bg-zinc-950 border-zinc-800 text-white"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white border-none">Confirm Adjustment</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-sm font-medium uppercase tracking-wider opacity-70">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
              <div>
                <dt className="font-medium text-zinc-500 uppercase text-xs tracking-widest mb-1">SKU</dt>
                <dd className="text-zinc-200 font-mono">{lot.sku}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 uppercase text-xs tracking-widest mb-1">Condition</dt>
                <dd className="text-zinc-200">{lot.condition}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 uppercase text-xs tracking-widest mb-1">Language</dt>
                <dd className="text-zinc-200">{lot.language}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 uppercase text-xs tracking-widest mb-1">Location</dt>
                <dd className="text-zinc-200">{lot.location || "N/A"}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 uppercase text-xs tracking-widest mb-1">Cost Basis</dt>
                <dd className="text-zinc-200 font-semibold">{lot.cost_basis ? `$${lot.cost_basis}` : "N/A"}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 uppercase text-xs tracking-widest mb-1">Created</dt>
                <dd className="text-zinc-400">{new Date(lot.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="events" className="data-[state=active]:bg-zinc-800">Audit Ledger</TabsTrigger>
          <TabsTrigger value="listings" className="data-[state=active]:bg-zinc-800">Linked Listings</TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="pt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Event History</CardTitle>
              <CardDescription className="text-zinc-400">Append-only ledger of all quantity changes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">No events recorded.</div>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="flex justify-between items-center py-3 border-b border-zinc-800 last:border-0">
                      <div>
                        <div className="font-medium flex items-center gap-2 text-zinc-200">
                          <Badge variant="outline" className="bg-zinc-950 border-zinc-700 text-zinc-400 uppercase text-[10px]">{event.event_type}</Badge>
                          <span className={event.quantity_delta > 0 ? "text-green-400" : event.quantity_delta < 0 ? "text-red-400" : "text-zinc-400"}>
                            {event.quantity_delta > 0 ? '+' : ''}{event.quantity_delta}
                          </span>
                          <span className="text-zinc-500 text-sm">
                            → {event.resulting_quantity}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          By {event.actor_name || 'System'} • {new Date(event.created_at).toLocaleString()}
                          {event.metadata?.reason && ` • "${event.metadata.reason}"`}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="listings" className="pt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-12 text-center text-zinc-500">
              <p className="text-lg font-medium text-zinc-400 mb-2">eBay Integration</p>
              <p className="max-w-md mx-auto">Link this inventory lot to eBay listings from the Channels page to enable automatic stock syncing.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
