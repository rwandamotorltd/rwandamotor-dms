using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RwandaMotor.Application.Features.Reports.Queries;

namespace RwandaMotor.Infrastructure.Reports;

public static class FollowUpReportPdfBuilder
{
    static FollowUpReportPdfBuilder()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Build(MonthlyFollowUpReportDto report)
    {
        var monthLabel = new DateTime(report.Year, report.Month, 1).ToString("MMMM yyyy");

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(t => t.FontSize(10).FontFamily("Arial"));

                page.Header().Element(c => BuildHeader(c, monthLabel));
                page.Content().Element(c => BuildContent(c, report));
                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span("RWANDAMOTOR LTD  ·  Kigali, Rwanda  ·  Page ").FontSize(8).FontColor(Colors.Grey.Lighten1);
                    t.CurrentPageNumber().FontSize(8).FontColor(Colors.Grey.Lighten1);
                    t.Span(" of ").FontSize(8).FontColor(Colors.Grey.Lighten1);
                    t.TotalPages().FontSize(8).FontColor(Colors.Grey.Lighten1);
                });
            });
        }).GeneratePdf();
    }

    private static void BuildHeader(IContainer c, string monthLabel)
    {
        c.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(inner =>
                {
                    inner.Item().Text("RWANDAMOTOR LTD").FontSize(14).Bold().FontColor("#1a1a1a");
                    inner.Item().Text("Monthly Follow-up Report").FontSize(11).FontColor("#555555");
                    inner.Item().Text(monthLabel).FontSize(10).FontColor("#888888");
                });
                row.ConstantItem(120).AlignRight().Column(inner =>
                {
                    inner.Item().Text("Generated").FontSize(8).FontColor("#aaaaaa");
                    inner.Item().Text(DateTime.UtcNow.ToString("dd MMM yyyy HH:mm") + " UTC")
                        .FontSize(8).FontColor("#888888");
                });
            });
            col.Item().PaddingTop(6).LineHorizontal(1).LineColor("#eeeeee");
            col.Item().Height(8);
        });
    }

    private static void BuildContent(IContainer c, MonthlyFollowUpReportDto r)
    {
        c.Column(col =>
        {
            // ── Summary KPI row ─────────────────────────────────────────────
            col.Item().Text("Summary").FontSize(12).Bold().FontColor("#1a1a1a");
            col.Item().Height(6);

            col.Item().Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    for (int i = 0; i < 4; i++) cols.RelativeColumn();
                });

                void KpiCell(string label, string value, string color)
                {
                    table.Cell().Border(1).BorderColor("#eeeeee").Padding(10).Column(inner =>
                    {
                        inner.Item().Text(value).FontSize(20).Bold().FontColor(color);
                        inner.Item().Text(label).FontSize(8).FontColor("#666666");
                    });
                }

                KpiCell("Follow-ups Created", r.TotalCreated.ToString(), "#1a1a1a");
                KpiCell("Customers Reached", r.TotalContacted.ToString(), "#2d7d52");
                KpiCell("Appointments Booked", r.TotalAppointmentsBooked.ToString(), "#3b82f6");
                KpiCell("Recovered", r.TotalRecovered.ToString(), "#7c3aed");
                KpiCell("No Answer", r.TotalNoAnswer.ToString(), "#c92a2a");
                KpiCell("Contact Rate", $"{r.ContactRate}%", "#e67700");
                KpiCell("Recovery Rate", $"{r.RecoveryRate}%", "#2d7d52");
                KpiCell("No-shows", r.TotalNoShow.ToString(), "#888888");
            });

            col.Item().Height(18);

            // ── Breakdown by reason ─────────────────────────────────────────
            col.Item().Text("Breakdown by Follow-up Type").FontSize(12).Bold().FontColor("#1a1a1a");
            col.Item().Height(6);

            col.Item().Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.RelativeColumn(3);
                    cols.RelativeColumn();
                    cols.RelativeColumn();
                    cols.RelativeColumn();
                    cols.RelativeColumn();
                    cols.RelativeColumn();
                });

                void Th(string text) =>
                    table.Cell().Background("#f1f3f5").Padding(6).Text(text)
                        .FontSize(8).Bold().FontColor("#555555");

                void Td(string text, bool bold = false)
                {
                    var cell = table.Cell().BorderBottom(1).BorderColor("#eeeeee").Padding(6)
                        .Text(text).FontSize(9).FontColor("#333333");
                    if (bold) cell.Bold();
                }

                Th("Type"); Th("Total"); Th("Contacted"); Th("Appts"); Th("Recovered"); Th("Closed");

                foreach (var b in r.ByReason)
                {
                    Td(b.Reason, bold: true);
                    Td(b.Total.ToString());
                    Td(b.Contacted.ToString());
                    Td(b.Appointments.ToString());
                    Td(b.Recovered.ToString());
                    Td(b.Closed.ToString());
                }
            });

            col.Item().Height(18);

            // ── Interaction log ─────────────────────────────────────────────
            col.Item().Text("Interaction Log").FontSize(12).Bold().FontColor("#1a1a1a");
            col.Item().Height(6);

            if (r.InteractionRows.Count == 0)
            {
                col.Item().Text("No interactions recorded this month.").FontSize(9).FontColor("#888888").Italic();
            }
            else
            {
                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.RelativeColumn(2); // Customer
                        cols.RelativeColumn(2); // Vehicle
                        cols.RelativeColumn(2); // Type
                        cols.RelativeColumn(2); // Outcome
                        cols.RelativeColumn(3); // Notes
                        cols.RelativeColumn(2); // Date
                    });

                    void Th(string text) =>
                        table.Cell().Background("#f1f3f5").Padding(5).Text(text)
                            .FontSize(7).Bold().FontColor("#555555");

                    Th("Customer"); Th("Vehicle"); Th("Type"); Th("Outcome"); Th("Notes"); Th("Date");

                    foreach (var row in r.InteractionRows.Take(200))
                    {
                        table.Cell().BorderBottom(1).BorderColor("#eeeeee").Padding(5)
                            .Text(row.CustomerName).FontSize(8).FontColor("#333333");
                        table.Cell().BorderBottom(1).BorderColor("#eeeeee").Padding(5)
                            .Text(row.VehiclePlate).FontSize(8).FontColor("#333333");
                        table.Cell().BorderBottom(1).BorderColor("#eeeeee").Padding(5)
                            .Text(row.Reason).FontSize(8).FontColor("#333333");
                        table.Cell().BorderBottom(1).BorderColor("#eeeeee").Padding(5)
                            .Text(row.Outcome.ToString()).FontSize(8).FontColor("#333333");
                        table.Cell().BorderBottom(1).BorderColor("#eeeeee").Padding(5)
                            .Text(row.Notes ?? "—").FontSize(7).FontColor("#555555");
                        table.Cell().BorderBottom(1).BorderColor("#eeeeee").Padding(5)
                            .Text(row.Date.ToString("dd MMM HH:mm")).FontSize(8).FontColor("#333333");
                    }
                });
            }
        });
    }
}
