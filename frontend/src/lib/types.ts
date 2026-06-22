export interface StoreBrand {
  name: string;
  description: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  whatsappNumber: string | null;
  allowsPickup: boolean;
  allowsDelivery: boolean;
  deliveryFee: string;
}

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

export interface StoreResponse {
  store: StoreBrand;
  categories: StoreCategory[];
}

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
  isFeatured: boolean;
  available: number;
  inStock: boolean;
  description?: string | null;
  category?: { name: string; slug: string } | null;
}

export interface ProductListResponse {
  items: PublicProduct[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
