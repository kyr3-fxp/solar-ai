using System.Text.Json.Serialization;

namespace Olympus.Models
{
    public class OpenMeteoResponse
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Timezone { get; set; } = "";
        public DailyData? Daily { get; set; }
    }

    public class DailyData
    {
        [JsonPropertyName("time")]
        public List<string> Time { get; set; } = new();

        [JsonPropertyName("shortwave_radiation_sum")]
        public List<double> ShortwaveRadiationSum { get; set; } = new();

        [JsonPropertyName("temperature_2m_max")]
        public List<double> Temperature2mMax { get; set; } = new();

        [JsonPropertyName("temperature_2m_min")]
        public List<double> Temperature2mMin { get; set; } = new();

        [JsonPropertyName("windspeed_10m_max")]
        public List<double> Windspeed10mMax { get; set; } = new();

        [JsonPropertyName("uv_index_max")]
        public List<double> UvIndexMax { get; set; } = new();

        [JsonPropertyName("sunrise")]
        public List<string> Sunrise { get; set; } = new();

        [JsonPropertyName("sunset")]
        public List<string> Sunset { get; set; } = new();
    }
}