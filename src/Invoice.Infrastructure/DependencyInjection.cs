using Invoice.Application.Abstractions;
using Invoice.Infrastructure.Authentication;
using Invoice.Infrastructure.Persistence;
using Invoice.Infrastructure.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Invoice.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.AddSingleton<SqlConnectionFactory>();
        services.AddSingleton<IUserPasswordHasher, AspNetPasswordHasher>();
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IInvoiceRepository, InvoiceRepository>();
        services.AddScoped<IClientRepository, ClientRepository>();
        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<IIdempotencyStore, IdempotencyStore>();
        services.AddHostedService<SchemaBootstrapper>();
        services.AddHostedService<DemoPasswordSeeder>();
        return services;
    }
}
