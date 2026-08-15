namespace Invoice.Infrastructure.Persistence;

public static class StoredProcedureNames
{
    public const string ClientGetOrCreate = "dbo.usp_Client_GetOrCreate";
    public const string InvoiceCreate = "dbo.usp_Invoice_Create";
    public const string InvoiceGetById = "dbo.usp_Invoice_GetById";
    public const string InvoiceSearch = "dbo.usp_Invoice_Search";
    public const string InvoiceList = "dbo.usp_Invoice_List";
    public const string InvoiceUpdateStatus = "dbo.usp_Invoice_UpdateStatus";
    public const string InvoiceExistsByNumber = "dbo.usp_Invoice_ExistsByNumber";
    public const string AuthGetUserByEmail = "dbo.usp_Auth_GetUserByEmail";
    public const string AuthSetPasswordHash = "dbo.usp_Auth_SetPasswordHash";
    public const string IdempotencyReserve = "dbo.usp_Idempotency_Reserve";
    public const string IdempotencyComplete = "dbo.usp_Idempotency_Complete";
    public const string IdempotencyAbandon = "dbo.usp_Idempotency_Abandon";
}
