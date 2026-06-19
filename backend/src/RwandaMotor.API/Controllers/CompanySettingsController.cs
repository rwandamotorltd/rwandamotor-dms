using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Admin.Queries;

namespace RwandaMotor.API.Controllers;

/// <summary>
/// GET /api/company-settings — accessible to any authenticated user (needed for print view).
/// PUT stays in AdminController behind Admin policy.
/// </summary>
[Authorize]
[ApiController]
[Route("api/company-settings")]
public class CompanySettingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public CompanySettingsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetCompanySettings()
    {
        var result = await _mediator.Send(new GetCompanySettingsQuery());
        return Ok(ApiResponse<CompanySettingsDto>.Ok(result));
    }
}
