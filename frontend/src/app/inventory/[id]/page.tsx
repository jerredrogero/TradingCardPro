import { LotDetail } from "@/components/inventory/LotDetail";
import { inventoryApi } from "@/lib/api-inventory";

export default async function LotDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let lot, events = [];
  try {
    const lotData = await inventoryApi.getLot(Number(params.id));
    lot = lotData;
    
    const eventData = await inventoryApi.getLotEvents(Number(params.id));
    events = eventData.results || eventData;
  } catch (error) {
    console.error("Failed to load lot detail:", error);
  }

  if (!lot) {
    return (
      <div className="container mx-auto py-20 text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Lot Not Found</h1>
        <p className="text-muted-foreground">The inventory lot you are looking for does not exist or you do not have permission to view it.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-4xl">
      <LotDetail lot={lot} initialEvents={events} />
    </div>
  );
}
