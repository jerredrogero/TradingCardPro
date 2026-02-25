import { InventoryTable } from "@/components/inventory/InventoryTable";
import { inventoryApi } from "@/lib/api-inventory";

export default async function InventoryPage() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Inventory</h1>
        <p className="text-zinc-400">Manage your card inventory, available quantities, and conditions.</p>
      </div>
      
      <InventoryTable />
    </div>
  );
}
