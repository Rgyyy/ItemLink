export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  is_verified: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ItemCategory {
  id: string;
  game_id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: Date;
}

export interface Item {
  id: string;
  seller_id: string;
  game_id: string;
  category_id?: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  server?: string;
  item_type: 'game_money' | 'item' | 'account' | 'other';
  status: 'available' | 'reserved' | 'sold' | 'hidden';
  images?: string[];
  views: number;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  item_id: string;
  seller_id: string;
  buyer_id: string;
  quantity: number;
  total_price: number;
  status: 'pending' | 'payment_waiting' | 'payment_completed' |
          'in_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
  payment_method?: string;
  meeting_location?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface Review {
  id: string;
  transaction_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string;
  created_at: Date;
}

export interface UserRating {
  user_id: string;
  total_reviews: number;
  average_rating: number;
  total_sales: number;
  total_purchases: number;
  updated_at: Date;
}

export interface Favorite {
  id: string;
  user_id: string;
  item_id: string;
  created_at: Date;
}

export interface Message {
  id: string;
  transaction_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
