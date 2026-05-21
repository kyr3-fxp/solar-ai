const dashboardRoot = document.querySelector('[data-dashboard="solar"]');

if (dashboardRoot) {
    const apiBase = (dashboardRoot.dataset.apiBase || '').replace(/\/$/, '');
    const elements = {
        bodyTime: document.querySelector('[data-bind="body-time"]'),
        heroDay: document.querySelector('[data-bind="hero-day"]'),
        heroClock: document.querySelector('[data-bind="hero-clock"]'),
        heroLocation: document.querySelector('[data-bind="hero-location"]'),
        heroRadiation: document.querySelector('[data-bind="hero-radiation"]'),
        heroState: document.querySelector('[data-bind="hero-state"]'),
        heroTemp: document.querySelector('[data-bind="hero-temp"]'),
        heroWind: document.querySelector('[data-bind="hero-wind"]'),
        radiationVsHistorical: document.querySelector('[data-bind="radiation-vs-historical"]'),
        solarIndex: document.querySelector('[data-bind="solar-index"]'),
        solarIndexLabel: document.querySelector('[data-bind="solar-index-label"]'),
        solarSummary: document.querySelector('[data-bind="solar-summary"]'),
        sunrise: document.querySelector('[data-bind="sunrise"]'),
        sunset: document.querySelector('[data-bind="sunset"]'),
        forecastList: document.querySelector('[data-bind="forecast-list"]'),
        hourlyList: document.querySelector('[data-bind="hourly-list"]'),
        recommendationsList: document.querySelector('[data-bind="recommendations-list"]'),
        monitoredList: document.querySelector('[data-bind="monitored-list"]'),
        uvIndex: document.querySelector('[data-bind="uv-index"]'),
        productionPct: document.querySelector('[data-bind="production-pct"]'),
        productionStatus: document.querySelector('[data-bind="production-status"]'),
        mapLegend: document.querySelector('[data-bind="map-legend"]'),
        mapInfo: document.querySelector('[data-bind="map-info"]'),
        profileGreeting: document.querySelector('[data-bind="profile-greeting"]'),
        profileSelector: document.querySelector('[data-role="profile-selector"]'),
        // Battery (removed card, keep refs safe)
        batteryCharge: document.querySelector('[data-bind="battery-charge"]'),
        batteryAutonomy: document.querySelector('[data-bind="battery-autonomy"]'),
        batteryProgress: document.querySelector('[data-bind="battery-progress"]'),
        batteryCycles: document.querySelector('[data-bind="battery-cycles"]'),
        batteryHealth: document.querySelector('[data-bind="battery-health"]'),
        // Consumption
        currentConsumption: document.querySelector('[data-bind="current-consumption"]'),
        consumptionProgress: document.querySelector('[data-bind="consumption-progress"]'),
        consumptionCostLabel: document.querySelector('[data-bind="consumption-cost-label"]'),
        consumptionCost: document.querySelector('[data-bind="consumption-cost"]'),
        consumptionToday: document.querySelector('[data-bind="consumption-today"]'),
        consumptionAvg: document.querySelector('[data-bind="consumption-avg"]'),
        consumptionDiff: document.querySelector('[data-bind="consumption-diff"]'),
        // History
        historySource: document.querySelector('[data-bind="history-source"]'),
        historyStats: document.querySelector('[data-bind="history-stats"]'),
        // Optimal / peak hours
        optimalHours: document.querySelector('[data-bind="optimal-hours"]'),
        peakCostHours: document.querySelector('[data-bind="peak-cost-hours"]'),
        // ROI
        roiInvestment: document.querySelector('[data-bind="roi-investment"]'),
        roiPayback: document.querySelector('[data-bind="roi-payback"]'),
        roiLabel: document.querySelector('[data-bind="roi-label"]'),
        aiReductionPct: document.querySelector('[data-bind="ai-reduction-pct"]'),
    };

    // ═══════════════════════════════════════════════════════
    // PROFILES — Perfiles de consumo para el pitch
    // ═══════════════════════════════════════════════════════
    // Tarifa base (fallback). Cada perfil define la suya según tipo de usuario Air-e La Guajira.
    // Comercial ~1050, Industrial ~850, Residencial estrato 3 ~780 COP/kWh
    const PROFILES = [
        {
            targetType: 'company',
            name: 'Hotel Majayura',
            companyType: 'hotel',
            tariffCopKwh: 1050,           // Tarifa comercial Air-e La Guajira
            monthlyConsumptionKwh: 12000,
            companySize: 18,              // empleados
            operatingHoursPerDay: 24,     // hotel 24h
            floorAreaM2: 1200,
            peakUsageHours: '18:00-22:00',
            mainLoads: ['aire acondicionado (30% consumo)', 'lavandería industrial (8%)', 'refrigeración cocina (12%)', 'iluminación (15%)', 'bombas de agua (5%)'],
            recommendations: {
                reasoning: 'Radiación alta detectada. Se priorizó mover cargas pesadas al mediodía y gestionar A/C en horas pico.',
                recommendations: [
                    { title: 'Mover lavandería al pico solar', description: 'Programa el lavado de toallas y sábanas entre 10:00 y 14:00, cuando la radiación es máxima.', priority: 'alta', timeWindow: '10:00 - 14:00', savingsCopDay: 48500 },
                    { title: 'Apagar A/C en habitaciones vacías', description: 'Con ocupación parcial, apaga el aire de las habitaciones sin huéspedes durante el día.', priority: 'media', timeWindow: '08:00 - 16:00', savingsCopDay: 22000 },
                    { title: 'Pre-enfriar cocina antes de las 6pm', description: 'Aprovecha la última hora de sol para bajar temperatura antes del pico tarifario.', priority: 'baja', timeWindow: '16:00 - 17:30', savingsCopDay: 12000 },
                ],
                totalSavingsCopDay: 82500,
                totalSavingsCopMonth: 2475000,
                alert: 'Concentra el consumo pesado en las horas de mayor radiación solar.',
            },
        },
        {
            targetType: 'company',
            name: 'Hielera del Caribe',
            companyType: 'hielera',
            tariffCopKwh: 850,            // Tarifa industrial media tensión
            monthlyConsumptionKwh: 28000,
            companySize: 6,               // empleados
            operatingHoursPerDay: 16,     // 05:00-21:00
            floorAreaM2: 600,
            peakUsageHours: '08:00-14:00',
            mainLoads: ['compresores industriales (80% consumo)', 'cámaras frías 4 unidades (12%)', 'bombas de agua (5%)', 'iluminación (3%)'],
            recommendations: {
                reasoning: 'Los compresores representan el 80% del consumo. Moverlos al pico solar genera el mayor impacto.',
                recommendations: [
                    { title: 'Programar compresores en pico solar', description: 'Concentra los ciclos de congelación entre 10:00 y 14:00, cuando la radiación cubre el consumo.', priority: 'alta', timeWindow: '10:00 - 14:00', savingsCopDay: 125000 },
                    { title: 'Mantenimiento preventivo cámaras frías', description: 'Sellos y serpentines limpios reducen el consumo del compresor hasta un 15%.', priority: 'media', timeWindow: 'Semanal', savingsCopDay: 42000 },
                    { title: 'Reducir apertura de cámaras en hora pico', description: 'Minimiza aperturas de puertas entre 18:00-21:00. Cada apertura pierde 3-5 min de frío.', priority: 'baja', timeWindow: '18:00 - 21:00', savingsCopDay: 18000 },
                ],
                totalSavingsCopDay: 185000,
                totalSavingsCopMonth: 5550000,
                alert: 'Los compresores consumen más cuando la temperatura supera 34°C. Hoy se espera temperatura alta.',
            },
        },
        {
            targetType: 'company',
            name: 'Restaurante Sazón Guajira',
            companyType: 'restaurante',
            tariffCopKwh: 1050,           // Tarifa comercial Air-e La Guajira
            monthlyConsumptionKwh: 8500,
            companySize: 40,              // clientes/día (capacidad)
            operatingHoursPerDay: 13,     // 09:00-22:00
            floorAreaM2: 280,
            peakUsageHours: '11:00-15:00',
            mainLoads: ['cocina industrial plancha/freidora (40% consumo)', 'refrigeración (25%)', 'aire acondicionado (20%)', 'iluminación (15%)'],
            recommendations: {
                reasoning: 'La cocina industrial y refrigeración dominan el consumo. Se priorizó desplazar cocción fuera del pico tarifario.',
                recommendations: [
                    { title: 'Cocinar antes del pico tarifario', description: 'Adelanta preparación de bases y fondos a 9:00-12:00. Evita cocina industrial entre 18:00-21:00.', priority: 'alta', timeWindow: '09:00 - 12:00', savingsCopDay: 28000 },
                    { title: 'Optimizar refrigeración nocturna', description: 'Baja la temperatura de neveras 2°C antes del cierre para mantener frío sin ciclos activos.', priority: 'media', timeWindow: '21:00 - 22:00', savingsCopDay: 12000 },
                    { title: 'A/C solo en horario de servicio', description: 'Enciende el A/C 30 min antes de abrir y apágalo al cerrar. No dejar encendido de noche.', priority: 'baja', timeWindow: '10:30 - 22:00', savingsCopDay: 8500 },
                ],
                totalSavingsCopDay: 48500,
                totalSavingsCopMonth: 1455000,
                alert: 'La temperatura hoy supera 34°C. El A/C consumirá más — prioriza ventilación cruzada.',
            },
        },
        {
            targetType: 'community',
            name: 'Riohacha',
            tariffCopKwh: 780,            // Tarifa residencial estrato 3 promedio Air-e
            populationEstimate: 246000,
            mainProblems: [
                'altos costos eléctricos',
                'picos de demanda',
                'apagones frecuentes',
                'baja gestión del consumo',
                'subaprovechamiento del potencial solar',
            ],
            recommendations: {
                reasoning: 'Riohacha tiene el mayor potencial solar de Colombia pero enfrenta tarifas altas y apagones. Las acciones colectivas impactan a miles de hogares.',
                recommendations: [
                    { title: 'Campaña masiva de consumo en horas solares', description: 'Promover que hogares y negocios concentren lavado, planchado y cocción entre 9:00-14:00 vía redes y emisoras.', priority: 'alta', timeWindow: '09:00 - 14:00', savingsCopDay: 850000 },
                    { title: 'Incentivos para paneles solares', description: 'Gestionar subsidios departamentales para PYMES. Con 6.5+ kWh/m², el retorno es menor a 3 años.', priority: 'media', timeWindow: 'Gestión continua', savingsCopDay: 320000 },
                    { title: 'Mantenimiento eléctrico comunitario', description: 'Jornadas de revisión de instalaciones. El 40% de pérdidas en barrios son por conexiones deficientes.', priority: 'baja', timeWindow: 'Fines de semana', savingsCopDay: 180000 },
                ],
                totalSavingsCopDay: 1350000,
                totalSavingsCopMonth: 40500000,
                alert: 'Con la radiación actual, Riohacha podría cubrir el 60% de su demanda con energía solar.',
            },
        },
    ];

    let activeProfileIndex = 0;
    // Cache de recomendaciones por perfil — se llena en la primera visita y no vuelve a llamar a la IA
    const recommendationsCache = {};

    const getActiveProfile = () => PROFILES[activeProfileIndex];

    const state = {
        today: null,
        forecast: [],
        score: null,
        recommendations: null,
        history: null,
        hourlyForecast: [],
    };

    const moneyFmt = new Intl.NumberFormat('es-CO');

    const formatCOP = (value) => `$${moneyFmt.format(Math.round(value || 0))}`;
    const formatNumber = (value, digits = 1) => Number(value || 0).toFixed(digits);

    // Tarifa eléctrica Riohacha (COP/kWh) — fuente: AGENTE-SOLAR-MAESTRO.md
    const TARIFF_COP_KWH = 943;

    const isServiceUnavailable = (error) => {
        const msg = (error?.message || '').toLowerCase();
        return msg.includes('503') || msg.includes('429') || msg.includes('no disponible')
            || msg.includes('quota') || msg.includes('rate') || msg.includes('servicio');
    };

    const isLightTheme = () => document.documentElement.getAttribute('data-theme') === 'light';
    const chartTextColor = () => isLightTheme() ? 'rgba(30,41,59,0.6)' : 'rgba(255,255,255,0.35)';
    const chartGridColor = () => isLightTheme() ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    const chartLegendColor = () => isLightTheme() ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.55)';

    const fetchJson = async (path, options = {}) => {
        const url = `${apiBase}${path}`;
        let response;
        try {
            response = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(options.headers || {}),
                },
                ...options,
            });
        } catch (networkError) {
            throw new Error(`No se pudo conectar con ${url}: ${networkError.message}`);
        }

        let json;
        try {
            json = await response.json();
        } catch {
            throw new Error(`Respuesta no-JSON desde ${url} (status ${response.status})`);
        }

        if (!response.ok || json.success === false) {
            throw new Error(json.error || json.detail || `Request failed with status ${response.status}`);
        }

        return json.data;
    };

    const loadScript = (src) => new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });

    const setText = (el, value) => {
        if (el) el.textContent = value;
    };

    const setHTML = (el, value) => {
        if (el) el.innerHTML = value;
    };

    const animateNumber = (el, target, { prefix = '', suffix = '', decimals = 0, duration = 1400 } = {}) => {
        if (!el) return;

        const start = performance.now();
        const initial = 0;

        const tick = (time) => {
            const progress = Math.min((time - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = initial + (target - initial) * eased;

            el.textContent = `${prefix}${current.toFixed(decimals)}${suffix}`;

            if (progress < 1) {
                requestAnimationFrame(tick);
            }
        };

        requestAnimationFrame(tick);
    };

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const shortDayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const iconMap = {
        sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`,
        'cloud-sun': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M12 2v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="M2 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><circle cx="12" cy="12" r="3"></circle><path d="M20 17a4 4 0 0 0-4-4h-.26A6 6 0 1 0 5 16.5"></path><path d="M16 22h4"></path></svg>`,
        battery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><rect x="3" y="7" width="16" height="10" rx="2"></rect><path d="M21 11v2"></path><path d="M7 11l3 3 7-7"></path></svg>`,
        zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="m13 2-9 12h7l-1 8 9-12h-7z"></path></svg>`,
        brain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M12 5a4 4 0 0 1 4-4"></path><path d="M8 5a4 4 0 0 0-4 4"></path><path d="M12 19a4 4 0 0 0 4 4"></path><path d="M8 19a4 4 0 0 1-4-4"></path><path d="M5 9a3 3 0 0 1 0 6"></path><path d="M19 9a3 3 0 0 0 0 6"></path><path d="M12 3v18"></path></svg>`,
        coins: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><ellipse cx="12" cy="5" rx="7" ry="3"></ellipse><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"></path><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"></path></svg>`,
        sunset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M12 3v2"></path><path d="M12 19v2"></path><path d="M4.22 10.22 5.64 11.64"></path><path d="M18.36 11.64l1.42-1.42"></path><path d="M3 17h18"></path><path d="M6 17a6 6 0 0 1 12 0"></path></svg>`,
        search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>`,
        moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`,
        github: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M9 19c-4.8 1.5-4.8-2.5-6.7-3m13.4 6v-3.2c0-.9.3-1.6-.4-2.3 2.7-.3 5.6-1.3 5.6-6a4.7 4.7 0 0 0-1.3-3.3 4.4 4.4 0 0 0-.1-3.3s-1-.3-3.3 1.3a11.4 11.4 0 0 0-6 0C7.8 3.1 6.8 3.4 6.8 3.4a4.4 4.4 0 0 0-.1 3.3A4.7 4.7 0 0 0 5.4 10c0 4.7 2.9 5.7 5.6 6-.5.5-.5 1-.4 1.8V22"></path></svg>`,
    };

    const icon = (name) => iconMap[name] || '';

    /* ── Forecast ── */
    const renderForecastList = (forecast) => {
        if (!elements.forecastList) return;

        const items = forecast.slice(0, 10).map((day, index) => {
            const dayLabel = index === 0 ? 'Hoy' : shortDayNames[new Date(day.date).getDay()];
            const iconName = day.solarIndex >= 80 ? 'sun' : 'cloud-sun';
            const low = Math.max(day.radiationKwhM2 - 1.2, 0).toFixed(1);
            const high = day.radiationKwhM2.toFixed(1);

            return `
                <div class="grid grid-cols-[64px_24px_1fr_52px] items-center gap-3 border-b border-white/6 py-3 last:border-none">
                    <div class="text-sm font-semibold text-white">${dayLabel}</div>
                    <div class="text-white/80">${icon(iconName)}</div>
                    <div class="relative h-2 rounded-full bg-white/10">
                        <div class="absolute left-0 top-0 h-full rounded-full solar-gradient" style="width:${Math.max(20, Math.min(day.solarIndex, 100))}%"></div>
                    </div>
                    <div class="text-right text-sm text-white/85">${low} <span class="text-white/35">/</span> ${high}</div>
                </div>
            `;
        });

        setHTML(elements.forecastList, items.join(''));
    };

    /* ── Hourly ── */
    const renderHourlyItems = (hourSlots) => {
        const items = hourSlots.map(({ label, value }) => `
            <div class="flex flex-col items-center gap-3">
                <div class="text-xs uppercase tracking-[0.28em] text-white/45">${label}</div>
                <div class="text-white/80">${icon('sun')}</div>
                <div class="mt-1 text-sm font-semibold text-white">${value}</div>
                <div class="h-16 w-3 rounded-full bg-white/8 p-[2px]">
                    <div class="h-full w-full rounded-full solar-gradient" style="transform: scaleY(${Math.max(0.2, Math.min(value / 7, 1))}); transform-origin: bottom;"></div>
                </div>
            </div>
        `);
        setHTML(elements.hourlyList, items.join(''));
    };

    const renderHourly = (today) => {
        if (!elements.hourlyList || !today) return;

        // Usar datos horarios reales que vienen incluidos en /api/solar/today
        const hourlyReal = today.hourlyRadiation;
        if (Array.isArray(hourlyReal) && hourlyReal.length > 0) {
            // Filtrar horas con radiación > 0 y tomar las 5 horas pico (mayor W/m²)
            const withSun = hourlyReal.filter(h => h.radiationWm2 > 10);
            if (withSun.length >= 3) {
                const top5 = withSun
                    .sort((a, b) => b.radiationWm2 - a.radiationWm2)
                    .slice(0, 5)
                    .sort((a, b) => a.hour - b.hour); // volver a orden cronológico

                renderHourlyItems(top5.map(h => ({
                    label: String(h.hour).padStart(2, '0'),
                    value: parseFloat((h.radiationWm2 / 1000).toFixed(2)), // W/m² → kWh/m²
                })));
                return;
            }
        }

        // Fallback sintético solo si la API no devuelve datos horarios
        const base = today.radiationKwhM2;
        const slots = [
            { label: '10', value: Math.max(0, base - 1.1) },
            { label: '11', value: Math.max(0, base - 0.6) },
            { label: '12', value: base },
            { label: '13', value: Math.max(0, base - 0.2) },
            { label: '14', value: Math.max(0, base - 0.8) },
        ].map(s => ({ label: s.label, value: parseFloat(s.value.toFixed(2)) }));

        renderHourlyItems(slots);
    };

    /* ── Recommendations ── */
    const renderRecommendations = (payload) => {
        if (!elements.recommendationsList || !payload) return;

        const reasoningEl = document.querySelector('[data-bind="ai-reasoning"]');
        if (reasoningEl) {
            if (payload.reasoning) {
                reasoningEl.textContent = payload.reasoning;
                reasoningEl.classList.remove('hidden');
            } else {
                reasoningEl.classList.add('hidden');
            }
        }

        const alertEl = document.querySelector('[data-bind="ai-alert"]');
        if (alertEl) {
            if (payload.alert) {
                alertEl.textContent = `⚠ ${payload.alert}`;
                alertEl.classList.remove('hidden');
            } else {
                alertEl.classList.add('hidden');
            }
        }

        const cards = payload.recommendations
            .map((item, index) => {
                const priorityClass =
                    item.priority === 'alta'
                        ? 'text-red-300 border-red-400/20 bg-red-400/5'
                        : item.priority === 'media'
                            ? 'text-yellow-200 border-yellow-400/20 bg-yellow-400/5'
                            : 'text-green-200 border-green-400/20 bg-green-400/5';

                return `
                    <div class="glass-card p-4 ${index > 0 ? 'mt-3' : ''}">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <div class="text-sm font-semibold text-white">${item.title}</div>
                                <div class="mt-2 text-sm leading-6 text-white/68">${item.description}</div>
                            </div>
                            <span class="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${priorityClass}">
                                ${item.priority}
                            </span>
                        </div>
                        <div class="mt-4 flex items-center justify-between text-xs text-white/46">
                            <span>${item.timeWindow}</span>
                            <span>${formatCOP(item.savingsCopDay)} / día</span>
                        </div>
                    </div>
                `;
            })
            .join('');

        setHTML(elements.recommendationsList, cards);
        document.querySelectorAll('[data-bind="savings-daily"]').forEach(el => el.textContent = formatCOP(payload.totalSavingsCopDay));
        document.querySelectorAll('[data-bind="savings-monthly"]').forEach(el => el.textContent = formatCOP(payload.totalSavingsCopMonth));

        // Ahorro Potencial (tarjeta Consumo Energético General)
        const profile = getActiveProfile();
        const tariff = profile.tariffCopKwh || TARIFF_COP_KWH;
        const dailyKwh = Math.round((profile.monthlyConsumptionKwh || 5400) / 30);
        const savingsPct = (payload.totalSavingsCopDay / (dailyKwh * tariff)) * 100;
        document.querySelectorAll('[data-bind="consumption-savings-pct"]').forEach(el => {
            el.textContent = `-${Math.min(savingsPct, 99).toFixed(1)}%`;
        });

        // Reducción IA — tarjeta ROI
        if (elements.aiReductionPct) {
            elements.aiReductionPct.textContent = `-${Math.min(savingsPct, 99).toFixed(1)}%`;
        }
    };

    /* ── Monitored Companies ── */
    const renderMonitoredCities = () => {
        if (!elements.monitoredList) return;

        setHTML(
            elements.monitoredList,
            PROFILES
                .map(
                    (profile, index) => {
                        const isActive = index === activeProfileIndex;
                        const activeClass = isActive
                            ? 'border-emerald-400/30 bg-emerald-400/5 translate-x-1'
                            : '';
                        const label = profile.targetType === 'community'
                            ? `${profile.name} (Comunidad)`
                            : profile.name;
                        const badge = isActive
                            ? '<span class="ml-auto h-2 w-2 rounded-full bg-emerald-400"></span>'
                            : '';

                        return `
                            <button
                                class="glass-card w-full px-4 py-3 text-left text-sm text-white/88 transition hover:translate-x-1 hover:border-white/16 flex items-center ${activeClass}"
                                data-profile-index="${index}"
                            >
                                <span>${index + 1}. ${label}</span>
                                ${badge}
                            </button>
                        `;
                    },
                )
                .join(''),
        );

        // Click on monitored company switches profile
        elements.monitoredList.querySelectorAll('[data-profile-index]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.profileIndex, 10);
                if (elements.profileSelector) elements.profileSelector.value = String(idx);
                switchProfile(idx);
            });
        });
    };

    /* ── Map Card (Leaflet) ── */
    let solarMap = null;

    const renderMapCard = (today, score) => {
        if (elements.mapLegend) {
            setText(elements.mapLegend, score?.label || 'Radiación en vivo');
        }

        if (elements.mapInfo) {
            setText(
                elements.mapInfo,
                today
                    ? `${today.location} · ${formatNumber(today.radiationKwhM2, 1)} kWh/m² · ${today.temperatureC.toFixed(1)}°C`
                    : 'Riohacha, La Guajira',
            );
        }

        // Initialize Leaflet map
        const mapEl = document.getElementById('solarMap');
        if (!mapEl || typeof L === 'undefined') return;

        if (solarMap) {
            solarMap.invalidateSize();
            return;
        }

        solarMap = L.map('solarMap', {
            center: [11.5444, -72.9072],
            zoom: 11,
            zoomControl: false,
            attributionControl: false,
        });

        // Dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
        }).addTo(solarMap);

        // Solar radiation marker for Riohacha
        if (today) {
            const radiationColor = today.radiationKwhM2 >= 6.5 ? '#22c55e'
                : today.radiationKwhM2 >= 5.0 ? '#facc15'
                : '#f97316';

            const marker = L.circleMarker([11.5444, -72.9072], {
                radius: 18,
                fillColor: radiationColor,
                fillOpacity: 0.35,
                color: radiationColor,
                weight: 2,
            }).addTo(solarMap);

            marker.bindPopup(`
                <div style="font-family:system-ui;font-size:12px;color:#333;">
                    <strong>Riohacha, La Guajira</strong><br>
                    Radiación: ${today.radiationKwhM2} kWh/m²<br>
                    Temperatura: ${today.temperatureC}°C<br>
                    Índice Solar: ${today.solarIndex}/100
                </div>
            `);

            // Halo pulsante
            L.circleMarker([11.5444, -72.9072], {
                radius: 30,
                fillColor: radiationColor,
                fillOpacity: 0.1,
                color: radiationColor,
                weight: 1,
                opacity: 0.4,
            }).addTo(solarMap);
        }

        // Add zoom control in a custom position
        L.control.zoom({ position: 'topright' }).addTo(solarMap);
    };

    /* ── Battery ──
       La API no expone datos de baterías. Se muestra una estimación
       correlacionada con el índice solar actual (badge "Demo" en UI). */
    const renderBattery = (today) => {
        if (!elements.batteryCharge) return;

        const solarIdx = today?.solarIndex ?? 50;
        const hour = new Date().getHours();

        let charge;
        if (hour >= 9 && hour <= 17) {
            // Horas solares: la batería carga según el índice solar del día
            const progress = (hour - 9) / 8; // 0 → 1 a lo largo del día solar
            charge = Math.round(20 + solarIdx * 0.65 * Math.min(1, progress + 0.3));
        } else if (hour > 17) {
            // Noche: descarga desde el máximo alcanzado
            const hoursAfter = hour - 17;
            charge = Math.max(18, Math.round(20 + solarIdx * 0.65) - hoursAfter * 4);
        } else {
            // Madrugada
            charge = Math.max(18, 38 - hour * 3);
        }
        charge = Math.min(95, Math.max(18, charge));

        // Autonomía estimada: basada en consumo del perfil activo
        const profile = getActiveProfile();
        const dailyKwh = (profile.monthlyConsumptionKwh || 5400) / 30;
        const batteryKwh = dailyKwh / 6; // capacidad ≈ 4h de consumo promedio
        const remainingKwh = batteryKwh * (charge / 100);
        const autonomyH = Math.max(0.5, remainingKwh / (dailyKwh / 24)).toFixed(1);

        setText(elements.batteryCharge, `${charge}%`);
        setText(elements.batteryAutonomy, `${autonomyH} h`);
        setText(elements.batteryCycles, '312');
        setText(elements.batteryHealth, '92%');

        if (elements.batteryProgress) elements.batteryProgress.style.width = `${charge}%`;
    };

    /* ── Consumption ──
       Deriva del consumo mensual del perfil activo.
       Tarifa: diferenciada por tipo de usuario (comercial/industrial/residencial).
       Consumo Hoy: ajustado por índice solar real (mayor sol = menos consumo de red).
       Base del Perfil: consumo sin generación solar (línea base). */
    const renderConsumption = (today) => {
        if (!elements.currentConsumption) return;

        const profile = getActiveProfile();
        const tariff = profile.tariffCopKwh || TARIFF_COP_KWH;
        const baseKwh = Math.round((profile.monthlyConsumptionKwh || 5400) / 30);
        const maxKwh = Math.round(baseKwh * 1.3);

        // Consumo Hoy: el índice solar reduce el consumo de red (autogeneración solar)
        // Máx 15% de reducción en día perfecto (índice 100). Fórmula basada en curva solar Riohacha.
        const solarIdx = today?.solarIndex ?? 50;
        const solarReduction = Math.round(baseKwh * (solarIdx / 100) * 0.15);
        const todayKwh = baseKwh - solarReduction;
        const diffPct = -parseFloat(((solarReduction / baseKwh) * 100).toFixed(1));

        const costDay = formatCOP(todayKwh * tariff);

        setText(elements.currentConsumption, `${todayKwh} kWh`);
        setText(elements.consumptionCost, costDay);
        setText(elements.consumptionToday, todayKwh.toLocaleString('es-CO'));
        setText(elements.consumptionAvg, baseKwh.toLocaleString('es-CO'));
        setText(elements.consumptionDiff, `${diffPct >= 0 ? '+' : ''}${formatNumber(diffPct, 1)}%`);

        if (elements.consumptionProgress) {
            elements.consumptionProgress.style.width = `${Math.min(100, (todayKwh / maxKwh) * 100)}%`;
        }

        const hour = new Date().getHours();
        const isPeak = hour >= 18 && hour <= 21;
        setText(elements.consumptionCostLabel, isPeak
            ? `Costo hora pico · $${tariff}/kWh`
            : `Costo est. / día · $${tariff}/kWh`);

        return { baseKwh, todayKwh, maxKwh, tariff };
    };

    /* ── ROI Solar ──
       Calcula el retorno de inversión en paneles solares para el perfil activo.
       Parámetros Riohacha: 5 horas sol pico/día, $3.5M COP/kWp instalado. */
    const renderROI = (profile, tariff) => {
        if (!elements.roiInvestment) return;

        const baseKwh = (profile.monthlyConsumptionKwh || 5400) / 30;
        const coveragePct = 0.40;           // Cubrir 40% del consumo con paneles
        const peakSunHours = 5.0;           // Horas sol pico Riohacha (hsp)
        const costPerKwp = 3_500_000;       // COP/kWp instalado (promedio Colombia 2025)
        const systemEfficiency = 0.80;      // Pérdidas: inversor, temperatura, cables

        const kWpNeeded = (baseKwh * coveragePct) / (peakSunHours * systemEfficiency);
        const investment = Math.round(kWpNeeded * costPerKwp);
        const annualGenKwh = kWpNeeded * peakSunHours * systemEfficiency * 365;
        const annualSavings = annualGenKwh * tariff;
        const paybackYears = parseFloat((investment / annualSavings).toFixed(1));

        const investFmt = investment >= 1_000_000
            ? `$${(investment / 1_000_000).toFixed(1)}M`
            : formatCOP(investment);

        setText(elements.roiInvestment, investFmt);
        setText(elements.roiPayback, `${paybackYears} años`);
        setText(elements.roiLabel,
            `${kWpNeeded.toFixed(1)} kWp · Genera ${Math.round(annualGenKwh).toLocaleString('es-CO')} kWh/año · Ahorro: ${formatCOP(annualSavings)}/año`);
    };

    /* ── History Chart ── */
    let historyChart = null;

    const renderHistory = async (days) => {
        if (!elements.historySource) return;

        try {
            // NASA POWER has ~7 day data delay — offset dates accordingly
            const NASA_DELAY = 8;
            const toDate = new Date();
            toDate.setDate(toDate.getDate() - NASA_DELAY);
            const fromDate = new Date(toDate);
            fromDate.setDate(fromDate.getDate() - days);
            const history = await fetchJson(`/api/solar/history?from=${fromDate.toISOString().split('T')[0]}&to=${toDate.toISOString().split('T')[0]}`);

            state.history = history;
            const daily = history.daily || [];
            const monthly = history.monthly || [];
            const useMonthly = days >= 180 && monthly.length > 0;

            // Stats row — prefer API-level aggregates, fall back to computing from arrays
            if (elements.historyStats) {
                const source = useMonthly ? monthly.map(m => m.averageRadiation) : daily.map(d => d.radiationKwhM2);
                const avg = history.averageRadiation ?? (source.length ? source.reduce((a, b) => a + b, 0) / source.length : 0);
                const max = history.maxRadiation ?? (source.length ? Math.max(...source) : 0);
                const min = history.minRadiation ?? (source.length ? Math.min(...source) : 0);
                setHTML(elements.historyStats, `
                    <div class="panel-surface rounded-xl p-3">
                        <div class="text-[10px] uppercase tracking-wider text-white/35">Promedio</div>
                        <div class="mt-1 text-base font-bold text-white">${avg.toFixed(2)} <span class="text-[10px] text-white/40">kWh/m²</span></div>
                    </div>
                    <div class="panel-surface rounded-xl p-3">
                        <div class="text-[10px] uppercase tracking-wider text-white/35">Máxima</div>
                        <div class="mt-1 text-base font-bold text-white">${max.toFixed(2)} <span class="text-[10px] text-white/40">kWh/m²</span></div>
                    </div>
                    <div class="panel-surface rounded-xl p-3">
                        <div class="text-[10px] uppercase tracking-wider text-white/35">Mínima</div>
                        <div class="mt-1 text-base font-bold text-white">${min.toFixed(2)} <span class="text-[10px] text-white/40">kWh/m²</span></div>
                    </div>
                `);
            }

            const datasetSize = useMonthly ? monthly.length : daily.length;
            setText(elements.historySource, `Fuente: ${history.source || 'NASA / Open-Meteo'} · ${useMonthly ? `${datasetSize} meses` : `${datasetSize} días`}`);

            await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js');

            const canvas = document.getElementById('solarHistoryChart');
            if (!canvas || typeof Chart === 'undefined') return;

            if (historyChart) historyChart.destroy();

            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 240);
            gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
            gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

            let chartLabels, chartValues, chartType;
            if (useMonthly) {
                chartLabels = monthly.map(m => m.monthName ? m.monthName.slice(0, 3) : `${m.year}/${m.month}`);
                chartValues = monthly.map(m => m.averageRadiation);
                chartType = 'bar';
            } else {
                chartLabels = daily.map(d => {
                    const date = new Date(d.date);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                });
                chartValues = daily.map(d => d.radiationKwhM2);
                chartType = 'line';
            }

            historyChart = new Chart(ctx, {
                type: chartType,
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Radiación kWh/m²',
                        data: chartValues,
                        borderColor: 'rgba(56, 189, 248, 0.85)',
                        backgroundColor: chartType === 'bar' ? 'rgba(56, 189, 248, 0.4)' : gradient,
                        fill: chartType === 'line',
                        tension: chartType === 'line' ? 0.35 : 0,
                        pointRadius: chartType === 'line' ? 2 : 0,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#38bdf8',
                        borderWidth: chartType === 'line' ? 2 : 0,
                        borderRadius: chartType === 'bar' ? 5 : 0,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(10, 10, 10, 0.9)',
                            titleColor: '#fff',
                            bodyColor: 'rgba(255,255,255,0.7)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 10,
                        },
                    },
                    scales: {
                        x: {
                            grid: { color: chartGridColor(), drawBorder: false },
                            ticks: { color: chartTextColor(), font: { size: 10 }, maxRotation: 0 },
                        },
                        y: {
                            grid: { color: chartGridColor(), drawBorder: false },
                            ticks: { color: chartTextColor(), font: { size: 10 } },
                        },
                    },
                },
            });
        } catch (e) {
            console.warn('History chart error:', e);
            setText(elements.historySource, 'No se pudieron cargar los datos históricos.');
        }
    };

    /* ── Consumption Chart ── */
    let consumptionChart = null;

    const renderConsumptionChart = async (today) => {
        const canvas = document.getElementById('consumptionChart');
        if (!canvas) return;

        try {
            await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js');

            if (consumptionChart) consumptionChart.destroy();

            const labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];

            // Producción solar: basada en radiación real del día (kWh/m²)
            // Distribución horaria típica de curva solar
            const radiation = today?.radiationKwhM2 ?? 6.5;
            const solarFactors = [0, 0, 0.07, 0.42, 0.34, 0.14, 0.03];
            const production = solarFactors.map(f => parseFloat((f * radiation * 0.9).toFixed(2)));

            // Consumo: derivado del perfil activo, su patrón operativo y ajuste solar
            const profile = getActiveProfile();
            const baseKwhDay = (profile.monthlyConsumptionKwh || 5400) / 30;
            const solarIdxNow = today?.solarIndex ?? 50;
            const solarReductionFactor = 1 - (solarIdxNow / 100) * 0.15;
            const dailyKwh = baseKwhDay * solarReductionFactor;
            const patterns = {
                hotel:      [0.08, 0.05, 0.12, 0.15, 0.18, 0.27, 0.15],
                hielera:    [0.10, 0.07, 0.18, 0.22, 0.20, 0.14, 0.09],
                restaurante:[0.05, 0.03, 0.10, 0.25, 0.14, 0.31, 0.12],
            };
            const pattern = patterns[profile.companyType] || [0.12, 0.06, 0.14, 0.12, 0.15, 0.29, 0.12];
            const consumptionValues = pattern.map(f => parseFloat((f * dailyKwh).toFixed(1)));

            const ctx = canvas.getContext('2d');
            const prodGradient = ctx.createLinearGradient(0, 0, 0, 240);
            prodGradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
            prodGradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');

            const consGradient = ctx.createLinearGradient(0, 0, 0, 240);
            consGradient.addColorStop(0, 'rgba(56, 189, 248, 0.2)');
            consGradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

            consumptionChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Producción Solar (kWh)',
                            data: production,
                            backgroundColor: prodGradient,
                            borderColor: 'rgba(34, 197, 94, 0.6)',
                            borderWidth: 1,
                            borderRadius: 4,
                            type: 'line',
                            tension: 0.35,
                            fill: true,
                            pointRadius: 2,
                            yAxisID: 'y',
                        },
                        {
                            label: 'Consumo (kWh)',
                            data: consumptionValues,
                            backgroundColor: consGradient,
                            borderColor: 'rgba(251, 146, 60, 0.5)',
                            borderWidth: 1,
                            borderRadius: 4,
                            type: 'bar',
                            yAxisID: 'y1',
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { labels: { color: chartLegendColor(), boxWidth: 12, font: { size: 10 } } },
                        tooltip: {
                            backgroundColor: 'rgba(10, 10, 10, 0.9)',
                            titleColor: '#fff',
                            bodyColor: 'rgba(255,255,255,0.7)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 10,
                        },
                    },
                    scales: {
                        x: {
                            grid: { color: chartGridColor(), drawBorder: false },
                            ticks: { color: chartTextColor(), font: { size: 10 } },
                        },
                        y: {
                            position: 'left',
                            grid: { color: chartGridColor(), drawBorder: false },
                            display: true,
                            ticks: { color: 'rgba(34, 197, 94, 0.7)', font: { size: 10 } },
                            title: { display: true, text: 'Solar', color: 'rgba(34,197,94,0.8)', font: { size: 10 } },
                        },
                        y1: {
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            display: true,
                            ticks: { color: 'rgba(251,146,60,0.7)', font: { size: 10 } },
                            title: { display: true, text: 'Consumo', color: 'rgba(251,146,60,0.8)', font: { size: 10 } },
                            stacked: true,
                        },
                    },
                },
            });
        } catch (e) {
            console.warn('Consumption chart error:', e);
        }
    };

    /* ── Clock ── */
    const updateClock = () => {
        const now = new Date();
        const day = dayNames[now.getDay()];

        if (elements.heroClock) {
            elements.heroClock.textContent = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        }
        if (elements.heroDay) {
            elements.heroDay.textContent = day;
        }
    };

    /* ═══════════════════════════════════════════════════════
       LOAD DASHBOARD
    ═══════════════════════════════════════════════════════ */
    const loadDashboard = async () => {
        try {
            const [today, forecast, score] = await Promise.all([
                fetchJson('/api/solar/today'),
                fetchJson('/api/solar/forecast?days=10'),
                fetchJson('/api/solar/score'),
            ]);

            state.today = today;
            state.forecast = forecast?.data || [];
            state.score = score;

            // ── Hero ──
            const now = new Date();
            if (elements.heroDay) elements.heroDay.textContent = dayNames[now.getDay()];
            if (elements.heroClock) elements.heroClock.textContent = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            if (elements.heroLocation) elements.heroLocation.textContent = today.location || 'Riohacha, Colombia';
            if (elements.heroState) elements.heroState.textContent = today.solarIndexLabel || 'Radiación estable';
            if (elements.heroTemp) elements.heroTemp.textContent = `${Math.round(today.temperatureC)}°C`;
            if (elements.heroWind) elements.heroWind.textContent = today.windSpeedKmh != null ? `${Math.round(today.windSpeedKmh)} km/h` : '—';
            if (elements.sunrise) elements.sunrise.textContent = today.sunrise || '--:--';
            if (elements.sunset) elements.sunset.textContent = today.sunset || '--:--';
            if (elements.productionStatus) elements.productionStatus.textContent = today.solarIndexLabel || 'Producción óptima.';
            if (elements.uvIndex) elements.uvIndex.textContent = today.uvIndex != null ? today.uvIndex.toFixed(1) : (score?.score ? String(score.score) : '—');

            if (elements.optimalHours) elements.optimalHours.textContent = today.optimalHours?.length ? today.optimalHours.join(', ') : '—';
            if (elements.peakCostHours) elements.peakCostHours.textContent = today.peakCostHours?.length ? today.peakCostHours.join(', ') : '—';

            animateNumber(elements.heroRadiation, today.radiationKwhM2, { decimals: 1, suffix: ' kWh/m²' });
            animateNumber(elements.solarIndex, score?.score || today.solarIndex || 0, { decimals: 0 });

            if (elements.solarIndexLabel) elements.solarIndexLabel.textContent = score?.label || today.solarIndexLabel || 'Día estable';
            if (elements.solarSummary) elements.solarSummary.textContent = score?.summary || 'Radiación estable para las próximas horas.';

            // Comparativa vs. promedio histórico 90 días (NASA POWER)
            if (elements.radiationVsHistorical && score?.historicalAvgKwhM2 > 0) {
                const vsP = score.vsHistoricalPct;
                const sign = vsP >= 0 ? '+' : '';
                const color = vsP >= 2 ? 'text-emerald-400' : vsP < -2 ? 'text-orange-400' : 'text-white/55';
                elements.radiationVsHistorical.innerHTML =
                    `<span class="${color}">${sign}${vsP}%</span> vs. promedio 90d · ${score.historicalAvgKwhM2} kWh/m²`;
            }

            // ── Progress bars ──
            const scoreVal = score?.score || today.solarIndex || 0;
            if (elements.productionProgress) {
                elements.productionProgress.style.width = `${Math.max(0, Math.min(scoreVal, 100))}%`;
            }
            if (elements.productionPct) elements.productionPct.textContent = `${scoreVal}/100`;

            renderForecastList(state.forecast);
            renderHourly(today);
            renderMonitoredCities();
            renderMapCard(today, score);

            // ── Battery ──
            renderBattery(today);

            // ── Consumption ──
            renderConsumption(today);

            // ── ROI Solar ──
            const activeProfile = getActiveProfile();
            renderROI(activeProfile, activeProfile.tariffCopKwh || TARIFF_COP_KWH);

            // ── Charts (lazy, after CDN loads) ──
            renderConsumptionChart(today);

            // Try load history (non-blocking)
            renderHistory(7);

            // Load recommendations for active profile
            await loadProfileRecommendations();

            if (window.lucide) window.lucide.createIcons();
        } catch (error) {
            console.error('Dashboard load error:', error);
            // API de datos solares no disponible — usar recomendaciones estáticas del perfil activo
            const profile = getActiveProfile();
            renderRecommendations(profile.recommendations);
            showFallbackIndicators(error);
            // Still try consumption chart on fallback
            renderConsumptionChart();
        }
    };

    /* ═══════════════════════════════════════════════════════
       PROFILE SYSTEM — Load recommendations per profile
    ═══════════════════════════════════════════════════════ */
    const updateSectionVisibility = (profile) => {
        const isCommunity = profile.targetType === 'community';

        // Toggle company-only sections
        document.querySelectorAll('[data-section="company-only"]').forEach(el => {
            el.style.display = isCommunity ? 'none' : '';
            el.classList.toggle('hidden', isCommunity);
        });

        // Toggle community-only sections
        document.querySelectorAll('[data-section="community-only"]').forEach(el => {
            el.style.display = isCommunity ? '' : 'none';
            el.classList.toggle('hidden', !isCommunity);
        });

        // Populate community data
        if (isCommunity) {
            const popEl = document.querySelector('[data-bind="community-population"]');
            const nameEl = document.querySelector('[data-bind="community-name"]');
            const problemsEl = document.querySelector('[data-bind="community-problems"]');
            const popNumEl = document.querySelector('[data-bind="community-pop-number"]');

            if (popEl) popEl.textContent = `${(profile.populationEstimate || 246000).toLocaleString('es-CO')} hab.`;
            if (popNumEl) popNumEl.textContent = `${Math.round((profile.populationEstimate || 246000) / 1000)}K`;

            if (nameEl) {
                nameEl.innerHTML = `
                    <div class="text-2xl font-bold text-white">${profile.name}</div>
                    <div class="mt-1 text-sm text-white/50">La Guajira, Colombia</div>
                `;
            }

            if (problemsEl && profile.mainProblems) {
                problemsEl.innerHTML = profile.mainProblems.map(p => `
                    <div class="community-problem-item flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
                        <span class="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0"></span>
                        ${p.charAt(0).toUpperCase() + p.slice(1)}
                    </div>
                `).join('');
            }
        }
    };

    const showFallbackIndicators = (error) => {
        const badge = document.querySelector('[data-bind="ai-fallback-badge"]');
        const msg = document.querySelector('[data-bind="ai-fallback-message"]');
        if (badge) badge.classList.remove('hidden');
        if (msg) {
            msg.textContent = isServiceUnavailable(error)
                ? '⚡ La cuota del agente IA está agotada por hoy. Mostrando recomendaciones precargadas para este perfil.'
                : '⚠ No se pudo conectar con el agente. Mostrando recomendaciones predeterminadas.';
            msg.classList.remove('hidden');
        }
    };

    const hideFallbackIndicators = () => {
        document.querySelector('[data-bind="ai-fallback-badge"]')?.classList.add('hidden');
        document.querySelector('[data-bind="ai-fallback-message"]')?.classList.add('hidden');
    };

    const loadProfileRecommendations = async () => {
        const profile = getActiveProfile();
        const cacheKey = activeProfileIndex;

        setText(elements.profileGreeting, `Bienvenido, ${profile.name}`);
        updateSectionVisibility(profile);

        // Si ya tenemos resultado cacheado para este perfil, úsalo directamente
        if (recommendationsCache[cacheKey]) {
            hideFallbackIndicators();
            renderRecommendations(recommendationsCache[cacheKey]);
            return;
        }

        hideFallbackIndicators();

        const reasoningEl = document.querySelector('[data-bind="ai-reasoning"]');
        const alertEl = document.querySelector('[data-bind="ai-alert"]');
        if (reasoningEl) reasoningEl.classList.add('hidden');
        if (alertEl) alertEl.classList.add('hidden');

        // Clear stale savings so previous profile's values don't linger
        document.querySelectorAll('[data-bind="savings-daily"]').forEach(el => { el.textContent = '—'; });
        document.querySelectorAll('[data-bind="savings-monthly"]').forEach(el => { el.textContent = '—'; });
        document.querySelectorAll('[data-bind="consumption-savings-pct"]').forEach(el => { el.textContent = '—'; });
        if (elements.aiReductionPct) elements.aiReductionPct.textContent = '—';

        // Loading state
        if (elements.recommendationsList) {
            elements.recommendationsList.innerHTML = `
                <div class="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/40">
                    <span class="inline-flex gap-1">
                        <span class="animate-pulse">.</span>
                        <span class="animate-pulse" style="animation-delay:0.2s">.</span>
                        <span class="animate-pulse" style="animation-delay:0.4s">.</span>
                    </span>
                    Consultando agente IA...
                </div>`;
        }

        try {
            const payload = {
                targetType: profile.targetType,
                name: profile.name,
                ...(profile.targetType !== 'community'
                    ? {
                        companyType: profile.companyType,
                        monthlyConsumptionKwh: profile.monthlyConsumptionKwh,
                        companySize: profile.companySize,
                        peakUsageHours: profile.peakUsageHours,
                        mainLoads: profile.mainLoads,
                        tariffCopKwh: profile.tariffCopKwh,
                        operatingHoursPerDay: profile.operatingHoursPerDay ?? null,
                    }
                    : {
                        populationEstimate: profile.populationEstimate,
                        mainProblems: profile.mainProblems,
                    }),
            };

            const data = await fetchJson('/api/ai/recommendations', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            // Solo cachear si viene del agente real
            recommendationsCache[cacheKey] = data;
            renderRecommendations(data);
        } catch (apiError) {
            console.warn('AI recommendations API failed:', apiError);

            // Fallback: datos del perfil activo — siempre coherentes con el perfil mostrado
            renderRecommendations(profile.recommendations);
            showFallbackIndicators(apiError);
        }
    };

    const switchProfile = async (index) => {
        activeProfileIndex = index;
        const profile = getActiveProfile();

        setText(elements.profileGreeting, `Bienvenido, ${profile.name}`);
        renderMonitoredCities();

        // Re-render consumption, ROI and chart with new profile context
        renderConsumption(state.today);
        renderBattery(state.today);
        const newProfile = getActiveProfile();
        renderROI(newProfile, newProfile.tariffCopKwh || TARIFF_COP_KWH);
        renderConsumptionChart(state.today);

        await loadProfileRecommendations();
    };

    // Profile selector event
    if (elements.profileSelector) {
        elements.profileSelector.addEventListener('change', (e) => {
            const index = parseInt(e.target.value, 10);
            if (!isNaN(index) && index >= 0 && index < PROFILES.length) {
                switchProfile(index);
            }
        });
    }

    /* ── AI Chat form with autocomplete ── */
    const AI_SUGGESTIONS = [
        '¿Mejor hora para encender A/C?',
        '¿Cuánto puedo ahorrar hoy?',
        '¿Cuándo mover la carga pesada?',
        '¿Cómo reducir el pico tarifario?',
        '¿Pronóstico solar para mañana?',
        '¿Cuánto cuesta la hora pico?',
        '¿Conviene lavar ropa ahora?',
        '¿Estado actual de radiación?',
    ];

    const initAiAutocomplete = () => {
        const form = document.querySelector('[data-role="command-form"]');
        if (!form) return;

        const messageInput = form.querySelector('input[name="message"]');
        if (!messageInput) return;

        // Create suggestions container
        const suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'ai-suggestions mt-2 flex flex-wrap gap-2';
        suggestionsBox.setAttribute('data-role', 'ai-suggestions');

        // Render initial chip suggestions
        const renderChips = (filter = '') => {
            const filtered = filter
                ? AI_SUGGESTIONS.filter(s => s.toLowerCase().includes(filter.toLowerCase()))
                : AI_SUGGESTIONS.slice(0, 4);

            suggestionsBox.innerHTML = filtered.slice(0, 4).map(s => `
                <button type="button" class="ai-chip rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/65 transition hover:border-white/20 hover:text-white/90 hover:bg-white/[0.08] cursor-pointer">
                    ${s}
                </button>
            `).join('');
        };

        messageInput.parentNode.insertBefore(suggestionsBox, messageInput.nextSibling);
        renderChips();

        // Click on chip fills the input
        suggestionsBox.addEventListener('click', (e) => {
            const chip = e.target.closest('.ai-chip');
            if (!chip) return;
            messageInput.value = chip.textContent.trim();
            messageInput.focus();
            suggestionsBox.innerHTML = '';
        });

        // Filter suggestions as user types
        messageInput.addEventListener('input', () => {
            const val = messageInput.value.trim();
            if (val.length === 0) {
                renderChips();
            } else if (val.length >= 2) {
                renderChips(val);
            } else {
                suggestionsBox.innerHTML = '';
            }
        });

        // Show suggestions on focus
        messageInput.addEventListener('focus', () => {
            if (!messageInput.value.trim()) renderChips();
        });
    };

    document.addEventListener('submit', async (event) => {
        const form = event.target.closest('[data-role="command-form"]');
        if (!form) return;

        event.preventDefault();
        const messageInput = form.querySelector('input[name="message"]');
        const chatBox = document.querySelector('[data-bind="chat-messages"]');

        const userMessage = messageInput?.value?.trim();
        if (!userMessage) return;

        const profile = getActiveProfile();

        // Add user bubble
        if (chatBox) {
            const userDiv = document.createElement('div');
            userDiv.className = 'flex justify-end';
            const bubble = document.createElement('div');
            bubble.className = 'max-w-[85%] rounded-2xl rounded-br-md bg-white/10 px-4 py-2.5 text-sm text-white/90';
            bubble.textContent = userMessage;
            userDiv.appendChild(bubble);
            chatBox.appendChild(userDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        // Clear input
        if (messageInput) messageInput.value = '';
        const suggestionsBox = form.querySelector('[data-role="ai-suggestions"]');
        if (suggestionsBox) suggestionsBox.innerHTML = '';

        // Build chat payload from active profile
        const payload = {
            message: userMessage,
            targetType: profile.targetType,
            name: profile.name,
            companyType: profile.companyType || '',
            monthlyConsumptionKwh: profile.monthlyConsumptionKwh || 0,
            companySize: profile.companySize || null,
            mainLoads: profile.mainLoads || [],
            populationEstimate: profile.populationEstimate || null,
        };

        // Show typing indicator
        const typingId = `typing-${Date.now()}`;
        if (chatBox) {
            chatBox.innerHTML += `
                <div class="flex justify-start" id="${typingId}">
                    <div class="max-w-[85%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm text-white/60">
                        <span class="inline-flex gap-1"><span class="animate-pulse">.</span><span class="animate-pulse" style="animation-delay:0.2s">.</span><span class="animate-pulse" style="animation-delay:0.4s">.</span></span>
                    </div>
                </div>`;
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        // Show loading state on button
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.textContent = 'Pensando...';
            submitBtn.disabled = true;
        }

        try {
            const response = await fetchJson('/api/ai/chat', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            // Remove typing indicator and add agent bubble
            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();

            if (chatBox) {
                const replyDiv = document.createElement('div');
                replyDiv.className = 'flex justify-start';
                const bubble = document.createElement('div');
                bubble.className = 'max-w-[85%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm leading-6 text-white/75';
                bubble.textContent = response.reply;
                replyDiv.appendChild(bubble);
                chatBox.appendChild(replyDiv);
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        } catch (error) {
            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();

            const isQuota = isServiceUnavailable(error);
            const errorMsg = isQuota
                ? 'Mi cuota de consultas está agotada por hoy. Mientras tanto, revisa las recomendaciones precargadas en el panel de arriba — cubren los escenarios más frecuentes para tu perfil.'
                : 'No pude conectar con el agente. Verifica la conexión e intenta de nuevo.';
            const errorStyle = isQuota
                ? 'border-yellow-400/20 bg-yellow-400/5 text-yellow-200/85'
                : 'border-red-400/20 bg-red-400/5 text-red-300/80';

            if (chatBox) {
                chatBox.innerHTML += `
                    <div class="flex justify-start">
                        <div class="max-w-[85%] rounded-2xl rounded-bl-md border ${errorStyle} px-4 py-2.5 text-sm leading-6">
                            ${errorMsg}
                        </div>
                    </div>`;
                chatBox.scrollTop = chatBox.scrollHeight;
            }
            console.error(error);
        } finally {
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    });

    /* ── History tab switching ── */
    document.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-bind="history-tabs"] .tab-button');
        if (tab) {
            const parent = tab.closest('[data-bind="history-tabs"]');
            if (parent) {
                parent.querySelectorAll('.tab-button').forEach(t => {
                    t.classList.remove('active', 'bg-white/[0.04]', 'text-white/90');
                    t.classList.add('text-white/55');
                });
                tab.classList.add('active', 'bg-white/[0.04]', 'text-white/90');
                tab.classList.remove('text-white/55');
            }
            const labels = { 'Semana': 7, 'Mes': 30, 'Año': 365 };
            const range = labels[tab.textContent.trim()];
            if (range) renderHistory(range);
        }
    });

    /* ── Consumption tab switching ── */
    document.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-bind="consumption-tabs"] .tab-button');
        if (tab) {
            const parent = tab.closest('[data-bind="consumption-tabs"]');
            if (!parent) return;
            parent.querySelectorAll('.tab-button').forEach(t => {
                t.classList.remove('active', 'bg-white/[0.04]', 'text-white/90');
                t.classList.add('text-white/55');
            });
            tab.classList.add('active', 'bg-white/[0.04]', 'text-white/90');
            tab.classList.remove('text-white/55');
        }
    });

    // ── Theme toggle ──
    const themeToggle = document.querySelector('[data-role="theme-toggle"]');
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('solar-theme', theme);
        // Swap icon
        if (themeToggle) {
            themeToggle.innerHTML = theme === 'light'
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="mx-auto h-4 w-4"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="mx-auto h-4 w-4"><path d="M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';
        }
    };

    // Load saved theme
    const savedTheme = localStorage.getItem('solar-theme') || 'dark';
    applyTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });
    }

    // Init
    updateClock();
    setInterval(updateClock, 1000);
    initAiAutocomplete();
    loadDashboard();
    setInterval(loadDashboard, 5 * 60 * 1000);
}
