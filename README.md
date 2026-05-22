# Agente Solar — Frontend

Dashboard de inteligencia energética solar para PYMES en Riohacha, La Guajira. Interfaz SPA construida sobre Laravel/Blade que consume la API de Agente Solar para mostrar datos en tiempo real, análisis con IA y simulación de ROI fotovoltaico.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Laravel 11 |
| Plantillas | Blade |
| CSS | Tailwind CSS v4 |
| Build | Vite 8 |
| Gráficas | Chart.js 4 |
| Mapas | Leaflet.js |
| Fuente | Instrument Sans (Fontsource) |

---

## Requisitos

- PHP 8.2+ con extensiones: `openssl`, `pdo`, `mbstring`, `tokenizer`, `xml`, `ctype`, `json`
- Composer 2+
- Node.js 20+ y npm 10+
- API de Agente Solar corriendo (ver [repositorio del backend](https://github.com/JuanPabloMendozaLopez/Olympus))

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/kyr3-fxp/solar-ai.git
cd solar-ai

# Dependencias PHP
composer install

# Configuración de entorno
cp .env.example .env
php artisan key:generate

# Configurar URL del backend en .env
# SOLAR_API_BASE=http://localhost:5000

# Dependencias JS y compilar assets
npm install
npm run build

# Iniciar servidor de desarrollo
php artisan serve --port=8000
```

Abrir en el navegador: `http://localhost:8000`

---

## Desarrollo

```bash
# Watch mode — reconstruye CSS/JS en cambios
npm run dev

# Build de producción
npm run build
```

> **Importante:** el template Blade carga assets desde `public/build/manifest.json` generado por Vite. Cualquier cambio en `resources/js/` o `resources/css/` requiere ejecutar `npm run build` para reflejarse.

---

## Estructura de archivos clave

```
resources/
├── css/
│   └── app.css              # Design system: variables, glass morphism, componentes
├── js/
│   ├── app.js               # Entry point Vite — importa dashboard.js
│   └── dashboard.js         # Lógica completa del SPA: perfiles, IA, gráficas, navegación
└── views/
    └── dashboard.blade.php  # Template principal con todas las secciones

routes/
└── web.php                  # Define la ruta raíz e inyecta la URL del API
```

---

## Secciones del dashboard

| Sección | Descripción |
|---------|-------------|
| **Dashboard** | Métricas solares en tiempo real: radiación, índice solar, temperatura, pronóstico, mapa Leaflet |
| **Análisis IA** | Resumen ejecutivo + 3 insights estratégicos generados por LLaMA 3.3 70B |
| **Simulador** | Calculadora de ROI fotovoltaico: kWp → inversión, generación anual, payback, CO₂ |
| **Alertas** | Alertas críticas/advertencias/info contextualizadas al perfil activo |
| **Historial** | Serie histórica NASA POWER con gráfica por semana, mes o año |
| **Comando AI** | Chat conversacional con el agente energético |

---

## Perfiles de demostración

El sistema incluye 4 perfiles preconfigurados con datos reales de empresas de Riohacha. Cambiar de perfil recalcula instantáneamente consumo, ROI, recomendaciones y alertas. Los resultados de IA se cachean por perfil para evitar llamadas repetidas.

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SOLAR_API_BASE` | URL base de la API de Agente Solar | `http://localhost:5000` |

---

## Licencia

MIT
