namespace Olympus.Models
{
    // ---------- Requests ----------

    public class RecommendationRequest
    {
        // Campos comunes
        public string TargetType { get; set; } = "company";       // "company" | "community"
        public string Name { get; set; } = "";                     // Nombre del negocio o comunidad (obligatorio)

        // Campos modo company
        public string CompanyType { get; set; } = "hotel";         // hotel, hielera, retail, restaurante
        public double MonthlyConsumptionKwh { get; set; }          // consumo mensual declarado
        public int? CompanySize { get; set; }                      // habitaciones / m² / empleados
        public string? PeakUsageHours { get; set; }                // ej "18:00-22:00"
        public List<string>? MainLoads { get; set; }               // cargas eléctricas principales

        // Campos modo community
        public int? PopulationEstimate { get; set; }               // población estimada
        public List<string>? MainProblems { get; set; }            // problemas energéticos principales

        // Alias legacy (para retrocompatibilidad)
        public string? CompanyName { get; set; }
    }

    public class ChatRequest
    {
        public string Message { get; set; } = "";

        // Campos comunes
        public string TargetType { get; set; } = "company";
        public string? Name { get; set; }

        // Campos modo company
        public string CompanyType { get; set; } = "hotel";
        public double MonthlyConsumptionKwh { get; set; }
        public int? CompanySize { get; set; }
        public List<string>? MainLoads { get; set; }

        // Campos modo community
        public int? PopulationEstimate { get; set; }
    }

    // ---------- Responses ----------

    public class RecommendationResult
    {
        public string TargetType { get; set; } = "company";
        public string Name { get; set; } = "";
        public string CompanyName { get; set; } = "";              // legacy
        public string CompanyType { get; set; } = "";
        public DateTime Date { get; set; }
        public double RadiationToday { get; set; }
        public int SolarIndex { get; set; }
        public string Reasoning { get; set; } = "";
        public List<Recommendation> Recommendations { get; set; } = new();
        public int TotalSavingsCopDay { get; set; }
        public int TotalSavingsCopMonth { get; set; }
        public string? Alert { get; set; }
    }

    public class Recommendation
    {
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public string Priority { get; set; } = "media";
        public string TimeWindow { get; set; } = "";
        public int SavingsCopDay { get; set; }
    }

    public class ChatResult
    {
        public string Reply { get; set; } = "";
        public DateTime Timestamp { get; set; }
    }
}
