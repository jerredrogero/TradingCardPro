"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ChannelListing {
  id: number;
  integration: number;
  lot: number;
  external_listing_id: string;
  external_sku: string;
  listed_price: string | null;
  listed_quantity: number;
  sync_state: 'synced' | 'pending' | 'error' | 'delisted';
  last_synced_at: string | null;
  lot_details?: any; // Assuming we expand this in the backend later
}

export default function ListingsPage() {
  const params = useParams();
  const id = params?.id;
  const [listings, setListings] = useState<ChannelListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      fetchListings();
    }
  }, [id]);

  const fetchListings = async () => {
    try {
      const response = await api.get('/channels/listings/');
      const allListings = response.data.results || response.data;
      
      setListings(allListings.filter((l: ChannelListing) => l.integration === Number(id)));
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePushQuantity = async (listingId: number) => {
    setSyncing(listingId);
    try {
      await api.post(`/channels/listings/${listingId}/push/`);
      alert('Sync task queued successfully.');
      fetchListings(); // Refresh to see pending status
    } catch (error) {
      console.error('Error pushing quantity:', error);
      alert('Failed to push quantity.');
    } finally {
      setSyncing(null);
    }
  };

  const getSyncStateBadge = (state: string) => {
    switch (state) {
      case 'synced': return <Badge className="bg-green-100 text-green-800 border-green-200">Synced</Badge>;
      case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'delisted': return <Badge variant="outline" className="text-gray-500">Delisted</Badge>;
      default: return <Badge variant="outline">{state}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-8">Loading listings...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" asChild className="border-zinc-700 text-zinc-400 hover:bg-zinc-800">
          <Link href="/channels"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-3xl font-bold text-white">eBay Listings</h1>
      </div>

      <div className="bg-zinc-900 rounded-md border border-zinc-800 shadow-sm overflow-hidden">
        {listings.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium text-zinc-400">No listings linked yet.</p>
            <p className="text-sm mt-2">You can link inventory lots to eBay listings from the Inventory detail page.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3">eBay Item ID</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Lot ID</th>
                <th className="px-6 py-3">Listed Qty</th>
                <th className="px-6 py-3">Sync State</th>
                <th className="px-6 py-3">Last Synced</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {listings.map((listing) => (
                <tr key={listing.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-200">{listing.external_listing_id}</td>
                  <td className="px-6 py-4 text-zinc-400">{listing.external_sku || '-'}</td>
                  <td className="px-6 py-4">
                    <Link href={`/inventory/${listing.lot}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                      {listing.lot}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-zinc-300 font-semibold">{listing.listed_quantity}</td>
                  <td className="px-6 py-4">{getSyncStateBadge(listing.sync_state)}</td>
                  <td className="px-6 py-4 text-zinc-500">
                    {listing.last_synced_at ? new Date(listing.last_synced_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePushQuantity(listing.id)}
                      disabled={syncing === listing.id}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${syncing === listing.id ? 'animate-spin' : ''}`} />
                      {syncing === listing.id ? 'Syncing...' : 'Force Sync'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
