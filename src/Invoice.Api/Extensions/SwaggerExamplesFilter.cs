using Invoice.Application.Auth.Dtos;
using Invoice.Application.Invoices.Dtos;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Invoice.Api.Extensions;

internal sealed class SwaggerExamplesFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type == typeof(LoginRequest))
        {
            schema.Example = new OpenApiObject
            {
                ["email"] = new OpenApiString("analyst@invoicehub.local"),
                ["password"] = new OpenApiString("InvoiceHub!2026")
            };
            return;
        }

        if (context.Type == typeof(CreateInvoiceRequest))
        {
            schema.Example = new OpenApiObject
            {
                ["clientName"] = new OpenApiString("Acme Corporation"),
                ["clientDocument"] = new OpenApiString("900123456"),
                ["clientEmail"] = new OpenApiString("billing@acme.test"),
                ["invoiceNumber"] = new OpenApiString("INV-EVAL-00001"),
                ["issueDate"] = new OpenApiString("2026-08-15"),
                ["dueDate"] = new OpenApiString("2026-09-14"),
                ["currency"] = new OpenApiString("COP"),
                ["subtotal"] = new OpenApiDouble(100000),
                ["tax"] = new OpenApiDouble(19000),
                ["total"] = new OpenApiDouble(119000),
                ["lines"] = new OpenApiArray
                {
                    new OpenApiObject
                    {
                        ["description"] = new OpenApiString("Consultoría"),
                        ["quantity"] = new OpenApiDouble(1),
                        ["unitPrice"] = new OpenApiDouble(100000),
                        ["amount"] = new OpenApiDouble(100000)
                    }
                }
            };
            return;
        }

        if (context.Type == typeof(UpdateInvoiceStatusRequest))
        {
            schema.Example = new OpenApiObject
            {
                ["status"] = new OpenApiString("Paid")
            };
        }
    }
}
