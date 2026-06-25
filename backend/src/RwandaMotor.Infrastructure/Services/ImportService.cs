using CsvHelper;
using CsvHelper.Configuration;
using ExcelDataReader;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MediatR;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Features.Admin.Commands;
using RwandaMotor.Application.Features.Import.Commands;
using RwandaMotor.Domain.Entities;
using RwandaMotor.Domain.Enums;
using System.Globalization;
using System.Text;
using System.Text.Json;

namespace RwandaMotor.Infrastructure.Services;

// --- Validate Handler -----------------------------------------------------------

public class ValidateImportFileCommandHandler
    : IRequestHandler<ValidateImportFileCommand, ValidateImportResultDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<ValidateImportFileCommandHandler> _log;

    public ValidateImportFileCommandHandler(IApplicationDbContext db, ILogger<ValidateImportFileCommandHandler> log)
    {
        _db = db;
        _log = log;
    }

    public async Task<ValidateImportResultDto> Handle(ValidateImportFileCommand cmd, CancellationToken ct)
    {
        var bytes = Convert.FromBase64String(cmd.FileContentBase64);

        List<Dictionary<string, string>> rows;
        try
        {
            rows = cmd.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase)
                ? ParseCsv(bytes)
                : ParseExcel(bytes);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to parse import file {File}", cmd.FileName);
            throw new InvalidOperationException($"Could not read file: {ex.Message}");
        }

        var existingVins = cmd.ImportType == ImportType.Vehicles
            ? (await _db.Vehicles.Where(v => !v.IsDeleted).Select(v => v.VIN).ToListAsync(ct))
                .ToHashSet(StringComparer.OrdinalIgnoreCase)
            : new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var vinsSeen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var previewRows = new List<ImportRowPreviewDto>();
        var errors = new List<ImportRowErrorDto>();
        int validRows = 0, errorRows = 0, duplicateRows = 0;

        for (int i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            int rowNum = i + 1;
            var (isValid, isDuplicate, error) = ValidateRow(row, cmd.ImportType, existingVins, vinsSeen);

            if (!isValid) errorRows++;
            else if (isDuplicate) duplicateRows++;
            else validRows++;

            previewRows.Add(new ImportRowPreviewDto(rowNum, isValid, isDuplicate, row, error));
            if (error != null) errors.Add(new ImportRowErrorDto(rowNum, "Row", error));
        }

        var importLog = new ImportLog
        {
            ImportType = cmd.ImportType,
            Status = errorRows == 0 ? ImportStatus.Valid : ImportStatus.Invalid,
            FileName = cmd.FileName,
            OriginalFileName = cmd.FileName,
            FileSizeBytes = bytes.Length,
            TotalRows = rows.Count,
            ValidRows = validRows,
            ErrorRows = errorRows,
            DuplicateRows = duplicateRows,
            StartedAt = DateTime.UtcNow,
        };

        foreach (var p in previewRows)
        {
            importLog.Rows.Add(new ImportLogRow
            {
                RowNumber = p.RowNumber,
                IsValid = p.IsValid,
                IsDuplicate = p.IsDuplicate,
                RawDataJson = JsonSerializer.Serialize(p.Data),
                ErrorMessage = p.Error,
            });
        }

        _db.ImportLogs.Add(importLog);
        await _db.SaveChangesAsync(ct);

        return new ValidateImportResultDto(
            importLog.Id,
            rows.Count,
            validRows,
            errorRows,
            duplicateRows,
            previewRows.Take(10).ToList(),
            errors);
    }

    private static (bool isValid, bool isDuplicate, string? error) ValidateRow(
        Dictionary<string, string> row, ImportType type,
        HashSet<string> existingVins, HashSet<string> vinsSeen)
    {
        if (type == ImportType.Vehicles)
        {
            if (!row.TryGetValue("VIN", out var vin) || string.IsNullOrWhiteSpace(vin))
                return (false, false, "VIN is required");
            if (!row.TryGetValue("BrandName", out var brand) || string.IsNullOrWhiteSpace(brand))
                return (false, false, "BrandName is required");
            if (!row.TryGetValue("ModelName", out var model) || string.IsNullOrWhiteSpace(model))
                return (false, false, "ModelName is required");
            if (!row.TryGetValue("Year", out var yearStr) || !int.TryParse(yearStr, out var year) || year < 1990)
                return (false, false, "Year must be a valid number >= 1990");

            vin = vin.Trim().ToUpperInvariant();
            if (vin.Length > 17) return (false, false, $"VIN '{vin}' exceeds 17 characters");
            if (existingVins.Contains(vin)) return (true, true, null);
            if (!vinsSeen.Add(vin))         return (true, true, null);
            return (true, false, null);
        }

        if (type == ImportType.ServiceRecords)
        {
            // Only VIN and ServiceDate are hard requirements.
            // MileageAtService and ServiceType are optional — CRE can complete them later.
            if (!row.TryGetValue("VIN", out var vin) || string.IsNullOrWhiteSpace(vin))
                return (false, false, "VIN is required");
            if (!row.TryGetValue("ServiceDate", out var dateStr) || !DateTime.TryParse(dateStr, out _))
                return (false, false, "ServiceDate must be a valid date (YYYY-MM-DD)");
            if (row.TryGetValue("MileageAtService", out var mileStr)
                && !string.IsNullOrWhiteSpace(mileStr)
                && (!int.TryParse(mileStr, out var m) || m < 0))
                return (false, false, "MileageAtService must be a non-negative integer when provided");
            return (true, false, null);
        }

        if (type == ImportType.JobCards)
        {
            if (!row.TryGetValue("VIN", out var vin) || string.IsNullOrWhiteSpace(vin))
                return (false, false, "VIN is required");
            if (!row.TryGetValue("JobCardDate", out var dateStr) || !DateTime.TryParse(dateStr, out _))
                return (false, false, "JobCardDate must be a valid date (YYYY-MM-DD)");
            if (row.TryGetValue("Mileage", out var mileStr)
                && !string.IsNullOrWhiteSpace(mileStr)
                && (!int.TryParse(mileStr, out var m) || m < 0))
                return (false, false, "Mileage must be a non-negative integer when provided");
            return (true, false, null);
        }

        return (true, false, null);
    }

    private static List<Dictionary<string, string>> ParseCsv(byte[] bytes)
    {
        using var ms = new MemoryStream(bytes);
        using var reader = new StreamReader(ms, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            MissingFieldFound = null,
            BadDataFound = null,
            TrimOptions = TrimOptions.Trim,
        });

        csv.Read(); csv.ReadHeader();
        var headers = csv.HeaderRecord ?? [];
        var rows = new List<Dictionary<string, string>>();

        while (csv.Read())
        {
            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var h in headers)
                row[h] = csv.GetField(h) ?? "";
            rows.Add(row);
        }
        return rows;
    }

    private static List<Dictionary<string, string>> ParseExcel(byte[] bytes)
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        using var ms = new MemoryStream(bytes);
        using var reader = ExcelReaderFactory.CreateReader(ms);
        var ds = reader.AsDataSet(new ExcelDataSetConfiguration
        {
            ConfigureDataTable = _ => new ExcelDataTableConfiguration { UseHeaderRow = true }
        });

        var table = ds.Tables[0];
        var rows = new List<Dictionary<string, string>>();
        foreach (System.Data.DataRow r in table.Rows)
        {
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (System.Data.DataColumn c in table.Columns)
                dict[c.ColumnName] = r[c]?.ToString()?.Trim() ?? "";
            rows.Add(dict);
        }
        return rows;
    }
}

// --- Process Handler ------------------------------------------------------------

public class ProcessImportCommandHandler
    : IRequestHandler<ProcessImportCommand, ProcessImportResultDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<ProcessImportCommandHandler> _log;

    public ProcessImportCommandHandler(
        IApplicationDbContext db,
        ILogger<ProcessImportCommandHandler> log)
    {
        _db = db;
        _log = log;
    }

    public async Task<ProcessImportResultDto> Handle(ProcessImportCommand cmd, CancellationToken ct)
    {
        var importLog = await _db.ImportLogs
            .Include(l => l.Rows)
            .FirstOrDefaultAsync(l => l.Id == cmd.ImportLogId, ct)
            ?? throw new InvalidOperationException("Import log not found");

        importLog.Status = ImportStatus.Importing;
        importLog.StartedAt ??= DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        // Process both valid rows AND duplicates — duplicates will be re-checked
        // against the live DB and skipped safely; only truly new rows are inserted.
        var rowsToProcess = importLog.Rows
            .Where(r => r.IsValid)
            .OrderBy(r => r.RowNumber)
            .ToList();

        var allData = rowsToProcess
            .Select(r => JsonSerializer.Deserialize<Dictionary<string, string>>(
                             r.RawDataJson ?? "{}",
                             new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                         ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase))
            .ToList();

        int imported = 0;
        var errors = new List<ImportRowErrorDto>();

        if (importLog.ImportType == ImportType.Vehicles)
            (imported, errors) = await ImportVehiclesBatch(rowsToProcess, allData, ct);
        else if (importLog.ImportType == ImportType.ServiceRecords)
            (imported, errors) = await ImportServiceRecordsBatch(rowsToProcess, allData, ct);
        else if (importLog.ImportType == ImportType.JobCards)
            (imported, errors) = await ImportJobCardsBatch(rowsToProcess, allData, ct);

        foreach (var e in errors)
        {
            var row = rowsToProcess.FirstOrDefault(r => r.RowNumber == e.RowNumber);
            if (row != null) row.ErrorMessage = e.Error;
        }

        importLog.ImportedRows = imported;
        importLog.ErrorRows += errors.Count;
        importLog.Status = imported > 0
            ? (errors.Count > 0 ? ImportStatus.CompletedWithErrors : ImportStatus.Completed)
            : ImportStatus.Failed;
        importLog.CompletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return new ProcessImportResultDto(
            importLog.Id, importLog.Status,
            importLog.TotalRows, imported, errors.Count, importLog.DuplicateRows, errors);
    }

    // -- Vehicles — fully batched with live dedup ---------------------------------

    private async Task<(int imported, List<ImportRowErrorDto> errors)> ImportVehiclesBatch(
        List<ImportLogRow> logRows, List<Dictionary<string, string>> allData, CancellationToken ct)
    {
        var errors = new List<ImportRowErrorDto>();
        int imported = 0;

        // Load all brands + models (include inactive so auto-create doesn't duplicate)
        var brands = await _db.Brands
            .Include(b => b.Models)
            .Where(b => !b.IsDeleted)
            .ToListAsync(ct);

        // Load ALL existing customers into memory
        var allCustomers = await _db.Customers
            .Where(c => !c.IsDeleted)
            .ToListAsync(ct);
        // TryAdd keeps the first match when duplicate names exist in the DB
        var customerMap = new Dictionary<string, Customer>(StringComparer.OrdinalIgnoreCase);
        foreach (var c in allCustomers)
            customerMap.TryAdd(c.FullName, c);

        // Re-check VINs against live DB (validation may be minutes stale)
        var existingVins = (await _db.Vehicles
            .Where(v => !v.IsDeleted)
            .Select(v => v.VIN)
            .ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Re-check plate numbers to avoid unique constraint violations
        var existingPlates = (await _db.Vehicles
            .Where(v => !v.IsDeleted && v.PlateNumber != null)
            .Select(v => v.PlateNumber!)
            .ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Intra-batch dedup sets
        var vinsInBatch   = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var platesInBatch = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Create missing customers first
        var newCustomers = new List<Customer>();
        foreach (var data in allData)
        {
            var name = Get(data, "CustomerName").Trim();
            if (string.IsNullOrEmpty(name) || customerMap.ContainsKey(name)) continue;

            var phone = Get(data, "CustomerPhone");
            // Truncate to column max lengths (Phone=20, FullName=200)
            var safeName  = name.Length > 200 ? name[..200] : name;
            var safePhone = string.IsNullOrWhiteSpace(phone) ? null
                          : (phone.Trim().Length > 20 ? phone.Trim()[..20] : phone.Trim());
            var c = new Customer
            {
                FullName = safeName,
                Phone    = safePhone,
                Country  = "Rwanda",
                Category = CustomerCategory.Retail,
                PreferredContactMethod = ContactMethod.Phone,
            };
            _db.Customers.Add(c);
            newCustomers.Add(c);
            customerMap[name] = c;
        }
        if (newCustomers.Count > 0)
            await _db.SaveChangesAsync(ct);

        // Auto-create any missing brands/models so the import doesn't fail on unknown catalogue entries
        await EnsureBrandsAndModels(allData, brands, ct);

        // Build vehicle entities
        var vehiclesToAdd = new List<Vehicle>();

        for (int i = 0; i < allData.Count; i++)
        {
            var data   = allData[i];
            var logRow = logRows[i];

            try
            {
                var vin          = Get(data, "VIN").ToUpperInvariant();
                var brandName    = Get(data, "BrandName");
                var modelName    = Get(data, "ModelName");
                var customerName = Get(data, "CustomerName").Trim();
                var plateNumber  = Get(data, "PlateNumber");
                var color        = Get(data, "Color");
                var saleDateStr  = Get(data, "SaleDate");
                var yearStr      = Get(data, "Year");

                // Skip if already in DB or already queued in this batch
                if (existingVins.Contains(vin) || !vinsInBatch.Add(vin))
                {
                    logRow.IsDuplicate = true;
                    continue;
                }

                // Skip rows with no customer — user said they will complete later
                if (string.IsNullOrWhiteSpace(customerName))
                {
                    logRow.ErrorMessage = "CustomerName empty — skipped";
                    continue;
                }

                var brand = brands.FirstOrDefault(b =>
                                b.Name.Equals(brandName, StringComparison.OrdinalIgnoreCase))
                            ?? brands.FirstOrDefault(b =>
                                b.Name.Contains(brandName, StringComparison.OrdinalIgnoreCase))
                            ?? throw new Exception($"Brand '{brandName}' could not be resolved (auto-create failed).");

                var model = brand.Models.FirstOrDefault(m =>
                                m.Name.Equals(modelName, StringComparison.OrdinalIgnoreCase))
                            ?? brand.Models.FirstOrDefault(m =>
                                m.Name.Contains(modelName, StringComparison.OrdinalIgnoreCase))
                            ?? throw new Exception($"Model '{modelName}' could not be resolved under '{brand.Name}' (auto-create failed).");

                if (!customerMap.TryGetValue(customerName, out var customer))
                    throw new Exception($"Customer '{customerName}' could not be resolved.");

                if (!int.TryParse(yearStr, out var year))
                    throw new Exception($"Year '{yearStr}' is not a valid integer.");

                DateTime? saleDate = DateTime.TryParse(saleDateStr, out var sd) ? sd : null;

                // Deduplicate plate numbers — if duplicate in DB or batch, import without plate
                string? plate = null;
                if (!string.IsNullOrWhiteSpace(plateNumber))
                {
                    var norm = plateNumber.Trim().ToUpperInvariant();
                    if (!existingPlates.Contains(norm) && platesInBatch.Add(norm))
                        plate = norm;
                    // else: duplicate plate — still import the vehicle, just without a plate
                }

                // Truncate VIN to 17 chars (already validated, but belt-and-braces)
                var safeVin   = vin.Length > 17 ? vin[..17] : vin;
                var safeColor = string.IsNullOrWhiteSpace(color) ? null
                              : (color.Trim().Length > 100 ? color.Trim()[..100] : color.Trim());

                vehiclesToAdd.Add(new Vehicle
                {
                    VIN                = safeVin,
                    PlateNumber        = plate,
                    BrandId            = brand.Id,
                    ModelId            = model.Id,
                    Year               = year,
                    Color              = safeColor,
                    CustomerId         = customer.Id,
                    SaleDate           = saleDate,
                    IsSoldByDealership = true,
                    RetentionStatus    = RetentionStatus.Active,
                });

                logRow.IsImported = true;
                imported++;
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Vehicle row {Row} failed", logRow.RowNumber);
                errors.Add(new ImportRowErrorDto(logRow.RowNumber, "Row", ex.Message));
            }
        }

        var savedVehicles = new List<Vehicle>();

        if (vehiclesToAdd.Count > 0)
        {
            try
            {
                _db.Vehicles.AddRange(vehiclesToAdd);
                await _db.SaveChangesAsync(ct);
                savedVehicles.AddRange(vehiclesToAdd);
            }
            catch (Exception batchEx)
            {
                // Batch save failed — retry row-by-row so good rows still get imported
                _log.LogWarning(batchEx, "Batch vehicle save failed, retrying row-by-row");

                // Cast to DbContext to access ChangeTracker (IApplicationDbContext doesn't expose it)
                var dbCtx = _db as Microsoft.EntityFrameworkCore.DbContext;

                // Detach all entities from the failed batch
                if (dbCtx != null)
                    foreach (var v in vehiclesToAdd)
                    {
                        var e = dbCtx.ChangeTracker.Entries<Vehicle>()
                            .FirstOrDefault(x => x.Entity == v);
                        if (e != null) e.State = EntityState.Detached;
                    }

                imported = 0;
                foreach (var vehicle in vehiclesToAdd)
                {
                    try
                    {
                        _db.Vehicles.Add(vehicle);
                        await _db.SaveChangesAsync(ct);
                        imported++;
                        savedVehicles.Add(vehicle);
                    }
                    catch (Exception rowEx)
                    {
                        _log.LogWarning(rowEx, "Row-by-row insert failed for VIN {VIN}", vehicle.VIN);
                        if (dbCtx != null)
                        {
                            var e = dbCtx.ChangeTracker.Entries<Vehicle>()
                                .FirstOrDefault(x => x.Entity == vehicle);
                            if (e != null) e.State = EntityState.Detached;
                        }
                        errors.Add(new ImportRowErrorDto(0, "VIN:" + vehicle.VIN,
                            rowEx.InnerException?.Message ?? rowEx.Message));
                    }
                }
            }
        }

        // Create a SalesHistory record for every successfully saved vehicle
        if (savedVehicles.Count > 0)
        {
            var customerIdToName = customerMap.ToDictionary(kv => kv.Value.Id, kv => kv.Key);
            _db.SalesHistories.AddRange(savedVehicles.Select(v => new SalesHistory
            {
                VehicleId    = v.Id,
                CustomerId   = v.CustomerId,
                SaleDate     = v.SaleDate ?? DateTime.UtcNow,
                SaleType     = "Import",
                VIN          = v.VIN,
                PlateNumber  = v.PlateNumber,
                CustomerName = v.CustomerId.HasValue &&
                               customerIdToName.TryGetValue(v.CustomerId.Value, out var cName)
                               ? cName : null,
                Notes        = "Imported from Vehicle Sales Data",
            }));
            await _db.SaveChangesAsync(ct);
        }

        return (imported, errors);
    }

    // -- Service Records — fully batched ------------------------------------------

    private async Task<(int imported, List<ImportRowErrorDto> errors)> ImportServiceRecordsBatch(
        List<ImportLogRow> logRows, List<Dictionary<string, string>> allData, CancellationToken ct)
    {
        var errors = new List<ImportRowErrorDto>();
        int imported = 0;

        var allVehicles = await _db.Vehicles
            .Where(v => !v.IsDeleted)
            .ToListAsync(ct);
        var vehicleMap = allVehicles
            .ToDictionary(v => v.VIN, StringComparer.OrdinalIgnoreCase);

        // Pre-pass: auto-create external vehicles for unknown VINs
        vehicleMap = await EnsureExternalVehicles(allData.Select(d => Get(d, "VIN")).ToList(), vehicleMap, ct);

        var policies = await _db.ServicePolicies
            .Where(p => !p.IsDeleted && p.IsActive)
            .ToListAsync(ct);

        var defaultPolicy = policies.FirstOrDefault(p => p.IsDefault)
                            ?? new ServicePolicy
                            {
                                Name = "System Default", IntervalKm = 5000, IntervalMonths = 6,
                                DueSoonLeadDays = 30, DueSoonLeadKm = 500, LostThresholdMonths = 12
                            };

        var technicians = await _db.Technicians
            .Where(t => !t.IsDeleted)
            .ToListAsync(ct);

        var recordsToAdd = new List<ServiceRecord>();

        for (int i = 0; i < allData.Count; i++)
        {
            var data   = allData[i];
            var logRow = logRows[i];

            try
            {
                var vin            = Get(data, "VIN").ToUpperInvariant();
                var serviceDateStr = Get(data, "ServiceDate");
                var mileageStr     = Get(data, "MileageAtService");
                var serviceTypeStr = Get(data, "ServiceType");
                var technicianName = Get(data, "TechnicianName");
                var invoiceNumber  = Get(data, "InvoiceNumber");

                if (!vehicleMap.TryGetValue(vin, out var vehicle))
                    throw new Exception($"Vehicle with VIN '{vin}' could not be resolved.");

                var serviceDate = DateTime.Parse(serviceDateStr, null, DateTimeStyles.AssumeUniversal);

                var mileage = (!string.IsNullOrWhiteSpace(mileageStr) && int.TryParse(mileageStr, out var parsedMileage) && parsedMileage >= 0)
                    ? parsedMileage : 0;

                if (!Enum.TryParse<ServiceType>(serviceTypeStr, ignoreCase: true, out var serviceType))
                    serviceType = ServiceType.RoutineMaintenance;

                Technician? technician = null;
                if (!string.IsNullOrWhiteSpace(technicianName))
                    technician = technicians.FirstOrDefault(t =>
                        t.FullName.Contains(technicianName, StringComparison.OrdinalIgnoreCase));

                var policy      = ResolvePolicy(vehicle, policies, defaultPolicy);
                var nextMileage = mileage + policy.IntervalKm;
                var nextDate    = serviceDate.AddMonths(policy.IntervalMonths);

                recordsToAdd.Add(new ServiceRecord
                {
                    VehicleId          = vehicle.Id,
                    TechnicianId       = technician?.Id,
                    ServiceDate        = serviceDate,
                    MileageAtService   = mileage,
                    ServiceType        = serviceType,
                    InvoiceNumber      = string.IsNullOrWhiteSpace(invoiceNumber) ? null : invoiceNumber,
                    NextServiceMileage = nextMileage,
                    NextServiceDate    = nextDate,
                });

                if (!vehicle.LastServiceDate.HasValue || serviceDate > vehicle.LastServiceDate.Value)
                {
                    vehicle.LastServiceDate    = serviceDate;
                    vehicle.LastServiceMileage = mileage;
                    vehicle.NextServiceDate    = nextDate;
                    vehicle.NextServiceMileage = nextMileage;
                }
                vehicle.CurrentMileage = Math.Max(vehicle.CurrentMileage ?? 0, mileage);
                vehicle.UpdatedAt      = DateTime.UtcNow;

                logRow.IsImported = true;
                imported++;
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Service record row {Row} failed", logRow.RowNumber);
                errors.Add(new ImportRowErrorDto(logRow.RowNumber, "Row", ex.Message));
            }
        }

        if (recordsToAdd.Count > 0)
        {
            _db.ServiceRecords.AddRange(recordsToAdd);
            await _db.SaveChangesAsync(ct);
        }

        return (imported, errors);
    }

    // -- Job Cards — historical import --------------------------------------------

    private async Task<(int imported, List<ImportRowErrorDto> errors)> ImportJobCardsBatch(
        List<ImportLogRow> logRows, List<Dictionary<string, string>> allData, CancellationToken ct)
    {
        var errors = new List<ImportRowErrorDto>();
        int imported = 0;

        var allVehicles = await _db.Vehicles
            .Where(v => !v.IsDeleted)
            .ToListAsync(ct);
        var vehicleMap = allVehicles
            .ToDictionary(v => v.VIN, StringComparer.OrdinalIgnoreCase);

        // Pre-pass: auto-create external vehicles for unknown VINs
        vehicleMap = await EnsureExternalVehicles(allData.Select(d => Get(d, "VIN")).ToList(), vehicleMap, ct);

        var technicians = await _db.Technicians
            .Where(t => !t.IsDeleted)
            .ToListAsync(ct);

        var jobCardsToAdd = new List<JobCard>();

        for (int i = 0; i < allData.Count; i++)
        {
            var data   = allData[i];
            var logRow = logRows[i];

            try
            {
                var vin            = Get(data, "VIN").ToUpperInvariant();
                var jobCardDateStr = Get(data, "JobCardDate");
                var mileageStr     = Get(data, "Mileage");
                var serviceTypeStr = Get(data, "ServiceType");
                var fuelLevelStr   = Get(data, "FuelLevel");
                var technicianName = Get(data, "TechnicianName");
                var statusStr      = Get(data, "Status");
                var notes          = Get(data, "Notes");
                var jobCardNumber  = Get(data, "JobCardNumber");
                var customerName   = Get(data, "CustomerName");
                var customerPhone  = Get(data, "CustomerPhone");

                if (!vehicleMap.TryGetValue(vin, out var vehicle))
                    throw new Exception($"Vehicle with VIN '{vin}' could not be resolved.");

                var jobCardDate = DateTime.Parse(jobCardDateStr, null, DateTimeStyles.AssumeUniversal);

                var mileage = (!string.IsNullOrWhiteSpace(mileageStr) && int.TryParse(mileageStr, out var parsedMileage) && parsedMileage >= 0)
                    ? parsedMileage : 0;

                if (!Enum.TryParse<ServiceType>(serviceTypeStr, ignoreCase: true, out var serviceType))
                    serviceType = ServiceType.RoutineMaintenance;

                if (!Enum.TryParse<FuelLevel>(fuelLevelStr, ignoreCase: true, out var fuelLevel))
                    fuelLevel = FuelLevel.Half;

                // Historical job cards default to Closed; override from CSV if present
                if (!Enum.TryParse<JobCardStatus>(statusStr, ignoreCase: true, out var status))
                    status = JobCardStatus.Closed;

                Technician? technician = null;
                if (!string.IsNullOrWhiteSpace(technicianName))
                    technician = technicians.FirstOrDefault(t =>
                        t.FullName.Contains(technicianName, StringComparison.OrdinalIgnoreCase));

                // Use provided number or generate a placeholder from VIN + date
                var number = !string.IsNullOrWhiteSpace(jobCardNumber)
                    ? jobCardNumber
                    : $"HIST-{vin[..Math.Min(8, vin.Length)]}-{jobCardDate:yyyyMMdd}";

                jobCardsToAdd.Add(new JobCard
                {
                    JobCardNumber    = number,
                    VehicleId        = vehicle.Id,
                    CustomerId       = vehicle.CustomerId,
                    TechnicianId     = technician?.Id,
                    VIN              = vehicle.VIN,
                    PlateNumber      = vehicle.PlateNumber,
                    Year             = vehicle.Year,
                    Color            = vehicle.Color,
                    Transmission     = vehicle.Transmission,
                    FuelType         = vehicle.FuelType,
                    FuelLevel        = fuelLevel,
                    Mileage          = mileage,
                    CustomerName     = !string.IsNullOrWhiteSpace(customerName) ? customerName : null,
                    CustomerPhone    = !string.IsNullOrWhiteSpace(customerPhone) ? customerPhone : null,
                    ServiceType      = serviceType,
                    Notes            = string.IsNullOrWhiteSpace(notes) ? null : notes,
                    Status           = status,
                    ReceivedByName   = "Import",
                    CreatedAt        = jobCardDate,
                    ClosedAt         = status == JobCardStatus.Closed ? jobCardDate : null,
                });

                vehicle.CurrentMileage = Math.Max(vehicle.CurrentMileage ?? 0, mileage);
                vehicle.UpdatedAt      = DateTime.UtcNow;

                logRow.IsImported = true;
                imported++;
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Job card row {Row} failed", logRow.RowNumber);
                errors.Add(new ImportRowErrorDto(logRow.RowNumber, "Row", ex.Message));
            }
        }

        if (jobCardsToAdd.Count > 0)
        {
            // Capture historical dates before DbContext override sets CreatedAt = UtcNow
            var historicalDates = jobCardsToAdd.ToDictionary(jc => jc.Id, jc => jc.CreatedAt);
            _db.JobCards.AddRange(jobCardsToAdd);
            await _db.SaveChangesAsync(ct);

            // Restore original job card dates so historical records sort correctly
            var dbCtx = _db as Microsoft.EntityFrameworkCore.DbContext;
            if (dbCtx != null)
                foreach (var (id, date) in historicalDates)
                    await dbCtx.Database.ExecuteSqlRawAsync(
                        @"UPDATE ""JobCards"" SET ""CreatedAt"" = {0} WHERE ""Id"" = {1}", date, id);
        }

        return (imported, errors);
    }

    // -- Shared: ensure external vehicles exist for all unknown VINs ---------------

    private async Task<Dictionary<string, Vehicle>> EnsureExternalVehicles(
        List<string> vins, Dictionary<string, Vehicle> vehicleMap, CancellationToken ct)
    {
        var unknownVins = vins
            .Select(v => v.Trim().ToUpperInvariant())
            .Where(v => !string.IsNullOrWhiteSpace(v) && !vehicleMap.ContainsKey(v))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (unknownVins.Count == 0) return vehicleMap;

        var newVehicles = unknownVins.Select(vin => new Vehicle
        {
            VIN                = vin.Length > 17 ? vin[..17] : vin,
            IsSoldByDealership = false,
            RetentionStatus    = RetentionStatus.External,
            Year               = 0,
        }).ToList();

        _db.Vehicles.AddRange(newVehicles);
        await _db.SaveChangesAsync(ct);

        foreach (var v in newVehicles)
            vehicleMap[v.VIN] = v;

        _log.LogInformation("Auto-created {Count} external vehicle(s) for import", newVehicles.Count);

        return vehicleMap;
    }

    // -- In-memory policy resolution ----------------------------------------------

    private static ServicePolicy ResolvePolicy(
        Vehicle vehicle,
        List<ServicePolicy> policies,
        ServicePolicy defaultPolicy)
    {
        if (vehicle.ServicePolicyId.HasValue)
        {
            var vp = policies.FirstOrDefault(p => p.Id == vehicle.ServicePolicyId.Value);
            if (vp != null) return vp;
        }

        if (vehicle.ModelId != Guid.Empty)
        {
            var mp = policies.FirstOrDefault(p => p.ModelId == vehicle.ModelId);
            if (mp != null) return mp;
        }

        var bp = policies.FirstOrDefault(p => p.BrandId == vehicle.BrandId && p.ModelId == null);
        if (bp != null) return bp;

        return policies.FirstOrDefault(p => p.IsDefault) ?? defaultPolicy;
    }

    // -- Auto-create missing brands/models so vehicle imports never fail on catalogue gaps ----

    private async Task EnsureBrandsAndModels(
        List<Dictionary<string, string>> allData,
        List<Brand> brands,
        CancellationToken ct)
    {
        // Pass 1 — brands
        bool anyNew = false;
        var brandNames = allData
            .Select(d => Get(d, "BrandName"))
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var brandName in brandNames)
        {
            var existing = brands.FirstOrDefault(b =>
                b.Name.Equals(brandName, StringComparison.OrdinalIgnoreCase) ||
                b.Name.Contains(brandName, StringComparison.OrdinalIgnoreCase));

            if (existing == null)
            {
                var brand = new Brand
                {
                    Name     = brandName,
                    Code     = AutoCode(brandName),
                    IsActive = true,
                };
                _db.Brands.Add(brand);
                brands.Add(brand);
                anyNew = true;
                _log.LogInformation("Auto-created brand '{Brand}' during vehicle import", brandName);
            }
        }
        if (anyNew) { await _db.SaveChangesAsync(ct); anyNew = false; }

        // Pass 2 — models
        var modelCombos = allData
            .Select(d => (brand: Get(d, "BrandName"), model: Get(d, "ModelName")))
            .Where(x => !string.IsNullOrWhiteSpace(x.brand) && !string.IsNullOrWhiteSpace(x.model))
            .Distinct()
            .ToList();

        foreach (var (brandName, modelName) in modelCombos)
        {
            var brand = brands.FirstOrDefault(b =>
                b.Name.Equals(brandName, StringComparison.OrdinalIgnoreCase) ||
                b.Name.Contains(brandName, StringComparison.OrdinalIgnoreCase));
            if (brand == null) continue;

            var existingModel = brand.Models.FirstOrDefault(m =>
                m.Name.Equals(modelName, StringComparison.OrdinalIgnoreCase) ||
                m.Name.Contains(modelName, StringComparison.OrdinalIgnoreCase));

            if (existingModel == null)
            {
                var model = new VehicleModel
                {
                    BrandId  = brand.Id,
                    Name     = modelName,
                    Code     = AutoCode(modelName),
                    IsActive = true,
                };
                _db.VehicleModels.Add(model);
                brand.Models.Add(model);
                anyNew = true;
                _log.LogInformation("Auto-created model '{Model}' under '{Brand}' during vehicle import", modelName, brandName);
            }
        }
        if (anyNew) await _db.SaveChangesAsync(ct);
    }

    private static string AutoCode(string name)
    {
        var letters = name.Where(char.IsLetter).Take(5).ToArray();
        return letters.Length > 0
            ? new string(letters).ToUpperInvariant()
            : name[..Math.Min(3, name.Length)].ToUpperInvariant();
    }

    private static string Get(Dictionary<string, string> d, string key) =>
        (d.TryGetValue(key, out var v) ? v : "").Trim();
}

// --- Catalogue Preview Handler -----------------------------------------------

public class PreviewCatalogueImportCommandHandler
    : IRequestHandler<PreviewCatalogueImportCommand, CataloguePreviewResultDto>
{
    private readonly IApplicationDbContext _db;

    public PreviewCatalogueImportCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<CataloguePreviewResultDto> Handle(PreviewCatalogueImportCommand cmd, CancellationToken ct)
    {
        List<Dictionary<string, string>> rows;
        try
        {
            rows = cmd.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase)
                ? ParseCsv(cmd.FileBytes)
                : ParseExcel(cmd.FileBytes);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Could not read file: {ex.Message}");
        }

        var existingBrands = await _db.Brands
            .Include(b => b.Models)
            .Where(b => !b.IsDeleted)
            .ToListAsync(ct);

        var previewRows = new List<CataloguePreviewRowDto>();
        var seenBrands = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        int newBrands = 0, newModels = 0, existBrands = 0, existModels = 0, errorRows = 0;

        for (int i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var brandName = Get(row, "BrandName");
            var modelName = Get(row, "ModelName");
            var brandCode = Get(row, "BrandCode");
            var modelCode = Get(row, "ModelCode");
            var segment   = Get(row, "ModelSegment");

            if (string.IsNullOrWhiteSpace(brandName))
            {
                previewRows.Add(new CataloguePreviewRowDto(
                    i + 1, brandName, modelName, brandCode, modelCode, segment,
                    false, false, true, "BrandName is required"));
                errorRows++;
                continue;
            }

            if (string.IsNullOrWhiteSpace(modelName))
            {
                previewRows.Add(new CataloguePreviewRowDto(
                    i + 1, brandName, modelName, brandCode, modelCode, segment,
                    false, false, true, "ModelName is required"));
                errorRows++;
                continue;
            }

            var existingBrand = existingBrands.FirstOrDefault(b =>
                b.Name.Equals(brandName, StringComparison.OrdinalIgnoreCase));
            bool isNewBrand = existingBrand == null && !seenBrands.Contains(brandName);
            if (isNewBrand) { seenBrands.Add(brandName); newBrands++; }
            else if (existingBrand != null && !seenBrands.Contains(brandName)) { existBrands++; seenBrands.Add(brandName); }

            var modelSource = existingBrand?.Models
                ?? previewRows.Where(r => r.BrandName.Equals(brandName, StringComparison.OrdinalIgnoreCase) && !r.IsNewModel)
                              .Select(_ => (object?)null).ToList() as IEnumerable<object>;
            bool isNewModel;
            if (existingBrand != null)
                isNewModel = !existingBrand.Models.Any(m => m.Name.Equals(modelName, StringComparison.OrdinalIgnoreCase));
            else
                isNewModel = !previewRows.Any(r =>
                    r.BrandName.Equals(brandName, StringComparison.OrdinalIgnoreCase) &&
                    r.ModelName.Equals(modelName, StringComparison.OrdinalIgnoreCase));

            if (isNewModel) newModels++;
            else existModels++;

            previewRows.Add(new CataloguePreviewRowDto(
                i + 1, brandName, modelName,
                string.IsNullOrWhiteSpace(brandCode) ? null : brandCode,
                string.IsNullOrWhiteSpace(modelCode) ? null : modelCode,
                string.IsNullOrWhiteSpace(segment) ? null : segment,
                isNewBrand, isNewModel, false, null));
        }

        return new CataloguePreviewResultDto(
            rows.Count, newBrands, newModels, existBrands, existModels, errorRows, previewRows);
    }

    private static List<Dictionary<string, string>> ParseCsv(byte[] bytes)
    {
        using var ms     = new MemoryStream(bytes);
        using var reader = new StreamReader(ms, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        using var csv    = new CsvHelper.CsvReader(reader, new CsvHelper.Configuration.CsvConfiguration(System.Globalization.CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true, MissingFieldFound = null, BadDataFound = null,
            TrimOptions = CsvHelper.Configuration.TrimOptions.Trim,
        });
        csv.Read(); csv.ReadHeader();
        var headers = csv.HeaderRecord ?? [];
        var rows    = new List<Dictionary<string, string>>();
        while (csv.Read())
        {
            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var h in headers) row[h] = csv.GetField(h) ?? "";
            rows.Add(row);
        }
        return rows;
    }

    private static List<Dictionary<string, string>> ParseExcel(byte[] bytes)
    {
        System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
        using var ms     = new MemoryStream(bytes);
        using var exlReader = ExcelDataReader.ExcelReaderFactory.CreateReader(ms);
        var ds = exlReader.AsDataSet(new ExcelDataReader.ExcelDataSetConfiguration
        {
            ConfigureDataTable = _ => new ExcelDataReader.ExcelDataTableConfiguration { UseHeaderRow = true }
        });
        var table = ds.Tables[0];
        var rows  = new List<Dictionary<string, string>>();
        foreach (System.Data.DataRow r in table.Rows)
        {
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (System.Data.DataColumn c in table.Columns)
                dict[c.ColumnName] = r[c]?.ToString()?.Trim() ?? "";
            rows.Add(dict);
        }
        return rows;
    }

    private static string Get(Dictionary<string, string> d, string key) =>
        (d.TryGetValue(key, out var v) ? v : "").Trim();
}

// --- Bulk Catalogue Import Handler -------------------------------------------

public class BulkImportCatalogueCommandHandler
    : IRequestHandler<BulkImportCatalogueCommand, BulkImportCatalogueResultDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<BulkImportCatalogueCommandHandler> _log;

    public BulkImportCatalogueCommandHandler(
        IApplicationDbContext db,
        ILogger<BulkImportCatalogueCommandHandler> log)
    {
        _db = db; _log = log;
    }

    public async Task<BulkImportCatalogueResultDto> Handle(BulkImportCatalogueCommand cmd, CancellationToken ct)
    {
        List<Dictionary<string, string>> rows;
        try
        {
            rows = cmd.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase)
                ? ParseCsv(cmd.FileBytes)
                : ParseExcel(cmd.FileBytes);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Could not read file: {ex.Message}");
        }

        var brands = await _db.Brands
            .Include(b => b.Models)
            .Where(b => !b.IsDeleted)
            .ToListAsync(ct);

        int brandsCreated = 0, brandsSkipped = 0, modelsCreated = 0, modelsSkipped = 0;

        // Bypass global soft-delete filter to see ALL brand codes including deleted rows.
        // EF Core's HasQueryFilter(e => !e.IsDeleted) is applied to every _db.Brands query;
        // without IgnoreQueryFilters() the result is identical to the in-memory brands list
        // and soft-deleted codes silently bypass our uniqueness check, causing IX_Brands_Code
        // violations at SaveChanges time.
        var dbCtx = _db as Microsoft.EntityFrameworkCore.DbContext;
        var usedBrandCodes = dbCtx != null
            ? (await dbCtx.Set<Brand>().IgnoreQueryFilters().Select(b => b.Code).ToListAsync(ct))
                  .ToHashSet(StringComparer.OrdinalIgnoreCase)
            : brands.Select(b => b.Code).ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Pass 1: brands
        bool anyNew = false;
        foreach (var brandName in rows.Select(r => Get(r, "BrandName"))
                                      .Where(n => !string.IsNullOrWhiteSpace(n))
                                      .Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var existing = brands.FirstOrDefault(b => b.Name.Equals(brandName, StringComparison.OrdinalIgnoreCase));
            if (existing == null)
            {
                var firstRow = rows.First(r => Get(r, "BrandName").Equals(brandName, StringComparison.OrdinalIgnoreCase));
                var baseCode = GetOrGenerate(Get(firstRow, "BrandCode"), brandName);
                var code     = UniqueCode(baseCode, usedBrandCodes);
                usedBrandCodes.Add(code);
                var country  = Get(firstRow, "BrandCountry");
                var brand    = new Brand
                {
                    Name     = brandName,
                    Code     = code,
                    Country  = string.IsNullOrWhiteSpace(country) ? null : country,
                    IsActive = true,
                };
                _db.Brands.Add(brand);
                brands.Add(brand);
                anyNew = true;
                brandsCreated++;
                _log.LogInformation("Bulk import: created brand '{Brand}' code '{Code}'", brandName, code);
            }
            else
            {
                brandsSkipped++;
            }
        }
        if (anyNew) { await _db.SaveChangesAsync(ct); anyNew = false; }

        // Pass 2: models — brand.Models includes rows added in this batch,
        // so usedModelCodes naturally grows as each model is appended.
        foreach (var row in rows)
        {
            var brandName = Get(row, "BrandName");
            var modelName = Get(row, "ModelName");
            if (string.IsNullOrWhiteSpace(brandName) || string.IsNullOrWhiteSpace(modelName)) continue;

            var brand = brands.FirstOrDefault(b => b.Name.Equals(brandName, StringComparison.OrdinalIgnoreCase));
            if (brand == null) continue;

            var existing = brand.Models.FirstOrDefault(m => m.Name.Equals(modelName, StringComparison.OrdinalIgnoreCase));
            if (existing == null)
            {
                var usedModelCodes = brand.Models.Select(m => m.Code).ToHashSet(StringComparer.OrdinalIgnoreCase);
                var baseCode = GetOrGenerate(Get(row, "ModelCode"), modelName);
                var code     = UniqueCode(baseCode, usedModelCodes);
                var segment  = Get(row, "ModelSegment");
                var model    = new VehicleModel
                {
                    BrandId  = brand.Id,
                    Name     = modelName,
                    Code     = code,
                    Segment  = string.IsNullOrWhiteSpace(segment) ? null : segment,
                    IsActive = true,
                };
                _db.VehicleModels.Add(model);
                brand.Models.Add(model);
                anyNew = true;
                modelsCreated++;
            }
            else
            {
                modelsSkipped++;
            }
        }
        if (anyNew) await _db.SaveChangesAsync(ct);

        return new BulkImportCatalogueResultDto(brandsCreated, brandsSkipped, modelsCreated, modelsSkipped);
    }

    private static string GetOrGenerate(string code, string name)
    {
        if (!string.IsNullOrWhiteSpace(code)) return code.Trim().ToUpperInvariant();
        var letters = name.Where(char.IsLetter).Take(5).ToArray();
        return letters.Length > 0
            ? new string(letters).ToUpperInvariant()
            : name[..Math.Min(3, name.Length)].ToUpperInvariant();
    }

    // Returns baseCode unchanged if not in usedCodes, otherwise appends 2, 3, … until unique.
    private static string UniqueCode(string baseCode, HashSet<string> usedCodes)
    {
        if (!usedCodes.Contains(baseCode)) return baseCode;
        for (int i = 2; ; i++)
        {
            var candidate = baseCode + i;
            if (!usedCodes.Contains(candidate)) return candidate;
        }
    }

    private static string Get(Dictionary<string, string> d, string key) =>
        (d.TryGetValue(key, out var v) ? v : "").Trim();

    private static List<Dictionary<string, string>> ParseCsv(byte[] bytes)
    {
        using var ms     = new MemoryStream(bytes);
        using var reader = new StreamReader(ms, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        using var csv    = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true, MissingFieldFound = null, BadDataFound = null,
            TrimOptions = TrimOptions.Trim,
        });
        csv.Read(); csv.ReadHeader();
        var headers = csv.HeaderRecord ?? [];
        var rows    = new List<Dictionary<string, string>>();
        while (csv.Read())
        {
            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var h in headers) row[h] = csv.GetField(h) ?? "";
            rows.Add(row);
        }
        return rows;
    }

    private static List<Dictionary<string, string>> ParseExcel(byte[] bytes)
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        using var ms     = new MemoryStream(bytes);
        using var reader = ExcelReaderFactory.CreateReader(ms);
        var ds    = reader.AsDataSet(new ExcelDataSetConfiguration
        {
            ConfigureDataTable = _ => new ExcelDataTableConfiguration { UseHeaderRow = true }
        });
        var table = ds.Tables[0];
        var rows  = new List<Dictionary<string, string>>();
        foreach (System.Data.DataRow r in table.Rows)
        {
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (System.Data.DataColumn c in table.Columns)
                dict[c.ColumnName] = r[c]?.ToString()?.Trim() ?? "";
            rows.Add(dict);
        }
        return rows;
    }
}
