namespace Olympus.Models
{
    public class SolarScore
    {
        public int Score { get; set; }
        public string Label { get; set; } = "";
        public string Color { get; set; } = "";
        public string Summary { get; set; } = "";
        public double RadiationKwhM2 { get; set; }
    }
}