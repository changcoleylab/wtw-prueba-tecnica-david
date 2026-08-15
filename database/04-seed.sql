USE [InvoiceHub];
GO

-- PasswordHash: SEED_PENDING_PHASE_04. La API lo reemplaza al arrancar con InvoiceHub!2026.

DECLARE @AnalystId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';
DECLARE @AdminId   UNIQUEIDENTIFIER = '22222222-2222-2222-2222-222222222222';
DECLARE @AcmeId    UNIQUEIDENTIFIER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DECLARE @GlobexId  UNIQUEIDENTIFIER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
DECLARE @InitechId UNIQUEIDENTIFIER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

IF NOT EXISTS (SELECT 1 FROM dbo.AppUser WHERE Id = @AnalystId)
BEGIN
    INSERT INTO dbo.AppUser (Id, Email, PasswordHash, DisplayName, Role)
    VALUES
        (@AnalystId, N'analyst@invoicehub.local', N'SEED_PENDING_PHASE_04', N'User Analyst', N'User'),
        (@AdminId,   N'admin@invoicehub.local',   N'SEED_PENDING_PHASE_04', N'Alex Admin',    N'Admin');
END
ELSE
BEGIN
    UPDATE dbo.AppUser SET DisplayName = N'User Analyst' WHERE Id = @AnalystId;
END

IF NOT EXISTS (SELECT 1 FROM dbo.Client WHERE Id = @AcmeId)
BEGIN
    INSERT INTO dbo.Client (Id, Name, DocumentNumber, Email)
    VALUES
        (@AcmeId,    N'Acme Corporation', N'900123456', N'billing@acme.test'),
        (@GlobexId,  N'Globex',           N'900987654', N'ap@globex.test');
END

IF NOT EXISTS (SELECT 1 FROM dbo.Client WHERE Id = @InitechId)
BEGIN
    INSERT INTO dbo.Client (Id, Name, DocumentNumber, Email)
    VALUES (@InitechId, N'Initech', N'901112233', N'ap@initech.test');
END

-- Acme se queda en 2 facturas (el test de search lo exige).
IF NOT EXISTS (SELECT 1 FROM dbo.Invoice WHERE InvoiceNumber = N'INV-2026-00001')
BEGIN
    INSERT INTO dbo.Invoice
        (Id, ClientId, InvoiceNumber, IssueDate, DueDate, Currency, Subtotal, Tax, Total, Status, CreatedBy)
    VALUES
        (NEWID(), @AcmeId,   N'INV-2026-00001', '2026-08-15', '2026-09-14', 'COP', 1000000.00, 190000.00, 1190000.00, N'Paid',    @AnalystId),
        (NEWID(), @AcmeId,   N'INV-2026-00002', '2026-08-15', '2026-09-14', 'COP', 2500000.00, 475000.00, 2975000.00, N'Issued',  @AnalystId),
        (NEWID(), @GlobexId, N'INV-2026-00003', '2026-08-15', '2026-09-14', 'USD',   8500.00,   1615.00,  10115.00, N'Issued',  @AnalystId);
END

UPDATE dbo.Invoice SET IssueDate = '2026-08-15', DueDate = '2026-09-14', Status = N'Paid'    WHERE InvoiceNumber = N'INV-2026-00001';
UPDATE dbo.Invoice SET IssueDate = '2026-08-15', DueDate = '2026-09-14', Status = N'Issued'  WHERE InvoiceNumber = N'INV-2026-00002';
UPDATE dbo.Invoice SET IssueDate = '2026-08-15', DueDate = '2026-09-14', Status = N'Issued'  WHERE InvoiceNumber = N'INV-2026-00003';
UPDATE dbo.Invoice SET IssueDate = '2026-08-15', DueDate = '2026-08-15', Status = N'Overdue' WHERE InvoiceNumber = N'INV-2026-00004';
UPDATE dbo.Invoice SET IssueDate = '2026-08-15', DueDate = '2026-09-14', Status = N'Paid'    WHERE InvoiceNumber = N'INV-2026-00005';
UPDATE dbo.Invoice SET IssueDate = '2026-08-15', DueDate = '2026-09-14', Status = N'Cancelled' WHERE InvoiceNumber = N'INV-2026-00006';
UPDATE dbo.Invoice SET IssueDate = '2026-08-15', DueDate = '2026-08-15', Status = N'Overdue' WHERE InvoiceNumber = N'INV-2026-00007';

IF NOT EXISTS (SELECT 1 FROM dbo.Invoice WHERE InvoiceNumber = N'INV-2026-00004')
BEGIN
    INSERT INTO dbo.Invoice
        (Id, ClientId, InvoiceNumber, IssueDate, DueDate, Currency, Subtotal, Tax, Total, Status, CreatedBy)
    VALUES
        (NEWID(), @GlobexId,  N'INV-2026-00004', '2026-08-15', '2026-08-15', 'USD',  4200.00,   798.00,   4998.00, N'Overdue',    @AnalystId),
        (NEWID(), @InitechId, N'INV-2026-00005', '2026-08-15', '2026-09-14', 'COP', 1800000.00, 342000.00, 2142000.00, N'Paid',    @AnalystId),
        (NEWID(), @InitechId, N'INV-2026-00006', '2026-08-15', '2026-09-14', 'COP',  750000.00, 142500.00,  892500.00, N'Cancelled', @AnalystId),
        (NEWID(), @InitechId, N'INV-2026-00007', '2026-08-15', '2026-08-15', 'EUR',   3100.00,   589.00,   3689.00, N'Overdue',    @AnalystId);
END
GO
