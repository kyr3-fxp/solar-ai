using Microsoft.AspNetCore.Mvc;
using Olympus.Models;
using Olympus.Services;
using System.Globalization;

namespace Olympus.Controllers
{
    [Route("api/solar")]
    [ApiController]
    public class SolarController : ControllerBase
    {
        private readonly SolarService _solar;
        private readonly SolarIndexService _solarIndex;

        public SolarController(SolarService solar, SolarIndexService solarIndex)
        {
            _solar = solar;
            _solarIndex = solarIndex;
        }

        // GET /api/solar/today
        [HttpGet("today")]
        public async Task<IActionResult> GetToday()
        {
            try
            {
                var today = await _solar.GetTodayAsync();
                if (today == null)
                    return StatusCode(503, new { success = false, error = "Sin datos solares disponibles" });

                return Ok(new { success = true, data = today });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new { success = false, error = "Servicio meteorológico no disponible", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = "Error procesando datos solares", detail = ex.Message });
            }
        }

        // GET /api/solar/forecast?days=15
        [HttpGet("forecast")]
        public async Task<IActionResult> GetForecast([FromQuery] int days = 15)
        {
            try
            {
                if (days < 1 || days > 16)
                    return BadRequest(new { success = false, error = "days debe estar entre 1 y 16" });

                var list = await _solar.GetForecastAsync(days);
                if (!list.Any())
                    return StatusCode(503, new { success = false, error = "Sin datos de pronóstico" });

                var radiations = list.Select(d => d.RadiationKwhM2).ToList();

                var forecast = new SolarForecast
                {
                    Days = days,
                    Data = list,
                    AverageRadiation = Math.Round(radiations.Average(), 2),
                    MaxRadiation = Math.Round(radiations.Max(), 2),
                    MinRadiation = Math.Round(radiations.Min(), 2)
                };

                return Ok(new { success = true, data = forecast });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new { success = false, error = "Servicio meteorológico no disponible", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = "Error procesando pronóstico", detail = ex.Message });
            }
        }

        // GET /api/solar/history?from=2024-01-01&to=2024-12-31
        [HttpGet("history")]
        public async Task<IActionResult> GetHistory(
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            try
            {
                var endDate = to ?? DateTime.Today.AddDays(-7);
                var startDate = from ?? endDate.AddDays(-365);

                if (startDate >= endDate)
                    return BadRequest(new { success = false, error = "from debe ser anterior a to" });

                if ((endDate - startDate).TotalDays > 1825)
                    return BadRequest(new { success = false, error = "Rango máximo: 5 años" });

                if (endDate > DateTime.Today.AddDays(-5))
                    endDate = DateTime.Today.AddDays(-7);

                var list = await _solar.GetHistoryAsync(startDate, endDate);
                if (!list.Any())
                    return BadRequest(new { success = false, error = "Sin datos válidos en el rango" });

                var radiations = list.Select(d => d.RadiationKwhM2).ToList();

                var monthly = list
                    .GroupBy(d => new { d.Date.Year, d.Date.Month })
                    .Select(g => new MonthlyAggregate
                    {
                        Year = g.Key.Year,
                        Month = g.Key.Month,
                        MonthName = new DateTime(g.Key.Year, g.Key.Month, 1)
                            .ToString("MMMM", new CultureInfo("es-CO")),
                        AverageRadiation = Math.Round(g.Average(d => d.RadiationKwhM2), 2),
                        MaxRadiation = Math.Round(g.Max(d => d.RadiationKwhM2), 2),
                        MinRadiation = Math.Round(g.Min(d => d.RadiationKwhM2), 2),
                        Days = g.Count()
                    })
                    .OrderBy(m => m.Year).ThenBy(m => m.Month)
                    .ToList();

                var history = new SolarHistory
                {
                    From = startDate.ToString("yyyy-MM-dd"),
                    To = endDate.ToString("yyyy-MM-dd"),
                    TotalDays = list.Count,
                    AverageRadiation = Math.Round(radiations.Average(), 2),
                    MaxRadiation = Math.Round(radiations.Max(), 2),
                    MinRadiation = Math.Round(radiations.Min(), 2),
                    Daily = list,
                    Monthly = monthly
                };

                return Ok(new { success = true, data = history });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new { success = false, error = "NASA POWER no disponible", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = "Error procesando histórico", detail = ex.Message });
            }
        }

        // GET /api/solar/score
        [HttpGet("score")]
        public async Task<IActionResult> GetScore()
        {
            try
            {
                var today = await _solar.GetTodayAsync();
                if (today == null)
                    return StatusCode(503, new { success = false, error = "Sin datos disponibles" });

                var score = new SolarScore
                {
                    Score = today.SolarIndex,
                    Label = today.SolarIndexLabel,
                    Color = today.SolarIndexColor,
                    Summary = _solarIndex.GetSummary(today.SolarIndex, today.RadiationKwhM2),
                    RadiationKwhM2 = today.RadiationKwhM2
                };

                return Ok(new { success = true, data = score });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new { success = false, error = "Servicio meteorológico no disponible", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = "Error obteniendo score", detail = ex.Message });
            }
        }
    }
}