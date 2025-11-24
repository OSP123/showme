// src/lib/models.ts

/** A row from the `maps` table */
export interface MapRow {
  id: string;
  name: string;
  is_private: 'true' | 'false';
  access_token: string | null;
  created_at: string; // ISO timestamp
}

/** A row from the `pins` table */
export interface PinRow {
  id: string;
  map_id: string;
  lat: number;
  lng: number;
  tags: string | null;         // JSON-encoded
  description: string | null;
  photo_urls: string | null;   // JSON-encoded
  created_at: string;
  updated_at: string;
}

/** Pin type/category for quick categorization */
export type PinType = 
  | 'medical'
  | 'water'
  | 'checkpoint'
  | 'shelter'
  | 'food'
  | 'danger'
  | 'other';

/** Pin creation data */
export interface PinData {
  map_id: string;
  lat: number;
  lng: number;
  type?: PinType;
  tags?: string[];
  description?: string;
  photo_urls?: string[];
}
