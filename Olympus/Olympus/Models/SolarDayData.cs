namespace Olympus.Models
{
    public class SolarDayData
    {
        public DateTime Date { get; set; }
        public double RadiationKwhM2 { get; set; }
        public double TemperatureC { get; set; }
        public double WindSpeedKmh { get; set; }
        public int SolarIndex { get; set; }
        public string SolarIndexLabel { get; set; } = "";
    }
}