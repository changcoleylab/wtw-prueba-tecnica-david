USE [InvoiceHub];
GO

CREATE OR ALTER PROCEDURE dbo.usp_Client_GetOrCreate
    @Name           NVARCHAR(200),
    @DocumentNumber NVARCHAR(32),
    @Email          NVARCHAR(256) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Id UNIQUEIDENTIFIER;

    SELECT @Id = Id
    FROM dbo.Client WITH (UPDLOCK, HOLDLOCK)
    WHERE DocumentNumber = @DocumentNumber;

    IF @Id IS NULL
    BEGIN
        SET @Id = NEWID();
        INSERT INTO dbo.Client (Id, Name, DocumentNumber, Email)
        VALUES (@Id, @Name, @DocumentNumber, @Email);
    END
    ELSE
    BEGIN
        UPDATE dbo.Client
        SET Name = @Name,
            Email = COALESCE(@Email, Email)
        WHERE Id = @Id;
    END

    SELECT Id, Name, DocumentNumber, Email, CreatedAt
    FROM dbo.Client
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Invoice_GetById
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.Id,
        i.InvoiceNumber,
        i.IssueDate,
        i.DueDate,
        i.Currency,
        i.Subtotal,
        i.Tax,
        i.Total,
        i.Status,
        i.CreatedAt,
        i.UpdatedAt,
        i.LinesJson,
        c.Id            AS ClientId,
        c.Name          AS ClientName,
        c.DocumentNumber AS ClientDocument,
        c.Email         AS ClientEmail
    FROM dbo.Invoice AS i
    INNER JOIN dbo.Client AS c ON c.Id = i.ClientId
    WHERE i.Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Invoice_Create
    @Id             UNIQUEIDENTIFIER,
    @ClientId       UNIQUEIDENTIFIER,
    @InvoiceNumber  NVARCHAR(40),
    @IssueDate      DATE,
    @DueDate        DATE,
    @Currency       CHAR(3),
    @Subtotal       DECIMAL(18, 2),
    @Tax            DECIMAL(18, 2),
    @Total          DECIMAL(18, 2),
    @Status         NVARCHAR(16),
    @CreatedBy      UNIQUEIDENTIFIER = NULL,
    @LinesJson      NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Invoice
    (
        Id, ClientId, InvoiceNumber, IssueDate, DueDate,
        Currency, Subtotal, Tax, Total, Status, CreatedBy, LinesJson
    )
    VALUES
    (
        @Id, @ClientId, @InvoiceNumber, @IssueDate, @DueDate,
        @Currency, @Subtotal, @Tax, @Total, @Status, @CreatedBy, @LinesJson
    );

    EXEC dbo.usp_Invoice_GetById @Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Invoice_Search
    @ClientName NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.Id,
        i.InvoiceNumber,
        i.IssueDate,
        i.DueDate,
        i.Currency,
        i.Subtotal,
        i.Tax,
        i.Total,
        i.Status,
        i.CreatedAt,
        i.UpdatedAt,
        i.LinesJson,
        c.Id            AS ClientId,
        c.Name          AS ClientName,
        c.DocumentNumber AS ClientDocument,
        c.Email         AS ClientEmail
    FROM dbo.Invoice AS i
    INNER JOIN dbo.Client AS c ON c.Id = i.ClientId
    WHERE c.Name LIKE N'%' + @ClientName + N'%'
    ORDER BY i.IssueDate DESC, i.InvoiceNumber;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Invoice_List
    @Page     INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    IF @Page < 1 SET @Page = 1;
    IF @PageSize < 1 SET @PageSize = 20;
    IF @PageSize > 100 SET @PageSize = 100;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    SELECT COUNT(*) AS TotalCount
    FROM dbo.Invoice;

    SELECT
        i.Id,
        i.InvoiceNumber,
        i.IssueDate,
        i.DueDate,
        i.Currency,
        i.Subtotal,
        i.Tax,
        i.Total,
        i.Status,
        i.CreatedAt,
        i.UpdatedAt,
        i.LinesJson,
        c.Id            AS ClientId,
        c.Name          AS ClientName,
        c.DocumentNumber AS ClientDocument,
        c.Email         AS ClientEmail
    FROM dbo.Invoice AS i
    INNER JOIN dbo.Client AS c ON c.Id = i.ClientId
    ORDER BY i.IssueDate DESC, i.InvoiceNumber
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Invoice_UpdateStatus
    @Id     UNIQUEIDENTIFIER,
    @Status NVARCHAR(16)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Invoice WHERE Id = @Id)
    BEGIN
        RETURN;
    END

    UPDATE dbo.Invoice
    SET Status = @Status,
        UpdatedAt = SYSUTCDATETIME()
    WHERE Id = @Id;

    EXEC dbo.usp_Invoice_GetById @Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Invoice_ExistsByNumber
    @InvoiceNumber NVARCHAR(40)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM dbo.Invoice WHERE InvoiceNumber = @InvoiceNumber)
        THEN 1
        ELSE 0
    END;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Auth_GetUserByEmail
    @Email NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT Id, Email, PasswordHash, DisplayName, Role, CreatedAt
    FROM dbo.AppUser
    WHERE Email = @Email;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Auth_SetPasswordHash
    @Id           UNIQUEIDENTIFIER,
    @PasswordHash NVARCHAR(512)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.AppUser
    SET PasswordHash = @PasswordHash
    WHERE Id = @Id;
END
GO


CREATE OR ALTER PROCEDURE dbo.usp_Idempotency_Reserve
    @IdempotencyKey NVARCHAR(128),
    @RequestHash    CHAR(64)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Inserted BIT = 0;

    BEGIN TRY
        INSERT INTO dbo.IdempotencyRecord (IdempotencyKey, RequestHash, ResponseStatus, ResponseBody)
        VALUES (@IdempotencyKey, @RequestHash, 0, N'');
        SET @Inserted = 1;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() NOT IN (2627, 2601)
        BEGIN
            THROW;
        END
    END CATCH

    SELECT
        @Inserted AS Inserted,
        IdempotencyKey,
        RequestHash,
        ResponseStatus,
        ResponseBody,
        CreatedAt
    FROM dbo.IdempotencyRecord
    WHERE IdempotencyKey = @IdempotencyKey;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Idempotency_Complete
    @IdempotencyKey NVARCHAR(128),
    @ResponseStatus INT,
    @ResponseBody   NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.IdempotencyRecord
    SET ResponseStatus = @ResponseStatus,
        ResponseBody = @ResponseBody
    WHERE IdempotencyKey = @IdempotencyKey;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Idempotency_Abandon
    @IdempotencyKey NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.IdempotencyRecord
    WHERE IdempotencyKey = @IdempotencyKey
      AND ResponseStatus = 0;
END
GO
