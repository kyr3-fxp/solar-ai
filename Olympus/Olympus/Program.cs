using Olympus.Services;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// Servicios de la app
builder.Services.AddSingleton<SolarIndexService>();
builder.Services.AddSingleton<RecommendationCacheService>();
builder.Services.AddScoped<SolarService>();
builder.Services.AddScoped<GroqService>();

// HttpClient (necesario para SolarService y GroqService)
builder.Services.AddHttpClient();

// CORS para frontend y móvil
builder.Services.AddCors(options =>
{

    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin();
        policy.AllowAnyMethod();
        policy.AllowAnyHeader();
    });

});

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors("AllowAll");

// HttpsRedirection deshabilitado: rompe llamadas cross-origin desde el frontend HTTP.
// Si necesitas HTTPS, configura un certificado y usa el perfil "https" de launchSettings.
// app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
