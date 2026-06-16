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
    public const string JobCardsEdit    = "jobCards.edit";
    public const string JobCardsDelete  = "jobCards.delete";
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
    public const string ServiceRecordsEdit   = "serviceRecords.edit";
    public const string ServiceRecordsDelete = "serviceRecords.delete";

    // ── Retention ─────────────────────────────────────────────────────────────
    public const string RetentionManage = "retention.manage";

    // ── Settings ──────────────────────────────────────────────────────────────
    public const string SettingsUsers   = "settings.users";
    public const string SettingsCompany = "settings.company";
    public const string SettingsGroups  = "settings.groups";

    // ── Dashboard widgets ─────────────────────────────────────────────────────
    public const string DashboardKpi            = "dashboard.kpi";
    public const string DashboardRetention      = "dashboard.retention";
    public const string DashboardJobCardsWidget = "dashboard.jobCardsWidget";

    // ── Full list ─────────────────────────────────────────────────────────────
    public static readonly List<string> All = new()
    {
        NavDashboard, NavVehicles, NavCustomers, NavServiceRecords,
        NavJobCards, NavRetention, NavImport, NavSettings,
        JobCardsCreate, JobCardsEdit, JobCardsDelete, JobCardsConvert,
        VehiclesCreate, VehiclesEdit, VehiclesDelete,
        CustomersCreate, CustomersEdit, CustomersDelete,
        ServiceRecordsCreate, ServiceRecordsEdit, ServiceRecordsDelete,
        RetentionManage,
        SettingsUsers, SettingsCompany, SettingsGroups,
        DashboardKpi, DashboardRetention, DashboardJobCardsWidget,
    };

    /// <summary>Returns default permissions when a user has no permission group or custom permissions assigned.</summary>
    public static List<string> ForRole(string role) => role switch
    {
        "Admin" => All,

        "CRMOfficer" => new()
        {
            NavDashboard, NavVehicles, NavCustomers, NavServiceRecords,
            NavJobCards, NavRetention, NavImport,
            JobCardsCreate, JobCardsEdit, JobCardsConvert,
            VehiclesCreate, VehiclesEdit,
            CustomersCreate, CustomersEdit,
            ServiceRecordsCreate, ServiceRecordsEdit,
            RetentionManage,
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
