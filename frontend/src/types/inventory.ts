export interface Card {
  id: number;
  shop: number;
  name: string;
  set_name: string;
  card_number: string;
  variant: string;
  language: string;
  attributes: Record<string, any>;
  created_at: string;
}

export interface InventoryLot {
  id: number;
  shop: number;
  card: Card;
  sku: string;
  quantity_available: number;
  quantity_reserved: number;
  condition: string;
  language: string;
  location: string;
  cost_basis: string | null;
  status: 'available' | 'reserved' | 'grading' | 'damaged';
  created_at: string;
  updated_at: string;
}

export interface InventoryEvent {
  id: number;
  lot: number;
  event_type: 'sale' | 'adjustment' | 'grading_out' | 'grading_in' | 'reserve' | 'unreserve' | 'import' | 'manual';
  quantity_delta: number;
  resulting_quantity: number;
  provider_event_id: string | null;
  order_id: string | null;
  actor: number | null;
  actor_name: string;
  metadata: Record<string, any>;
  created_at: string;
}
