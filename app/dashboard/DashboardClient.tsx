"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory,
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  seedDefaultProducts,
  updateProduct,
} from "@/lib/db";
import { signOut } from "@/lib/auth";
import type { Category, Product } from "@/types";

type ProductForm = {
  name: string;
  categoryName: string;
  price: string;
  unit: string;
  stock: string;
  lowStockThreshold: string;
  barcode: string;
  isHot: string;
};

type OrderItem = {
  id: string;
  name: string;
  price: number;
  unit: string;
  qty: number;
};

type OrderRecord = {
  no: string;
  items: OrderItem[];
  payment: string;
  amount: number;
  time: string;
  isDebt: boolean;
  customer: string;
  note: string;
};

const emptyForm: ProductForm = {
  name: "",
  categoryName: "",
  price: "",
  unit: "",
  stock: "",
  lowStockThreshold: "",
  barcode: "",
  isHot: "false",
};

const storeTypeStorageKey = "xiaodian-store-type";

const categoryIcons: Record<string, string> = {
  全部: "全",
  热销: "热",
  低库存: "低",
  大米: "米",
  食用油: "油",
  面粉: "粉",
  杂粮: "粮",
};

function money(value: number) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function formatMoneyCompact(value: number) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 100000000) return `¥${(amount / 100000000).toFixed(2)}亿`;
  if (Math.abs(amount) >= 10000) return `¥${(amount / 10000).toFixed(2)}万`;
  return money(amount);
}

function nowText() {
  return new Date().toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function productCategory(product: Product, categories: Category[]) {
  return (
    product.categories?.name ||
    categories.find((category) => category.id === product.category_id)?.name ||
    "未分类"
  );
}

function toNumber(value: string) {
  return Number(value || 0);
}

export default function DashboardClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState("全部");
  const [search, setSearch] = useState("");
  const [recordSearch, setRecordSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("现金");
  const [discount, setDiscount] = useState("0");
  const [customerName, setCustomerName] = useState("");
  const [debtNote, setDebtNote] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [activeTab, setActiveTab] = useState<"orders" | "warning" | "debt">("orders");
  const [storeType, setStoreType] = useState("grain");
  const [storeTypeReady, setStoreTypeReady] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData(nextStoreType = storeType) {
    setLoading(true);
    setMessage("");

    const seeded = await seedDefaultProducts(userId, nextStoreType);
    if (seeded.error) {
      setMessage(seeded.error);
      setLoading(false);
      return;
    }

    const [categoryResult, productResult] = await Promise.all([
      getCategories(userId, nextStoreType),
      getProducts(userId, nextStoreType),
    ]);

    if (categoryResult.error || productResult.error) {
      setMessage(categoryResult.error || productResult.error);
      setLoading(false);
      return;
    }

    setCategories(categoryResult.data);
    setProducts(productResult.data);
    setLoading(false);
  }

  useEffect(() => {
    const savedStoreType = window.localStorage.getItem(storeTypeStorageKey);
    if (savedStoreType) setStoreType(savedStoreType);
    setStoreTypeReady(true);
  }, []);

  useEffect(() => {
    if (!storeTypeReady) return;
    loadData(storeType);
  }, [userId, storeType, storeTypeReady]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((product) => {
      const categoryName = productCategory(product, categories);
      const byCategory =
        activeCategory === "全部" ||
        (activeCategory === "热销" && product.is_hot) ||
        (activeCategory === "低库存" && product.stock <= product.low_stock_threshold) ||
        categoryName === activeCategory;
      const bySearch =
        !keyword ||
        product.name.toLowerCase().includes(keyword) ||
        (product.barcode || "").toLowerCase().includes(keyword) ||
        categoryName.toLowerCase().includes(keyword);

      return byCategory && bySearch;
    });
  }, [activeCategory, categories, products, search]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) || null;
  const subtotal = currentOrder.reduce((sum, item) => sum + item.price * item.qty, 0);
  const amountDue = Math.max(0, subtotal - toNumber(discount));
  const paidOrders = orders.filter((order) => !order.isDebt);
  const debtOrders = orders.filter((order) => order.isDebt);
  const lowProducts = products.filter((product) => product.stock <= product.low_stock_threshold);
  const visibleOrders = orders.filter((order) => {
    const keyword = recordSearch.trim().toLowerCase();
    const text = `${order.no} ${order.payment} ${order.customer} ${order.items
      .map((item) => item.name)
      .join(" ")}`.toLowerCase();
    return !keyword || text.includes(keyword);
  });

  async function ensureCategoryByName(name: string) {
    const cleanName = name.trim();
    if (!cleanName) return null;

    const existing = categories.find((category) => category.name === cleanName);
    if (existing) return existing;

    const created = await createCategory(userId, storeType, {
      name: cleanName,
      sort_order: categories.length,
    });
    if (created.error) {
      setMessage(created.error);
      return null;
    }
    if (created.data) {
      setCategories((current) => [...current, created.data as Category]);
    }
    return created.data;
  }

  function fillProductForm(product: Product) {
    setSelectedProductId(product.id);
    setForm({
      name: product.name,
      categoryName: productCategory(product, categories),
      price: String(product.price),
      unit: product.unit,
      stock: String(product.stock),
      lowStockThreshold: String(product.low_stock_threshold),
      barcode: product.barcode || "",
      isHot: String(product.is_hot),
    });
  }

  function addToOrder(product: Product) {
    if (product.stock <= 0) return;
    fillProductForm(product);
    setCurrentOrder((items) => {
      const current = items.find((item) => item.id === product.id);
      if (current) {
        return items.map((item) =>
          item.id === product.id ? { ...item, qty: Math.min(product.stock, item.qty + 1) } : item,
        );
      }
      return [
        ...items,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          qty: 1,
        },
      ];
    });
  }

  function updateQty(productId: string, delta: number) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setCurrentOrder((items) =>
      items.map((item) =>
        item.id === productId
          ? { ...item, qty: Math.max(1, Math.min(product.stock, item.qty + delta)) }
          : item,
      ),
    );
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;

    const created = await createCategory(userId, storeType, {
      name,
      sort_order: categories.length,
    });
    if (created.error) {
      setMessage(created.error);
      return;
    }

    setNewCategoryName("");
    setActiveCategory(name);
    await loadData();
  }

  async function handleAddProduct() {
    const category = await ensureCategoryByName(form.categoryName || "默认分类");
    if (form.categoryName && !category) return;

    const created = await createProduct(userId, storeType, {
      category_id: category?.id || null,
      name: form.name.trim() || "未命名商品",
      price: toNumber(form.price),
      unit: form.unit.trim() || "件",
      stock: toNumber(form.stock),
      low_stock_threshold: toNumber(form.lowStockThreshold),
      barcode: form.barcode.trim() || null,
      is_hot: form.isHot === "true",
    });

    if (created.error) {
      setMessage(created.error);
      return;
    }

    setSelectedProductId(created.data?.id || "");
    await loadData();
  }

  async function handleEditProduct() {
    if (!selectedProductId) return;
    const category = await ensureCategoryByName(form.categoryName || "默认分类");
    if (form.categoryName && !category) return;

    const updated = await updateProduct(userId, selectedProductId, {
      category_id: category?.id || null,
      name: form.name.trim() || "未命名商品",
      price: toNumber(form.price),
      unit: form.unit.trim() || "件",
      stock: toNumber(form.stock),
      low_stock_threshold: toNumber(form.lowStockThreshold),
      barcode: form.barcode.trim() || null,
      is_hot: form.isHot === "true",
    });

    if (updated.error) {
      setMessage(updated.error);
      return;
    }

    await loadData();
  }

  async function handleDeleteProduct() {
    if (!selectedProduct) return;
    if (!confirm(`确定删除「${selectedProduct.name}」吗？删除后会同时从当前订单里移除。`)) return;

    const deleted = await deleteProduct(userId, selectedProduct.id);
    if (deleted.error) {
      setMessage(deleted.error);
      return;
    }

    setCurrentOrder((items) => items.filter((item) => item.id !== selectedProduct.id));
    setSelectedProductId("");
    setForm(emptyForm);
    await loadData();
  }

  async function handleProductContextMenu(
    event: React.MouseEvent<HTMLButtonElement>,
    product: Product,
  ) {
    event.preventDefault();

    if (!confirm(`确定要删除商品「${product.name}」吗？`)) return;

    const deleted = await deleteProduct(userId, product.id);
    if (deleted.error) {
      setMessage("删除商品失败，请稍后重试。");
      return;
    }

    setProducts((items) => items.filter((item) => item.id !== product.id));
    setCurrentOrder((items) => items.filter((item) => item.id !== product.id));

    if (selectedProductId === product.id) {
      setSelectedProductId("");
      setForm(emptyForm);
    }
  }

  async function handleRestock() {
    if (!selectedProduct) return;
    const updated = await updateProduct(userId, selectedProduct.id, {
      stock: Number(selectedProduct.stock) + 10,
    });
    if (updated.error) {
      setMessage(updated.error);
      return;
    }
    await loadData();
    if (updated.data) fillProductForm(updated.data);
  }

  async function handleStockCount() {
    if (!selectedProduct) return;
    const updated = await updateProduct(userId, selectedProduct.id, {
      stock: toNumber(form.stock),
    });
    if (updated.error) {
      setMessage(updated.error);
      return;
    }
    await loadData();
  }

  async function handleStoreTypeChange(nextType: string) {
    if (nextType === storeType) return;

    setLoading(true);
    setMessage("");

    window.localStorage.setItem(storeTypeStorageKey, nextType);
    setStoreType(nextType);
    setCurrentOrder([]);
    setSelectedProductId("");
    setForm(emptyForm);
    setActiveCategory("全部");
    setSearch("");
  }

  function checkout() {
    if (!currentOrder.length) return;

    const order: OrderRecord = {
      no: `ORD${Date.now().toString().slice(-8)}`,
      items: currentOrder,
      payment: paymentMethod,
      amount: amountDue,
      time: nowText(),
      isDebt: paymentMethod === "挂账",
      customer: customerName.trim(),
      note: debtNote.trim(),
    };

    setOrders((items) => [order, ...items]);
    setProducts((items) =>
      items.map((product) => {
        const ordered = currentOrder.find((item) => item.id === product.id);
        return ordered ? { ...product, stock: Math.max(0, product.stock - ordered.qty) } : product;
      }),
    );
    setCurrentOrder([]);
    setDiscount("0");
    setCustomerName("");
    setDebtNote("");
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-authbar">
        <button className="small-btn danger" type="button" onClick={handleSignOut}>
          退出登录
        </button>
      </div>

      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="logo">店</div>
            <div className="brand-copy">
              <h1>小店管家</h1>
              <div className="store-line">
                <span>当前店铺</span>
                <input id="storeName" defaultValue="安心小店" aria-label="当前店铺名称" />
              </div>
            </div>
          </div>

          <div className="search-wrap">
            <select
              aria-label="店铺类型"
              value={storeType}
              onChange={(event) => handleStoreTypeChange(event.target.value)}
            >
              <option value="grain">粮油店</option>
              <option value="convenience">便利店</option>
              <option value="fruit">水果店</option>
              <option value="stationery">文具店</option>
              <option value="hardware">五金店</option>
              <option value="baby">母婴店</option>
              <option value="custom">自定义</option>
            </select>
            <div className="search-shell">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索商品名称、条码、分类"
              />
            </div>
          </div>

          <div className="stats">
            <div className="stat" data-icon="¥">
              <span>今日营业额</span>
              <strong>{formatMoneyCompact(paidOrders.reduce((sum, order) => sum + order.amount, 0))}</strong>
            </div>
            <div className="stat" data-icon="单">
              <span>今日订单数</span>
              <strong>{orders.length} 单</strong>
            </div>
            <div className="stat" data-icon="账">
              <span>待收款金额</span>
              <strong>{formatMoneyCompact(debtOrders.reduce((sum, order) => sum + order.amount, 0))}</strong>
            </div>
            <div className="stat" data-icon="利">
              <span>今日总利润</span>
              <strong>待统计</strong>
            </div>
          </div>
        </header>

        {message ? <div className="auth-state">{message}</div> : null}

        <main className="workspace">
          <aside className="card">
            <div className="card-head">
              <h2>商品分类</h2>
              <span className="muted">{products.length} 件</span>
            </div>
            <div className="category-list">
              {["全部", "热销", "低库存"].map((name) => (
                <button
                  className={`category-btn ${activeCategory === name ? "active" : ""}`}
                  data-category={name}
                  key={name}
                  type="button"
                  onClick={() => setActiveCategory(name)}
                >
                  <span>{categoryIcons[name]}</span>
                  <strong>{name}</strong>
                  <em>
                    {name === "全部"
                      ? products.length
                      : name === "热销"
                        ? products.filter((product) => product.is_hot).length
                        : lowProducts.length}
                  </em>
                </button>
              ))}
              {categories.map((category) => (
                <button
                  className={`category-btn ${activeCategory === category.name ? "active" : ""}`}
                  data-category={category.name}
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.name)}
                >
                  <span>{category.icon || categoryIcons[category.name] || "类"}</span>
                  <strong>{category.name}</strong>
                  <em>
                    {
                      products.filter((product) => productCategory(product, categories) === category.name)
                        .length
                    }
                  </em>
                </button>
              ))}
            </div>
            <div className="tool-row">
              <input
                className="field"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="新增分类名称"
              />
              <button className="ghost-btn" type="button" onClick={handleAddCategory}>
                新增分类
              </button>
            </div>
          </aside>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>商品快捷区</h2>
                <span className="muted">点击商品卡片，快速加入当前订单</span>
              </div>
              <span className="pill">{activeCategory}</span>
            </div>
            <div className="tool-row">
              <button className="small-btn primary" type="button" onClick={() => loadData()}>
                刷新商品
              </button>
              <button className="small-btn" type="button" onClick={() => setActiveCategory("低库存")}>
                查看低库存
              </button>
              <button
                className="small-btn accent"
                type="button"
                onClick={() => document.querySelector("#productManager")?.scrollIntoView({ behavior: "smooth" })}
              >
                新增商品
              </button>
              <button
                className="small-btn"
                type="button"
                onClick={() => alert("批量管理适合下一步升级。当前版本先用下方商品管理逐个维护。")}
              >
                批量管理
              </button>
            </div>
            <div className="product-grid">
              {loading ? <div className="empty">正在加载商品...</div> : null}
              {!loading && !filteredProducts.length ? <div className="empty">没有找到商品</div> : null}
              {filteredProducts.map((product) => {
                const categoryName = productCategory(product, categories);
                const low = product.stock <= product.low_stock_threshold;
                return (
                  <button
                    className={`product-card ${low ? "low-stock" : ""}`}
                    data-id={product.id}
                    key={product.id}
                    type="button"
                    onClick={() => addToOrder(product)}
                    onContextMenu={(event) => handleProductContextMenu(event, product)}
                  >
                    <div className="product-top">
                      <span className="category-tag">{categoryName}</span>
                      <div className="status-tags">
                        {product.is_hot ? <span className="hot-tag">热销</span> : null}
                        {low ? <span className="low-tag">低库存</span> : null}
                      </div>
                    </div>
                    <h3>{product.name}</h3>
                    <div className="price">
                      <span>¥</span>
                      {Number(product.price).toFixed(2)}
                    </div>
                    <div className="product-meta">
                      <span>单位：{product.unit}</span>
                      <span>库存：{product.stock}</span>
                      <span>条码：{product.barcode || "未填写"}</span>
                    </div>
                    <div className="add-line">
                      <span>加入订单</span>
                      <strong>+</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="card order-panel">
            <div className="card-head">
              <div>
                <h2>当前订单</h2>
                <span className="order-status">{currentOrder.length ? "待收款订单" : "未生成订单"}</span>
              </div>
              <button className="small-btn danger" type="button" onClick={() => setCurrentOrder([])}>
                清空
              </button>
            </div>
            <div className="order-list">
              {currentOrder.length ? (
                currentOrder.map((item) => (
                  <div className="order-item" key={item.id}>
                    <div>
                      <h4>{item.name}</h4>
                      <div className="muted">
                        {money(item.price)} / {item.unit}
                      </div>
                      <div className="qty-control">
                        <button className="icon-btn" type="button" onClick={() => updateQty(item.id, -1)}>
                          -
                        </button>
                        <strong>{item.qty}</strong>
                        <button className="icon-btn" type="button" onClick={() => updateQty(item.id, 1)}>
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <strong>{money(item.price * item.qty)}</strong>
                      <button
                        className="icon-btn remove-btn"
                        type="button"
                        onClick={() => setCurrentOrder((items) => items.filter((orderItem) => orderItem.id !== item.id))}
                      >
                        删
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <div className="empty-icon">+</div>
                  <strong>当前订单为空</strong>
                  <div>点击中间商品卡片，快速加入当前订单</div>
                </div>
              )}
            </div>
            <div className="summary">
              <div className="summary-line">
                <span>商品小计</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <div className="discount-row">
                <span className="muted">优惠金额</span>
                <input
                  className="mini-field"
                  min="0"
                  step="0.01"
                  type="number"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </div>
              <div className="summary-line due">
                <span>应收金额</span>
                <strong>{money(amountDue)}</strong>
              </div>
            </div>
            <div className="pay-grid">
              {["现金", "微信", "支付宝", "挂账"].map((pay) => (
                <button
                  className={`pay-btn ${paymentMethod === pay ? "active" : ""}`}
                  data-pay={pay}
                  key={pay}
                  type="button"
                  onClick={() => setPaymentMethod(pay)}
                >
                  <span className="pay-icon">{pay.slice(0, 1)}</span>
                  <span>{pay}</span>
                </button>
              ))}
            </div>
            <div className={`debt-box ${paymentMethod === "挂账" ? "show" : ""}`}>
              <input
                className="field"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="客户姓名"
              />
              <input
                className="field"
                value={debtNote}
                onChange={(event) => setDebtNote(event.target.value)}
                placeholder="挂账备注"
              />
            </div>
            <button className="primary-btn" type="button" onClick={checkout}>
              完成收款
            </button>
          </aside>
        </main>

        <section className="management">
          <div className="card" id="productManager">
            <div className="card-head">
              <div>
                <h2>商品管理</h2>
                <span className="muted">新增、编辑、入库、盘点</span>
              </div>
            </div>
            <div className="manager-summary">
              {selectedProduct ? (
                <>
                  <div>
                    <strong>{selectedProduct.name}</strong>
                    <span className="muted">
                      {productCategory(selectedProduct, categories)} · 售价 {money(selectedProduct.price)}
                    </span>
                  </div>
                  <div className="summary-tags">
                    <span className="pill">{selectedProduct.is_hot ? "热销商品" : "普通商品"}</span>
                    <span
                      className={`pill ${
                        selectedProduct.stock <= selectedProduct.low_stock_threshold ? "low" : ""
                      }`}
                    >
                      库存：{selectedProduct.stock} {selectedProduct.unit}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <strong>准备新增商品</strong>
                    <span className="muted">填写下方信息后，点击“新增商品”即可加入商品快捷区</span>
                  </div>
                  <div className="summary-tags">
                    <span className="pill">未选中商品</span>
                  </div>
                </>
              )}
            </div>

            <div className="form-grid">
              <div className="form-section-title">基础信息</div>
              <div className="form-field wide">
                <label htmlFor="productName">商品名称</label>
                <input
                  id="productName"
                  className="field"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="例如：东北大米"
                />
              </div>
              <div className="form-field">
                <label htmlFor="productCategory">所属分类</label>
                <input
                  id="productCategory"
                  className="field"
                  value={form.categoryName}
                  onChange={(event) => setForm({ ...form, categoryName: event.target.value })}
                  placeholder="例如：大米"
                />
              </div>
              <div className="form-field">
                <label htmlFor="productBarcode">商品条码</label>
                <input
                  id="productBarcode"
                  className="field"
                  value={form.barcode}
                  onChange={(event) => setForm({ ...form, barcode: event.target.value })}
                  placeholder="可手动输入"
                />
              </div>
              <div className="form-section-title">价格库存</div>
              <div className="form-field">
                <label htmlFor="productPrice">售价</label>
                <input
                  id="productPrice"
                  className="field"
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="form-field">
                <label htmlFor="productUnit">单位</label>
                <input
                  id="productUnit"
                  className="field"
                  value={form.unit}
                  onChange={(event) => setForm({ ...form, unit: event.target.value })}
                  placeholder="件 / 瓶 / 斤"
                />
              </div>
              <div className="form-field">
                <label htmlFor="productStock">当前库存</label>
                <input
                  id="productStock"
                  className="field"
                  min="0"
                  step="1"
                  type="number"
                  value={form.stock}
                  onChange={(event) => setForm({ ...form, stock: event.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="form-field">
                <label htmlFor="productThreshold">低库存阈值</label>
                <input
                  id="productThreshold"
                  className="field"
                  min="0"
                  step="1"
                  type="number"
                  value={form.lowStockThreshold}
                  onChange={(event) => setForm({ ...form, lowStockThreshold: event.target.value })}
                  placeholder="低于多少提醒"
                />
              </div>
              <div className="form-section-title">商品标记</div>
              <div className="form-field wide">
                <label htmlFor="productHot">快捷标记</label>
                <select
                  id="productHot"
                  className="field hot-select"
                  value={form.isHot}
                  onChange={(event) => setForm({ ...form, isHot: event.target.value })}
                >
                  <option value="false">普通商品</option>
                  <option value="true">热销商品</option>
                </select>
              </div>
            </div>
            <div className="action-row">
              <button className="small-btn primary" type="button" onClick={handleAddProduct}>
                新增商品
              </button>
              <button className="small-btn" type="button" onClick={handleEditProduct}>
                编辑选中商品
              </button>
              <button className="small-btn danger" type="button" onClick={handleDeleteProduct}>
                删除选中商品
              </button>
              <button className="small-btn accent" type="button" onClick={handleRestock}>
                库存入库 +10
              </button>
              <button className="small-btn" type="button" onClick={handleStockCount}>
                库存盘点
              </button>
              <button
                className="small-btn"
                type="button"
                onClick={() => {
                  setSelectedProductId("");
                  setForm(emptyForm);
                }}
              >
                清空表单
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h2>经营看板</h2>
                <span className="muted">流水、库存预警、挂账记录</span>
              </div>
            </div>
            <div className="tabs">
              {[
                ["orders", "今日流水"],
                ["warning", "库存预警"],
                ["debt", "挂账记录"],
              ].map(([key, label]) => (
                <button
                  className={`tab-btn ${activeTab === key ? "active" : ""}`}
                  data-tab={key}
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key as "orders" | "warning" | "debt")}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="tool-row">
              <input
                className="field"
                value={recordSearch}
                onChange={(event) => setRecordSearch(event.target.value)}
                placeholder="筛选商品、订单、客户"
              />
            </div>
            {activeTab === "orders" ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>订单号</th>
                      <th>商品</th>
                      <th>支付方式</th>
                      <th>金额</th>
                      <th>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.length ? (
                      visibleOrders.map((order) => (
                        <tr key={order.no}>
                          <td>{order.no}</td>
                          <td>{order.items.map((item) => `${item.name} x${item.qty}`).join("、")}</td>
                          <td>
                            <span className={`pay-badge ${order.isDebt ? "debt" : ""}`}>{order.payment}</span>
                          </td>
                          <td className="money-cell">{money(order.amount)}</td>
                          <td>{order.time}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>暂无流水</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            {activeTab === "warning" ? (
              <div className="warning-list">
                {lowProducts.length ? (
                  lowProducts.map((product) => (
                    <div className="list-row low-alert" key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <span className="muted">
                          {productCategory(product, categories)} · 阈值 {product.low_stock_threshold} {product.unit}
                        </span>
                      </div>
                      <span className="pill low">
                        剩余 {product.stock} {product.unit}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty">暂无库存预警</div>
                )}
              </div>
            ) : null}

            {activeTab === "debt" ? (
              <div className="debt-list">
                {debtOrders.length ? (
                  debtOrders.map((order) => (
                    <div className="list-row" key={order.no}>
                      <div>
                        <strong>{order.customer || "未填写客户"}</strong>
                        <span className="muted">
                          {order.no} · {order.note || "无备注"}
                        </span>
                      </div>
                      <span className="pay-badge debt">{money(order.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty">暂无挂账记录</div>
                )}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
