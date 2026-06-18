using ClosedXML.Excel;
using RwandaMotor.Application.Features.Reports.Queries;

namespace RwandaMotor.Infrastructure.Reports;

public static class FollowUpReportExcelBuilder
{
    public static byte[] Build(MonthlyFollowUpReportDto report)
    {
        var monthLabel = new DateTime(report.Year, report.Month, 1).ToString("MMMM yyyy");

        using var wb = new XLWorkbook();

        BuildSummarySheet(wb, report, monthLabel);
        BuildBreakdownSheet(wb, report);
        BuildInteractionsSheet(wb, report);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    private static void BuildSummarySheet(XLWorkbook wb, MonthlyFollowUpReportDto r, string monthLabel)
    {
        var ws = wb.Worksheets.Add("Summary");
        ws.ShowGridLines = false;

        // Title
        ws.Cell("A1").Value = "RWANDAMOTOR LTD — Monthly Follow-up Report";
        ws.Cell("A1").Style.Font.Bold = true;
        ws.Cell("A1").Style.Font.FontSize = 16;
        ws.Cell("A2").Value = monthLabel;
        ws.Cell("A2").Style.Font.FontSize = 12;
        ws.Cell("A2").Style.Font.FontColor = XLColor.FromHtml("#555555");
        ws.Cell("A3").Value = $"Generated: {DateTime.UtcNow:dd MMM yyyy HH:mm} UTC";
        ws.Cell("A3").Style.Font.FontSize = 9;
        ws.Cell("A3").Style.Font.FontColor = XLColor.FromHtml("#888888");

        // KPI table
        var kpiStart = 5;
        void Kpi(int row, string label, string value)
        {
            ws.Cell(row, 1).Value = label;
            ws.Cell(row, 1).Style.Font.Bold = true;
            ws.Cell(row, 1).Style.Font.FontColor = XLColor.FromHtml("#444444");
            ws.Cell(row, 2).Value = value;
            ws.Cell(row, 2).Style.Font.FontSize = 12;
            ws.Cell(row, 2).Style.Font.Bold = true;
        }

        Kpi(kpiStart + 0, "Follow-ups Created",           r.TotalCreated.ToString());
        Kpi(kpiStart + 1, "Customers Reached",            r.TotalContacted.ToString());
        Kpi(kpiStart + 2, "No Answer",                    r.TotalNoAnswer.ToString());
        Kpi(kpiStart + 3, "Appointments Booked",          r.TotalAppointmentsBooked.ToString());
        Kpi(kpiStart + 4, "Appointments Completed",       r.TotalAppointmentsCompleted.ToString());
        Kpi(kpiStart + 5, "No-shows",                     r.TotalNoShow.ToString());
        Kpi(kpiStart + 6, "Recovered",                    r.TotalRecovered.ToString());
        Kpi(kpiStart + 7, "Contact Rate",                 $"{r.ContactRate}%");
        Kpi(kpiStart + 8, "Recovery Rate",                $"{r.RecoveryRate}%");

        ws.Columns(1, 2).AdjustToContents();
        ws.Column(1).Width = Math.Max(ws.Column(1).Width, 28);
    }

    private static void BuildBreakdownSheet(XLWorkbook wb, MonthlyFollowUpReportDto r)
    {
        var ws = wb.Worksheets.Add("By Type");
        ws.ShowGridLines = false;

        string[] headers = ["Follow-up Type", "Total", "Contacted", "Appointments", "Recovered", "Closed"];
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#f1f3f5");
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        int row = 2;
        foreach (var b in r.ByReason)
        {
            ws.Cell(row, 1).Value = b.Reason;
            ws.Cell(row, 2).Value = b.Total;
            ws.Cell(row, 3).Value = b.Contacted;
            ws.Cell(row, 4).Value = b.Appointments;
            ws.Cell(row, 5).Value = b.Recovered;
            ws.Cell(row, 6).Value = b.Closed;
            row++;
        }

        var tableRange = ws.Range(1, 1, Math.Max(2, row - 1), headers.Length);
        tableRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        tableRange.Style.Border.OutsideBorderColor = XLColor.FromHtml("#cccccc");

        ws.Columns().AdjustToContents();
    }

    private static void BuildInteractionsSheet(XLWorkbook wb, MonthlyFollowUpReportDto r)
    {
        var ws = wb.Worksheets.Add("Interactions");
        ws.ShowGridLines = false;

        string[] headers = ["Customer", "Vehicle", "Follow-up Type", "Outcome", "Notes", "Date", "Agent"];
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#f1f3f5");
        }

        int row = 2;
        foreach (var item in r.InteractionRows)
        {
            ws.Cell(row, 1).Value = item.CustomerName;
            ws.Cell(row, 2).Value = item.VehiclePlate;
            ws.Cell(row, 3).Value = item.Reason;
            ws.Cell(row, 4).Value = item.Outcome.ToString();
            ws.Cell(row, 5).Value = item.Notes ?? "";
            ws.Cell(row, 6).Value = item.Date.ToString("dd MMM yyyy HH:mm");
            ws.Cell(row, 7).Value = item.Agent;
            row++;
        }

        if (r.InteractionRows.Count > 0)
        {
            var tableRange = ws.Range(1, 1, row - 1, headers.Length);
            tableRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            tableRange.Style.Border.OutsideBorderColor = XLColor.FromHtml("#cccccc");
        }

        ws.Columns().AdjustToContents();
        ws.Column(5).Width = Math.Min(ws.Column(5).Width, 40); // Notes column cap
    }
}
