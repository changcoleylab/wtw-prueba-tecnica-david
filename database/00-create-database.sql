USE [master];
GO

IF DB_ID(N'InvoiceHub') IS NULL
BEGIN
    CREATE DATABASE [InvoiceHub];
END
GO
