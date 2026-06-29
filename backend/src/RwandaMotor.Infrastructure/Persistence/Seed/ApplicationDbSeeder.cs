using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Domain.Enums;

namespace RwandaMotor.Infrastructure.Persistence.Seed;

public class ApplicationDbSeeder
{
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ILogger<ApplicationDbSeeder> _logger;

    public ApplicationDbSeeder(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ILogger<ApplicationDbSeeder> logger)
    {
        _db = db;
        _userManager = userManager;
        _roleManager = roleManager;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        await _db.Database.MigrateAsync();
        await SeedRoles();
        await SeedAppRoles();
        await SeedUsers();
        await SeedBrands();
        await SeedServicePolicies();
        await SeedElectricVehicleData();   // EV brands, models and policies
        await SeedTechniciansAndBays();
        await SeedDemoData();
        await CleanupDemoServiceRecords(); // remove seeded demo service records
        await SeedCompanySettings();
        _logger.LogInformation("Database seeding completed.");
    }

    private async Task SeedRoles()
    {
        string[] builtIn = ["Admin", "TechnicalDirector", "CRMOfficer", "CRE"];
        foreach (var role in builtIn)
            if (!await _roleManager.RoleExistsAsync(role))
                await _roleManager.CreateAsync(new IdentityRole(role));

        // Backfill any custom AppRoles that were created before Identity mirroring was added
        var customAppRoles = await _db.AppRoles
            .Where(r => !r.IsBuiltIn)
            .Select(r => r.Name)
            .ToListAsync();
        foreach (var name in customAppRoles)
            if (!await _roleManager.RoleExistsAsync(name))
                await _roleManager.CreateAsync(new IdentityRole(name));
    }

    private async Task SeedAppRoles()
    {
        var builtIn = new[]
        {
            new AppRole { Name = "Admin",             DisplayName = "Administrator",           Description = "Full system access",                          IsBuiltIn = true },
            new AppRole { Name = "CRMOfficer",        DisplayName = "CRM Officer",             Description = "Customer relations and service management",    IsBuiltIn = true },
            new AppRole { Name = "TechnicalDirector", DisplayName = "Technical Director",      Description = "Workshop oversight and technical operations",   IsBuiltIn = true },
            new AppRole { Name = "CRE",               DisplayName = "Customer Relation Exec.", Description = "Follow-ups, appointments and outreach",         IsBuiltIn = true },
        };

        foreach (var role in builtIn)
        {
            if (!await _db.AppRoles.AnyAsync(r => r.Name == role.Name))
                _db.AppRoles.Add(role);
        }
        await _db.SaveChangesAsync();
    }

    private async Task SeedUsers()
    {
        async Task CreateUser(string email, string fullName, string password, string role)
        {
            if (await _userManager.FindByEmailAsync(email) != null) return;
            var user = new ApplicationUser { UserName = email, Email = email, FullName = fullName, IsActive = true };
            var result = await _userManager.CreateAsync(user, password);
            if (result.Succeeded) await _userManager.AddToRoleAsync(user, role);
        }

        await CreateUser("admin@rwandamotor.com", "System Administrator", "Admin@123!", "Admin");
        await CreateUser("director@rwandamotor.com", "Technical Director", "Director@123!", "TechnicalDirector");
        await CreateUser("crm@rwandamotor.com", "CRM Officer", "Crm@123!", "CRMOfficer");
        await CreateUser("cre@rwandamotor.com", "Customer Relation Executive", "Cre@123!", "CRE");
    }

    private async Task SeedBrands()
    {
        if (await _db.Brands.AnyAsync()) return;

        var brands = new[]
        {
            new { Name = "Suzuki", Code = "SUZ" },
            new { Name = "Changan", Code = "CAG" },
            new { Name = "Renault", Code = "RNL" },
            new { Name = "Fiat", Code = "FIA" },
            new { Name = "Tata", Code = "TAT" },
            new { Name = "Range Rover", Code = "RRV" }
        };

        var models = new Dictionary<string, string[]>
        {
            ["SUZ"] = ["Swift", "Vitara", "Jimny", "S-Cross", "Alto", "Baleno", "Ertiga"],
            ["CAG"] = ["CS35 Plus", "CS55 Plus", "CS75 Plus", "Alsvin", "Hunter"],
            ["RNL"] = ["Duster", "Kiger", "Triber", "Kwid", "Oroch"],
            ["FIA"] = ["Doblo", "Ducato", "Fullback", "500X"],
            ["TAT"] = ["Xenon", "Safari", "Harrier", "Nexon", "Punch"],
            ["RRV"] = ["Defender", "Discovery", "Range Rover Sport", "Evoque", "Velar"]
        };

        foreach (var b in brands)
        {
            var brand = new Brand { Name = b.Name, Code = b.Code, IsActive = true };
            if (models.TryGetValue(b.Code, out var modelNames))
            {
                foreach (var mn in modelNames)
                    brand.Models.Add(new VehicleModel { Name = mn, Code = mn.Replace(" ", "").ToUpper()[..Math.Min(10, mn.Replace(" ", "").Length)] });
            }
            _db.Brands.Add(brand);
        }

        await _db.SaveChangesAsync();
    }

    private async Task SeedServicePolicies()
    {
        if (await _db.ServicePolicies.AnyAsync()) return;

        var suzuki = await _db.Brands.FirstAsync(b => b.Code == "SUZ");
        var rangeRover = await _db.Brands.FirstAsync(b => b.Code == "RRV");

        _db.ServicePolicies.AddRange(
            new ServicePolicy
            {
                Name = "Suzuki Standard 5,000km",
                BrandId = suzuki.Id,
                IntervalKm = 5000,
                IntervalMonths = 6,
                DueSoonLeadDays = 30,
                DueSoonLeadKm = 500,
                LostThresholdMonths = 12,
                IsDefault = false,
                IsActive = true
            },
            new ServicePolicy
            {
                Name = "Range Rover Premium 10,000km",
                BrandId = rangeRover.Id,
                IntervalKm = 10000,
                IntervalMonths = 12,
                DueSoonLeadDays = 45,
                DueSoonLeadKm = 1000,
                LostThresholdMonths = 18,
                IsDefault = false,
                IsActive = true
            },
            new ServicePolicy
            {
                Name = "Standard 5,000km Default",
                IntervalKm = 5000,
                IntervalMonths = 6,
                DueSoonLeadDays = 30,
                DueSoonLeadKm = 500,
                LostThresholdMonths = 12,
                IsDefault = true,
                IsActive = true
            }
        );

        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Idempotent: adds DEEPAL brand + models, Changan e-star model, and their
    /// 10,000 km / 12-month EV service policies. Also fixes the default policy
    /// if it was previously seeded with the wrong (10,000 km) interval.
    /// </summary>
    private async Task SeedElectricVehicleData()
    {
        // ── 1. DEEPAL brand ───────────────────────────────────────────────────
        if (!await _db.Brands.AnyAsync(b => b.Code == "DPL"))
        {
            var deepal = new Brand { Name = "DEEPAL", Code = "DPL", IsActive = true };
            deepal.Models.Add(new VehicleModel { Name = "S07", Code = "S07" });
            deepal.Models.Add(new VehicleModel { Name = "S05", Code = "S05" });
            deepal.Models.Add(new VehicleModel { Name = "318", Code = "318" });
            _db.Brands.Add(deepal);
            await _db.SaveChangesAsync();
            _logger.LogInformation("Seeded DEEPAL brand with models S07, S05, 318.");
        }

        // ── 2. Changan e-star model ───────────────────────────────────────────
        var changan = await _db.Brands.FirstOrDefaultAsync(b => b.Code == "CAG");
        if (changan != null && !await _db.VehicleModels.AnyAsync(m => m.BrandId == changan.Id && m.Name == "e-star"))
        {
            _db.VehicleModels.Add(new VehicleModel { Name = "e-star", Code = "ESTAR", BrandId = changan.Id });
            await _db.SaveChangesAsync();
            _logger.LogInformation("Seeded Changan e-star model.");
        }

        // ── 3. DEEPAL brand-level EV policy ──────────────────────────────────
        var deepalBrand = await _db.Brands.FirstOrDefaultAsync(b => b.Code == "DPL");
        if (deepalBrand != null && !await _db.ServicePolicies.AnyAsync(p => p.BrandId == deepalBrand.Id))
        {
            _db.ServicePolicies.Add(new ServicePolicy
            {
                Name = "DEEPAL Electric 10,000km / 12 months",
                BrandId = deepalBrand.Id,
                IntervalKm = 10000,
                IntervalMonths = 12,
                DueSoonLeadDays = 30,
                DueSoonLeadKm = 1000,
                LostThresholdMonths = 18,
                IsDefault = false,
                IsActive = true
            });
            await _db.SaveChangesAsync();
            _logger.LogInformation("Seeded DEEPAL EV service policy.");
        }

        // ── 4. Changan e-star model-level EV policy ───────────────────────────
        if (changan != null)
        {
            var eStar = await _db.VehicleModels.FirstOrDefaultAsync(m => m.BrandId == changan.Id && m.Name == "e-star");
            if (eStar != null && !await _db.ServicePolicies.AnyAsync(p => p.ModelId == eStar.Id))
            {
                _db.ServicePolicies.Add(new ServicePolicy
                {
                    Name = "Changan e-star Electric 10,000km / 12 months",
                    BrandId = changan.Id,
                    ModelId = eStar.Id,
                    IntervalKm = 10000,
                    IntervalMonths = 12,
                    DueSoonLeadDays = 30,
                    DueSoonLeadKm = 1000,
                    LostThresholdMonths = 18,
                    IsDefault = false,
                    IsActive = true
                });
                await _db.SaveChangesAsync();
                _logger.LogInformation("Seeded Changan e-star EV service policy.");
            }
        }

        // ── 5. Fix default policy if previously seeded with wrong interval ─────
        var defaultPolicy = await _db.ServicePolicies.FirstOrDefaultAsync(p => p.IsDefault && !p.IsDeleted);
        if (defaultPolicy != null && defaultPolicy.IntervalKm != 5000)
        {
            defaultPolicy.Name = "Standard 5,000km Default";
            defaultPolicy.IntervalKm = 5000;
            defaultPolicy.IntervalMonths = 6;
            defaultPolicy.DueSoonLeadKm = 500;
            await _db.SaveChangesAsync();
            _logger.LogInformation("Updated default service policy to 5,000km / 6 months.");
        }
    }

    private async Task SeedTechniciansAndBays()
    {
        if (await _db.Technicians.AnyAsync()) return;

        _db.Technicians.AddRange(
            new Technician { FullName = "Jean-Baptiste Nkusi", EmployeeCode = "TEC-001", Specialization = "Electrical & Diagnostics" },
            new Technician { FullName = "Emmanuel Habimana", EmployeeCode = "TEC-002", Specialization = "Engine & Transmission" },
            new Technician { FullName = "Grace Uwimana", EmployeeCode = "TEC-003", Specialization = "Body & Suspension" },
            new Technician { FullName = "Patrick Nduwayo", EmployeeCode = "TEC-004", Specialization = "General Service" }
        );

        _db.WorkshopBays.AddRange(
            new WorkshopBay { Name = "Bay 1", Code = "BAY-01", BayType = "General Service" },
            new WorkshopBay { Name = "Bay 2", Code = "BAY-02", BayType = "General Service" },
            new WorkshopBay { Name = "Bay 3", Code = "BAY-03", BayType = "Diagnostics" },
            new WorkshopBay { Name = "Bay 4", Code = "BAY-04", BayType = "Bodywork" },
            new WorkshopBay { Name = "Lube Bay", Code = "BAY-LB", BayType = "Quick Service" }
        );

        await _db.SaveChangesAsync();
    }

    private async Task SeedDemoData()
    {
        if (await _db.Customers.AnyAsync()) return;

        var suzuki = await _db.Brands.FirstAsync(b => b.Code == "SUZ");
        var changan = await _db.Brands.FirstAsync(b => b.Code == "CAG");
        var rangeRover = await _db.Brands.FirstAsync(b => b.Code == "RRV");

        var swiftModel = await _db.VehicleModels.FirstAsync(m => m.BrandId == suzuki.Id && m.Name == "Swift");
        var vitaraModel = await _db.VehicleModels.FirstAsync(m => m.BrandId == suzuki.Id && m.Name == "Vitara");
        var cs55Model = await _db.VehicleModels.FirstAsync(m => m.BrandId == changan.Id);
        var defenderModel = await _db.VehicleModels.FirstAsync(m => m.BrandId == rangeRover.Id && m.Name == "Defender");

        var rng = new Random(42);
        var customers = new List<Customer>();
        string[] names = ["Alice Mukamana", "Bob Nsabimana", "Claire Uwase", "David Habimana", "Eve Niyonzima",
                           "Frank Mutabazi", "Grace Iradukunda", "Henry Ndagijimana", "Irene Uwimana", "James Rugamba"];

        foreach (var name in names)
        {
            customers.Add(new Customer
            {
                FullName = name,
                Phone = $"+25078{rng.Next(1000000, 9999999)}",
                Email = $"{name.Split(' ')[0].ToLower()}@email.rw",
                City = "Kigali",
                Country = "Rwanda",
                Category = (CustomerCategory)(rng.Next(1, 6)),
                PreferredContactMethod = ContactMethod.Phone
            });
        }

        _db.Customers.AddRange(customers);
        await _db.SaveChangesAsync();

        // Seed demo vehicles
        var vehicleData = new[]
        {
            (VIN: "JSAJTC54V00123456", Plate: "RAA 001A", Brand: suzuki.Id, Model: swiftModel.Id, Year: 2022, Customer: customers[0], Mileage: 32000, SaleDate: new DateTime(2022,3,15)),
            (VIN: "JSAJTC54V00123457", Plate: "RAB 002B", Brand: suzuki.Id, Model: vitaraModel.Id, Year: 2023, Customer: customers[1], Mileage: 18000, SaleDate: new DateTime(2023,1,20)),
            (VIN: "LSVEC4180NF000001", Plate: "RAC 003C", Brand: changan.Id, Model: cs55Model.Id, Year: 2023, Customer: customers[2], Mileage: 22000, SaleDate: new DateTime(2023,6,10)),
            (VIN: "SALCA2AX4KH000001", Plate: "RAD 004D", Brand: rangeRover.Id, Model: defenderModel.Id, Year: 2022, Customer: customers[3], Mileage: 45000, SaleDate: new DateTime(2022,8,5)),
            (VIN: "JSAJTC54V00123460", Plate: "RAE 005E", Brand: suzuki.Id, Model: swiftModel.Id, Year: 2021, Customer: customers[4], Mileage: 58000, SaleDate: new DateTime(2021,5,12)),
        };

        foreach (var vd in vehicleData)
        {
            _db.Vehicles.Add(new Vehicle
            {
                VIN = vd.VIN,
                PlateNumber = vd.Plate,
                BrandId = vd.Brand,
                ModelId = vd.Model,
                Year = vd.Year,
                CustomerId = vd.Customer.Id,
                SaleDate = vd.SaleDate,
                CurrentMileage = vd.Mileage,
                IsSoldByDealership = true,
                WarrantyStartDate = vd.SaleDate,
                WarrantyEndDate = vd.SaleDate.AddYears(3),
                RetentionStatus = RetentionStatus.Active
            });
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Demo data seeded: {Customers} customers, {Vehicles} vehicles", customers.Count, vehicleData.Length);
    }

    /// <summary>
    /// One-time cleanup: soft-deletes any service records that were created
    /// by the demo seeder for the five known demo vehicle VINs.
    /// Safe to re-run — already-deleted records are skipped.
    /// </summary>
    private async Task CleanupDemoServiceRecords()
    {
        string[] demoVins =
        [
            "JSAJTC54V00123456",
            "JSAJTC54V00123457",
            "LSVEC4180NF000001",
            "SALCA2AX4KH000001",
            "JSAJTC54V00123460"
        ];

        var demoRecords = await _db.ServiceRecords
            .Include(sr => sr.Vehicle)
            .Where(sr => !sr.IsDeleted && demoVins.Contains(sr.Vehicle.VIN))
            .ToListAsync();

        if (demoRecords.Count == 0) return;

        var now = DateTime.UtcNow;
        foreach (var sr in demoRecords)
        {
            sr.IsDeleted = true;
            sr.DeletedAt = now;
            sr.DeletedBy = "seeder-cleanup";
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Cleaned up {Count} demo service records.", demoRecords.Count);
    }

    private async Task SeedCompanySettings()
    {
        var existing = await _db.CompanySettings.FindAsync(CompanySettings.SingletonId);
        if (existing != null) return; // already seeded — never overwrite admin edits

        _db.CompanySettings.Add(new CompanySettings
        {
            Id               = CompanySettings.SingletonId,
            CompanyName      = "RwandaMotor",
            Address          = "KG 123 St, Kigali, Rwanda",
            Phone            = "+250 788 000 000",
            Email            = "admin@rwandamotor.com",
            TinNumber        = "000000000",
            Website          = "www.rwandamotor.com",
            JobCardShowHeader          = true,
            JobCardShowFooter          = true,
            DeliveryNoteShowHeader     = true,
            DeliveryNoteShowFooter     = true,
            FooterDisclaimer = "RwandaMotor declines all responsibility for materials not listed above.",
            UpdatedAt        = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
        _logger.LogInformation("CompanySettings seeded.");
    }
}
