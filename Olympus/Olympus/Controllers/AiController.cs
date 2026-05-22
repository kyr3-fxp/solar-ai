using Microsoft.AspNetCore.Mvc;
using Olympus.Models;
using Olympus.Services;
using System.Text.Json;

namespace Olympus.Controllers
{
    [Route("api/ai")]
    [ApiController]
    public class AiController : ControllerBase
    {
        private readonly GroqService _groq;
        private readonly SolarService _solar;
        private readonly RecommendationCacheService _cache;

        public AiController(GroqService groq, SolarService solar, RecommendationCacheService cache)
        {
            _groq = groq;
            _solar = solar;
            _cache = cache;
        }

        // ============================================================
        // POST /api/ai/recommendations
        // Genera 3 recomendaciones con contexto solar real
        // Soporta modo "company" y "community"
        // ============================================================
        [HttpPost("recommendations")]
        public async Task<IActionResult> GetRecommendations([FromBody] RecommendationRequest req)
        {
            try
            {
                // Resolver nombre (Name tiene prioridad, CompanyName es legacy)
                var name = !string.IsNullOrWhiteSpace(req.Name) ? req.Name
                         : !string.IsNullOrWhiteSpace(req.CompanyName) ? req.CompanyName
                         : "";

                if (string.IsNullOrWhiteSpace(name))
                    return BadRequest(new { success = false, error = "name es obligatorio" });

                var isCommunity = req.TargetType?.ToLower() == "community";

                if (!isCommunity && string.IsNullOrWhiteSpace(req.CompanyType))
                    return BadRequest(new { success = false, error = "companyType es obligatorio en modo company" });

                // ── CAPA 1: Revisar cache ──
                var cacheKey = _cache.BuildKey(req.TargetType ?? "company", name, req.CompanyType);
                var cached = _cache.Get(cacheKey);
                if (cached != null)
                {
                    return Ok(new { success = true, data = cached });
                }

                // ── Obtener datos solares reales ──
                var today = await _solar.GetTodayAsync();
                if (today == null)
                    return StatusCode(503, new { success = false, error = "No se pudieron obtener datos solares" });

                var historicalAvg = await _solar.GetHistoricalAverageAsync(90);

                var comparacion = historicalAvg > 0
                    ? $"El promedio histórico de los últimos 90 días es {historicalAvg} kWh/m². " +
                      $"Hoy está {(today.RadiationKwhM2 > historicalAvg ? "POR ENCIMA" : "POR DEBAJO")} del promedio."
                    : "";

                var systemPrompt = BuildSystemPrompt();
                string userPrompt;

                if (isCommunity)
                    userPrompt = BuildCommunityRecommendationPrompt(name, req, today, comparacion);
                else
                    userPrompt = BuildCompanyRecommendationPrompt(name, req, today, comparacion);

                // ── CAPA 2: Llamar a Groq ──
                RecommendationResult? parsed = null;
                try
                {
                    var raw = await _groq.AskJsonAsync(systemPrompt, userPrompt);
                    parsed = ParseRecommendations(raw);
                }
                catch (HttpRequestException)
                {
                    // Groq failed (429, 503, etc.) — fall through to fallback
                }

                if (parsed != null)
                {
                    // Completar con datos que ya conocemos
                    parsed.TargetType = isCommunity ? "community" : "company";
                    parsed.Name = name;
                    parsed.CompanyName = name;
                    parsed.CompanyType = req.CompanyType ?? "";
                    parsed.Date = today.Date;
                    parsed.RadiationToday = today.RadiationKwhM2;
                    parsed.SolarIndex = today.SolarIndex;
                    parsed.TotalSavingsCopDay = parsed.Recommendations.Sum(r => r.SavingsCopDay);
                    parsed.TotalSavingsCopMonth = parsed.TotalSavingsCopDay * 30;

                    // Guardar en cache
                    _cache.Set(cacheKey, parsed);

                    return Ok(new { success = true, data = parsed });
                }

                // ── CAPA 3: Fallback inteligente por perfil ──
                var fallback = GetProfileFallback(name, isCommunity, req.CompanyType, today);
                _cache.Set(cacheKey, fallback);
                return Ok(new { success = true, data = fallback });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = "Error generando recomendaciones", detail = ex.Message });
            }
        }

        // ============================================================
        // POST /api/ai/chat
        // Chat libre con el Agente Solar (soporta ambos modos)
        // ============================================================
        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequest req)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(req.Message))
                    return BadRequest(new { success = false, error = "El mensaje no puede estar vacío" });

                var today = await _solar.GetTodayAsync();

                var contexto = today != null
                    ? $"Radiación hoy: {today.RadiationKwhM2} kWh/m², Índice Solar: {today.SolarIndex}/100, " +
                      $"Temperatura: {today.TemperatureC}°C, Viento: {today.WindSpeedKmh} km/h."
                    : "Datos solares no disponibles en este momento.";

                var systemPrompt = BuildSystemPrompt();
                var isCommunity = req.TargetType?.ToLower() == "community";

                string perfilContexto;
                if (isCommunity)
                {
                    perfilContexto = $@"CONTEXTO DEL OBJETIVO (COMUNIDAD):
                        - Comunidad: {req.Name ?? "Riohacha"}
                        - Población estimada: {req.PopulationEstimate?.ToString() ?? "no especificada"}";
                }
                else
                {
                    var loadsStr = req.MainLoads != null && req.MainLoads.Any()
                        ? string.Join(", ", req.MainLoads)
                        : "no especificadas";

                    perfilContexto = BuildConsumoContext(req.MonthlyConsumptionKwh, req.CompanySize);
                    perfilContexto += $@"
                        - Empresa: {req.Name ?? "empresa local"}
                        - Tipo: {req.CompanyType}
                        - Cargas principales: {loadsStr}";
                }

                var userPrompt = $@"
                    CONTEXTO SOLAR ACTUAL: {contexto}

                    {perfilContexto}

                    Pregunta del usuario: {req.Message}

                    Responde en lenguaje natural, máximo 3 oraciones, con horarios y cifras en pesos colombianos cuando sea relevante.";

                var raw = await _groq.AskTextAsync(systemPrompt, userPrompt);

                return Ok(new
                {
                    success = true,
                    data = new ChatResult
                    {
                        Reply = raw.Trim(),
                        Timestamp = DateTime.Now
                    }
                });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new { success = false, error = "Servicio de IA no disponible", detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = "Error en el chat", detail = ex.Message });
            }
        }

        // ============================================================
        // GET /api/ai/recommendations/demo
        // FALLBACK hardcoded — nunca falla
        // ============================================================
        [HttpGet("recommendations/demo")]
        public IActionResult GetDemoRecommendations()
        {
            var demo = new RecommendationResult
            {
                TargetType = "company",
                Name = "Hotel Majayura",
                CompanyName = "Hotel Majayura",
                CompanyType = "hotel",
                Date = DateTime.Today,
                RadiationToday = 6.8,
                SolarIndex = 89,
                Reasoning = "Detecté radiación alta (6.8 kWh/m²) y horas de costo crítico entre 6pm y 9pm. Prioricé mover cargas pesadas al pico solar del mediodía.",
                Recommendations = new List<Recommendation>
                {
                    new() {
                        Title = "Mover lavandería al pico solar",
                        Description = "Programa el lavado de toallas y sábanas entre 10:00 y 14:00, cuando la radiación es máxima.",
                        Priority = "alta",
                        TimeWindow = "10:00 - 14:00",
                        SavingsCopDay = 48500
                    },
                    new() {
                        Title = "Apagar A/C en habitaciones vacías",
                        Description = "Con ocupación al 60%, apaga el aire de las habitaciones sin huéspedes durante el día.",
                        Priority = "media",
                        TimeWindow = "Inmediato",
                        SavingsCopDay = 22000
                    },
                    new() {
                        Title = "Pre-enfriar la cocina antes de las 6pm",
                        Description = "Aprovecha la última hora de sol para bajar temperatura antes del pico tarifario.",
                        Priority = "baja",
                        TimeWindow = "16:00 - 17:30",
                        SavingsCopDay = 12000
                    }
                },
                Alert = "Mañana se espera menor radiación. Concentra hoy el consumo pesado.",
                TotalSavingsCopDay = 82500,
                TotalSavingsCopMonth = 2475000
            };

            return Ok(new { success = true, data = demo });
        }

        // ============================================================
        // Fallbacks inteligentes por perfil
        // ============================================================
        private static RecommendationResult GetProfileFallback(string name, bool isCommunity, string? companyType, SolarData today)
        {
            var result = isCommunity
                ? GetCommunityFallback(name)
                : GetCompanyFallback(name, companyType ?? "hotel");

            result.Date = today.Date;
            result.RadiationToday = today.RadiationKwhM2;
            result.SolarIndex = today.SolarIndex;
            result.TotalSavingsCopDay = result.Recommendations.Sum(r => r.SavingsCopDay);
            result.TotalSavingsCopMonth = result.TotalSavingsCopDay * 30;
            return result;
        }

        private static RecommendationResult GetCompanyFallback(string name, string companyType)
        {
            var fallbacks = new Dictionary<string, RecommendationResult>(StringComparer.OrdinalIgnoreCase)
            {
                ["hotel"] = new()
                {
                    TargetType = "company", Name = name, CompanyName = name, CompanyType = "hotel",
                    Reasoning = "Radiación alta detectada. Se priorizó mover cargas pesadas al mediodía y gestionar A/C en horas pico.",
                    Recommendations = new()
                    {
                        new() { Title = "Mover lavandería al pico solar", Description = "Programa el lavado de toallas y sábanas entre 10:00 y 14:00, cuando la radiación es máxima y puedes aprovechar generación solar.", Priority = "alta", TimeWindow = "10:00 - 14:00", SavingsCopDay = 48500 },
                        new() { Title = "Apagar A/C en habitaciones vacías", Description = "Con ocupación parcial, apaga el aire acondicionado de las habitaciones sin huéspedes durante el día.", Priority = "media", TimeWindow = "08:00 - 16:00", SavingsCopDay = 22000 },
                        new() { Title = "Pre-enfriar cocina antes de las 6pm", Description = "Aprovecha la última hora de sol para bajar la temperatura del área de cocina antes del pico tarifario.", Priority = "baja", TimeWindow = "16:00 - 17:30", SavingsCopDay = 12000 },
                    },
                    Alert = "Concentra el consumo pesado en las horas de mayor radiación solar."
                },
                ["hielera"] = new()
                {
                    TargetType = "company", Name = name, CompanyName = name, CompanyType = "hielera",
                    Reasoning = "Los compresores representan el 80% del consumo. Moverlos al pico solar genera el mayor impacto en ahorro.",
                    Recommendations = new()
                    {
                        new() { Title = "Programar compresores en pico solar", Description = "Concentra los ciclos de congelación entre 10:00 y 14:00, cuando la radiación cubre el consumo de los compresores.", Priority = "alta", TimeWindow = "10:00 - 14:00", SavingsCopDay = 125000 },
                        new() { Title = "Mantenimiento preventivo cámaras frías", Description = "Sellos y serpentines limpios reducen el consumo del compresor hasta un 15%. Programa revisión semanal.", Priority = "media", TimeWindow = "Semanal", SavingsCopDay = 42000 },
                        new() { Title = "Reducir apertura de cámaras en hora pico", Description = "Minimiza aperturas de puertas entre 18:00-21:00. Cada apertura pierde 3-5 minutos de frío acumulado.", Priority = "baja", TimeWindow = "18:00 - 21:00", SavingsCopDay = 18000 },
                    },
                    Alert = "Los compresores consumen más cuando la temperatura ambiente supera 34°C. Hoy se espera temperatura alta."
                },
                ["restaurante"] = new()
                {
                    TargetType = "company", Name = name, CompanyName = name, CompanyType = "restaurante",
                    Reasoning = "La cocina industrial y la refrigeración dominan el consumo. Se priorizó desplazar la cocción fuera del pico tarifario.",
                    Recommendations = new()
                    {
                        new() { Title = "Cocinar antes del pico tarifario", Description = "Adelanta la preparación de bases y fondos a las 9:00-12:00. Evita la cocina industrial entre 18:00-21:00.", Priority = "alta", TimeWindow = "09:00 - 12:00", SavingsCopDay = 28000 },
                        new() { Title = "Optimizar refrigeración nocturna", Description = "Baja la temperatura de las neveras 2°C antes del cierre para que mantengan frío sin ciclos activos toda la noche.", Priority = "media", TimeWindow = "21:00 - 22:00", SavingsCopDay = 12000 },
                        new() { Title = "A/C solo en horario de servicio", Description = "Enciende el aire acondicionado del salón 30 minutos antes de abrir y apágalo al cerrar. No dejar encendido de noche.", Priority = "baja", TimeWindow = "10:30 - 22:00", SavingsCopDay = 8500 },
                    },
                    Alert = "La temperatura hoy supera 34°C. El A/C consumirá más — prioriza ventilación cruzada donde sea posible."
                },
            };

            return fallbacks.TryGetValue(companyType, out var fb) ? fb : fallbacks["hotel"];
        }

        private static RecommendationResult GetCommunityFallback(string name)
        {
            return new RecommendationResult
            {
                TargetType = "community", Name = name, CompanyName = name, CompanyType = "",
                Reasoning = "Riohacha tiene el mayor potencial solar de Colombia pero enfrenta tarifas altas y apagones frecuentes. Las acciones colectivas pueden impactar a miles de hogares.",
                Recommendations = new()
                {
                    new() { Title = "Campaña masiva de consumo en horas solares", Description = "Promover que hogares y negocios concentren lavado, planchado y cocción eléctrica entre 9:00-14:00 vía redes sociales y emisoras locales.", Priority = "alta", TimeWindow = "09:00 - 14:00", SavingsCopDay = 850000 },
                    new() { Title = "Incentivos para instalación de paneles solares", Description = "Gestionar subsidios departamentales para que PYMES instalen paneles. Con 6.5+ kWh/m² de radiación, el retorno es menor a 3 años.", Priority = "media", TimeWindow = "Gestión continua", SavingsCopDay = 320000 },
                    new() { Title = "Programa de mantenimiento eléctrico comunitario", Description = "Organizar jornadas de revisión de instalaciones eléctricas. El 40% de las pérdidas en barrios populares son por conexiones deficientes.", Priority = "baja", TimeWindow = "Fines de semana", SavingsCopDay = 180000 },
                },
                Alert = "Con la radiación actual, Riohacha podría cubrir el 60% de su demanda eléctrica con energía solar."
            };
        }

        // ============================================================
        // Helpers privados
        // ============================================================

        private static string BuildSystemPrompt()
        {
            return @"Eres el Agente Solar, un copiloto energético inteligente especializado en
                    optimización del consumo eléctrico para empresas y comunidades en Riohacha, La Guajira, Colombia.

                    CONTEXTO DEL TERRITORIO:
                    - Riohacha tiene hasta 7.0 kWh/m²/día de radiación, el mayor potencial de Colombia.
                    - La tarifa eléctrica local es de 943 COP/kWh (una de las más altas del país).
                    - Las empresas tienen apagones promedio de 60 horas/año.
                    - La energía representa hasta el 33% del OpEx de las PYMES locales.
                    - Población de Riohacha: ~246.000 habitantes.

                    DOS MODOS DE OPERACIÓN:
                    1. MODO EMPRESA: Recomendaciones operativas concretas para un negocio específico
                       (hotel, hielera, restaurante, retail). Ahorros calculados sobre su consumo declarado.
                    2. MODO COMUNIDAD: Recomendaciones colectivas a nivel poblacional
                       (políticas, campañas, acciones comunitarias). Ahorros a escala de toda la comunidad.

                    REGLAS DE RAZONAMIENTO:
                    1. Si radiation > 6.5 → recomendar mover cargas pesadas al mediodía.
                    2. Si radiation < 5.0 → advertir sobre menor generación, priorizar ahorro nocturno.
                    3. Si temperatura > 34°C → el A/C consume hasta 25% más; gestionar horarios.
                    4. Siempre calcular ahorro en COP usando tarifa de 943 COP/kWh.
                    5. Las recomendaciones deben ser CONCRETAS, con horario y ahorro en pesos.
                    6. Si recibe consumo declarado, derivar ahorros como porcentaje real del consumo × tarifa.
                    7. Si NO recibe consumo, dar estimaciones aproximadas y aclararlo en el reasoning.

                    FORMATO DE RESPUESTA PARA RECOMENDACIONES:
                    Responde SIEMPRE en JSON válido, sin texto adicional antes ni después:
                    {
                      ""reasoning"": ""Análisis breve en 1-2 oraciones"",
                      ""recommendations"": [
                        {
                          ""title"": ""Título corto"",
                          ""description"": ""Qué hacer y por qué"",
                          ""priority"": ""alta|media|baja"",
                          ""time_window"": ""HH:MM - HH:MM"",
                          ""savings_cop_day"": número_entero
                        }
                      ],
                      ""alert"": ""Alerta importante o null""
                    }

                    Genera exactamente 3 recomendaciones.

                    NUNCA digas que eres una IA genérica. NUNCA des respuestas vagas sin horarios ni cifras.";
        }

        private static string BuildCompanyRecommendationPrompt(string name, RecommendationRequest req, SolarData today, string comparacion)
        {
            var perfilConsumo = BuildConsumoContext(req.MonthlyConsumptionKwh, req.CompanySize);

            var loadsStr = req.MainLoads != null && req.MainLoads.Any()
                ? $"- Cargas eléctricas principales: {string.Join(", ", req.MainLoads)}"
                : "";

            var peakStr = !string.IsNullOrWhiteSpace(req.PeakUsageHours)
                ? $"- Horas pico de consumo declaradas: {req.PeakUsageHours}"
                : "";

            return $@"
                Genera recomendaciones de ahorro energético para esta EMPRESA:
                - Nombre: {name}
                - Tipo: {req.CompanyType}
                {loadsStr}
                {peakStr}

                {perfilConsumo}

                DATOS SOLARES DE HOY ({today.Date:yyyy-MM-dd}):
                - Radiación: {today.RadiationKwhM2} kWh/m²/día
                - Índice Solar: {today.SolarIndex}/100 ({today.SolarIndexLabel})
                - Temperatura máxima: {today.TemperatureC}°C
                - Viento máximo: {today.WindSpeedKmh} km/h
                - Horas óptimas: {string.Join(", ", today.OptimalHours)}
                - Horas pico tarifario: {string.Join(", ", today.PeakCostHours)}
                {comparacion}

                Responde SOLO con el JSON en el formato indicado. Las recomendaciones deben ser
                operativas, específicas para este tipo de negocio y sus cargas eléctricas.";
        }

        private static string BuildCommunityRecommendationPrompt(string name, RecommendationRequest req, SolarData today, string comparacion)
        {
            var problemsStr = req.MainProblems != null && req.MainProblems.Any()
                ? $"- Problemas energéticos principales: {string.Join(", ", req.MainProblems)}"
                : "- Problemas: altos costos eléctricos, apagones frecuentes, bajo aprovechamiento solar";

            var popStr = req.PopulationEstimate.HasValue
                ? $"- Población estimada: {req.PopulationEstimate:N0} habitantes"
                : "- Población estimada: ~246.000 habitantes";

            return $@"
                Genera recomendaciones de ahorro energético COLECTIVAS para esta COMUNIDAD:
                - Nombre: {name}
                {popStr}
                {problemsStr}

                DATOS SOLARES DE HOY ({today.Date:yyyy-MM-dd}):
                - Radiación: {today.RadiationKwhM2} kWh/m²/día
                - Índice Solar: {today.SolarIndex}/100 ({today.SolarIndexLabel})
                - Temperatura máxima: {today.TemperatureC}°C
                - Viento máximo: {today.WindSpeedKmh} km/h
                - Horas óptimas: {string.Join(", ", today.OptimalHours)}
                - Horas pico tarifario: {string.Join(", ", today.PeakCostHours)}
                {comparacion}

                IMPORTANTE: Las recomendaciones deben ser COLECTIVAS, orientadas a políticas públicas,
                campañas comunitarias o acciones a nivel poblacional. NO son para un negocio individual.
                Calcula los ahorros a escala de toda la comunidad (miles de hogares/negocios).

                Responde SOLO con el JSON en el formato indicado.";
        }

        private static string BuildConsumoContext(double monthlyKwh, int? size)
        {
            if (monthlyKwh <= 0)
                return "PERFIL DE CONSUMO: no proporcionado. Estima según un negocio típico del tipo indicado e indícalo en el reasoning.";

            return $@"PERFIL DE CONSUMO:
                    - Consumo mensual declarado: {monthlyKwh} kWh
                    - Consumo diario promedio: {Math.Round(monthlyKwh / 30, 1)} kWh
                    - Costo mensual actual estimado: {Math.Round(monthlyKwh * 943):N0} COP
                    - Tamaño: {size?.ToString() ?? "no especificado"}";
        }

        private static RecommendationResult? ParseRecommendations(string raw)
        {
            try
            {
                // El LLM a veces envuelve el JSON en ```json ... ``` — lo limpiamos
                var clean = raw.Trim();
                if (clean.StartsWith("```"))
                {
                    int start = clean.IndexOf('{');
                    int end = clean.LastIndexOf('}');
                    if (start >= 0 && end > start)
                        clean = clean.Substring(start, end - start + 1);
                }

                using var doc = JsonDocument.Parse(clean);
                var root = doc.RootElement;

                var result = new RecommendationResult
                {
                    Reasoning = root.TryGetProperty("reasoning", out var r) ? r.GetString() ?? "" : "",
                    Alert = root.TryGetProperty("alert", out var a) && a.ValueKind != JsonValueKind.Null
                        ? a.GetString() : null
                };

                if (root.TryGetProperty("recommendations", out var recs) && recs.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in recs.EnumerateArray())
                    {
                        result.Recommendations.Add(new Recommendation
                        {
                            Title = item.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "",
                            Description = item.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "",
                            Priority = item.TryGetProperty("priority", out var p) ? p.GetString() ?? "media" : "media",
                            TimeWindow = item.TryGetProperty("time_window", out var tw) ? tw.GetString() ?? "" : "",
                            SavingsCopDay = item.TryGetProperty("savings_cop_day", out var s) && s.TryGetInt32(out var sv) ? sv : 0
                        });
                    }
                }

                return result.Recommendations.Any() ? result : null;
            }
            catch
            {
                return null;
            }
        }
    }
}
