"use client";

import { createContext, useContext } from "react";
import type { CategoryInfo } from "@atlas/api";

const CategoriesContext = createContext<CategoryInfo[]>([]);

export function CategoriesProvider({ categories, children }: { categories: CategoryInfo[]; children: React.ReactNode }) {
  return <CategoriesContext.Provider value={categories}>{children}</CategoriesContext.Provider>;
}

/** Every game from GET /api/categories, loaded once in the root layout. Empty when the API is down. */
export function useCategories(): CategoryInfo[] {
  return useContext(CategoriesContext);
}
