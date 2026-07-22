export interface ProductVariant {
  id: string;
  name: string;        // e.g. 'Soot Black', 'Alabaster White', 'Sage Green'
  image?: string;      // specific image for this color/design variant
  colorCode?: string;   // optional hex code for styling color swatches
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
  stock: number;
  sizes?: string[]; // e.g. ['S', 'M', 'L', 'XL']
  variants?: ProductVariant[]; // list of design/color variants
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
