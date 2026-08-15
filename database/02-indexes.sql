USE [InvoiceHub];
GO

-- Búsqueda GET /invoices/search?client= filtra por nombre de cliente.
CREATE NONCLUSTERED INDEX IX_Client_Name
    ON dbo.Client (Name);
GO

-- Evita scans al listar facturas de un cliente a medida que crece Invoice.
CREATE NONCLUSTERED INDEX IX_Invoice_ClientId
    ON dbo.Invoice (ClientId)
    INCLUDE (InvoiceNumber, IssueDate, DueDate, Total, Currency, Status);
GO

-- Filtros from/to sobre fecha de emisión.
CREATE NONCLUSTERED INDEX IX_Invoice_IssueDate
    ON dbo.Invoice (IssueDate);
GO
