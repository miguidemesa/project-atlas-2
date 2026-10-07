import type { PayResult } from "@/lib/api";

const PAID_STATES: readonly string[] = ["paid_awaiting_shipment", "shipped", "delivered_confirmed", "funds_released"];
const DEAD_ORDER_STATUSES = [404, 409];

export type PayOutcome = "paid" | "pending" | "redirect" | "expired" | "retry";

/**
 * What a pay response means. "paid" only when the server's order status says so
 * (domain rule 11); 404/409 mean the reservation is gone, so retrying it would loop.
 */
export function payOutcome(result: PayResult): PayOutcome {
  if (!result.ok) return result.status !== undefined && DEAD_ORDER_STATUSES.includes(result.status) ? "expired" : "retry";
  if (result.checkoutUrl) return "redirect";
  const status = result.order?.status;
  if (!status || status === "pending_payment") return "pending";
  return PAID_STATES.includes(status) ? "paid" : "retry";
}
