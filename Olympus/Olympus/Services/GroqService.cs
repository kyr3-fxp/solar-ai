using System.Text;
using System.Text.Json;

namespace Olympus.Services
{
    public class GroqService
    {
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;

        public GroqService(IConfiguration config, HttpClient httpClient)
        {
            _config = config;
            _httpClient = httpClient;
        }

        private string Key => _config["Groq:KEY"] ?? "";
        private string Model => _config["Groq:MODEL"] ?? "";
        private string Url => _config["Groq:URL"] ?? "";

        // Pide respuesta en JSON estricto — para recomendaciones
        public async Task<string> AskJsonAsync(string systemPrompt, string userPrompt)
        {
            return await SendAsync(systemPrompt, userPrompt, jsonMode: true);
        }

        // Pide respuesta en texto libre — para el chat
        public async Task<string> AskTextAsync(string systemPrompt, string userPrompt)
        {
            return await SendAsync(systemPrompt, userPrompt, jsonMode: false);
        }

        private async Task<string> SendAsync(string systemPrompt, string userPrompt, bool jsonMode)
        {
            if (string.IsNullOrEmpty(Key) || string.IsNullOrEmpty(Model) || string.IsNullOrEmpty(Url))
                throw new InvalidOperationException("Configuración de Groq incompleta (KEY, MODEL o URL).");

            object body = jsonMode
                ? new
                {
                    model = Model,
                    messages = new[]
                    {
                        new { role = "system", content = systemPrompt },
                        new { role = "user", content = userPrompt }
                    },
                    temperature = 0.6,
                    response_format = new { type = "json_object" }
                }
                : new
                {
                    model = Model,
                    messages = new[]
                    {
                        new { role = "system", content = systemPrompt },
                        new { role = "user", content = userPrompt }
                    },
                    temperature = 0.7
                };

            var json = JsonSerializer.Serialize(body);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            using var request = new HttpRequestMessage(HttpMethod.Post, Url);
            request.Headers.Add("Authorization", $"Bearer {Key}");
            request.Content = content;

            var response = await _httpClient.SendAsync(request);
            var result = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new HttpRequestException($"Groq devolvió {(int)response.StatusCode}: {result}");

            using var doc = JsonDocument.Parse(result);
            var text = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return text ?? "";
        }
    }
}