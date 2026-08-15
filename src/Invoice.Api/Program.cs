using System.Threading.RateLimiting;
using Invoice.Api;
using Invoice.Api.Extensions;
using Invoice.Api.Middleware;
using Invoice.Application;
using Invoice.Infrastructure;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddInvoiceAuthentication(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        if (context.HttpContext.Items.TryGetValue(CorrelationIdMiddleware.HeaderName, out var value)
            && value is string correlationId)
        {
            context.ProblemDetails.Extensions["correlationId"] = correlationId;
        }
    };
});
builder.Services.AddHealthChecks()
    .AddCheck<SqlReadyHealthCheck>("sql", tags: ["ready"]);
builder.Services.AddInvoiceSwagger();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("login", limiter =>
    {
        limiter.PermitLimit = 10;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiter.QueueLimit = 0;
    });
});

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors("frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "InvoiceHub API v1");
    options.RoutePrefix = "swagger";
    options.DocumentTitle = "InvoiceHub API";
    options.DisplayRequestDuration();
    options.EnablePersistAuthorization();
    options.DefaultModelsExpandDepth(0);
    options.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.List);
});
app.MapControllers();
app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.Run();

public partial class Program;
