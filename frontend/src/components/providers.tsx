"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import { CategoriesProvider } from "@/lib/categories-context";
import type { CategoryInfo } from "@/lib/types";
import { useState } from "react";

export function Providers({ categories, children }: { categories: CategoryInfo[]; children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <CategoriesProvider categories={categories}>{children}</CategoriesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
