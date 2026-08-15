namespace Invoice.Domain.Enums;

public enum InvoiceStatus
{
    Draft = 0,
    Issued = 1,
    Paid = 2,
    Cancelled = 3,
    Overdue = 4
}
