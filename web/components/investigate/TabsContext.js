"use client";

import { createContext, useContext } from "react";

/**
 * Lets a deeply nested component (an evidence link inside the AI tab) ask the
 * investigation shell to switch tabs and highlight a row. Optional — components
 * fall back to plain in-page scrolling when no provider is mounted.
 */
export const TabsContext = createContext(null);

export function useTabs() {
  return useContext(TabsContext);
}
