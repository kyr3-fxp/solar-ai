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
            <!-- ── Top Header: Logo · Nav · Controls ────────────────── -->
            <div class="fade-in stagger-1 flex items-center justify-between gap-4 px-5 py-3 border-b border-white/6">
                <!-- Logo -->
                <div class="flex items-center gap-3 shrink-0">
                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-sky-400/20 border border-emerald-400/25">
                        <span class="text-lg">⚡</span>
                    </div>
                    <div>
                        <div class="text-sm font-bold text-white leading-none">Agente Solar</div>
                        <div class="text-[10px] text-white/35 uppercase tracking-[0.22em] mt-0.5" data-bind="profile-greeting-sub">Riohacha · La Guajira</div>
                    </div>
                </div>

                <!-- Navigation -->
                <nav class="hidden sm:flex items-center gap-1">
                    <button class="nav-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[13px] font-medium cursor-pointer transition-all text-white bg-white/[0.08] border-white/[0.12]" data-nav="dashboard">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-3.5 w-3.5 shrink-0"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                        Dashboard
                    </button>
                    <button class="nav-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-transparent text-white/50 text-[13px] font-medium cursor-pointer transition-all hover:text-white/85 hover:bg-white/[0.05] hover:border-white/8" data-nav="ai-analysis">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-3.5 w-3.5 shrink-0"><path d="M12 5a4 4 0 0 1 4-4"/><path d="M8 5a4 4 0 0 0-4 4"/><path d="M12 19a4 4 0 0 0 4 4"/><path d="M8 19a4 4 0 0 1-4-4"/><path d="M5 9a3 3 0 0 1 0 6"/><path d="M19 9a3 3 0 0 0 0 6"/><path d="M12 3v18"/></svg>
                        Análisis IA
                    </button>
                    <button class="nav-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-transparent text-white/50 text-[13px] font-medium cursor-pointer transition-all hover:text-white/85 hover:bg-white/[0.05] hover:border-white/8" data-nav="simulator">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-3.5 w-3.5 shrink-0"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                        Simulador
                    </button>
                    <button class="nav-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-transparent text-white/50 text-[13px] font-medium cursor-pointer transition-all hover:text-white/85 hover:bg-white/[0.05] hover:border-white/8" data-nav="alerts">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-3.5 w-3.5 shrink-0"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                        Alertas
                        <span class="h-4 w-4 rounded-full bg-red-500/80 text-[9px] font-bold text-white hidden items-center justify-center" data-bind="alerts-count">0</span>
                    </button>
                    <button class="nav-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-transparent text-white/50 text-[13px] font-medium cursor-pointer transition-all hover:text-white/85 hover:bg-white/[0.05] hover:border-white/8" data-nav="history">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-3.5 w-3.5 shrink-0"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                        Historial
                    </button>
                </nav>

                <!-- Controls -->
                <div class="flex items-center gap-2 shrink-0">
                    <button data-role="theme-toggle" class="glass-card h-9 w-9 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 transition hover:border-white/16">
                        {!! '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="mx-auto h-4 w-4"><path d="M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9Z"></path></svg>' !!}
                    </button>
                    <span class="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/50">
                        <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        En vivo
                    </span>
                </div>
            </div>

            <!-- ── Profile Cards Bar ─────────────────────────────────── -->
            <div class="fade-in stagger-2 flex items-center gap-2 overflow-x-auto px-5 py-3 border-b border-white/6 scrollbar-thin" data-role="profile-bar">
                <div class="profile-card flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] cursor-pointer transition-all hover:border-emerald-400/40 select-none" data-profile-card="0">
                    <span class="text-xl shrink-0 leading-none">🏨</span>
                    <div class="min-w-0">
                        <div class="text-[13px] font-semibold text-white leading-tight whitespace-nowrap">Hotel Majayura</div>
                        <div data-card-type class="text-[10px] uppercase tracking-[0.18em] text-emerald-400/70 mt-0.5 whitespace-nowrap">Comercial · 24h</div>
                    </div>
                </div>
                <div class="profile-card flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-white/8 bg-white/[0.03] cursor-pointer transition-all hover:border-white/14 hover:bg-white/[0.06] select-none" data-profile-card="1">
                    <span class="text-xl shrink-0 leading-none">🧊</span>
                    <div class="min-w-0">
                        <div class="text-[13px] font-semibold text-white/85 leading-tight whitespace-nowrap">Hielera del Caribe</div>
                        <div data-card-type class="text-[10px] uppercase tracking-[0.18em] text-white/38 mt-0.5 whitespace-nowrap">Industrial · 16h</div>
                    </div>
                </div>
                <div class="profile-card flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-white/8 bg-white/[0.03] cursor-pointer transition-all hover:border-white/14 hover:bg-white/[0.06] select-none" data-profile-card="2">
                    <span class="text-xl shrink-0 leading-none">🍽️</span>
                    <div class="min-w-0">
                        <div class="text-[13px] font-semibold text-white/85 leading-tight whitespace-nowrap">Sazón Guajira</div>
                        <div data-card-type class="text-[10px] uppercase tracking-[0.18em] text-white/38 mt-0.5 whitespace-nowrap">Restaurante · 13h</div>
                    </div>
                </div>
                <div class="profile-card flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-white/8 bg-white/[0.03] cursor-pointer transition-all hover:border-white/14 hover:bg-white/[0.06] select-none" data-profile-card="3">
                    <span class="text-xl shrink-0 leading-none">🌆</span>
                    <div class="min-w-0">
                        <div class="text-[13px] font-semibold text-white/85 leading-tight whitespace-nowrap">Riohacha</div>
                        <div data-card-type class="text-[10px] uppercase tracking-[0.18em] text-white/38 mt-0.5 whitespace-nowrap">Comunidad · 246K hab.</div>
                    </div>
                </div>
            </div>

            <!-- ══ VIEW: Dashboard ══════════════════════════════════════ -->
            <div data-view="dashboard">
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
                                    <div class="solar-gradient h-full rounded-full transition-all duration-700" data-bind="uv-bar" style="width: 50%"></div>
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
                            <span class="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-wider text-white/45">Vista del día</span>
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
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <div class="flex items-center gap-2 mb-0.5">
                                    <h3 class="text-base font-semibold text-white">Recomendaciones IA</h3>
                                    <span class="hidden items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/8 px-2 py-0.5 text-[10px] text-emerald-300/90" data-bind="ai-live-badge">
                                        <span class="ai-live-dot"></span> En vivo
                                    </span>
                                    <span class="hidden shrink-0 rounded-full border border-yellow-400/25 bg-yellow-400/8 px-2 py-0.5 text-[10px] uppercase tracking-wider text-yellow-300/80" data-bind="ai-fallback-badge">⚡ Precargado</span>
                                </div>
                                <div class="mt-0.5 text-[11px] text-white/38">Acciones concretas con horario y ahorro en COP/día</div>
                                <div class="mt-1 text-[10px] text-white/30" data-bind="ai-generated-time"></div>
                            </div>
                            <button data-role="regenerate-ai" title="Regenerar recomendaciones" class="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 text-white/40 hover:border-white/16 hover:text-white/70 transition" style="line-height:1">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
                            </button>
                        </div>
                        <div class="mt-3 hidden rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-3 py-2.5 text-xs leading-5 text-yellow-200/85" data-bind="ai-fallback-message"></div>
                        <div class="mt-3 hidden rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-xs leading-5 text-white/55 italic" data-bind="ai-reasoning"></div>
                        <div class="mt-3 hidden rounded-xl border border-orange-400/20 bg-orange-400/5 px-3 py-2.5 text-xs leading-5 text-orange-200" data-bind="ai-alert"></div>
                        <div class="mt-4 space-y-3 overflow-y-auto scrollbar-thin pr-1 max-h-[380px]" data-bind="recommendations-list"></div>
                    </section>

                    <section class="glass-card fade-in stagger-3 flex flex-1 flex-col p-5 min-h-0">
                        <h3 class="text-base font-semibold text-white">Comando AI</h3>
                        <div class="mt-2 text-xs text-white/40">Pregunta al agente usando el perfil activo del selector superior.</div>
                        <div class="mt-4 flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-1" data-bind="chat-messages">
                        </div>
                        <form class="mt-4 shrink-0 space-y-3" data-role="command-form">
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

            <!-- Fila 2: Mapa Solar (ancho completo) -->
            <div class="mt-[18px]">
                <article class="glass-card fade-in stagger-9 overflow-hidden p-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-base font-semibold text-white">Mapa Solar</h3>
                            <div class="mt-0.5 text-[11px] text-white/38">La Guajira tiene el mayor potencial solar de Colombia · 7 kWh/m²/día</div>
                        </div>
                        <div class="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/55" data-bind="map-legend">Radiación</div>
                    </div>
                    <div class="relative mt-4 overflow-hidden rounded-[20px] border border-white/8">
                        <div id="solarMap" class="h-[380px] w-full rounded-[20px]" style="z-index: 1;"></div>
                        <div class="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
                            <div class="text-sm uppercase tracking-[0.3em] text-white/40" data-bind="map-location">Riohacha, Colombia</div>
                            <div class="mt-2 text-lg font-bold text-white" data-bind="map-info">Riohacha, La Guajira</div>
                        </div>
                    </div>
                </article>
            </div>
            </div><!-- /data-view="dashboard" -->

            <!-- ══ VIEW: Análisis IA ═════════════════════════════════════ -->
            <div data-view="ai-analysis" class="hidden">
                <div class="px-0 py-4">

                    <!-- Intro explicativa -->
                    <div class="glass-card fade-in p-6 mb-5">
                        <div class="flex items-start gap-4">
                            <div class="text-3xl shrink-0 mt-0.5">🧠</div>
                            <div>
                                <h2 class="text-lg font-bold text-white mb-1">¿Qué hace esta sección?</h2>
                                <p class="text-sm leading-7 text-white/65">
                                    El Agente Solar usa inteligencia artificial (modelo <strong class="text-white/85">LLaMA 3.3 70B</strong>) para analizar las condiciones solares de Riohacha en tiempo real y generar un resumen ejecutivo personalizado para el perfil activo. No son datos genéricos: el agente considera la radiación del día, el perfil de consumo seleccionado y las tarifas de Air-e La Guajira para decirte en lenguaje simple <strong class="text-white/85">qué hacer hoy para reducir tu factura eléctrica</strong>.
                                </p>
                                <div class="mt-4 flex flex-wrap gap-2">
                                    <span class="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55"><span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Datos solares en tiempo real</span>
                                    <span class="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55"><span class="h-1.5 w-1.5 rounded-full bg-sky-400"></span> Contexto del perfil activo</span>
                                    <span class="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55"><span class="h-1.5 w-1.5 rounded-full bg-yellow-400"></span> Insights accionables con impacto en COP</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Executive Summary Card -->
                    <div class="glass-card fade-in p-6 mb-5">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="ai-live-dot"></span>
                                    <span class="text-[11px] uppercase tracking-[0.22em] text-white/40">Resumen ejecutivo IA</span>
                                </div>
                                <h2 class="text-xl font-bold text-white leading-tight" data-bind="insights-headline">Cargando análisis...</h2>
                                <p class="mt-3 text-sm leading-7 text-white/60 max-w-3xl" data-bind="insights-summary">El agente está procesando los datos solares actuales de Riohacha para generar tu resumen ejecutivo personalizado.</p>
                            </div>
                            <div class="shrink-0 text-right">
                                <div class="text-xs text-white/35" data-bind="insights-time">—</div>
                                <button data-role="refresh-insights" class="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 hover:border-white/16 hover:text-white/80 transition">
                                    🔄 Actualizar
                                </button>
                            </div>
                        </div>
                        <div class="mt-4 rounded-xl border border-sky-400/15 bg-sky-400/5 px-4 py-3 text-sm text-sky-200/80" data-bind="insights-solar-context">
                            Riohacha · La Guajira tiene el mayor potencial solar de Colombia con hasta 7 kWh/m²/día
                        </div>
                    </div>

                    <!-- 3-column insights grid -->
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3" data-bind="insights-grid">
                        <!-- Filled by JS -->
                        <div class="insight-card">
                            <div class="text-2xl mb-3">☀️</div>
                            <div class="skeleton-block h-4 w-3/4 mb-2"></div>
                            <div class="skeleton-block h-3 w-full mb-1"></div>
                            <div class="skeleton-block h-3 w-5/6"></div>
                        </div>
                        <div class="insight-card">
                            <div class="text-2xl mb-3">⚡</div>
                            <div class="skeleton-block h-4 w-3/4 mb-2"></div>
                            <div class="skeleton-block h-3 w-full mb-1"></div>
                            <div class="skeleton-block h-3 w-5/6"></div>
                        </div>
                        <div class="insight-card">
                            <div class="text-2xl mb-3">💰</div>
                            <div class="skeleton-block h-4 w-3/4 mb-2"></div>
                            <div class="skeleton-block h-3 w-full mb-1"></div>
                            <div class="skeleton-block h-3 w-5/6"></div>
                        </div>
                    </div>

                    <!-- Riohacha context -->
                    <div class="glass-card fade-in mt-5 p-6">
                        <h3 class="text-base font-semibold text-white mb-4">Contexto Energético — Riohacha, La Guajira</h3>
                        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-2xl font-bold text-emerald-400">7.0</div>
                                <div class="text-xs text-white/40 mt-1">kWh/m²/día</div>
                                <div class="text-[10px] text-white/30 mt-1">Mayor potencial solar Colombia</div>
                            </div>
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-2xl font-bold text-orange-400">60h</div>
                                <div class="text-xs text-white/40 mt-1">apagones/año</div>
                                <div class="text-[10px] text-white/30 mt-1">Promedio histórico Air-e</div>
                            </div>
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-2xl font-bold text-yellow-400">33%</div>
                                <div class="text-xs text-white/40 mt-1">del OpEx PYMES</div>
                                <div class="text-[10px] text-white/30 mt-1">Costo energético promedio</div>
                            </div>
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-2xl font-bold text-sky-400">&lt;3 años</div>
                                <div class="text-xs text-white/40 mt-1">payback solar</div>
                                <div class="text-[10px] text-white/30 mt-1">Con 6.5+ kWh/m²/día</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ══ VIEW: Simulador Solar ══════════════════════════════════ -->
            <div data-view="simulator" class="hidden">
                <div class="py-4">
                    <div class="glass-card fade-in p-6">
                        <div class="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <div class="text-xs uppercase tracking-[0.22em] text-white/38 mb-1">Herramienta interactiva</div>
                                <h2 class="text-xl font-bold text-white">Simulador Solar Fotovoltaico</h2>
                                <p class="mt-1 text-sm text-white/50">Calcula el retorno de inversión de instalar paneles solares en tu negocio</p>
                            </div>
                            <span class="rounded-full border border-emerald-400/25 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-300/80 uppercase tracking-wider shrink-0">Riohacha · 5 HSP</span>
                        </div>

                        <!-- Qué significa cada dato -->
                        <div class="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                            <div class="flex items-start gap-3">
                                <span class="text-xl shrink-0">📐</span>
                                <div class="text-xs leading-5 text-white/55">
                                    <div class="font-semibold text-white/80 mb-0.5">¿Qué es un kWp?</div>
                                    Es la potencia máxima del sistema solar. 1 kWp equivale a ~3 paneles de 330W. Un negocio pequeño necesita 5–15 kWp, uno industrial puede superar los 50 kWp.
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="text-xl shrink-0">☀️</span>
                                <div class="text-xs leading-5 text-white/55">
                                    <div class="font-semibold text-white/80 mb-0.5">¿Por qué Riohacha es diferente?</div>
                                    Con <strong class="text-white/75">5 horas de sol pico al día</strong>, Riohacha es la ciudad con mayor potencial solar de Colombia. Eso significa que cada kWp genera más energía aquí que en Bogotá, Medellín o Cali.
                                </div>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="text-xl shrink-0">💰</span>
                                <div class="text-xs leading-5 text-white/55">
                                    <div class="font-semibold text-white/80 mb-0.5">¿Qué es el payback?</div>
                                    Es el tiempo en que la inversión se paga sola con el ahorro en la factura eléctrica. En Riohacha, con tarifas de Air-e entre $780–$1.050/kWh, el promedio es <strong class="text-white/75">menos de 3 años</strong>.
                                </div>
                            </div>
                        </div>

                        <!-- Slider -->
                        <div class="mb-8">
                            <div class="flex items-center justify-between mb-3">
                                <label class="text-sm font-semibold text-white">Capacidad del sistema</label>
                                <div class="flex items-center gap-2">
                                    <span class="text-2xl font-black text-white" data-bind="sim-kwp">5.0</span>
                                    <span class="text-sm text-white/50">kWp</span>
                                </div>
                            </div>
                            <input type="range" id="kwp-slider" class="kwp-slider" min="1" max="100" value="5" step="0.5">
                            <div class="flex justify-between text-xs text-white/30 mt-2">
                                <span>1 kWp</span>
                                <span>25 kWp</span>
                                <span>50 kWp</span>
                                <span>100 kWp</span>
                            </div>
                        </div>

                        <!-- Results grid -->
                        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-[10px] uppercase tracking-wider text-white/38 mb-2">Inversión</div>
                                <div class="text-lg font-bold text-white" data-bind="sim-investment">—</div>
                                <div class="text-[10px] text-white/30 mt-1">COP estimado</div>
                            </div>
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-[10px] uppercase tracking-wider text-white/38 mb-2">Generación/año</div>
                                <div class="text-lg font-bold text-white" data-bind="sim-gen">—</div>
                                <div class="text-[10px] text-white/30 mt-1">kWh anuales</div>
                            </div>
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-[10px] uppercase tracking-wider text-white/38 mb-2">Ahorro/año</div>
                                <div class="text-lg font-bold text-emerald-400" data-bind="sim-savings-year">—</div>
                                <div class="text-[10px] text-white/30 mt-1">COP ahorrados</div>
                            </div>
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-[10px] uppercase tracking-wider text-white/38 mb-2">Se paga en</div>
                                <div class="text-lg font-bold text-sky-400" data-bind="sim-payback">—</div>
                                <div class="text-[10px] text-white/30 mt-1">años de ahorro</div>
                            </div>
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-[10px] uppercase tracking-wider text-white/38 mb-2">CO₂ evitado</div>
                                <div class="text-lg font-bold text-green-400" data-bind="sim-co2">—</div>
                                <div class="text-[10px] text-white/30 mt-1">kg/año</div>
                            </div>
                            <div class="panel-surface rounded-2xl p-4 text-center">
                                <div class="text-[10px] uppercase tracking-wider text-white/38 mb-2">Cobertura</div>
                                <div class="text-lg font-bold text-purple-400" data-bind="sim-coverage">—</div>
                                <div class="text-[10px] text-white/30 mt-1">del consumo</div>
                            </div>
                        </div>

                        <!-- Summary bar -->
                        <div class="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-5 py-4">
                            <p class="text-sm text-emerald-200/85 leading-6" data-bind="sim-summary">Ajusta el slider para calcular el ROI solar de tu negocio con datos reales de Riohacha.</p>
                        </div>

                        <!-- Coverage bar -->
                        <div class="mt-5">
                            <div class="flex justify-between text-xs text-white/40 mb-2">
                                <span>Cobertura energética</span>
                                <span data-bind="sim-coverage-label">0%</span>
                            </div>
                            <div class="h-3 rounded-full bg-white/8 p-[2px]">
                                <div class="solar-gradient h-full rounded-full transition-all duration-700" data-bind="sim-coverage-bar" style="width: 0%"></div>
                            </div>
                        </div>

                        <!-- ROI note -->
                        <div class="mt-4 text-[11px] text-white/30">
                            * Calculado con: 5.0 HSP promedio Riohacha · 80% eficiencia del sistema · $3.500.000 COP/kWp · Tarifa activa del perfil seleccionado
                        </div>
                    </div>
                </div>
            </div>

            <!-- ══ VIEW: Alertas ══════════════════════════════════════════ -->
            <div data-view="alerts" class="hidden">
                <div class="py-4">
                    <div class="glass-card fade-in p-6">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <div class="text-xs uppercase tracking-[0.22em] text-white/38 mb-1">Sistema de alertas IA</div>
                                <h2 class="text-xl font-bold text-white">Alertas Energéticas Predictivas</h2>
                                <p class="mt-1 text-sm text-white/50">El agente monitorea condiciones solares, tarifas y patrones para anticipar riesgos</p>
                            </div>
                            <button data-role="refresh-alerts" class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60 hover:border-white/16 transition">
                                🔄 Actualizar
                            </button>
                        </div>

                        <!-- Cómo leer las alertas -->
                        <div class="mb-6 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4">
                            <div class="text-xs uppercase tracking-wider text-white/38 mb-3">¿Cómo leer las alertas?</div>
                            <div class="flex flex-wrap gap-2 mb-3">
                                <div class="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-200/80">🔴 <strong>Crítica</strong> — Actúa ahora. Impacto directo en tu factura hoy.</div>
                                <div class="flex items-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-3 py-2 text-xs text-yellow-200/80">🟡 <strong>Advertencia</strong> — Situación a vigilar. Actúa hoy para evitar sobrecosto.</div>
                                <div class="flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/5 px-3 py-2 text-xs text-sky-200/80">🔵 <strong>Info</strong> — Oportunidad o dato relevante para tu planificación.</div>
                            </div>
                            <p class="text-xs text-white/38 leading-5">Las alertas se generan con IA considerando la radiación solar del día, la <strong class="text-white/55">hora pico tarifaria de Air-e (18:00–21:00)</strong>, la temperatura ambiente y el perfil de consumo activo. Se actualizan automáticamente al cambiar de perfil.</p>
                        </div>

                        <!-- Alerts list -->
                        <div class="space-y-3" data-bind="alerts-list">
                            <!-- Skeleton while loading -->
                            <div class="alert-item">
                                <div class="skeleton-block h-8 w-8 rounded-lg shrink-0"></div>
                                <div class="flex-1">
                                    <div class="skeleton-block h-4 w-1/3 mb-2"></div>
                                    <div class="skeleton-block h-3 w-4/5"></div>
                                </div>
                            </div>
                            <div class="alert-item">
                                <div class="skeleton-block h-8 w-8 rounded-lg shrink-0"></div>
                                <div class="flex-1">
                                    <div class="skeleton-block h-4 w-1/4 mb-2"></div>
                                    <div class="skeleton-block h-3 w-3/4"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Footer context -->
                        <div class="mt-5 text-xs text-white/30 border-t border-white/6 pt-4" data-bind="alerts-context">
                            Generando alertas con datos solares en tiempo real de Riohacha...
                        </div>
                    </div>
                </div>
            </div>

            <!-- ══ VIEW: Historial ════════════════════════════════════════ -->
            <div data-view="history" class="hidden">
                <div class="py-4">

                    <!-- Intro explicativa -->
                    <div class="glass-card fade-in p-6 mb-5">
                        <div class="flex items-start gap-4">
                            <div class="text-3xl shrink-0 mt-0.5">🛰️</div>
                            <div>
                                <h2 class="text-lg font-bold text-white mb-1">Datos satelitales de radiación solar</h2>
                                <p class="text-sm leading-7 text-white/65">
                                    Los datos históricos provienen de <strong class="text-white/85">NASA POWER</strong>, un repositorio satelital de la NASA con más de 20 años de registros solares y meteorológicos para cualquier punto del planeta. La latitud exacta de Riohacha <strong class="text-white/85">(11.54°N, 72.90°W)</strong> permite ver con precisión cuánta radiación solar recibe La Guajira día a día — una región que aparece de forma consistente como la de <strong class="text-white/85">mayor potencial solar de Colombia</strong>.
                                </p>
                                <div class="mt-4 flex flex-wrap gap-2">
                                    <span class="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55"><span class="h-1.5 w-1.5 rounded-full bg-sky-400"></span> Fuente: NASA POWER API</span>
                                    <span class="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55"><span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> +20 años de datos verificados</span>
                                    <span class="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55"><span class="h-1.5 w-1.5 rounded-full bg-yellow-400"></span> Resolución diaria y mensual</span>
                                </div>
                                <p class="mt-3 text-[11px] text-white/32">⚠ NASA POWER actualiza los datos con un retraso de ~8 días por el procesamiento satelital. Los valores más recientes pueden ser estimados.</p>
                            </div>
                        </div>
                    </div>

                    <div class="glass-card fade-in overflow-hidden p-6">
                        <div class="flex items-center justify-between mb-2">
                            <div>
                                <div class="text-xs uppercase tracking-[0.22em] text-white/38 mb-1">Fuente: NASA POWER</div>
                                <h2 class="text-xl font-bold text-white">Historia Solar — Riohacha</h2>
                            </div>
                            <div class="flex gap-2" data-bind="history-tabs-full">
                                <button class="tab-button active rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-wider text-white/90">Semana</button>
                                <button class="tab-button rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wider text-white/55 hover:border-white/18">Mes</button>
                                <button class="tab-button rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wider text-white/55 hover:border-white/18">Año</button>
                            </div>
                        </div>
                        <div class="mb-3 text-xs text-white/40" data-bind="history-source-full">Cargando datos históricos...</div>
                        <div class="h-80 w-full">
                            <canvas id="solarHistoryChartFull"></canvas>
                        </div>
                        <div class="mt-5 grid grid-cols-3 gap-4" data-bind="history-stats-full"></div>
                    </div>
                </div>
            </div>
        </main>
    </body>
</html>
