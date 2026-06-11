using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.ServicePolicies.Queries;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ServicePoliciesController : ControllerBase
{
    private readonly IMediator _mediator;

    public ServicePoliciesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetPolicies([FromQuery] Guid? brandId)
    {
        var result = await _mediator.Send(new GetServicePoliciesQuery(brandId));
        return Ok(ApiResponse<List<ServicePolicyDto>>.Ok(result));
    }
}
