import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface BookDB extends DBSchema {
  books: {
    key: string;
    value: {
      id: string;
      name: string;
      data: ArrayBuffer;
      uploadedAt: number;
      lastPage: number;
    };
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<BookDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<BookDB>('pdf-reader-db', 1, {
      upgrade(db) {
        const bookStore = db.createObjectStore('books', { keyPath: 'id' });
        bookStore.createIndex('by-date', 'uploadedAt');
      },
    });
  }
  return dbPromise;
}

export interface Book {
  id: string;
  name: string;
  data: ArrayBuffer;
  uploadedAt: number;
  lastPage: number;
}

export async function addBook(name: string, data: ArrayBuffer): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.put('books', {
    id,
    name,
    data,
    uploadedAt: Date.now(),
    lastPage: 1,
  });
  return id;
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDB();
  const books = await db.getAll('books');
  return books.sort((a, b) => b.uploadedAt - a.uploadedAt);
}

export async function getBook(id: string): Promise<Book | undefined> {
  const db = await getDB();
  return db.get('books', id);
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('books', id);
}

export async function updateLastPage(id: string, page: number): Promise<void> {
  const db = await getDB();
  const book = await db.get('books', id);
  if (book) {
    book.lastPage = page;
    await db.put('books', book);
  }
}
