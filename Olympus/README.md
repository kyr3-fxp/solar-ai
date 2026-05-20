# ☀️ API Agente Solar — Documentación para Frontend y Móvil

> Documento de referencia para los desarrolladores de Frontend (Jose Fuentes) y Móvil (Angel).
> Backend: ASP.NET Core 8 · Proyecto `Olympus` · Responsable: Juan Pa.

---

## Índice

1. [Información general](#1-información-general)
2. [Convención de respuestas](#2-convención-de-respuestas)
3. [Controlador Solar](#3-controlador-solar)
4. [Controlador IA](#4-controlador-ia)
5. [Modelos de datos completos](#5-modelos-de-datos-completos)
6. [Prompts del Agente IA](#6-prompts-del-agente-ia)
7. [Fuentes de datos externas](#7-fuentes-de-datos-externas)
8. [Notas de integración](#8-notas-de-integración)

---

## 1. Información general

### URL base

Durante el desarrollo, la API corre localmente. La URL base depende de cómo se conecten:

| Escenario | URL base |
|---|---|
| Mismo equipo que el backend | `http://localhost:5000/api` |
| Otro equipo en la misma red WiFi | `http://<IP-LOCAL-DE-JUANPA>:5000/api` |
| Red restringida / móvil con datos | URL de ngrok (la comparte Juan Pa) |

> **Importante:** Centralicen la URL base en una sola constante.
> Frontend: `const API_BASE = "..."` en un `config.js`.
> Móvil: `const val API_BASE = "..."` en un archivo de configuración.
> Cuando cambie la red, solo se toca un archivo.

### Formato

- Todas las peticiones y respuestas usan **JSON**.
- Las peticiones `POST` requieren el header `Content-Type: application/json`.
- La API tiene **CORS abierto** — frontend y móvil pueden consumirla sin restricción de origen.

### Documentación interactiva (Scalar)

La API usa **Scalar** como interfaz de documentación interactiva (no Swagger).
Desde .NET 9 las plantillas de ASP.NET Core dejaron de incluir Swagger; .NET 10
genera la especificación OpenAPI de forma nativa y Scalar la visualiza.

| Recurso | URL | Para qué sirve |
|---|---|---|
| UI de Scalar | `<API_BASE sin /api>/scalar` | Probar endpoints de forma visual, ver requests y responses |
| Especificación OpenAPI | `<API_BASE sin /api>/openapi/v1.json` | Importar la API a Postman, Thunder Client o generar clientes |

Ejemplo en local: la UI queda en `http://localhost:5000/scalar` y la
especificación en `http://localhost:5000/openapi/v1.json`.

> La UI solo está disponible en entorno de desarrollo.
> Para importar la API a Postman: copiar la URL de `/openapi/v1.json` y usar
> "Import" en Postman.

### Resumen de endpoints

| Método | Ruta | Propósito | Fuente de datos |
|---|---|---|---|
| GET | `/api/solar/today` | Pronóstico solar de hoy | Open-Meteo |
| GET | `/api/solar/forecast?days=15` | Pronóstico próximos 1-16 días | Open-Meteo |
| GET | `/api/solar/history?from=&to=` | Histórico real de radiación | NASA POWER |
| GET | `/api/solar/score` | Score solar ligero (para móvil) | Open-Meteo |
| POST | `/api/ai/recommendations` | Recomendaciones IA del día | Groq + Solar |
| POST | `/api/ai/chat` | Chat libre con el agente | Groq + Solar |
| GET | `/api/ai/recommendations/demo` | Recomendaciones hardcoded (fallback) | Ninguna |

---

## 2. Convención de respuestas

**Toda respuesta de la API sigue la misma estructura.** Esto permite manejar éxito y error de forma uniforme.

### Respuesta exitosa

```json
{
  "success": true,
  "data": { ... }
}
```

El contenido real está siempre dentro de `data`.

### Respuesta de error

```json
{
  "success": false,
  "error": "Mensaje legible del error",
  "detail": "Detalle técnico (opcional)"
}
```

### Códigos HTTP que devuelve la API

| Código | Significado | Qué hacer en el cliente |
|---|---|---|
| 200 | Todo bien | Leer `data` |
| 400 | Petición mal formada (parámetro inválido) | Revisar lo que se envió |
| 502 | La IA devolvió un formato inesperado | Reintentar o usar fallback |
| 503 | Servicio externo (NASA / Open-Meteo / Groq) caído | Mostrar mensaje amable, reintentar |
| 500 | Error interno del backend | Mostrar mensaje genérico |

### Patrón recomendado para consumir

**Frontend (JavaScript):**

```javascript
async function llamarAPI(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const json = await res.json();

    if (!json.success) {
      console.error("Error API:", json.error);
      return null;
    }
    return json.data;
  } catch (err) {
    console.error("Error de red:", err);
    return null;
  }
}
```

**Móvil (Kotlin con Retrofit):** Cada endpoint mapea a un modelo que envuelve `success` + `data`. Revisar siempre `success` antes de usar `data`.

---

## 3. Controlador Solar

**Ruta base:** `/api/solar`
**Qué hace:** Expone los datos de radiación solar de Riohacha. Combina dos fuentes: Open-Meteo (pronóstico futuro) y NASA POWER (histórico observado real). El frontend y el móvil **nunca llaman a NASA u Open-Meteo directamente** — siempre pasan por esta API.

---

### 3.1 `GET /api/solar/today`

Devuelve el pronóstico solar completo para **el día de hoy** en Riohacha.

**Uso típico:** KPIs principales del dashboard, hero banner, pantalla principal del móvil.

**Parámetros:** ninguno.

**Ejemplo de petición:**

```
GET http://localhost:5000/api/solar/today
```

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "data": {
    "date": "2026-05-19T00:00:00",
    "location": "Riohacha, La Guajira",
    "radiationKwhM2": 6.8,
    "temperatureC": 33.2,
    "windSpeedKmh": 23.4,
    "uvIndex": 11.2,
    "solarIndex": 89,
    "solarIndexLabel": "Día Óptimo",
    "solarIndexColor": "green",
    "sunrise": "05:42",
    "sunset": "18:09",
    "optimalHours": ["10:00-14:00"],
    "peakCostHours": ["18:00-21:00"],
    "cached": false
  }
}
```

---

### 3.2 `GET /api/solar/forecast`

Devuelve el pronóstico solar de **los próximos N días** (incluyendo hoy).

**Uso típico:** Gráfica de planificación semanal, vista de "próximos días" en el dashboard.

**Parámetros (query string):**

| Parámetro | Tipo | Obligatorio | Default | Rango válido |
|---|---|---|---|---|
| `days` | int | No | 15 | 1 a 16 |

**Ejemplo de petición:**

```
GET http://localhost:5000/api/solar/forecast?days=7
```

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "data": {
    "location": "Riohacha, La Guajira",
    "source": "Open-Meteo Forecast (ECMWF, NOAA, DWD)",
    "days": 7,
    "data": [
      {
        "date": "2026-05-19T00:00:00",
        "radiationKwhM2": 6.8,
        "temperatureC": 33.2,
        "windSpeedKmh": 23.4,
        "solarIndex": 89,
        "solarIndexLabel": "Día Óptimo"
      },
      {
        "date": "2026-05-20T00:00:00",
        "radiationKwhM2": 6.4,
        "temperatureC": 32.8,
        "windSpeedKmh": 21.0,
        "solarIndex": 84,
        "solarIndexLabel": "Día Favorable"
      }
    ],
    "averageRadiation": 6.6,
    "maxRadiation": 6.9,
    "minRadiation": 6.1
  }
}
```

**Error si `days` está fuera de rango:**

```json
{ "success": false, "error": "days debe estar entre 1 y 16" }
```

---

### 3.3 `GET /api/solar/history`

Devuelve datos **históricos reales observados** de radiación en Riohacha. Estos datos vienen de mediciones satelitales de NASA POWER, no de pronósticos.

**Uso típico:** Panel "Historial de Riohacha" en el dashboard, análisis de tendencias, comparativas mes a mes.

**Parámetros (query string):**

| Parámetro | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| `from` | fecha (`yyyy-MM-dd`) | No | hace 1 año | Inicio del rango |
| `to` | fecha (`yyyy-MM-dd`) | No | hace 7 días | Fin del rango |

**Reglas importantes:**
- NASA POWER tiene ~5-7 días de retraso. No pidan datos más recientes que hace una semana.
- El rango máximo es de **5 años**.
- `from` debe ser anterior a `to`.

**Ejemplo de petición:**

```
GET http://localhost:5000/api/solar/history?from=2025-01-01&to=2025-12-31
```

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "data": {
    "location": "Riohacha, La Guajira",
    "source": "NASA POWER (satellite observations)",
    "from": "2025-01-01",
    "to": "2025-12-31",
    "totalDays": 365,
    "averageRadiation": 6.21,
    "maxRadiation": 7.34,
    "minRadiation": 4.12,
    "daily": [
      {
        "date": "2025-01-01T00:00:00",
        "radiationKwhM2": 6.15,
        "temperatureC": 27.8,
        "windSpeedKmh": 25.1,
        "solarIndex": 82,
        "solarIndexLabel": "Día Favorable"
      }
    ],
    "monthly": [
      {
        "year": 2025,
        "month": 1,
        "monthName": "enero",
        "averageRadiation": 6.05,
        "maxRadiation": 6.88,
        "minRadiation": 5.20,
        "days": 31
      }
    ]
  }
}
```

**Notas para el cliente:**
- `daily` → usar para gráficas de línea en rangos cortos (1-3 meses).
- `monthly` → usar para gráficas de barras en rangos largos (6 meses a 5 años).
- Una sola petición trae ambas vistas; el cliente decide cuál mostrar.

---

### 3.4 `GET /api/solar/score`

Versión **ligera** del estado solar de hoy. Devuelve solo lo esencial para pintar una pantalla compacta. Pensado específicamente para la app móvil.

**Uso típico:** Pantalla principal del móvil, widget de resumen.

**Parámetros:** ninguno.

**Ejemplo de petición:**

```
GET http://localhost:5000/api/solar/score
```

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "data": {
    "score": 89,
    "label": "Día Óptimo",
    "color": "green",
    "summary": "Excelente día con 6.8 kWh/m². Aprovecha el mediodía.",
    "radiationKwhM2": 6.8
  }
}
```

**Valores posibles de `color`:** `green`, `lime`, `yellow`, `orange`, `red`.

---

## 4. Controlador IA

**Ruta base:** `/api/ai`
**Qué hace:** Es el cerebro del producto. Recibe el perfil de la empresa, obtiene los datos solares actuales internamente, los combina, y consulta al modelo de lenguaje **Llama 3.3 70B** (vía Groq) para generar recomendaciones de ahorro y responder preguntas.

> **Nota:** El cliente NO necesita pasar los datos solares. El `AiController` los obtiene solo, internamente, llamando al servicio Solar.

---

### 4.1 `POST /api/ai/recommendations`

Genera **3 recomendaciones de ahorro energético** personalizadas para una empresa, basadas en los datos solares del día y el perfil de consumo de la empresa.

**Headers:**
```
Content-Type: application/json
```

**Cuerpo de la petición (Request):**

```json
{
  "companyType": "hotel",
  "companyName": "Hotel Majayura",
  "monthlyConsumptionKwh": 12000,
  "companySize": 18,
  "peakUsageHours": "18:00-22:00"
}
```

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `companyType` | string | **Sí** | Tipo de empresa: `hotel`, `hielera`, `retail`, `restaurante` |
| `companyName` | string | No | Nombre de la empresa (para personalizar) |
| `monthlyConsumptionKwh` | número | No | Consumo mensual declarado en kWh |
| `companySize` | int | No | Tamaño: nº habitaciones, m², o empleados |
| `peakUsageHours` | string | No | Franja horaria de mayor consumo |

> **Sobre el perfil de consumo:** Si se envía `monthlyConsumptionKwh`, el agente calcula ahorros como porcentaje real de ese consumo. Si NO se envía (o es 0), el agente usa estimaciones aproximadas según el tipo de empresa y lo indica en el campo `reasoning`. Los campos de consumo son opcionales — la API no se rompe si faltan.

**Ejemplo de respuesta (Result):**

```json
{
  "success": true,
  "data": {
    "companyName": "Hotel Majayura",
    "companyType": "hotel",
    "date": "2026-05-19T00:00:00",
    "radiationToday": 6.8,
    "solarIndex": 89,
    "reasoning": "Detecté radiación alta (6.8 kWh/m²) y horas de costo crítico entre 6pm y 9pm. Prioricé mover cargas pesadas al pico solar del mediodía.",
    "recommendations": [
      {
        "title": "Mover lavandería al pico solar",
        "description": "Programa el lavado de toallas y sábanas entre 10:00 y 14:00, cuando la radiación es máxima.",
        "priority": "alta",
        "timeWindow": "10:00 - 14:00",
        "savingsCopDay": 48500
      },
      {
        "title": "Apagar A/C en habitaciones vacías",
        "description": "Con ocupación al 60%, apaga el aire de las habitaciones sin huéspedes durante el día.",
        "priority": "media",
        "timeWindow": "Inmediato",
        "savingsCopDay": 22000
      },
      {
        "title": "Pre-enfriar la cocina antes de las 6pm",
        "description": "Aprovecha la última hora de sol para bajar temperatura antes del pico tarifario.",
        "priority": "baja",
        "timeWindow": "16:00 - 17:30",
        "savingsCopDay": 12000
      }
    ],
    "totalSavingsCopDay": 82500,
    "totalSavingsCopMonth": 2475000,
    "alert": "Mañana se espera menor radiación. Concentra hoy el consumo pesado."
  }
}
```

**Campos del resultado:**

| Campo | Tipo | Descripción |
|---|---|---|
| `companyName` | string | Eco del nombre enviado |
| `companyType` | string | Eco del tipo enviado |
| `date` | fecha | Fecha de los datos solares usados |
| `radiationToday` | número | Radiación de hoy en kWh/m² |
| `solarIndex` | int | Índice Solar 0-100 |
| `reasoning` | string | Explicación breve del razonamiento del agente |
| `recommendations` | array | Lista de 3 recomendaciones |
| `totalSavingsCopDay` | int | Suma de ahorros diarios (COP) |
| `totalSavingsCopMonth` | int | Proyección mensual (díario × 30) |
| `alert` | string / null | Alerta opcional, puede venir `null` |

**Campos de cada recomendación:**

| Campo | Tipo | Valores |
|---|---|---|
| `title` | string | Título corto de la acción |
| `description` | string | Qué hacer y por qué |
| `priority` | string | `alta`, `media`, `baja` |
| `timeWindow` | string | Franja horaria sugerida |
| `savingsCopDay` | int | Ahorro estimado del día en COP |

**Posibles errores:**

```json
{ "success": false, "error": "companyType es obligatorio" }
{ "success": false, "error": "No se pudieron obtener datos solares" }
{ "success": false, "error": "La IA devolvió un formato inválido" }
{ "success": false, "error": "Servicio de IA no disponible" }
```

---

### 4.2 `POST /api/ai/chat`

Permite hacer **preguntas libres** al Agente Solar en lenguaje natural. El agente responde considerando los datos solares del día y, si se proporciona, el perfil de consumo.

**Headers:**
```
Content-Type: application/json
```

**Cuerpo de la petición (Request):**

```json
{
  "message": "¿A qué hora me conviene encender los aires acondicionados?",
  "companyType": "hotel",
  "monthlyConsumptionKwh": 12000,
  "companySize": 18
}
```

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `message` | string | **Sí** | La pregunta del usuario |
| `companyType` | string | No | Tipo de empresa para contextualizar |
| `monthlyConsumptionKwh` | número | No | Consumo mensual para respuestas con cifras reales |
| `companySize` | int | No | Tamaño de la empresa |

**Ejemplo de respuesta (Result):**

```json
{
  "success": true,
  "data": {
    "reply": "Para tu hotel en Riohacha, te recomiendo encender los A/C de habitaciones ocupadas a partir de las 2pm, cuando la radiación todavía cubre el consumo. Evita encenderlos entre 6pm y 9pm: ahí pagas la tarifa más alta del día.",
    "timestamp": "2026-05-19T14:30:00"
  }
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `reply` | string | Respuesta del agente en lenguaje natural (máximo ~3 oraciones) |
| `timestamp` | fecha | Momento en que se generó la respuesta |

**Posibles errores:**

```json
{ "success": false, "error": "El mensaje no puede estar vacío" }
{ "success": false, "error": "Servicio de IA no disponible" }
```

---

### 4.3 `GET /api/ai/recommendations/demo`

Devuelve un conjunto de recomendaciones **fijas y pre-armadas** (hardcoded). No llama a la IA ni a ningún servicio externo, por lo que **nunca falla**.

**Para qué sirve:** Es el plan de respaldo de la demo. Si durante la presentación el servicio de Groq se cae o tiene saturación, el frontend puede apuntar a este endpoint y la demo sigue funcionando con datos idénticos en estructura a los reales.

**Parámetros:** ninguno.

**Ejemplo de petición:**

```
GET http://localhost:5000/api/ai/recommendations/demo
```

**Respuesta:** misma estructura que `POST /api/ai/recommendations` (ver 4.1), con datos fijos del Hotel Majayura.

> **Recomendación de uso:** El frontend y el móvil pueden tener una variable tipo `USE_DEMO_MODE`. En condiciones normales `false` (usa el endpoint real). Si algo falla en la presentación, se cambia a `true` y consume este endpoint.

---

## 5. Modelos de datos completos

Esta sección lista todos los modelos para que el equipo móvil pueda crear sus `data class` en Kotlin y el frontend sepa la forma exacta de cada objeto.

### Envoltura general

Toda respuesta viene envuelta. En Kotlin conviene un genérico:

```kotlin
data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val error: String?,
    val detail: String?
)
```

### Modelos del dominio Solar

**SolarData** — respuesta de `/solar/today`

| Campo | Tipo JSON | Tipo Kotlin sugerido |
|---|---|---|
| `date` | string (ISO) | String |
| `location` | string | String |
| `radiationKwhM2` | número | Double |
| `temperatureC` | número | Double |
| `windSpeedKmh` | número | Double |
| `uvIndex` | número | Double |
| `solarIndex` | int | Int |
| `solarIndexLabel` | string | String |
| `solarIndexColor` | string | String |
| `sunrise` | string | String |
| `sunset` | string | String |
| `optimalHours` | array de string | List<String> |
| `peakCostHours` | array de string | List<String> |
| `cached` | bool | Boolean |

**SolarDayData** — item usado dentro de `forecast` e `history`

| Campo | Tipo JSON | Tipo Kotlin sugerido |
|---|---|---|
| `date` | string (ISO) | String |
| `radiationKwhM2` | número | Double |
| `temperatureC` | número | Double |
| `windSpeedKmh` | número | Double |
| `solarIndex` | int | Int |
| `solarIndexLabel` | string | String |

**SolarForecast** — respuesta de `/solar/forecast`

| Campo | Tipo JSON | Tipo Kotlin sugerido |
|---|---|---|
| `location` | string | String |
| `source` | string | String |
| `days` | int | Int |
| `data` | array de SolarDayData | List<SolarDayData> |
| `averageRadiation` | número | Double |
| `maxRadiation` | número | Double |
| `minRadiation` | número | Double |

**SolarHistory** — respuesta de `/solar/history`

| Campo | Tipo JSON | Tipo Kotlin sugerido |
|---|---|---|
| `location` | string | String |
| `source` | string | String |
| `from` | string | String |
| `to` | string | String |
| `totalDays` | int | Int |
| `averageRadiation` | número | Double |
| `maxRadiation` | número | Double |
| `minRadiation` | número | Double |
| `daily` | array de SolarDayData | List<SolarDayData> |
| `monthly` | array de MonthlyAggregate | List<MonthlyAggregate> |

**MonthlyAggregate** — item dentro de `history.monthly`

| Campo | Tipo JSON | Tipo Kotlin sugerido |
|---|---|---|
| `year` | int | Int |
| `month` | int | Int |
| `monthName` | string | String |
| `averageRadiation` | número | Double |
| `maxRadiation` | número | Double |
| `minRadiation` | número | Double |
| `days` | int | Int |

**SolarScore** — respuesta de `/solar/score`

| Campo | Tipo JSON | Tipo Kotlin sugerido |
|---|---|---|
| `score` | int | Int |
| `label` | string | String |
| `color` | string | String |
| `summary` | string | String |
| `radiationKwhM2` | número | Double |

### Modelos del dominio IA

**RecommendationRequest** — cuerpo de `POST /ai/recommendations`

| Campo | Tipo JSON | Obligatorio |
|---|---|---|
| `companyType` | string | Sí |
| `companyName` | string | No |
| `monthlyConsumptionKwh` | número | No |
| `companySize` | int | No |
| `peakUsageHours` | string | No |

**ChatRequest** — cuerpo de `POST /ai/chat`

| Campo | Tipo JSON | Obligatorio |
|---|---|---|
| `message` | string | Sí |
| `companyType` | string | No |
| `monthlyConsumptionKwh` | número | No |
| `companySize` | int | No |

**RecommendationResult** — respuesta de `/ai/recommendations`

| Campo | Tipo JSON | Tipo Kotlin sugerido |
|---|---|---|
| `companyName` | string | String |
| `companyType` | string | String |
| `date` | string (ISO) | String |
| `radiationToday` | número | Double |
| `solarIndex` | int | Int |
| `reasoning` | string | String |
| `recommendations` | array de Recommendation | List<Recommendation> |
| `totalSavingsCopDay` | int | Int |
| `totalSavingsCopMonth` | int | Int |
| `alert` | string / null | String? |

**Recommendation** — item dentro de `recommendations`

| Campo | Tipo JSON | Tipo Kotlin sugerido |
|---|---|---|
| `title` | string | String |
| `description` | string | String |
| `priority` | string | String |
| `timeWindow` | string | String |
| `savingsCopDay` | int | Int |

**ChatResult** — respuesta de `/ai/chat`

| Campo | Tipo JSON | Tipo Kotlin sugerido |
|---|---|---|
| `reply` | string | String |
| `timestamp` | string (ISO) | String |

---

## 6. Prompts del Agente IA

El frontend y el móvil no manejan prompts directamente — el backend los arma. Esta sección es informativa, para que el equipo entienda cómo "piensa" el agente.

### System Prompt (define el comportamiento del agente)

El agente recibe siempre estas instrucciones de base:

- Es un copiloto energético especializado en empresas de Riohacha, La Guajira.
- Conoce el contexto local: radiación de hasta 7.0 kWh/m², tarifa de 943 COP/kWh, apagones de 60h/año, energía como 33% del OpEx.
- Reglas de razonamiento: si la radiación es alta recomienda mover cargas al mediodía; si es baja prioriza ahorro nocturno; si la temperatura supera 34°C considera el sobreconsumo del A/C.
- Regla de cálculo: si recibe el consumo de la empresa, deriva los ahorros como porcentaje real de ese consumo × tarifa. Si no lo recibe, da estimaciones aproximadas y lo aclara.
- Para recomendaciones, responde **siempre en JSON estricto**.
- Para chat, responde en lenguaje natural, máximo 3 oraciones, con horarios y cifras concretas.

### User Prompt de recomendaciones (lo que cambia en cada petición)

El backend arma dinámicamente un texto con: nombre y tipo de empresa, perfil de consumo (si se envió), datos solares de hoy (radiación, índice, temperatura, viento, horas óptimas y pico), y la comparación contra el promedio histórico de 90 días.

### User Prompt de chat

El backend arma: el contexto solar actual, el tipo de empresa, el perfil de consumo (si se envió), y la pregunta literal del usuario.

### Formato JSON que produce la IA para recomendaciones

```json
{
  "reasoning": "Análisis breve en 1-2 oraciones",
  "recommendations": [
    {
      "title": "Título corto",
      "description": "Qué hacer y por qué",
      "priority": "alta|media|baja",
      "time_window": "HH:MM - HH:MM",
      "savings_cop_day": 12345
    }
  ],
  "alert": "Alerta importante o null"
}
```

> El backend transforma este JSON (snake_case del modelo) al formato final de respuesta (camelCase) y completa los campos calculados como `totalSavingsCopDay`.

---

## 7. Fuentes de datos externas

Para contexto del equipo. El cliente nunca llama a estas APIs directamente.

### Open-Meteo (pronóstico)

- **Qué aporta:** Pronóstico solar de hoy y hasta 16 días.
- **Por qué:** Gratis, sin API key, sin delay, incluye el día actual.
- **Coordenadas Riohacha:** lat `11.5444`, lon `-72.9072`.
- **Usado por:** `/solar/today`, `/solar/forecast`, `/solar/score`.

### NASA POWER (histórico)

- **Qué aporta:** Datos satelitales reales observados, desde 1984.
- **Por qué:** La mejor fuente mundial de datos históricos observacionales.
- **Limitación:** ~5-7 días de retraso en publicar datos.
- **Usado por:** `/solar/history` y el contexto histórico del agente IA.

### Groq — Llama 3.3 70B (motor de IA)

- **Qué aporta:** Generación de recomendaciones y respuestas de chat.
- **Por qué:** Gratuito, muy rápido, compatible con la API de OpenAI.
- **Modelo:** `llama-3.3-70b-versatile`.
- **Usado por:** `/ai/recommendations`, `/ai/chat`.

---

## 8. Notas de integración

### Para el equipo de Frontend (Jose Fuentes)

- Centralizar `API_BASE` en un `config.js`.
- Maquetar primero con datos quemados, luego conectar `fetch()`.
- Para los KPIs animados, llamar `/solar/today` y pasar los valores al contador animado.
- Para la gráfica histórica, llamar `/solar/history` y alimentar Chart.js con `daily` (rangos cortos) o `monthly` (rangos largos).
- Para las recomendaciones, llamar `POST /ai/recommendations` y renderizar las 3 cards.
- Mostrar el campo `reasoning` de forma visible — es lo que evidencia que el agente "piensa".
- Tener una variable `USE_DEMO_MODE` para conmutar al endpoint `/ai/recommendations/demo` si algo falla.

### Para el equipo de Móvil (Angel)

- Usar el modelo genérico `ApiResponse<T>` con Retrofit/Moshi o Ktor/kotlinx.serialization.
- Para Android, recordar `usesCleartextTraffic="true"` en el `AndroidManifest.xml` si la API corre en HTTP.
- Pantalla principal: consumir `/solar/score` (ligero) en vez de `/solar/today` (pesado).
- Pantalla de recomendaciones: consumir `POST /ai/recommendations`.
- Revisar siempre el campo `success` antes de usar `data`.
- El dispositivo físico debe estar en la misma red WiFi que el backend, o usar la URL de ngrok.

### Reglas generales

- Todos los endpoints `GET` se pueden probar directo en el navegador o en la UI de Scalar (`/scalar`).
- Los `POST` se prueban desde Scalar (`/scalar`), Postman o Thunder Client.
- Si un endpoint devuelve `success: false`, leer `error` para el mensaje y `detail` para la causa técnica.
- Ante un 503, el problema es de un servicio externo — reintentar suele resolverlo.

---

*Documento de API — Proyecto Agente Solar · Equipo: Juan Pa · Jose Campo · Angel · Jose Fuentes*
*Hackathon Encuentros de Colombia 5.0 · Riohacha, La Guajira*
