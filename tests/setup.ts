import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement scrollIntoView -- SegmentList calls it to follow the active segment.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
