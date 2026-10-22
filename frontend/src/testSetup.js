import '@testing-library/jest-dom/vitest';

const storageValues = new Map();
const storage = {
  getItem: (key) => storageValues.get(String(key)) ?? null,
  setItem: (key, value) => storageValues.set(String(key), String(value)),
  removeItem: (key) => storageValues.delete(String(key)),
  clear: () => storageValues.clear(),
};

Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
