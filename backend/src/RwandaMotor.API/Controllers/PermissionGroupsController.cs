using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.PermissionGroups;

namespace RwandaMotor.API.Controllers;

[Authorize(Policy = "Admin")]
[ApiController]
[Route("api/admin/permission-groups")]
public class PermissionGroupsController : ControllerBase
{
    private readonly IMediator _mediator;
    public PermissionGroupsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var result = await _mediator.Send(new GetPermissionGroupsQuery());
        return Ok(ApiResponse<List<PermissionGroupDto>>.Ok(result));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePermissionGroupCommand cmd)
    {
        var id = await _mediator.Send(cmd);
        return Ok(ApiResponse<Guid>.Ok(id, "Permission group created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePermissionGroupRequest req)
    {
        var ok = await _mediator.Send(new UpdatePermissionGroupCommand(id, req.Name, req.Description, req.Permissions));
        if (!ok) return NotFound(ApiResponse<object>.Fail("Not found"));
        return Ok(ApiResponse<bool>.Ok(true, "Updated"));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ok = await _mediator.Send(new DeletePermissionGroupCommand(id));
        if (!ok) return NotFound(ApiResponse<object>.Fail("Not found"));
        return Ok(ApiResponse<bool>.Ok(true, "Deleted"));
    }
}

public record UpdatePermissionGroupRequest(string Name, string? Description, List<string> Permissions);
