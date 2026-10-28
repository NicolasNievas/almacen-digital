import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library no limpia el DOM automáticamente sin `globals: true`.
afterEach(() => {
  cleanup();
});
