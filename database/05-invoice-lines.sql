USE [InvoiceHub];
GO

IF COL_LENGTH(N'dbo.Invoice', N'LinesJson') IS NULL
BEGIN
    ALTER TABLE dbo.Invoice ADD LinesJson NVARCHAR(MAX) NULL;
END
GO
