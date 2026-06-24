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
    public const string NavFollowUps      = "nav.followUps";
    public const string NavAppointments   = "nav.appointments";
    public const string NavReports        = "nav.reports";
    public const string NavImport         = "nav.import";
    public const string NavSettings        = "nav.settings";
    public const string NavActivity        = "nav.activity";
    public const string NavSales           = "nav.sales";

    // ── Job Cards ─────────────────────────────────────────────────────────────
    public const string JobCardsCreate  = "jobCards.create";
    public const string JobCardsEdit    = "jobCards.edit";
    public const string JobCardsDelete  = "jobCards.delete";
    public const string JobCardsConvert = "jobCards.convert";
    public const string JobCardsPrint   = "jobCards.print";
    public const string JobCardsShare   = "jobCards.share";

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

    // ── Follow-ups ────────────────────────────────────────────────────────────
    public const string FollowUpsView   = "followUps.view";
    public const string FollowUpsManage = "followUps.manage";

    // ── Appointments ──────────────────────────────────────────────────────────
    public const string AppointmentsView   = "appointments.view";
    public const string AppointmentsManage = "appointments.manage";

    // ── Settings ──────────────────────────────────────────────────────────────
    public const string SettingsUsers   = "settings.users";
    public const string SettingsCompany = "settings.company";
    public const string SettingsGroups  = "settings.groups";

    // ── Dashboard widgets ─────────────────────────────────────────────────────
    public const string DashboardKpi            = "dashboard.kpi";           // legacy: enables all KPI cards
    public const string DashboardRetention      = "dashboard.retention";
    public const string DashboardJobCardsWidget = "dashboard.jobCardsWidget";
    // Individual KPI card permissions
    public const string DashboardKpiFollowUps   = "dashboard.kpi.followUps";
    public const string DashboardKpiDueSoon     = "dashboard.kpi.dueSoon";
    public const string DashboardKpiOverdue     = "dashboard.kpi.overdue";
    public const string DashboardKpiLost        = "dashboard.kpi.lost";
    public const string DashboardKpiRecovered   = "dashboard.kpi.recovered";

    // ── Full list ─────────────────────────────────────────────────────────────
    public static readonly List<string> All = new()
    {
        NavDashboard, NavVehicles, NavCustomers, NavServiceRecords,
        NavJobCards, NavRetention, NavFollowUps, NavAppointments, NavReports,
        NavImport, NavSettings, NavActivity, NavSales,
        JobCardsCreate, JobCardsEdit, JobCardsDelete, JobCardsConvert, JobCardsPrint, JobCardsShare,
        VehiclesCreate, VehiclesEdit, VehiclesDelete,
        CustomersCreate, CustomersEdit, CustomersDelete,
        ServiceRecordsCreate, ServiceRecordsEdit, ServiceRecordsDelete,
        RetentionManage,
        FollowUpsView, FollowUpsManage,
        AppointmentsView, AppointmentsManage,
        SettingsUsers, SettingsCompany, SettingsGroups,
        DashboardKpi, DashboardRetention, DashboardJobCardsWidget,
        DashboardKpiFollowUps, DashboardKpiDueSoon, DashboardKpiOverdue, DashboardKpiLost, DashboardKpiRecovered,
    };

    /// <summary>Returns default permissions when a user has no permission group or custom permissions assigned.</summary>
    public static List<string> ForRole(string role) => role switch
    {
        "Admin" => All,

        "CRMOfficer" => new()
        {
            NavDashboard, NavVehicles, NavCustomers, NavServiceRecords,
            NavJobCards, NavRetention, NavFollowUps, NavAppointments, NavReports, NavImport, NavSales,
            JobCardsCreate, JobCardsEdit, JobCardsConvert, JobCardsPrint, JobCardsShare,
            VehiclesCreate, VehiclesEdit,
            CustomersCreate, CustomersEdit,
            ServiceRecordsCreate, ServiceRecordsEdit,
            RetentionManage,
            FollowUpsView, FollowUpsManage,
            AppointmentsView, AppointmentsManage,
            DashboardKpiFollowUps, DashboardKpiDueSoon, DashboardKpiOverdue, DashboardKpiLost, DashboardKpiRecovered,
            DashboardRetention, DashboardJobCardsWidget,
        },

        "TechnicalDirector" => new()
        {
            NavDashboard, NavVehicles, NavCustomers,
            NavServiceRecords, NavJobCards, NavRetention, NavAppointments, NavReports,
            AppointmentsView, AppointmentsManage,
            DashboardKpiDueSoon, DashboardKpiOverdue, DashboardKpiLost,
            DashboardRetention, DashboardJobCardsWidget,
        },

        // CRE: Customer Relation Executive — focuses on customer outreach
        "CRE" => new()
        {
            NavDashboard, NavCustomers, NavVehicles,
            NavFollowUps, NavAppointments,
            FollowUpsView, FollowUpsManage,
            AppointmentsView, AppointmentsManage,
            DashboardKpiFollowUps, DashboardKpiDueSoon, DashboardKpiOverdue, DashboardKpiLost, DashboardKpiRecovered,
        },

        _ => new() { NavDashboard },
    };
}
