import { supabase, supabaseConfigError } from "./supabaseClient";
import type { Category, DbResult, Product } from "@/types";

type CategoryInput = {
  name: string;
  icon?: string | null;
  sort_order?: number;
};

type ProductInput = {
  category_id?: string | null;
  name: string;
  price?: number;
  unit?: string;
  stock?: number;
  low_stock_threshold?: number;
  barcode?: string | null;
  is_hot?: boolean;
  status?: string;
};

type SeedProduct = Omit<ProductInput, "category_id"> & {
  category_name: string;
};

const tableMissingMessage = "数据库表未创建，请先在 Supabase SQL Editor 执行 supabase/schema.sql。";

const storeTemplates: Record<string, { categories: string[]; products: SeedProduct[] }> = {
  grain: {
    categories: ["大米", "食用油", "面粉", "杂粮"],
    products: [
      { name: "东北大米", category_name: "大米", price: 3.6, unit: "斤", stock: 260, low_stock_threshold: 60, is_hot: true },
      { name: "花生油 5L", category_name: "食用油", price: 96, unit: "桶", stock: 8, low_stock_threshold: 10, is_hot: true },
      { name: "家用面粉", category_name: "面粉", price: 28, unit: "袋", stock: 29, low_stock_threshold: 8 },
      { name: "小米", category_name: "杂粮", price: 8.8, unit: "斤", stock: 42, low_stock_threshold: 10 },
    ],
  },
  convenience: {
    categories: ["饮料", "零食", "日用品", "速食", "纸品"],
    products: [
      { name: "矿泉水", category_name: "饮料", price: 2, unit: "瓶", stock: 80, low_stock_threshold: 20, barcode: "6901001", is_hot: true },
      { name: "冰红茶", category_name: "饮料", price: 4, unit: "瓶", stock: 36, low_stock_threshold: 12, barcode: "6901002", is_hot: true },
      { name: "薯片", category_name: "零食", price: 7.5, unit: "袋", stock: 22, low_stock_threshold: 8, barcode: "6901003" },
      { name: "抽纸", category_name: "纸品", price: 12, unit: "提", stock: 10, low_stock_threshold: 12, barcode: "6901004" },
    ],
  },
  fruit: {
    categories: ["苹果", "香蕉", "柑橘", "时令水果", "礼盒"],
    products: [
      { name: "红富士苹果", category_name: "苹果", price: 6.8, unit: "斤", stock: 90, low_stock_threshold: 20, barcode: "6903001", is_hot: true },
      { name: "精品香蕉", category_name: "香蕉", price: 3.9, unit: "斤", stock: 16, low_stock_threshold: 20, barcode: "6903002", is_hot: true },
      { name: "砂糖橘", category_name: "柑橘", price: 7.5, unit: "斤", stock: 34, low_stock_threshold: 10, barcode: "6903004" },
      { name: "果篮礼盒", category_name: "礼盒", price: 88, unit: "盒", stock: 9, low_stock_threshold: 5, barcode: "6903003" },
    ],
  },
  stationery: {
    categories: ["笔类", "本册", "办公用品", "学生用品"],
    products: [
      { name: "中性笔", category_name: "笔类", price: 3, unit: "支", stock: 120, low_stock_threshold: 30, barcode: "6904001", is_hot: true },
      { name: "作业本", category_name: "本册", price: 2.5, unit: "本", stock: 80, low_stock_threshold: 20, barcode: "6904002", is_hot: true },
      { name: "A4 打印纸", category_name: "办公用品", price: 24, unit: "包", stock: 12, low_stock_threshold: 8, barcode: "6904003" },
      { name: "水彩笔", category_name: "学生用品", price: 18, unit: "盒", stock: 7, low_stock_threshold: 8, barcode: "6904004" },
    ],
  },
  hardware: {
    categories: ["工具", "螺丝", "电线", "胶带", "灯具"],
    products: [
      { name: "螺丝刀", category_name: "工具", price: 12, unit: "把", stock: 25, low_stock_threshold: 6, barcode: "6905001", is_hot: true },
      { name: "绝缘胶布", category_name: "胶带", price: 3, unit: "卷", stock: 60, low_stock_threshold: 15, barcode: "6905002", is_hot: true },
      { name: "膨胀螺丝", category_name: "螺丝", price: 0.5, unit: "个", stock: 200, low_stock_threshold: 50, barcode: "6905003" },
      { name: "LED 灯泡", category_name: "灯具", price: 16, unit: "个", stock: 5, low_stock_threshold: 8, barcode: "6905005" },
    ],
  },
  baby: {
    categories: ["奶粉", "纸尿裤", "洗护", "玩具", "辅食"],
    products: [
      { name: "婴儿奶粉 1 段", category_name: "奶粉", price: 268, unit: "罐", stock: 12, low_stock_threshold: 5, barcode: "6906001", is_hot: true },
      { name: "成长纸尿裤 M", category_name: "纸尿裤", price: 89, unit: "包", stock: 18, low_stock_threshold: 8, barcode: "6906002", is_hot: true },
      { name: "婴儿沐浴露", category_name: "洗护", price: 36, unit: "瓶", stock: 9, low_stock_threshold: 6, barcode: "6906003" },
      { name: "米粉辅食", category_name: "辅食", price: 42, unit: "盒", stock: 6, low_stock_threshold: 8, barcode: "6906005" },
    ],
  },
  custom: {
    categories: [],
    products: [],
  },
};

function emptyResult<T>(data: T, error: string): DbResult<T> {
  return { data, error };
}

function errorMessage(error: { code?: string; message?: string } | null): string {
  if (!error) return "";
  if (error.code === "42P01") return tableMissingMessage;
  return error.message || "数据库操作失败。";
}

function requireSupabase<T>(data: T): DbResult<T> | null {
  return supabase ? null : emptyResult(data, supabaseConfigError);
}

export async function getCategories(userId: string, storeType: string): Promise<DbResult<Category[]>> {
  const missing = requireSupabase<Category[]>([]);
  if (missing) return missing;

  const { data, error } = await supabase!
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .eq("store_type", storeType)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return emptyResult((data || []) as Category[], errorMessage(error));
}

export async function createCategory(
  userId: string,
  storeType: string,
  data: CategoryInput,
): Promise<DbResult<Category | null>> {
  const missing = requireSupabase<Category | null>(null);
  if (missing) return missing;

  const { data: category, error } = await supabase!
    .from("categories")
    .insert({
      user_id: userId,
      store_type: storeType,
      name: data.name,
      icon: data.icon ?? null,
      sort_order: data.sort_order ?? 0,
    })
    .select("*")
    .single();

  return emptyResult((category as Category | null) || null, errorMessage(error));
}

export async function deleteCategory(
  userId: string,
  categoryId: string,
): Promise<DbResult<null>> {
  const missing = requireSupabase<null>(null);
  if (missing) return missing;

  const { error } = await supabase!
    .from("categories")
    .delete()
    .eq("user_id", userId)
    .eq("id", categoryId);

  return emptyResult(null, errorMessage(error));
}

export async function getProducts(userId: string, storeType: string): Promise<DbResult<Product[]>> {
  const missing = requireSupabase<Product[]>([]);
  if (missing) return missing;

  const { data, error } = await supabase!
    .from("products")
    .select("*, categories(id, name, icon)")
    .eq("user_id", userId)
    .eq("store_type", storeType)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  return emptyResult((data || []) as Product[], errorMessage(error));
}

export async function createProduct(
  userId: string,
  storeType: string,
  data: ProductInput,
): Promise<DbResult<Product | null>> {
  const missing = requireSupabase<Product | null>(null);
  if (missing) return missing;

  const { data: product, error } = await supabase!
    .from("products")
    .insert({
      user_id: userId,
      store_type: storeType,
      category_id: data.category_id ?? null,
      name: data.name,
      price: data.price ?? 0,
      unit: data.unit || "件",
      stock: data.stock ?? 0,
      low_stock_threshold: data.low_stock_threshold ?? 0,
      barcode: data.barcode || null,
      is_hot: data.is_hot ?? false,
      status: data.status || "active",
    })
    .select("*, categories(id, name, icon)")
    .single();

  return emptyResult((product as Product | null) || null, errorMessage(error));
}

export async function updateProduct(
  userId: string,
  productId: string,
  data: Partial<ProductInput>,
): Promise<DbResult<Product | null>> {
  const missing = requireSupabase<Product | null>(null);
  if (missing) return missing;

  const { data: product, error } = await supabase!
    .from("products")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", productId)
    .select("*, categories(id, name, icon)")
    .single();

  return emptyResult((product as Product | null) || null, errorMessage(error));
}

export async function deleteProduct(
  userId: string,
  productId: string,
): Promise<DbResult<null>> {
  const missing = requireSupabase<null>(null);
  if (missing) return missing;

  const { error } = await supabase!
    .from("products")
    .delete()
    .eq("user_id", userId)
    .eq("id", productId);

  return emptyResult(null, errorMessage(error));
}

async function createTemplateData(userId: string, storeType: string): Promise<DbResult<null>> {
  const template = storeTemplates[storeType] || storeTemplates.grain;
  const categories: Category[] = [];

  for (let index = 0; index < template.categories.length; index += 1) {
    const name = template.categories[index];
    const created = await createCategory(userId, storeType, { name, sort_order: index });
    if (created.error) return emptyResult(null, created.error);
    if (created.data) categories.push(created.data);
  }

  const categoryByName = new Map(categories.map((category) => [category.name, category.id]));

  for (const product of template.products) {
    const created = await createProduct(userId, storeType, {
      ...product,
      category_id: categoryByName.get(product.category_name) || null,
    });
    if (created.error) return emptyResult(null, created.error);
  }

  return emptyResult(null, "");
}

export async function seedDefaultProducts(userId: string, storeType = "grain"): Promise<DbResult<null>> {
  const currentCategories = await getCategories(userId, storeType);
  if (currentCategories.error) return emptyResult(null, currentCategories.error);

  const currentProducts = await getProducts(userId, storeType);
  if (currentProducts.error) return emptyResult(null, currentProducts.error);

  if (currentCategories.data.length || currentProducts.data.length) {
    return emptyResult(null, "");
  }

  return createTemplateData(userId, storeType);
}
