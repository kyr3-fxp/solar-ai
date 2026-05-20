namespace Olympus.Models
{
    public class SolarData
    {
        public DateTime Date { get; set; }
        public string Location { get; set; } = "Riohacha, La Guajira";
        public double RadiationKwhM2 { get; set; }
        public double TemperatureC { get; set; }
        public double WindSpeedKmh { get; set; }
        public double UvIndex { get; set; }
        public int SolarIndex { get; set; }
        public string SolarIndexLabel { get; set; } = "";
        public string SolarIndexColor { get; set; } = "";
        public string Sunrise { get; set; } = "";
        public string Sunset { get; set; } = "";
        public List<string> OptimalHours { get; set; } = new();
        public List<string> PeakCostHours { get; set; } = new();
        public bool Cached { get; set; }
    }
}