export interface ProductColor {
  name: string;
  hex: string;
  image?: string;
}

export interface ProductSize {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  nameKo?: string;
  description: string;
  shortDescription?: string;
  /** 사이즈별 가격 차이가 없는 상품의 기본가. sizes가 있으면 sizes[].price가 실제 판매가로 우선 적용됨 */
  price: number;
  imageUrl: string | null;
  images: string[];
  colors?: ProductColor[];
  /** 사이즈별로 가격이 다른 상품에만 사용 (예: FLOWER POUCH S/L). 없으면 기존처럼 단일 가격(price)만 사용 */
  sizes?: ProductSize[];
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
  /** Our Story 섹션에 브랜드 스토리와 함께 노출할 이미지 */
  storyImage?: string;
  storyImageAlt?: string;
  /** 원단/대표 확대 이미지 (전체 폭 배너) */
  materialDetailImage?: string;
  materialDetailImageAlt?: string;
  /** Details 섹션에 세로로 나열할 이미지 목록 */
  detailImages?: { src: string; alt: string; width: number; height: number }[];
  /** 컬러 소개 섹션 (예: "7 Colors") */
  colorSectionTitle?: string;
  colorDescription?: string;
  colorSectionImage?: string;
  colorSectionImageAlt?: string;
  /** 실제 KC 인증번호. 없으면 SAFETY CERTIFICATION 영역 자체를 숨김 */
  certificationNumber?: string;
  /** 인증 아코디언 본문을 기본 템플릿 대신 완전히 교체하고 싶을 때만 사용 */
  certificationText?: string;
  /** SIZE/SAFETY CERTIFICATION/CARE 외 상품별 추가 아코디언 항목 */
  accordionItems?: { title: string; content: string }[];
  /** You May Also Like에 노출할 관련 상품 slug (표시 순서 그대로) */
  relatedProductSlugs?: string[];
  /** 상단 갤러리 images[] 순서에 대응하는 alt 텍스트 */
  imageAlts?: string[];
  /** 대표 이미지 alt에 쓰이는 한국어 명사구 (예: "아기 거즈빕") */
  imageAltSubject?: string;
  /** 스냅·지퍼·끈 등 부자재 정보. 해당 사항 없는 상품(SPREAD 등)은 비워두면 UI에 노출되지 않음 — 현재 렌더링 미구현, 데이터만 보관 */
  hardwareInfo?: string;
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
