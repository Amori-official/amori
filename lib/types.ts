export interface ProductColor {
  name: string;
  hex: string;
  image?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  nameKo?: string;
  description: string;
  shortDescription?: string;
  price: number;
  imageUrl: string | null;
  images: string[];
  colors?: ProductColor[];
  category: string;
  stock: number;
  isComingSoon?: boolean;
  material?: string;
  sizeGuide?: string;
  careInstructions?: string;
  detailIntro?: string;
  tagline?: string;
  features?: { label: string; body: string }[];
  brandStory?: string;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  shippingAddress: ShippingAddress;
  giftWrapping?: boolean;
  giftMessage?: string;
  createdAt: string;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  createdAt: string;
}
