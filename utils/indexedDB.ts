class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'PersonalAIOperatorDB';
  private readonly version = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // State store
        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state', { keyPath: 'key' });
        }

        // Chat history store
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          messagesStore.createIndex('role', 'role', { unique: false });
        }

        // Audit trail store
        if (!db.objectStoreNames.contains('audit')) {
          const auditStore = db.createObjectStore('audit', { keyPath: 'id', autoIncrement: true });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
          auditStore.createIndex('source', 'source', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Telemetry store
        if (!db.objectStoreNames.contains('telemetry')) {
          const telemetryStore = db.createObjectStore('telemetry', { keyPath: 'id', autoIncrement: true });
          telemetryStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async get(key: string, store: string = 'state'): Promise<any> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  async set(key: string, value: any, store: string = 'state'): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put({ key, value, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async add(value: any, store: string): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.add({ ...value, timestamp: Date.now() });

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(store: string, limit: number = 100): Promise<any[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll(null, limit);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(store: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async searchMessages(query: string, role?: string): Promise<any[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const messages = await this.getAll('messages', 1000);
    return messages.filter((msg: any) => {
      const matchesText = msg.text?.toLowerCase().includes(query.toLowerCase());
      const matchesRole = role ? msg.role === role : true;
      return matchesText && matchesRole;
    });
  }

  async getMessagesByDateRange(start: number, end: number): Promise<any[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('timestamp');
      const range = IDBKeyRange.bound(start, end);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOldMessages(days: number = 30): Promise<void> {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const messages = await this.getAll('messages', 10000);
    const oldMessages = messages.filter((msg: any) => msg.timestamp < cutoff);

    for (const msg of oldMessages) {
      await this.delete('messages', msg.id);
    }
  }

  async delete(store: string, id: number | string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async exportAll(): Promise<{
    state: any;
    messages: any[];
    audit: any[];
    settings: any;
    telemetry: any[];
    exportDate: string;
    version: string;
  }> {
    const [state, messages, audit, settings, telemetry] = await Promise.all([
      this.getAll('state', 1).then(r => r[0]?.value || {}),
      this.getAll('messages', 10000),
      this.getAll('audit', 1000),
      this.getAll('settings', 1).then(r => r[0]?.value || {}),
      this.getAll('telemetry', 1000)
    ]);

    return {
      state,
      messages,
      audit,
      settings,
      telemetry,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  async importAll(data: any): Promise<void> {
    await this.clear('state');
    await this.clear('messages');
    await this.clear('audit');
    await this.clear('settings');
    await this.clear('telemetry');

    if (data.state) {
      await this.set('main', data.state, 'state');
    }
    if (data.settings) {
      await this.set('main', data.settings, 'settings');
    }
    if (data.messages) {
      for (const msg of data.messages) {
        await this.add(msg, 'messages');
      }
    }
    if (data.audit) {
      for (const entry of data.audit) {
        await this.add(entry, 'audit');
      }
    }
    if (data.telemetry) {
      for (const entry of data.telemetry) {
        await this.add(entry, 'telemetry');
      }
    }
  }
}

export const db = new IndexedDBStorage();
export default db;
