import { openDB, type IDBPDatabase } from 'idb';
import type { CapturedMessage, ContactProfile, ConversationAnalysis, RizzAISettings } from '../../types';
import { DEFAULT_SETTINGS } from '../utils/constants';

const DB_NAME = 'rizzai';
const DB_VERSION = 1;

interface RizzAIDB {
  messages: {
    key: string;
    value: CapturedMessage;
    indexes: {
      'by-contact': string;
      'by-timestamp': number;
      'by-contact-timestamp': [string, number];
    };
  };
  contacts: {
    key: string;
    value: ContactProfile;
    indexes: {
      'by-platform': string;
    };
  };
  analyses: {
    key: string;
    value: ConversationAnalysis;
  };
  settings: {
    key: string;
    value: { key: string; data: RizzAISettings };
  };
}

let dbInstance: IDBPDatabase<RizzAIDB> | null = null;

async function getDB(): Promise<IDBPDatabase<RizzAIDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<RizzAIDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Messages store
      const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
      messagesStore.createIndex('by-contact', 'contactId');
      messagesStore.createIndex('by-timestamp', 'timestamp');
      messagesStore.createIndex('by-contact-timestamp', ['contactId', 'timestamp']);

      // Contacts store
      const contactsStore = db.createObjectStore('contacts', { keyPath: 'contactId' });
      contactsStore.createIndex('by-platform', 'platform');

      // Analyses store
      db.createObjectStore('analyses', { keyPath: 'contactId' });

      // Settings store
      db.createObjectStore('settings', { keyPath: 'key' });
    },
  });

  return dbInstance;
}

// ==================== Messages ====================

export async function saveMessages(messages: CapturedMessage[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('messages', 'readwrite');
  for (const msg of messages) {
    await tx.store.put(msg);
  }
  await tx.done;
}

export async function getMessagesByContact(contactId: string): Promise<CapturedMessage[]> {
  const db = await getDB();
  return db.getAllFromIndex('messages', 'by-contact', contactId);
}

export async function getRecentMessages(
  contactId: string,
  limit: number = 50
): Promise<CapturedMessage[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('messages', 'by-contact', contactId);
  // Sort by timestamp descending and take the most recent
  all.sort((a, b) => b.timestamp - a.timestamp);
  return all.slice(0, limit).reverse();
}

export async function getMessageCount(contactId: string): Promise<number> {
  const db = await getDB();
  return db.countFromIndex('messages', 'by-contact', contactId);
}

export async function deduplicateMessages(contactId: string): Promise<void> {
  const db = await getDB();
  const messages = await getMessagesByContact(contactId);

  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const msg of messages) {
    const key = `${msg.sender}:${msg.timestamp}:${msg.text}`;
    if (seen.has(key)) {
      duplicates.push(msg.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicates.length > 0) {
    const tx = db.transaction('messages', 'readwrite');
    for (const id of duplicates) {
      await tx.store.delete(id);
    }
    await tx.done;
  }
}

// ==================== Contacts ====================

export async function saveContact(profile: ContactProfile): Promise<void> {
  const db = await getDB();
  await db.put('contacts', profile);
}

export async function getContact(contactId: string): Promise<ContactProfile | undefined> {
  const db = await getDB();
  return db.get('contacts', contactId);
}

export async function getAllContacts(): Promise<ContactProfile[]> {
  const db = await getDB();
  return db.getAll('contacts');
}

export async function deleteContact(contactId: string): Promise<void> {
  const db = await getDB();
  await db.delete('contacts', contactId);

  // Also delete associated messages
  const messages = await getMessagesByContact(contactId);
  const tx = db.transaction('messages', 'readwrite');
  for (const msg of messages) {
    await tx.store.delete(msg.id);
  }
  await tx.done;

  // Delete analysis
  await db.delete('analyses', contactId);
}

// ==================== Analyses ====================

export async function saveAnalysis(analysis: ConversationAnalysis): Promise<void> {
  const db = await getDB();
  await db.put('analyses', analysis);
}

export async function getAnalysis(contactId: string): Promise<ConversationAnalysis | undefined> {
  const db = await getDB();
  return db.get('analyses', contactId);
}

// ==================== Settings ====================

export async function getSettings(): Promise<RizzAISettings> {
  const db = await getDB();
  const row = await db.get('settings', 'main');
  return row?.data ?? { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: Partial<RizzAISettings>): Promise<void> {
  const db = await getDB();
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await db.put('settings', { key: 'main', data: merged });
}

// ==================== Utilities ====================

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('messages');
  await db.clear('contacts');
  await db.clear('analyses');
}

export async function exportContactData(contactId: string) {
  const messages = await getMessagesByContact(contactId);
  const profile = await getContact(contactId);
  const analysis = await getAnalysis(contactId);
  return { profile, messages, analysis };
}
