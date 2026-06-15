namespace RwandaMotor.Application.Common.Permissions;

/// <summary>Canonical permission key constants + role defaults.</summary>
public static class DefaultPermissions
{
    // ── Navigation ────────────────────────────────────────────────────────────
    public const string NavDashboard      = "nav.dashboard";
    public const string NavVehicles       = "nav.vehicles";
    public const string NavCustomers      = "nav.customers";
    public const string NavServiceRecords = "nav.serviceRecords";
    public const string NavJobCards       = "nav.jobCards";
    public const string NavRetention      = "nav.retention";
    public const string NavImport         = "nav.import";
    public const string NavSettings       = "nav.settings";

    // ── Job Cards ─────────────────────────────────────────────────────────────
    public const string JobCardsCreate  = "jobCards.create";
    public const string JobCardsConvert = "jobCards.convert";

    // ── Vehicles ──────────────────────────────────────────────────────────────
    public const string VehiclesCreate = "vehicles.create";
    public const string VehiclesEdit   = "vehicles.edit";
    public const string VehiclesDelete = "vehicles.delete";

    // ── Customers ─────────────────────────────────────────────────────────────
    public const string CustomersCreate = "customers.create";
    public const string CustomersEdit   = "customers.edit";
    public const string CustomersDelete = "customers.delete";

    // ── Service Records ───────────────────────────────────────────────────────
    public const string ServiceRecordsCreate = "serviceRecords.create";

    // ── Dashboard widgets ─────────────────────────────────────────────────────
    public const string DashboardKpi            = "dashboard.kpi";
    public const string DashboardRetention      = "dashboard.retention";
    public const string DashboardJobCardsWidget = "dashboard.jobCardsWidget";

    // ── Full list ─────────────────────────────────────────────────────────────
    public static readonly List<string> All = new()
    {
        NavDashboard, NavVehicles, NavCustomers, NavServiceRecords,
        NavJobCards, NavRetention, NavImport, NavSettings,
        JobCardsCreate, JobCardsConvert,
        VehiclesCreate, VehiclesEdit, VehiclesDelete,
        CustomersCreate, CustomersEdit, CustomersDelete,
        ServiceRecordsCreate,
        DashboardKpi, DashboardRetention, DashboardJobCardsWidget,
    };

    /// <summary>Returns default permissions when a user has no permission group assigned.</summary>
    public static List<string> ForRole(string role) => role switch
    {
        "Admin" => All,

        "CRMOfficer" => new()
        {
            NavDashboard, NavVehicles, NavCustomers, NavServiceRecords,
            NavJobCards, NavRetention, NavImport,
            JobCardsCreate, JobCardsConvert,
            VehiclesCreate, VehiclesEdit,
            CustomersCreate, CustomersEdit,
            ServiceRecordsCreate,
            DashboardKpi, DashboardRetention, DashboardJobCardsWidget,
        },

        "TechnicalDirector" => new()
        {
            NavDashboard, NavVehicles, NavCustomers,
            NavServiceRecords, NavJobCards, NavRetention,
            DashboardKpi, DashboardRetention, DashboardJobCardsWidget,
        },

        _ => new() { NavDashboard },
    };
}
