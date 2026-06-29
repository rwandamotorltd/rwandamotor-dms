using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RwandaMotor.Application.Common.Interfaces;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Domain.Entities;

namespace RwandaMotor.API.Controllers;

/// <summary>
/// Public endpoints consumed by the PWA manifest and service worker.
/// No authentication required — these serve the install/launch flow.
/// </summary>
[AllowAnonymous]
[ApiController]
[Route("api/pwa")]
public class PwaController : ControllerBase
{
    private readonly IApplicationDbContext _db;
    public PwaController(IApplicationDbContext db) => _db = db;

    /// <summary>Returns the configured screen orientation for the PWA manifest.</summary>
    [HttpGet("orientation")]
    public async Task<IActionResult> GetOrientation(CancellationToken ct)
    {
        var settings = await _db.CompanySettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == CompanySettings.SingletonId, ct);
        return Ok(ApiResponse<string>.Ok(settings?.PwaOrientation ?? "portrait"));
    }
}
