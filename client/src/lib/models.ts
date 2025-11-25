// src/lib/models.ts

/** A row from the `maps` table */
export interface MapRow {
  id: string;
  name: string;
  is_private: 'true' | 'false';
  access_token: string | null;
  created_at: string; // ISO timestamp
  fuzzing_enabled?: boolean;
  fuzzing_radius?: number; // in meters
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
  type: string | null;         // PinType
  expires_at: string | null;  // ISO timestamp
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
  expires_at?: string; // ISO timestamp for TTL
}

/** Pin TTL configuration per type (in hours) */
export const PIN_TTL_HOURS: Record<PinType, number> = {
  medical: 24,      // Medical facilities: 24 hours
  water: 12,        // Water sources: 12 hours
  checkpoint: 2,    // Checkpoints: 2 hours (fastest expiration)
  shelter: 24,      // Shelters: 24 hours
  food: 12,         // Food sources: 12 hours
  danger: 6,        // Danger zones: 6 hours
  other: 24,        // Other: 24 hours
};
