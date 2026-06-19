using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RwandaMotor.Application.Common.Models;
using RwandaMotor.Application.Features.Sales.Queries;

namespace RwandaMotor.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SalesController : ControllerBase
{
    private readonly IMediator _mediator;

    public SalesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetSales(
        [FromQuery] string? search,
        [FromQuery] string? saleType,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25)
    {
        var result = await _mediator.Send(new GetSalesHistoriesQuery(search, saleType, dateFrom, dateTo, pageNumber, pageSize));
        return Ok(ApiResponse<PaginatedResult<SalesHistoryListDto>>.Ok(result));
    }
}
