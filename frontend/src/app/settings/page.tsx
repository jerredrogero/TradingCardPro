"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";

export default function SettingsPage() {
  const { user } = useAuth();
  const [shopName, setShopName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.active_shop?.name) {
      setShopName(user.active_shop.name);
    }
  }, [user]);

  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const shopId = user?.active_shop?.id;
    if (!shopId) {
      toast.error("No active shop found.");
      return;
    }
    
    setSaving(true);
    try {
      await api.patch(`/shops/${shopId}/`, { name: shopName });
      toast.success("Shop settings saved successfully.");
    } catch (error) {
      toast.error("Failed to save shop settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <Tabs defaultValue="shop" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shop">Shop Settings</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="team">Team Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="shop">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Shop Settings</CardTitle>
              <CardDescription className="text-zinc-400">
                Manage your trading card shop's basic information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveShopSettings} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="shop-name" className="text-zinc-300">Shop Name</Label>
                  <Input 
                    id="shop-name" 
                    value={shopName} 
                    onChange={(e) => setShopName(e.target.value)} 
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white border-none">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Account Details</CardTitle>
              <CardDescription className="text-zinc-400">
                Your personal account information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-zinc-500 uppercase text-xs tracking-widest">Username</Label>
                <div className="font-medium text-zinc-200">{user?.username}</div>
              </div>
              <div>
                <Label className="text-zinc-500 uppercase text-xs tracking-widest">Email</Label>
                <div className="font-medium text-zinc-200">{user?.email || "Not provided"}</div>
              </div>
              <div>
                <Label className="text-zinc-500 uppercase text-xs tracking-widest">Role</Label>
                <div className="font-medium capitalize text-zinc-200">Owner</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Team Management</CardTitle>
              <CardDescription className="text-zinc-400">
                Manage who has access to your shop.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-zinc-400 p-8 bg-zinc-950 rounded-md border border-zinc-800 text-center">
                Team management features will be available in a future update.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}