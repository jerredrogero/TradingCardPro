export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  active_shop: Shop | null;
}

export interface Shop {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  refresh: string;
  access: string;
}
