namespace Olympus.Models
{
    public class SolarForecast
    {
        public string Location { get; set; } = "Riohacha, La Guajira";
        public string Source { get; set; } = "Open-Meteo Forecast (ECMWF, NOAA, DWD)";
        public int Days { get; set; }
        public List<SolarDayData> Data { get; set; } = new();
        public double AverageRadiation { get; set; }
        public double MaxRadiation { get; set; }
        public double MinRadiation { get; set; }
    }
}