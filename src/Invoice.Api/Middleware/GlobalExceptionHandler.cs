using Invoice.Domain.Exceptions;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Invoice.Api.Middleware;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is ValidationException validation)
        {
            var errors = validation.Errors
                .GroupBy(e => string.IsNullOrWhiteSpace(e.PropertyName) ? "request" : e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

            var validationProblem = new HttpValidationProblemDetails(errors)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation failed",
                Type = "https://httpstatuses.io/400",
                Instance = context.Request.Path
            };
            AttachCorrelation(context, validationProblem);
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(validationProblem, cancellationToken);
            return true;
        }

        var (status, title, detail) = exception switch
        {
            InvalidInvoiceException => (StatusCodes.Status400BadRequest, "Invalid request", exception.Message),
            UnauthorizedException => (StatusCodes.Status401Unauthorized, "Unauthorized", exception.Message),
            InvoiceNotFoundException => (StatusCodes.Status404NotFound, "Invoice not found", exception.Message),
            DuplicateInvoiceException => (StatusCodes.Status409Conflict, "Conflict", exception.Message),
            ConflictException => (StatusCodes.Status409Conflict, "Conflict", exception.Message),
            _ => (StatusCodes.Status500InternalServerError, "Unexpected error", "An unexpected error occurred.")
        };

        if (status == StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception");
        }

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Type = $"https://httpstatuses.io/{status}",
            Instance = context.Request.Path
        };
        AttachCorrelation(context, problem);
        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }

    private static void AttachCorrelation(HttpContext context, ProblemDetails problem)
    {
        if (context.Items.TryGetValue(CorrelationIdMiddleware.HeaderName, out var value) && value is string id)
        {
            problem.Extensions["correlationId"] = id;
        }
    }
}
