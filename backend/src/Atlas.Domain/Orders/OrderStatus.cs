namespace Atlas.Domain.Orders;

public enum OrderStatus
{
    PendingPayment,
    PaidAwaitingShipment,
    Shipped,
    DeliveredConfirmed,
    FundsReleased,
    Disputed,
    Cancelled,
    Refunded
}