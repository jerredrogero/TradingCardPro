"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inventoryApi } from "@/lib/api-inventory";
import { toast } from "sonner";

export function LotForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Card Data
    name: "",
    set_name: "",
    card_number: "",
    variant: "",
    language: "English",
    
    // Lot Data
    sku: "",
    initial_quantity: 1,
    condition: "NM",
    location: "",
    cost_basis: "",
    status: "available"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create Card and Lot together (nested serializer logic is handled in backend)
      const dataToSubmit = {
        card: {
          name: formData.name,
          set_name: formData.set_name,
          card_number: formData.card_number,
          variant: formData.variant,
          language: formData.language
        },
        sku: formData.sku,
        initial_quantity: Number(formData.initial_quantity),
        condition: formData.condition,
        location: formData.location,
        cost_basis: formData.cost_basis ? Number(formData.cost_basis) : null,
        status: formData.status
      };

      const result = await inventoryApi.createLot(dataToSubmit);
      toast.success("Inventory lot created successfully!");
      router.push(`/inventory/${result.id}`);
    } catch (error: any) {
      console.error("Failed to create lot:", error);
      toast.error(error.response?.data?.error || "Failed to create inventory lot");
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Inventory</CardTitle>
        <CardDescription>Create a new card record and its associated inventory lot.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Card Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Card Name *</Label>
                <Input id="name" required value={formData.name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="set_name">Set Name *</Label>
                <Input id="set_name" required value={formData.set_name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card_number">Card Number</Label>
                <Input id="card_number" value={formData.card_number} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variant">Variant (e.g. Foil, Reverse)</Label>
                <Input id="variant" value={formData.variant} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Inventory Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input id="sku" required value={formData.sku} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial_quantity">Initial Quantity *</Label>
                <Input id="initial_quantity" type="number" min="0" required value={formData.initial_quantity} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition *</Label>
                <Select 
                  value={formData.condition} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, condition: val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NM">Near Mint</SelectItem>
                    <SelectItem value="LP">Lightly Played</SelectItem>
                    <SelectItem value="MP">Moderately Played</SelectItem>
                    <SelectItem value="HP">Heavily Played</SelectItem>
                    <SelectItem value="DMG">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (Bin/Box)</Label>
                <Input id="location" value={formData.location} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_basis">Cost Basis ($)</Label>
                <Input id="cost_basis" type="number" step="0.01" min="0" value={formData.cost_basis} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="grading">Grading</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Inventory"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
