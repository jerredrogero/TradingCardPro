import api from "../api";

export const fetchMismatches = async (status?: string) => {
  const params = status ? { status } : {};
  const response = await api.get("/reconciliation/mismatches/", { params });
  return response.data.results || response.data;
};

export const resolveMismatch = async (id: number, resolution: string) => {
  const response = await api.post(`/reconciliation/mismatches/${id}/resolve/`, { resolution });
  return response.data;
};
