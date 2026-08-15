using Microsoft.OpenApi.Models;
using System.Reflection;

namespace Invoice.Api.Extensions;

public static class SwaggerExtensions
{
    public static IServiceCollection AddInvoiceSwagger(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "InvoiceHub API",
                Version = "v1",
                Description =
                    "Prueba WTW: registro y búsqueda de facturas (SQL Server + SPs, sin EF).\n\n" +
                    "**Para el evaluador**\n" +
                    "1. `POST /api/v1/auth/login` — el ejemplo ya trae el usuario demo.\n" +
                    "2. Copiar `accessToken` → **Authorize** → `Bearer {token}`.\n" +
                    "3. `GET /api/v1/invoices` o `GET /api/v1/invoices/search?client=Acme`.\n\n" +
                    "Demo: `analyst@invoicehub.local` / `InvoiceHub!2026`.\n\n" +
                    "Mapeo enunciado: `POST /invoice` → `POST /api/v1/invoices`, " +
                    "`GET /invoice/{id}` → `GET /api/v1/invoices/{id}`, " +
                    "`GET /invoice/search` → `GET /api/v1/invoices/search`."
            });

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Token de POST /api/v1/auth/login. Solo el JWT, Swagger antepone Bearer."
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });

            options.SchemaFilter<SwaggerExamplesFilter>();

            var xml = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
            if (File.Exists(xml))
            {
                options.IncludeXmlComments(xml, includeControllerXmlComments: true);
            }
        });

        return services;
    }
}
