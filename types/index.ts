export type AuthResult = {
  ok: boolean;
  message?: string;
};

export type Category = {
  id: string;
  user_id: string;
  store_type: string;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
};

export type Product = {
  id: string;
  user_id: string;
  store_type: string;
  category_id: string | null;
  name: string;
  price: number;
  unit: string;
  stock: number;
  low_stock_threshold: number;
  barcode: string | null;
  is_hot: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  categories?: Pick<Category, "id" | "name" | "icon"> | null;
};

export type DbResult<T> = {
  data: T;
  error: string;
};
