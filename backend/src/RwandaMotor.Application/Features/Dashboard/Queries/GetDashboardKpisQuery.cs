using MediatR;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Domain.Enums;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.Application.Features.Dashboard.Queries;

public record GetDashboardKpisQuery : IRequest<DashboardKpisDto>;

public class GetDashboardKpisQueryHandler : IRequestHandler<GetDashboardKpisQuery, DashboardKpisDto>
{
    private readonly IApplicationDbContext _db;
    private readonly IRetentionEngine _retention;

    public GetDashboardKpisQueryHandler(IApplicationDbContext db, IRetentionEngine retention)
    {
        _db = db;
        _retention = retention;
    }

    public async Task<DashboardKpisDto> Handle(GetDashboardKpisQuery request, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var yearStart = new DateTime(now.Year, 1, 1);

        var totalVehicles = await _db.Vehicles.CountAsync(v => !v.IsDeleted, ct);
        var dealershipVehicles = await _db.Vehicles.CountAsync(v => !v.IsDeleted && v.IsSoldByDealership, ct);
        var activeVehicles = await _db.Vehicles.CountAsync(v => !v.IsDeleted && v.RetentionStatus == RetentionStatus.Active, ct);
        var dueSoon = await _db.Vehicles.CountAsync(v => !v.IsDeleted && v.RetentionStatus == RetentionStatus.DueSoon, ct);
        var overdue = await _db.Vehicles.CountAsync(v => !v.IsDeleted && v.RetentionStatus == RetentionStatus.Overdue, ct);
        var lost = await _db.Vehicles.CountAsync(v => !v.IsDeleted && v.RetentionStatus == RetentionStatus.Lost, ct);
        var recovered = await _db.Vehicles.CountAsync(v => !v.IsDeleted && v.RetentionStatus == RetentionStatus.Recovered, ct);

        var totalCustomers = await _db.Customers.CountAsync(c => !c.IsDeleted, ct);
        var activeFollowUps = await _db.FollowUps.CountAsync(f => !f.IsDeleted && f.Status == FollowUpStatus.Pending, ct);

        var monthlyServices = await _db.ServiceRecords
            .CountAsync(s => !s.IsDeleted && s.ServiceDate >= monthStart, ct);

        var openJobCards = await _db.JobCards
            .CountAsync(j => !j.IsDeleted && j.Status == JobCardStatus.Open, ct);
        var todayJobCards = await _db.JobCards
            .CountAsync(j => !j.IsDeleted && j.CreatedAt.Date == now.Date, ct);
        var monthlyJobCards = await _db.JobCards
            .CountAsync(j => !j.IsDeleted && j.CreatedAt >= monthStart, ct);
        var monthlySalesHistory = await _db.SalesHistories
            .CountAsync(s => !s.IsDeleted && s.SaleDate >= monthStart, ct);

        var monthlySummary = await _retention.GetRetentionSummaryAsync(RetentionPeriod.Monthly, now, ct);
        var quarterlySummary = await _retention.GetRetentionSummaryAsync(RetentionPeriod.Quarterly, now, ct);
        var sixMonthSummary = await _retention.GetRetentionSummaryAsync(RetentionPeriod.SixMonth, now, ct);
        var yearlySummary = await _retention.GetRetentionSummaryAsync(RetentionPeriod.Yearly, now, ct);

        var trendData = await _retention.GetRetentionTrendAsync(12, ct);
        var brandData = await _retention.GetRetentionByBrandAsync(yearStart, now, ct);

        return new DashboardKpisDto(
            TotalVehicles: totalVehicles,
            DealershipVehicles: dealershipVehicles,
            ActiveVehicles: activeVehicles,
            DueSoonVehicles: dueSoon,
            OverdueVehicles: overdue,
            LostVehicles: lost,
            RecoveredVehicles: recovered,
            TotalCustomers: totalCustomers,
            ActiveFollowUps: activeFollowUps,
            MonthlyServiceCount: monthlyServices,
            MonthlyRetentionRate: monthlySummary.RetentionRate,
            QuarterlyRetentionRate: quarterlySummary.RetentionRate,
            SixMonthRetentionRate: sixMonthSummary.RetentionRate,
            YearlyRetentionRate: yearlySummary.RetentionRate,
            RetentionTrend: trendData,
            BrandReten