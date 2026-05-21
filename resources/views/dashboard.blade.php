<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>{{ config('app.name', 'Solar AI Dashboard') }}</title>
        @php
            $manifest = json_decode(file_get_contents(public_path('build/manifest.json')), true) ?? [];
            $cssFile  = $manifest['resources/css/app.css']['file'] ?? 'assets/app.css';
            $jsFile   = $manifest['resources/js/app.js']['file'] ?? 'assets/app.js';
        @endphp
        <link rel="stylesheet" href="{{ asset('build/'.$cssFile) }}">
        <script src="https://unpkg.com/lucide@latest"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="{{ asset('build/'.$jsFile) }}" defer></script>
        <style>
          .uv-index-grid:has(.glass-card[data-section="company-only"].hidden) {
            grid-template-columns: 1fr;
          }
          .roi-solar-row:has([data-section="company-only"].hidden) {
            grid-template-columns: 1fr;
          }
        </style>
    </head>
    <body
        class="dashboard-ambient bg-[#050505] text-white"
        data-dashboard="solar"
        data-api-base="{{ $apiBase }}"
    >
        <main class="dashboard-frame scrollbar-thin">
            <!-- Profile Selector Header -->
            <div class="fade-in stagger-1 flex items-center justify-between gap-4 px-5 py-4 border-b border-white/6">
                <div class="flex items-center gap-4">
                    <div>
                        <div class="text-xs uppercase tracking-[0.25em] text-white/40">Panel activo</div>
                        <h1 class="mt-1 text-xl font-bold text-white" data-bind="profile-greeting">Bienvenido, Hotel Majayura</h1>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <select
                        data-role="profile-selector"
                        class="h-11 min-w-[220px] rounded-xl border border-white/10 bg-black/55 px-4 py-0 text-sm text-white outline-none transition focus:border-white/18 focus:bg-black/70 cursor-pointer"
                    >
                        <option value="0">Hotel Majayura</option>
                        <option value="1">Hielera del Caribe</option>
                        <option value="2">Restaurante Sazón Guajira</option>
                        <option value="3">Riohacha (Comunidad)</option>
                    </select>
                    <button data-role="theme-toggle" class="glass-card h-11 w-11 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 transition hover:border-white/16">
                        {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="mx-auto h-4 w-4"><path d="M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9Z"></path></svg>' !!}
                    </button>
                    <a href="https://github.com" target="_blank" class="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white/90 transition hover:scale-[1.02] hover:border-white/18">
                        {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M9 19c-4.8 1.5-4.8-2.5-6.7-3m13.4 6v-3.2c0-.9.3-1.6-.4-2.3 2.7-.3 5.6-1.3 5.6-6a4.7 4.7 0 0 0-1.3-3.3 4.4 4.4 0 0 0-.1-3.3s-1-.3-3.3 1.3a11.4 11.4 0 0 0-6 0C7.8 3.1 6.8 3.4 6.8 3.4a4.4 4.4 0 0 0-.1 3.3A4.7 4.7 0 0 0 5.4 10c0 4.7 2.9 5.7 5.6 6-.5.5-.5 1-.4 1.8V22"></path></svg>' !!}
                        <span>Support</span>
                    </a>
                    <span class="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/50">
                        <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        En vivo
                    </span>
                </div>
            </div>

            <div class="dashboard-grid">
                <aside class="dashboard-left flex flex-col gap-4">
                    <section class="glass-card fade-in stagger-1 flex min-h-[430px] flex-col justify-between p-5">
                        <div class="flex items-start justify-between">
                            <div>
                                <div class="text-sm font-semibold text-white/95" data-bind="hero-day">Domingo</div>
                                <div class="mt-2 text-sm text-white/55" data-bind="hero-location">Riohacha, Colombia</div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-semibold text-white/90" data-bind="hero-clock">12:39 PM</div>
                                <div class="mt-2 text-xs uppercase tracking-[0.28em] text-white/38">Solar AI</div>
                            </div>
                        </div>

                        <div class="flex flex-1 flex-col items-center justify-center">
                            <div class="text-7xl font-black leading-none tracking-tight text-glow" data-bind="hero-radiation">0.0</div>
                            <div class="mt-1 text-xs font-medium uppercase tracking-[0.25em] text-white/35">kWh/m²/día</div>
                            <div class="mt-1 text-[11px] text-white/30">Energía solar disponible hoy en Riohacha</div>
                            <div class="mt-2 text-lg font-semibold text-white/90" data-bind="hero-state">—</div>
                            <div class="mt-2 text-xs text-white/45" data-bind="radiation-vs-historical">vs. promedio 90d</div>
                            <div class="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/55">
                                <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
                                Tiempo real
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="panel-surface rounded-2xl px-4 py-4">
                                <div class="text-xs uppercase tracking-[0.25em] text-white/40">Temp. máx.</div>
                                <div class="mt-2 text-2xl font-bold text-white" data-bind="hero-temp">—</div>
                                <div class="mt-1 text-[10px] text-white/30">Afecta eficiencia del panel</div>
                            </div>
                            <div class="panel-surface rounded-2xl px-4 py-4">
                                <div class="text-xs uppercase tracking-[0.25em] text-white/40">Viento máx.</div>
                                <div class="mt-2 text-2xl font-bold text-white" data-bind="hero-wind">—</div>
                                <div class="mt-1 text-[10px] text-white/30">Ráfagas sobre 60 km/h reducen generación</div>
                            </div>
                        </div>
                    </section>

                    <section class="glass-card fade-in stagger-2 flex flex-1 flex-col p-5">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-base font-semibold text-white">Predicción Solar 10 Días</h2>
                                <div class="mt-0.5 text-[11px] text-white/38">Radiación diaria estimada · fuente Open-Meteo</div>
                            </div>
                            <span class="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/55">
                                Riohacha
                            </span>
                        </div>
                        <div class="mt-5 space-y-1" data-bind="forecast-list"></div>
                    </section>
                </aside>

                <section class="dashboard-center flex min-w-0 flex-col gap-4">

                    <article class="glass-card fade-in stagger-2 p-5">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center gap-2 text-white/75">
                                {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0 mt-0.5"><path d="M12 3v2"></path><path d="M12 19v2"></path><path d="M4.22 10.22 5.64 11.64"></path><path d="M18.36 11.64l1.42-1.42"></path><path d="M3 17h18"></path><path d="M6 17a6 6 0 0 1 12 0"></path></svg>' !!}
                                <div>
                                    <div class="text-sm font-semibold text-white">Ventana Solar de Hoy</div>
                                    <div class="text-[11px] text-white/38 mt-0.5">Cuándo generar y cuándo evitar consumo extra</div>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div class="panel-surface rounded-2xl px-4 py-3">
                                <div class="text-[11px] uppercase tracking-wider text-white/40">Amanecer</div>
                                <div class="mt-1.5 text-xl font-bold text-white" data-bind="sunrise">—</div>
                                <div class="mt-1 text-xs text-white/45">Inicio de generación solar</div>
                            </div>
                            <div class="panel-surface rounded-2xl px-4 py-3">
                                <div class="text-[11px] uppercase tracking-wider text-white/40">Atardecer</div>
                                <div class="mt-1.5 text-xl font-bold text-white" data-bind="sunset">—</div>
                                <div class="mt-1 text-xs text-white/45">Fin de generación solar</div>
                            </div>
                            <div class="panel-surface rounded-2xl border border-emerald-400/15 px-4 py-3">
                                <div class="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-400/80">
                                    <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                    Horario óptimo
                                </div>
                                <div class="mt-1.5 text-xl font-bold text-white" data-bind="optimal-hours">—</div>
                                <div class="mt-1 text-xs text-white/45">Máxima radiación — concentra tus cargas aquí</div>
                            </div>
                            <div class="panel-surface rounded-2xl border border-orange-400/15 px-4 py-3">
                                <div class="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-orange-400/80">
                                    <span class="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
                                    Hora pico tarifaria
                                </div>
                                <div class="mt-1.5 text-xl font-bold text-white" data-bind="peak-cost-hours">—</div>
                                <div class="mt-1 text-xs text-white/45">Tarifa más cara — evita consumo extra</div>
                            </div>
                        </div>
                    </article>

                    <div class="grid min-w-0 grid-cols-2 gap-4">
                        <article class="glass-card fade-in stagger-4 min-h-[180px] p-5">
                            <div class="flex items-center gap-2 text-white/75">
                                {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path></svg>' !!}
                                <div>
                                    <div class="text-sm text-white">Radiación por Hora</div>
                                    <div class="text-[11px] text-white/38 mt-0.5">Las 5 franjas con mayor radiación del día</div>
                                </div>
                            </div>
                            <div class="mt-4 grid grid-cols-5 gap-3" data-bind="hourly-list"></div>
                        </article>

                        <div class="grid grid-cols-2 gap-4 uv-index-grid">
                            <article class="glass-card fade-in stagger-5 min-h-[180px] p-5">
                                <div class="flex items-center gap-2 text-white/75">
                                    {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0"><circle cx="12" cy="12" r="4"></circle></svg>' !!}
                                    <div>
                                        <div class="text-sm text-white">Índice UV</div>
                                        <div class="text-[11px] text-white/38 mt-0.5">Radiación ultravioleta del día</div>
                                    </div>
                                </div>
                                <div class="mt-4 text-3xl font-bold text-white" data-bind="uv-index">—</div>
                                <div class="mt-3 h-3 rounded-full bg-white/10 p-[2px]">
                                    <div class="solar-gradient h-full w-full rounded-full"></div>
                                </div>
                                <div class="mt-2 text-[11px] text-white/40">Escala 0–11+. Por encima de 6, la radiación solar es alta — mayor potencial fotovoltaico.</div>
                            </article>

                            <article class="glass-card fade-in stagger-6 min-h-[180px] p-5" data-section="company-only" id="company-only-article">
                                <div class="flex items-center gap-2 text-white/75">
                                    {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0"><ellipse cx="12" cy="5" rx="7" ry="3"></ellipse><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"></path><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"></path></svg>' !!}
                                    <div>
                                        <div class="text-sm text-white">Ahorro Estimado</div>
                                        <div class="text-[11px] text-white/38 mt-0.5">Si aplicas las 3 recomendaciones del agente</div>
                                    </div>
                                </div>
                                <div class="mt-4 text-3xl font-bold text-white" data-bind="savings-daily">—</div>
                                <div class="mt-1 text-[11px] text-white/38">COP ahorrados por día</div>
                                <div class="mt-3 text-sm text-white/50">Mensual estimado: <span class="font-semibold text-white/75" data-bind="savings-monthly">—</span></div>
                            </article>
                        </div>
                    </div>

                    <article class="glass-card fade-in stagger-7 p-5" data-section="company-only">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 text-white/75">
                                {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0"><path d="m13 2-9 12h7l-1 8 9-12h-7z"></path></svg>' !!}
                                <div>
                                    <div class="text-sm text-white">Consumo Estimado</div>
                                    <div class="text-[11px] text-white/38 mt-0.5">Basado en el perfil activo y el índice solar de hoy</div>
                                </div>
                            </div>
                            <span class="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-wider text-white/55">Del perfil</span>
                        </div>
                        <div class="mt-5 grid grid-cols-3 gap-4">
                            <div>
                                <div class="text-xs uppercase tracking-wider text-white/40">Consumo diario</div>
                                <div class="mt-2 text-3xl font-bold text-white" data-bind="current-consumption">—</div>
                                <div class="mt-1 text-[11px] text-white/35">kWh con ajuste solar</div>
                            </div>
                            <div>
                                <div class="text-xs uppercase tracking-wider text-white/40">Costo estimado</div>
                                <div class="mt-2 text-3xl font-bold text-white" data-bind="consumption-cost">—</div>
                                <div class="mt-1 text-[11px] text-white/35">COP · tarifa del perfil</div>
                            </div>
                            <div>
                                <div class="text-xs uppercase tracking-wider text-white/40">Vs. ayer</div>
                                <div class="mt-2 text-3xl font-bold text-white" data-bind="consumption-diff">—</div>
                                <div class="mt-1 text-[11px] text-white/35">variación por índice solar</div>
                            </div>
                        </div>
                        <div class="mt-4 h-2 rounded-full bg-white/10 p-[2px]">
                            <div class="solar-gradient h-full rounded-full" data-bind="consumption-progress" style="width: 0%"></div>
                        </div>
                        <div class="mt-2 text-xs text-white/35" data-bind="consumption-cost-label">Costo est. / día</div>
                    </article>

                    <article class="glass-card fade-in stagger-9 min-h-[160px] p-5" data-section="company-only">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 text-white/75">
                                {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0"><circle cx="12" cy="12" r="4"></circle></svg>' !!}
                                <div>
                                    <div class="text-sm text-white">Consumo Energético General</div>
                                    <div class="text-[11px] text-white/38 mt-0.5">Comparación real vs. base del perfil</div>
                                </div>
                            </div>
                            <div class="flex gap-2" data-bind="consumption-tabs">
                                <button class="tab-button active rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-wider text-white/90">Día</button>
                                <button class="tab-button rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wider text-white/55 hover:border-white/18">Semana</button>
                                <button class="tab-button rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wider text-white/55 hover:border-white/18">Mes</button>
                            </div>
                        </div>
                        <div class="mt-4 grid grid-cols-3 gap-3" data-bind="consumption-summary">
                            <div class="panel-surface rounded-2xl p-4">
                                <div class="text-xs uppercase tracking-wider text-white/40">Consumo Hoy</div>
                                <div class="mt-2 text-2xl font-bold text-white" data-bind="consumption-today">—</div>
                                <div class="mt-1 text-xs text-white/46">kWh · con eficiencia solar</div>
                            </div>
                            <div class="panel-surface rounded-2xl p-4">
                                <div class="text-xs uppercase tracking-wider text-white/40">Sin Optimización</div>
                                <div class="mt-2 text-2xl font-bold text-white" data-bind="consumption-avg">—</div>
                                <div class="mt-1 text-xs text-white/46">kWh/día · consumo base</div>
                            </div>
                            <div class="panel-surface rounded-2xl p-4">
                                <div class="text-xs uppercase tracking-wider text-white/40">Ahorro Potencial</div>
                                <div class="mt-2 text-2xl font-bold text-white" data-bind="consumption-savings-pct">—</div>
                                <div class="mt-1 text-xs text-white/46">% del costo que puede ahorrarse</div>
                            </div>
                        </div>
                        <div class="mt-4 h-40 w-full" data-bind="consumption-chart">
                            <canvas id="consumptionChart"></canvas>
                        </div>
                    </article>

                    <!-- Community-only: Contexto comunitario -->
                    <article class="glass-card fade-in stagger-7 p-5 hidden" data-section="community-only">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 text-white/75">
                                {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' !!}
                                <span class="text-sm">Contexto Comunitario</span>
                            </div>
                            <span class="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-wider text-white/55" data-bind="community-population">246.000 hab.</span>
                        </div>
                        <div class="mt-5" data-bind="community-name">
                            <div class="text-2xl font-bold text-white">Riohacha</div>
                            <div class="mt-1 text-sm text-white/50">La Guajira, Colombia</div>
                        </div>
                        <div class="mt-5">
                            <div class="text-xs uppercase tracking-wider text-white/40 mb-3">Problemas energéticos identificados</div>
                            <div class="space-y-2" data-bind="community-problems"></div>
                        </div>
                    </article>

                    <article class="glass-card fade-in stagger-8 flex flex-1 flex-col p-5 hidden" data-section="community-only">
                        <div class="flex items-center gap-2 text-white/75">
                            {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m13 2-9 12h7l-1 8 9-12h-7z"></path></svg>' !!}
                            <span class="text-sm">Impacto Potencial</span>
                        </div>
                        <div class="mt-5 grid grid-cols-3 gap-3">
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-xs uppercase tracking-wider text-white/40">Población</div>
                                <div class="mt-2 text-2xl font-bold text-white" data-bind="community-pop-number">246K</div>
                            </div>
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-xs uppercase tracking-wider text-white/40">Ahorro/día</div>
                                <div class="mt-2 text-2xl font-bold text-white" data-bind="savings-daily">—</div>
                            </div>
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-xs uppercase tracking-wider text-white/40">Ahorro/mes</div>
                                <div class="mt-2 text-2xl font-bold text-white" data-bind="savings-monthly">—</div>
                            </div>
                        </div>
                        <div class="mt-4 text-sm leading-6 text-white/55">
                            Estimación de ahorro colectivo basado en las recomendaciones del agente para toda la comunidad.
                        </div>
                    </article>

                </section>

                <aside class="dashboard-right flex flex-col gap-4">
                    <section class="glass-card fade-in stagger-2 flex flex-1 flex-col p-5 overflow-hidden">
                        <div class="flex items-center justify-between gap-2">
                            <div>
                                <h3 class="text-base font-semibold text-white">Recomendaciones IA</h3>
                                <div class="mt-0.5 text-[11px] text-white/38">Acciones concretas con horario y ahorro en COP/día</div>
                            </div>
                            <span class="hidden shrink-0 rounded-full border border-yellow-400/25 bg-yellow-400/8 px-2.5 py-1 text-[11px] uppercase tracking-wider text-yellow-300/80" data-bind="ai-fallback-badge">⚡ Precargado</span>
                        </div>
                        <div class="mt-3 hidden rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-3 py-2.5 text-xs leading-5 text-yellow-200/85" data-bind="ai-fallback-message"></div>
                        <div class="mt-3 hidden rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-xs leading-5 text-white/55 italic" data-bind="ai-reasoning"></div>
                        <div class="mt-3 hidden rounded-xl border border-orange-400/20 bg-orange-400/5 px-3 py-2.5 text-xs leading-5 text-orange-200" data-bind="ai-alert"></div>
                        <div class="mt-4 space-y-3 overflow-y-auto scrollbar-thin pr-1 max-h-[380px]" data-bind="recommendations-list"></div>
                    </section>

                    <section class="glass-card fade-in stagger-3 flex flex-1 flex-col p-5">
                        <h3 class="text-base font-semibold text-white">Comando AI</h3>
                        <div class="mt-2 text-xs text-white/40">Pregunta al agente usando el perfil activo del selector superior.</div>
                        <div class="mt-4 flex flex-col gap-3 max-h-[260px] overflow-y-auto scrollbar-thin pr-1" data-bind="chat-messages">
                        </div>
                        <form class="mt-4 space-y-3" data-role="command-form">
                            <input name="message" type="text" placeholder="Pregunta al agente..." class="w-full rounded-xl border border-white/10 bg-black/55 px-4 py-3 text-sm text-white outline-none placeholder:text-white/34 focus:border-white/18">
                            <button type="submit" class="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]">
                                Consultar IA
                            </button>
                        </form>
                    </section>
                </aside>
            </div>

            <!-- ── Fila inferior ──────────────────────────────────────────── -->

            <!-- Fila 1: ROI Solar + Índice Solar -->
            <div class="roi-solar-row grid grid-cols-2 gap-[18px] mt-[18px]">

                <article class="glass-card fade-in stagger-9 p-5" data-section="company-only">
                    <div class="flex items-center justify-between gap-2 text-white/75 mb-3">
                        <div class="flex items-center gap-2">
                            {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0"><path d="M12 2v4"></path><path d="m4.93 7.93 2.83 2.83"></path><path d="M2 16h4"></path><path d="m4.93 24.07 2.83-2.83"></path><path d="M12 26v-4"></path><path d="m19.07 24.07-2.83-2.83"></path><path d="M26 16h-4"></path><path d="m19.07 7.93-2.83 2.83"></path><circle cx="12" cy="16" r="4"></circle></svg>' !!}
                            <div>
                                <div class="text-sm text-white">Retorno Solar (ROI)</div>
                                <div class="text-[11px] text-white/38 mt-0.5">¿Cuánto cuesta instalar paneles y en cuánto se paga solo?</div>
                            </div>
                        </div>
                        <span class="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-[11px] uppercase tracking-wider text-emerald-300/80">Calculado</span>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div class="panel-surface rounded-2xl p-4 text-center">
                            <div class="text-[10px] uppercase tracking-wider text-white/40">Inversión</div>
                            <div class="mt-1 text-lg font-bold text-white" data-bind="roi-investment">—</div>
                            <div class="text-[10px] text-white/35">COP · cubre 40% consumo</div>
                        </div>
                        <div class="panel-surface rounded-2xl p-4 text-center">
                            <div class="text-[10px] uppercase tracking-wider text-white/40">Se paga en</div>
                            <div class="mt-1 text-lg font-bold text-emerald-400" data-bind="roi-payback">—</div>
                            <div class="text-[10px] text-white/35">años de ahorro acumulado</div>
                        </div>
                        <div class="panel-surface rounded-2xl p-4 text-center">
                            <div class="text-[10px] uppercase tracking-wider text-white/40">Reducción IA</div>
                            <div class="mt-1 text-lg font-bold text-white" data-bind="ai-reduction-pct">—</div>
                            <div class="text-[10px] text-white/35">del costo diario</div>
                        </div>
                    </div>
                    <div class="mt-3 text-[11px] text-white/35" data-bind="roi-label">Calculando ROI con tarifa del perfil...</div>
                </article>

                <article class="glass-card fade-in stagger-9 p-5">
                    <div class="flex items-center gap-2 text-white/75">
                        {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0"><circle cx="12" cy="12" r="4"></circle></svg>' !!}
                        <div>
                            <div class="text-sm text-white">Índice Solar</div>
                            <div class="text-[11px] text-white/38 mt-0.5">0–100 · combina radiación, temperatura y viento</div>
                        </div>
                    </div>
                    <div class="mt-5 flex items-end justify-between gap-4">
                        <div>
                            <div class="text-5xl font-bold text-white" data-bind="solar-index">—</div>
                            <div class="text-[11px] text-white/35 mt-1">puntos hoy</div>
                        </div>
                        <div class="text-right">
                            <div class="text-base font-semibold text-white/90" data-bind="solar-index-label">—</div>
                            <div class="mt-2 text-sm text-white/50" data-bind="solar-summary">—</div>
                        </div>
                    </div>
                </article>

            </div>

            <!-- Fila 2: Mapa Solar + Historia Solar -->
            <div class="grid grid-cols-2 gap-[18px] mt-[18px]">

                <article class="glass-card fade-in stagger-9 overflow-hidden p-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-base font-semibold text-white">Mapa Solar</h3>
                            <div class="mt-0.5 text-[11px] text-white/38">La Guajira tiene el mayor potencial solar de Colombia · 7 kWh/m²/día</div>
                        </div>
                        <div class="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/55" data-bind="map-legend">Radiación</div>
                    </div>
                    <div class="relative mt-4 overflow-hidden rounded-[20px] border border-white/8">
                        <div id="solarMap" class="h-[340px] w-full rounded-[20px]" style="z-index: 1;"></div>
                        <div class="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
                            <div class="text-sm uppercase tracking-[0.3em] text-white/40" data-bind="map-location">Riohacha, Colombia</div>
                            <div class="mt-2 text-lg font-bold text-white" data-bind="map-info">Riohacha, La Guajira</div>
                        </div>
                    </div>
                </article>

                <article class="glass-card fade-in stagger-9 overflow-hidden p-5" id="history-card">
                    <div class="flex items-center justify-between">
                        <h3 class="text-base font-semibold text-white">Historia Solar — Riohacha</h3>
                        <div class="flex gap-2" data-bind="history-tabs">
                            <button class="tab-button active rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-wider text-white/90">Semana</button>
                            <button class="tab-button rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wider text-white/55 hover:border-white/18">Mes</button>
                            <button class="tab-button rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wider text-white/55 hover:border-white/18">Año</button>
                        </div>
                    </div>
                    <div class="mb-2 flex items-center gap-3 text-xs text-white/40">
                        <span data-bind="history-source">Cargando datos...</span>
                        <span class="text-white/20">·</span>
                        <span>NASA POWER</span>
                    </div>
                    <div class="mt-2 h-72 w-full">
                        <canvas id="solarHistoryChart"></canvas>
                    </div>
                    <div class="mt-4 grid grid-cols-3 gap-3 text-xs" data-bind="history-stats"></div>
                </article>

            </div>
        </main>
    </body>
</html>
