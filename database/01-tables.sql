USE [InvoiceHub];
GO

IF OBJECT_ID(N'dbo.IdempotencyRecord', N'U') IS NOT NULL DROP TABLE dbo.IdempotencyRecord;
IF OBJECT_ID(N'dbo.Invoice', N'U') IS NOT NULL DROP TABLE dbo.Invoice;
IF OBJECT_ID(N'dbo.Client', N'U') IS NOT NULL DROP TABLE dbo.Client;
IF OBJECT_ID(N'dbo.AppUser', N'U') IS NOT NULL DROP TABLE dbo.AppUser;
GO

CREATE TABLE dbo.AppUser
(
    Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AppUser PRIMARY KEY,
    Email           NVARCHAR(256)    NOT NULL,
    PasswordHash    NVARCHAR(512)    NOT NULL,
    DisplayName     NVARCHAR(200)    NOT NULL,
    Role            NVARCHAR(32)     NOT NULL CONSTRAINT DF_AppUser_Role DEFAULT (N'User'),
    CreatedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_AppUser_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_AppUser_Role CHECK (Role IN (N'User', N'Admin')),
    CONSTRAINT UX_AppUser_Email UNIQUE (Email)
);
GO

CREATE TABLE dbo.Client
(
    Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Client PRIMARY KEY,
    Name            NVARCHAR(200)    NOT NULL,
    DocumentNumber  NVARCHAR(32)     NOT NULL,
    Email           NVARCHAR(256)    NULL,
    CreatedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_Client_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UX_Client_DocumentNumber UNIQUE (DocumentNumber)
);
GO

CREATE TABLE dbo.Invoice
(
    Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Invoice PRIMARY KEY,
    ClientId        UNIQUEIDENTIFIER NOT NULL,
    InvoiceNumber   NVARCHAR(40)     NOT NULL,
    IssueDate       DATE             NOT NULL,
    DueDate         DATE             NOT NULL,
    Currency        CHAR(3)          NOT NULL,
    Subtotal        DECIMAL(18, 2)   NOT NULL,
    Tax             DECIMAL(18, 2)   NOT NULL,
    Total           DECIMAL(18, 2)   NOT NULL,
    Status          NVARCHAR(16)     NOT NULL CONSTRAINT DF_Invoice_Status DEFAULT (N'Issued'),
    CreatedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_Invoice_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_Invoice_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CreatedBy       UNIQUEIDENTIFIER NULL,
    LinesJson       NVARCHAR(MAX)    NULL,
    CONSTRAINT FK_Invoice_Client FOREIGN KEY (ClientId) REFERENCES dbo.Client (Id),
    CONSTRAINT FK_Invoice_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.AppUser (Id),
    CONSTRAINT UX_Invoice_InvoiceNumber UNIQUE (InvoiceNumber),
    CONSTRAINT CK_Invoice_Status CHECK (Status IN (N'Draft', N'Issued', N'Paid', N'Cancelled', N'Overdue')),
    CONSTRAINT CK_Invoice_DueDate CHECK (DueDate >= IssueDate),
    CONSTRAINT CK_Invoice_Amounts CHECK (Subtotal >= 0 AND Tax >= 0 AND Total >= 0),
    CONSTRAINT CK_Invoice_Currency CHECK (Currency IN ('COP', 'USD', 'EUR'))
);
GO

CREATE TABLE dbo.IdempotencyRecord
(
    IdempotencyKey  NVARCHAR(128)    NOT NULL CONSTRAINT PK_IdempotencyRecord PRIMARY KEY,
    RequestHash     CHAR(64)         NOT NULL,
    ResponseStatus  INT              NOT NULL,
    ResponseBody    NVARCHAR(MAX)    NOT NULL,
    CreatedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_Idempotency_CreatedAt DEFAULT (SYSUTCDATETIME())
);
GO
