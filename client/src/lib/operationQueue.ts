// Operation queue for retrying failed operations when offline
interface QueuedOperation {
  id: string;
  type: 'createMap' | 'addPin';
  data: any;
  timestamp: number;
  retries: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

export class OperationQueue {
  private queue: QueuedOperation[] = [];
  private processing = false;
  private listeners: Array<(count: number) => void> = [];

  constructor() {
    // Load queue from localStorage on init
    this.loadFromStorage();
    
    // Listen for online events to retry operations
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processQueue();
      });
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('operationQueue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load operation queue from storage:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('operationQueue', JSON.stringify(this.queue));
    } catch (e) {
      console.error('Failed to save operation queue to storage:', e);
    }
  }

  subscribe(listener: (count: number) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.queue.length));
  }

  async enqueue(type: QueuedOperation['type'], data: any): Promise<string> {
    const operation: QueuedOperation = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(operation);
    this.saveToStorage();
    this.notify();

    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return operation.id;
  }

  async processQueue() {
    // Don't process queue if panic wipe is active (check both window flag and localStorage)
    const panicWipeActive = (window as any).__panicWipeActive || localStorage.getItem('__panicWipeActive') === 'true';
    if (panicWipeActive) {
      console.debug('⏸️ Operation queue processing disabled - panic wipe active');
      return;
    }
    
    if (this.processing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.processing = true;
    console.log(`🔄 Processing ${this.queue.length} queued operations...`);

    const operationsToProcess = [...this.queue];
    
    for (const operation of operationsToProcess) {
      // Check panic wipe flag before each operation (check both window flag and localStorage)
      const panicWipeActive = (window as any).__panicWipeActive || localStorage.getItem('__panicWipeActive') === 'true';
      if (panicWipeActive) {
        console.debug('⏸️ Operation queue processing stopped - panic wipe active');
        this.processing = false;
        return;
      }
      
      try {
        const success = await this.executeOperation(operation);
        
        if (success) {
          // Remove from queue on success
          this.queue = this.queue.filter(op => op.id !== operation.id);
          this.saveToStorage();
          this.notify();
          console.log(`✅ Successfully processed operation ${operation.id}`);
        } else {
          // Increment retries
          operation.retries++;
          
          if (operation.retries >= MAX_RETRIES) {
            // Remove after max retries
            console.warn(`⚠️ Operation ${operation.id} exceeded max retries, removing from queue`);
            this.queue = this.queue.filter(op => op.id !== operation.id);
            this.saveToStorage();
            this.notify();
          } else {
            // Update in queue
            const index = this.queue.findIndex(op => op.id === operation.id);
            if (index !== -1) {
              this.queue[index] = operation;
              this.saveToStorage();
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing operation ${operation.id}:`, error);
        operation.retries++;
        
        if (operation.retries >= MAX_RETRIES) {
          this.queue = this.queue.filter(op => op.id !== operation.id);
          this.saveToStorage();
          this.notify();
        }
      }
      
      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.processing = false;
    
    if (this.queue.length > 0) {
      // Retry remaining operations after delay
      setTimeout(() => this.processQueue(), RETRY_DELAY);
    }
  }

  private async executeOperation(operation: QueuedOperation): Promise<boolean> {
    // Don't execute operations if panic wipe is active (check both window flag and localStorage)
    const panicWipeActive = (window as any).__panicWipeActive || localStorage.getItem('__panicWipeActive') === 'true';
    if (panicWipeActive) {
      console.debug('⏸️ Operation execution skipped - panic wipe active');
      return false;
    }
    
    try {
      if (operation.type === 'createMap') {
        const response = await fetch('http://localhost:3015/maps', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(operation.data)
        });
        return response.ok;
      } else if (operation.type === 'addPin') {
        // Before creating a pin, ensure the map exists in PostgreSQL
        // This prevents foreign key constraint violations
        const mapId = operation.data.map_id;
        try {
          const mapCheckResponse = await fetch(`http://localhost:3015/maps?id=eq.${mapId}&select=id`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (mapCheckResponse.ok) {
            const maps = await mapCheckResponse.json();
            if (maps.length === 0) {
              // Map doesn't exist - this operation will fail, so return false
              // The map should be created/synced first
              console.warn(`⚠️ Map ${mapId} does not exist in PostgreSQL, pin operation will retry after map sync`);
              return false;
            }
          }
        } catch (mapCheckError) {
          // If we can't check, continue anyway - the pin creation will fail if map doesn't exist
          console.warn('⚠️ Could not check if map exists, proceeding with pin creation:', mapCheckError);
        }
        
        // Map exists (or we couldn't check), try to create the pin
        let response: Response;
        try {
          response = await fetch('http://localhost:3015/pins', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
                body: JSON.stringify(operation.data)
          });
        } catch (fetchError) {
          console.error('❌ Network error during pin operation:', fetchError);
          return false;
        }
        
        if (!response.ok) {
          let errorText = await response.text();
          let errorMessage = errorText;
          
          // Try to parse as JSON (PostgREST returns JSON errors)
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorText;
          } catch {
            // Not JSON, use as-is
          }
          
          console.error(`❌ Pin operation failed (${response.status}):`, errorMessage);
          console.error('📦 Data sent:', JSON.stringify(operation.data, null, 2));
          
          // Check if it's a column doesn't exist error (for backward compatibility)
          // PostgREST error: "Could not find the 'expires_at' column of 'pins' in the schema cache"
          const isColumnError = errorMessage.includes('column') && (
            errorMessage.includes('does not exist') || 
            errorMessage.includes('Could not find') ||
            errorText.includes('PGRST204')
          );
          
          if (isColumnError) {
            console.warn(`⚠️ Column doesn't exist in PostgreSQL yet, retrying without Phase 3 fields...`);
            // Try again without the new Phase 3 fields
            if (operation.data.type || operation.data.expires_at) {
              const fallbackData = { ...operation.data };
              delete fallbackData.type;
              delete fallbackData.expires_at;
              console.log('🔄 Retrying pin operation without Phase 3 fields...');
              
              response = await fetch('http://localhost:3015/pins', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify(fallbackData)
              });
              
              if (response.ok) {
                console.log('✅ Pin saved successfully after fallback');
                return true;
              }
              // If fallback also fails, log the error
              const fallbackErrorText = await response.text();
              console.error(`❌ Fallback also failed (${response.status}):`, fallbackErrorText);
            }
          }
          
          // Check if it's a foreign key constraint error
          if (errorText.includes('foreign key constraint') || errorText.includes('23503')) {
            console.warn(`⚠️ Foreign key constraint error for pin - map ${mapId} may not exist yet`);
            return false; // Will retry later
          }
          
          return false;
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Operation execution error:', error);
      return false;
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue() {
    this.queue = [];
    this.saveToStorage();
    this.notify();
  }
}

export const operationQueue = new OperationQueue();

// Make operation queue accessible globally for panic wipe
if (typeof window !== 'undefined') {
  (window as any).operationQueue = operationQueue;
}

