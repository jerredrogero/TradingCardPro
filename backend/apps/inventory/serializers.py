from rest_framework import serializers
from .models import Card, InventoryLot, InventoryEvent

class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = '__all__'
        read_only_fields = ['shop', 'created_at']

class InventoryLotSerializer(serializers.ModelSerializer):
    card_details = CardSerializer(source='card', read_only=True)
    card = CardSerializer(write_only=True)
    
    class Meta:
        model = InventoryLot
        fields = '__all__'
        read_only_fields = ['shop', 'created_at', 'updated_at']

    def create(self, validated_data):
        card_data = validated_data.pop('card')
        shop_id = validated_data.pop('shop_id', None)
        
        # Create or get the card
        card, _ = Card.objects.get_or_create(
            shop_id=shop_id,
            name=card_data.get('name'),
            set_name=card_data.get('set_name'),
            card_number=card_data.get('card_number', ''),
            variant=card_data.get('variant', ''),
            language=card_data.get('language', 'English'),
            defaults={'attributes': card_data.get('attributes', {})}
        )
        
        # Map initial_quantity to quantity_available for creation
        initial_qty = validated_data.pop('initial_quantity', 0)
        
        # Ensure we don't pass initial_quantity to create if it's not a model field
        # (It is a model field now since we added it, but let's be safe)
        lot = InventoryLot.objects.create(
            card=card,
            shop_id=shop_id,
            quantity_available=initial_qty,
            initial_quantity=initial_qty,
            **validated_data
        )
        
        # Log the initial creation event
        InventoryEvent.objects.create(
            lot=lot,
            event_type='adjustment',
            quantity_delta=initial_qty,
            resulting_quantity=initial_qty,
            metadata={"reason": "Initial inventory creation"}
        )
        
        return lot

class InventoryEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryEvent
        fields = '__all__'
        read_only_fields = ['created_at']
