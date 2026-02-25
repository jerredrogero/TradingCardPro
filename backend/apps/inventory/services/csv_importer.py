import csv
import io
import json
import logging
from django.db import transaction
from apps.inventory.models import Card, InventoryLot, InventoryEvent

logger = logging.getLogger(__name__)

class CSVImporter:
    def __init__(self, shop_id, user_id=None):
        self.shop_id = shop_id
        self.user_id = user_id
        
    def parse_and_import(self, file_content, mapping_json):
        """
        Parses CSV content and imports it into the database based on the provided mapping.
        """
        try:
            mapping = json.loads(mapping_json) if isinstance(mapping_json, str) else mapping_json
        except Exception as e:
            return {"status": "error", "error": f"Invalid mapping: {str(e)}"}
            
        # Filter mapping to only include fields with a target
        field_mapping = {k: v for k, v in mapping.items() if v}
        
        if not field_mapping:
            return {"status": "error", "error": "No fields mapped for import"}
            
        required_fields = ['name', 'set', 'quantity']
        mapped_values = list(field_mapping.values())
        
        for req in required_fields:
            if req not in mapped_values:
                return {"status": "error", "error": f"Required field '{req}' is not mapped"}
                
        # Parse CSV
        try:
            if isinstance(file_content, bytes):
                file_content = file_content.decode('utf-8')
            
            # Use StringIO to read string as file
            csv_file = io.StringIO(file_content)
            reader = csv.DictReader(csv_file)
            
            summary = {
                "created": 0,
                "skipped": 0,
                "errors": []
            }
            
            with transaction.atomic():
                for i, row in enumerate(reader):
                    row_num = i + 2 # +1 for 0-index, +1 for header
                    try:
                        self._process_row(row, field_mapping)
                        summary["created"] += 1
                    except Exception as e:
                        summary["skipped"] += 1
                        summary["errors"].append(f"Row {row_num}: {str(e)}")
                        
            return {"status": "completed", "summary": summary}
            
        except Exception as e:
            logger.error(f"CSV import failed: {str(e)}", exc_info=True)
            return {"status": "error", "error": f"Failed to process CSV: {str(e)}"}
            
    def _process_row(self, row, field_mapping):
        # Extract data based on mapping
        data = {}
        for csv_col, db_field in field_mapping.items():
            if csv_col in row:
                data[db_field] = row[csv_col]
                
        # Validate required data
        name = data.get('name', '').strip()
        set_name = data.get('set', '').strip()
        
        if not name or not set_name:
            raise ValueError("Name and Set are required")
            
        try:
            quantity = int(data.get('quantity', 0))
            if quantity < 0:
                raise ValueError("Quantity cannot be negative")
        except ValueError:
            raise ValueError("Invalid quantity format")
            
        if quantity == 0:
            raise ValueError("Quantity is zero, skipping")
            
        # Get optional data
        card_number = data.get('card_number', '').strip()
        condition = data.get('condition', 'NM').strip()
        location = data.get('location', '').strip()
        
        cost_basis = None
        cost_str = data.get('cost', '').strip()
        if cost_str:
            try:
                # Remove currency symbols if present
                clean_cost = cost_str.replace('$', '').replace(',', '')
                cost_basis = float(clean_cost)
            except ValueError:
                pass
                
        # Create or get Card
        card, _ = Card.objects.get_or_create(
            shop_id=self.shop_id,
            name=name,
            set_name=set_name,
            card_number=card_number,
            defaults={
                'attributes': {}
            }
        )
        
        # Create InventoryLot
        # We create a new lot for each import to keep cost basis and location separate
        lot = InventoryLot.objects.create(
            shop_id=self.shop_id,
            card=card,
            quantity_available=quantity,
            condition=condition,
            location=location,
            cost_basis=cost_basis,
            status='available'
        )
        
        # Create Event
        InventoryEvent.objects.create(
            lot=lot,
            event_type='import',
            quantity_delta=quantity,
            resulting_quantity=quantity,
            actor_id=self.user_id,
            metadata={"source": "csv_import"}
        )
