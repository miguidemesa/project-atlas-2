import { describe, expect, it } from "vitest";
import type { Order } from "@/lib/api";
import { payOutcome } from "@/lib/checkout";

const order = (status: Order["status"]) => ({ ok: true, order: { status } as Order });

describe("payOutcome", () => {
  it("says paid only for a server-confirmed paid status", () => {
    expect(payOutcome(order("paid_awaiting_shipment"))).toBe("paid");
  });
  it("never says paid for pending_payment or a missing order", () => {
    expect(payOutcome(order("pending_payment"))).toBe("pending");
    expect(payOutcome({ ok: true })).toBe("pending");
  });
  it("never says paid for cancelled or refunded orders", () => {
    expect(payOutcome(order("cancelled"))).toBe("retry");
    expect(payOutcome(order("refunded"))).toBe("retry");
  });
  it("never says paid on a failed call", () => {
    expect(payOutcome({ ok: false, error: "x", status: 500 })).toBe("retry");
    expect(payOutcome({ ok: false, error: "x" })).toBe("retry");
  });
  it("treats 404 and 409 as an ended reservation", () => {
    expect(payOutcome({ ok: false, error: "x", status: 404 })).toBe("expired");
    expect(payOutcome({ ok: false, error: "x", status: 409 })).toBe("expired");
  });
  it("redirects to the hosted checkout without claiming payment", () => {
    expect(payOutcome({ ok: true, checkoutUrl: "https://pay.example/x" })).toBe("redirect");
  });
});
