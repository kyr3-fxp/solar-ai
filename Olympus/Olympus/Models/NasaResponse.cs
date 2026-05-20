namespace Olympus.Models
{
    public class NasaResponse
    {
        public NasaProperties Properties { get; set; }
    }

    public class NasaProperties
    {
        public NasaParameter Parameter { get; set; }
    }

    public class NasaParameter
    {
        public Dictionary<string, double> ALLSKY_SFC_SW_DWN { get; set; }

        public Dictionary<string, double> T2M { get; set; }

        public Dictionary<string, double> WS10M { get; set; }

        public Dictionary<string, double> ALLSKY_KT { get; set; }
    }


}