using FluentValidation;
using Invoice.Application.Auth;
using Invoice.Application.Invoices;
using Microsoft.Extensions.DependencyInjection;

namespace Invoice.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }
}
