"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Event {
  id: number;
  lot: number;
  event_type: string;
  quantity_delta: number;
  resulting_quantity: number;
  actor_name: string;
  metadata: any;
  created_at: string;
}

export default function AuditLogPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/inventory/events/?search=${searchTerm}`);
      setEvents(response.data.results || response.data);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
      </div>

      <div className="flex justify-between items-center gap-4">
        <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center space-x-2">
          <Input 
            type="text" 
            placeholder="Search events..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Lot ID</TableHead>
              <TableHead>Delta</TableHead>
              <TableHead>New Qty</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No events found.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{format(new Date(event.created_at), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                  <TableCell className="capitalize">{event.event_type.replace('_', ' ')}</TableCell>
                  <TableCell>{event.lot}</TableCell>
                  <TableCell>
                    <span className={event.quantity_delta > 0 ? "text-green-600 font-medium" : event.quantity_delta < 0 ? "text-red-600 font-medium" : ""}>
                      {event.quantity_delta > 0 ? '+' : ''}{event.quantity_delta}
                    </span>
                  </TableCell>
                  <TableCell>{event.resulting_quantity}</TableCell>
                  <TableCell>{event.actor_name || 'System'}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {JSON.stringify(event.metadata)}
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
