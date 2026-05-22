namespace Olympus.Models
{
    public class SolarHistory
    {
        public string Location { get; set; } = "Riohacha, La Guajira";
        public string Source { get; set; } = "NASA POWER (satellite observations)";
        public string From { get; set; } = "";
        public string To { get; set; } = "";
        public int TotalDays { get; set; }
        public double AverageRadiation { get; set; }
        public double MaxRadiation { get; set; }
        public double MinRadiation { get; set; }
        public List<SolarDayData> Daily { get; set; } = new();
        public List<MonthlyAggregate> Monthly { get; set; } = new();
    }

    public class MonthlyAggregate
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public string MonthName { get; set; } = "";
        public double AverageRadiation { get; set; }
        public double MaxRadiation { get; set; }
        public double MinRadiation { get; set; }
        public int Days { get; set; }
    }
}