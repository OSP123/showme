// Svelte store for in-app notifications
import { writable } from 'svelte/store';

export interface Notification {
  id: string;
  type: 'pin_added' | 'pin_updated' | 'map_updated';
  pinType?: string;
  emoji?: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Create the store
const { subscribe, update } = writable<Notification[]>([]);

// Load from localStorage on init
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('showme_notifications');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      update(() => parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      })));
    } catch (e) {
      console.warn('Failed to load notifications from storage');
    }
  }
}

export const notifications = {
  subscribe,
  
  add: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false
    };
    
    update(n => {
      const updated = [newNotification, ...n].slice(0, 50); // Keep last 50
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('showme_notifications', JSON.stringify(updated));
      }
      
      return updated;
    });
    
    return newNotification.id;
  },
  
  markAsRead: (id: string) => {
    update(n => {
      const updated = n.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      );
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('showme_notifications', JSON.stringify(updated));
      }
      
      return updated;
    });
  },
  
  markAllAsRead: () => {
    update(n => {
      const updated = n.map(notif => ({ ...notif, read: true }));
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('showme_notifications', JSON.stringify(updated));
      }
      
      return updated;
    });
  },
  
  clear: () => {
    update(() => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('showme_notifications');
      }
      return [];
    });
  }
};

// Helper to get emoji for pin type
export function getPinTypeEmoji(pinType?: string): string {
  const emojiMap: Record<string, string> = {
    danger: '⚠️',
    medical: '🏥',
    water: '💧',
    food: '🍽️',
    shelter: '🏠',
    checkpoint: '🚧',
    other: '📍'
  };
  return pinType ? emojiMap[pinType] || '📍' : '📍';
}
