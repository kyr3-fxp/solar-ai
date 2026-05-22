namespace Olympus.Services
{
    public class SolarIndexService
    {
        public int Calculate(double radiation, double windKmh, double temp)
        {
            return (int)Math.Clamp(
                (radiation / 7.0) * 70 +
                (windKmh > 20 ? 15 : 10) +
                (temp > 34 ? 8 : 15),
                0, 100
            );
        }

        public string GetLabel(int index) => index switch
        {
            >= 85 => "Día Óptimo",
            >= 65 => "Día Favorable",
            >= 45 => "Día Moderado",
            >= 25 => "Día Bajo",
            _ => "Día Crítico"
        };

        public string GetColor(int index) => index switch
        {
            >= 85 => "green",
            >= 65 => "lime",
            >= 45 => "yellow",
            >= 25 => "orange",
            _ => "red"
        };

        public string GetSummary(int index, double radiation) => index switch
        {
            >= 85 => $"Excelente día con {radiation} kWh/m². Aprovecha el mediodía.",
            >= 65 => $"Buen día con {radiation} kWh/m². Mueve cargas al pico solar.",
            >= 45 => $"Día moderado con {radiation} kWh/m². Vigila las horas pico.",
            >= 25 => $"Día bajo con {radiation} kWh/m². Reduce consumo no esencial.",
            _ => $"Día crítico con {radiation} kWh/m². Ahorro máximo recomendado."
        };
    }
}