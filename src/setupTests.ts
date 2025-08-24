/**
 * Jest Setup for Version History Tests
 * Mock browser APIs like localStorage for test environment
 */

// Mock localStorage (jsdom already provides window)
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

// Replace localStorage with our mock
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock performance.now() for performance testing
if (!window.performance) {
  Object.defineProperty(window, "performance", {
    value: {
      now: () => Date.now(),
    },
    writable: true,
  });
}
