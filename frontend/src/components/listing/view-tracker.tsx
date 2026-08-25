"use client";

import { useEffect } from "react";
import { recordAffinityEvent } from "@/lib/affinity";
import type { Category } from "@/lib/types";

export function ViewTracker({ category }: { category: Category }) {
  useEffect(() => {
    recordAffinityEvent(category, "view");
  }, [category]);
  return null;
}
