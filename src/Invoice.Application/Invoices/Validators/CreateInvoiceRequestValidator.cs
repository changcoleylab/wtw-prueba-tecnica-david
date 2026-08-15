using FluentValidation;
using Invoice.Application.Invoices.Dtos;

namespace Invoice.Application.Invoices.Validators;

public sealed class CreateInvoiceRequestValidator : AbstractValidator<CreateInvoiceRequest>
{
    private static readonly string[] Currencies = ["COP", "USD", "EUR"];

    public CreateInvoiceRequestValidator()
    {
        RuleFor(x => x.ClientName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ClientDocument).NotEmpty().MaximumLength(32);
        RuleFor(x => x.InvoiceNumber).NotEmpty().MaximumLength(40);
        RuleFor(x => x.Currency)
            .NotEmpty()
            .Must(c => Currencies.Contains(c, StringComparer.OrdinalIgnoreCase))
            .WithMessage("Currency must be COP, USD or EUR.");
        RuleFor(x => x.Subtotal).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Tax).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Total).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DueDate)
            .GreaterThanOrEqualTo(x => x.IssueDate)
            .WithMessage("Due date must be greater than or equal to issue date.");
        When(x => x.Lines is not null, () =>
        {
            RuleForEach(x => x.Lines).ChildRules(line =>
            {
                line.RuleFor(l => l.Description).NotEmpty().MaximumLength(200);
                line.RuleFor(l => l.Quantity).GreaterThan(0);
                line.RuleFor(l => l.UnitPrice).GreaterThan(0);
                line.RuleFor(l => l.Amount).GreaterThan(0);
            });
        });
    }
}
