import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

/**
 * An in-memory Storage, because this jsdom build exposes none: Node's own experimental
 * localStorage is disabled without --localstorage-file and shadows jsdom's. Without it the
 * history and session-id code paths silently take their "storage unavailable" branch and go
 * untested, which is exactly the code that most needs covering.
 */
class MemoryStorage implements Storage {
  private entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: string): string | null {
    return this.entries.get(String(key)) ?? null;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.entries.delete(String(key));
  }

  setItem(key: string, value: string): void {
    this.entries.set(String(key), String(value));
  }
}

const localStorageStub = new MemoryStorage();
const sessionStorageStub = new MemoryStorage();

Object.defineProperty(globalThis, "localStorage", { value: localStorageStub, configurable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: sessionStorageStub, configurable: true });

// Storage that leaked between tests would make them order-dependent.
beforeEach(() => {
  localStorageStub.clear();
  sessionStorageStub.clear();
});
