export interface ProductVariant {
  id: string;
  name: string;        // e.g. 'Soot Black', 'Alabaster White', 'Sage Green'
  image?: string;      // specific image for this color/design variant
  colorCode?: string;   // optional hex code for styling color swatches
}

export interface ParentImage {
  title: string; // e.g. 'Front', 'Back'
  url: string;
}

export interface ParentProduct {
  id: string;
  name: string;
  image?: string; // optional representative image
  images?: ParentImage[]; // titled images in display order; `image` mirrors images[0].url
  category: string; // owned by the parent; copied onto every linked product (products.category). '' = uncategorized
  subcategory?: string;
  sizeOrder: string[]; // canonical size list & display order, e.g. ['S', 'M', 'L', 'XL']
  stockBySize: Record<string, number>; // keys are exactly the entries in sizeOrder
}

export type HighlightIconKey =
  | 'leaf'
  | 'shirt'
  | 'truck'
  | 'shield'
  | 'package'
  | 'sparkles'
  | 'ruler'
  | 'droplets'
  | 'wind';

// One entry of a product's admin-entered feature row, e.g. 180 GSM / Lycra Cotton.
export interface ProductHighlight {
  icon: HighlightIconKey;
  title: string;
  subtitle: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  subcategory?: string;
  rating: number;
  parentProductId?: string; // references the ParentProduct that owns this product's sizes & stock
  variants?: ProductVariant[]; // list of design/color variants
  sizeChartId?: string; // references a reusable SizeChart template
  gallery?: string[]; // extra product photos shown as thumbnails (main image stays in `image`)
  highlights?: ProductHighlight[]; // admin-entered feature row
  isActive?: boolean; // false hides the product from the storefront (undefined = active)
  isFeatured?: boolean;
  parentProduct?: ParentProduct; // read-time join attached by the application layer; never persisted on the product doc
}

export interface SizeChartRow {
  size: string; // e.g. 'S', 'M', '42'
  values: string[]; // one value per SizeChart.columns entry, same order
}

export interface SizeChart {
  id: string;
  name: string; // e.g. "Men's T-Shirt", "Women's Dress"
  columns: string[]; // measurement labels, e.g. ['Chest', 'Length', 'Shoulder']
  rows: SizeChartRow[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string; // For products with size variants
  selectedVariant?: ProductVariant; // For products with design/color variants
}

export type OrderStatus = 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  selectedSize?: string; // For products with size variants
  selectedVariant?: ProductVariant; // For products with design/color variants
  parentProductId?: string; // Snapshot of the parent product whose pooled stock this line decremented
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  address: string;
  phone: string;
  items: OrderItem[];
  totalAmount: number;
  promoCode?: string;
  discount?: number;
  status: OrderStatus;
  paymentMethod: 'cash_on_delivery';
  createdAt: string; // ISO String or serialized
  updatedAt: string;
}
