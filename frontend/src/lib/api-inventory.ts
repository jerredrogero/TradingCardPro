import api from '@/lib/api';

export const inventoryApi = {
  getCards: async (params?: Record<string, any>) => {
    const { data } = await api.get('/inventory/cards/', { params });
    return data;
  },
  
  getLots: async (params?: Record<string, any>) => {
    const { data } = await api.get('/inventory/lots/', { params });
    return data;
  },

  getLot: async (id: number) => {
    const { data } = await api.get(`/inventory/lots/${id}/`);
    return data;
  },

  createLot: async (lotData: any) => {
    const { data } = await api.post('/inventory/lots/', lotData);
    return data;
  },

  updateLot: async (id: number, lotData: any) => {
    const { data } = await api.put(`/inventory/lots/${id}/`, lotData);
    return data;
  },

  adjustLotQuantity: async (id: number, quantity_delta: number, reason: string) => {
    const { data } = await api.post(`/inventory/lots/${id}/adjust/`, {
      quantity_delta,
      reason
    });
    return data;
  },

  getLotEvents: async (lotId: number, params?: Record<string, any>) => {
    const { data } = await api.get('/inventory/events/', { 
      params: { ...params, lot: lotId } 
    });
    return data;
  }
};
