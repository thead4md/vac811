import '@testing-library/jest-dom'

// jsdom has no IntersectionObserver; some pages (Home) use it for scroll reveals.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
