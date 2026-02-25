"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Integration {
  id: number;
  provider: string;
  status: string;
  token_expiry: string;
  last_poll_cursor: string | null;
}

export default function ChannelsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const message = searchParams.get('message');

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await api.get('/channels/integrations/');
      setIntegrations(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectEbay = async () => {
    setConnecting(true);
    try {
      // First, get all integrations to see if we already have one
      const listRes = await api.get('/channels/integrations/');
      const existingEbay = (listRes.data.results || listRes.data).find((i: any) => i.provider === 'ebay');
      
      let integrationId;
      if (existingEbay) {
        integrationId = existingEbay.id;
      } else {
        // Create a disconnected integration record
        const createRes = await api.post('/channels/integrations/', { provider: 'ebay' });
        integrationId = createRes.data.id;
      }

      // Get the auth URL
      const connectRes = await api.post(`/channels/integrations/${integrationId}/connect/`);
      
      // Redirect to eBay
      if (connectRes.data.auth_url) {
        window.location.href = connectRes.data.auth_url;
      }
    } catch (error) {
      console.error('Error connecting eBay:', error);
      alert('Failed to initiate eBay connection. Please try again.');
      setConnecting(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading channels...</div>;
  }

  const activeEbay = integrations.find(i => i.provider === 'ebay' && i.status === 'active');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Sales Channels</h1>
      </div>

      {status === 'success' && (
        <Alert className="bg-green-900/20 border-green-900/50 text-green-400">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertTitle className="text-green-400">Success!</AlertTitle>
          <AlertDescription className="text-green-400/80">
            Successfully connected to eBay. Your inventory will now begin syncing.
          </AlertDescription>
        </Alert>
      )}

      {status === 'error' && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-900/50 text-red-400">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Connection Failed</AlertTitle>
          <AlertDescription className="text-red-400/80">
            {message === 'AuthFailed' 
              ? 'Could not authenticate with eBay. Please try again.' 
              : 'An unexpected error occurred while connecting the channel.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* eBay Integration Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              eBay
              {activeEbay ? (
                <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-900/50">Active</Badge>
              ) : (
                <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">Disconnected</Badge>
              )}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Sync your inventory and orders with eBay.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeEbay ? (
              <div className="space-y-2 text-sm text-zinc-300">
                <p>Connected Integration ID: {activeEbay.id}</p>
                <p>Status: {activeEbay.status}</p>
                {activeEbay.token_expiry && (
                  <p>Token Expires: {new Date(activeEbay.token_expiry).toLocaleString()}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Connect your eBay seller account to automatically sync stock levels and import orders.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            {activeEbay ? (
              <>
                <Button variant="outline" asChild className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  <Link href={`/channels/${activeEbay.id}/listings`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Manage Listings
                  </Link>
                </Button>
                {/* Could add a disconnect button here */}
              </>
            ) : (
              <Button onClick={handleConnectEbay} disabled={connecting} className="w-full bg-blue-600 hover:bg-blue-700 text-white border-none">
                <LinkIcon className="mr-2 h-4 w-4" />
                {connecting ? 'Connecting...' : 'Connect eBay'}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* TCGPlayer placeholder */}
        <Card className="opacity-60 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              TCGPlayer
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">Coming Soon</Badge>
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Sync your inventory with TCGPlayer marketplace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">
              Support for TCGPlayer is planned for a future release.
            </p>
          </CardContent>
          <CardFooter>
            <Button disabled variant="outline" className="w-full border-zinc-700 text-zinc-500">Connect TCGPlayer</Button>
          </CardFooter>
        </Card>
      </div>

      {integrations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-white">Integration History</h2>
          <div className="bg-zinc-900 rounded-md border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-950 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3">Provider</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Last Polled</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {integrations.map((integration) => (
                  <tr key={integration.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-200">{integration.provider}</td>
                    <td className="px-6 py-4">
                      <Badge variant={integration.status === 'active' ? 'default' : 'secondary'} className={integration.status === 'active' ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' : 'bg-zinc-800 text-zinc-400'}>
                        {integration.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      {integration.last_poll_cursor ? new Date(integration.last_poll_cursor).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="link" size="sm" asChild className="text-blue-400 hover:text-blue-300">
                        <Link href={`/channels/${integration.id}/listings`}>View Listings</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
