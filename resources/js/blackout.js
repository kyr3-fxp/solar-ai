// ═══════════════════════════════════════════════════════════════════════════
//  MODO APAGÓN — Agente Solar
//  Gestión completa del apagón: activación, timer, IA, reporte final y offline.
// ═══════════════════════════════════════════════════════════════════════════

let _apiBase          = '';
let _timerInterval    = null;
let _startTime        = null;
let _activeProfile    = null;   // perfil activo cuando se activó el apagón
let _blackoutData     = null;   // respuesta del backend
let _offlineMode      = false;

// Configuración energética declarada en el diálogo
let _hasSolarPanels   = false;
let _hasBattery       = false;
let _batteryKwh       = 0;

// Impacto económico
let _lossPerHourCop   = 0;

// ── Inicialización ────────────────────────────────────────────────────────
export function initBlackout(apiBase) {
    _apiBase = apiBase;

    // Botón flotante
    const btn = document.getElementById('blackout-fab');
    if (btn) btn.addEventListener('click', onFabClick);

    // Botón cerrar/terminar
    const endBtn = document.getElementById('blackout-end-btn');
    if (endBtn) endBtn.addEventListener('click', endBlackout);

    // Cargar historial en background para cachear
    prefetchHistory();
}

// ── Gatillo del botón flotante ────────────────────────────────────────────
async function onFabClick() {
    if (_timerInterval) {
        // Ya activo — mostrar overlay
        showOverlay();
        return;
    }
    await activateBlackout();
}

// ── Activar Modo Apagón ───────────────────────────────────────────────────
async function activateBlackout() {
    // 1. Mostrar diálogo de configuración
    const config = await showActivationDialog();
    if (!config) return; // usuario canceló

    // 2. Guardar config declarada
    _hasSolarPanels = config.hasSolarPanels;
    _hasBattery     = config.hasBattery;
    _batteryKwh     = config.batteryKwh;

    // 3. Obtener perfil activo del dashboard
    _activeProfile = getCurrentProfile();

    // 4. Iniciar timer y mostrar overlay
    _startTime = Date.now();
    startTimer();
    showOverlay();
    setUrgencyUI('low');
    showLoading(true);

    // 5. Mostrar perfil en header inmediatamente
    renderProfileLabel(_activeProfile);

    const payload = buildPayload(0);

    try {
        const data = await callApi('/api/blackout/activate', 'POST', payload);
        if (data.success) {
            _blackoutData = data.data;
            _offlineMode  = false;
            renderBlackoutData(data.data);
        } else {
            renderOfflineFallback(_activeProfile?.companyType || 'hotel');
        }
    } catch {
        _offlineMode = true;
        renderOfflineFallback(_activeProfile?.companyType || 'hotel');
    } finally {
        showLoading(false);
    }

    // Cambiar ícono del FAB
    updateFab(true);
}

// ── Diálogo de configuración ─────────────────────────────────────────────
function showActivationDialog() {
    return new Promise((resolve) => {
        const dialog = document.getElementById('blackout-activation-dialog');
        if (!dialog) {
            resolve({ hasSolarPanels: false, hasBattery: false, batteryKwh: 0 });
            return;
        }

        // Mostrar perfil activo en el diálogo
        const profile = getCurrentProfile();
        const nameEl  = document.getElementById('bdlg-profile-name');
        if (nameEl) nameEl.textContent = profile.name;

        // Resetear form
        const solarCb   = document.getElementById('bdlg-solar');
        const batteryCb = document.getElementById('bdlg-battery');
        const kwhInput  = document.getElementById('bdlg-battery-kwh');
        const kwhRow    = document.getElementById('bdlg-battery-kwh-row');
        if (solarCb)   solarCb.checked   = false;
        if (batteryCb) batteryCb.checked = false;
        if (kwhInput)  kwhInput.value    = '10';
        if (kwhRow)    kwhRow.style.display = 'none';

        dialog.style.display = 'flex';

        // Toggle kWh al marcar batería
        if (batteryCb) {
            batteryCb.onchange = function () {
                if (kwhRow) kwhRow.style.display = this.checked ? 'block' : 'none';
            };
        }

        const startBtn  = document.getElementById('bdlg-start-btn');
        const cancelBtn = document.getElementById('bdlg-cancel-btn');

        if (startBtn) {
            startBtn.onclick = () => {
                dialog.style.display = 'none';
                resolve({
                    hasSolarPanels: solarCb?.checked  || false,
                    hasBattery:     batteryCb?.checked || false,
                    batteryKwh:     parseFloat(kwhInput?.value || 0) || 0
                });
            };
        }

        if (cancelBtn) {
            cancelBtn.onclick = () => {
                dialog.style.display = 'none';
                resolve(null);
            };
        }
    });
}

// ── Timer ─────────────────────────────────────────────────────────────────
function startTimer() {
    updateTimerDisplay();
    _timerInterval = setInterval(() => {
        updateTimerDisplay();
        // Re-llamar IA cada 30 minutos para refrescar el plan
        const elapsed = getElapsedMinutes();
        if (elapsed > 0 && elapsed % 30 === 0) refreshPlan(elapsed);
    }, 60_000);
}

function stopTimer() {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
}

function getElapsedMinutes() {
    if (!_startTime) return 0;
    return Math.floor((Date.now() - _startTime) / 60_000);
}

function updateTimerDisplay() {
    const min   = getElapsedMinutes();
    const hours = Math.floor(min / 60);
    const mins  = min % 60;
    const str   = hours > 0 ? `${hours}h ${mins.toString().padStart(2,'0')}min` : `${mins} min`;

    const el = document.getElementById('blackout-timer');
    if (el) el.textContent = str;

    // Actualizar urgencia
    const profileType = _activeProfile?.companyType || 'hotel';
    const autonomy    = _blackoutData?.estimatedAutonomyMinutes || 0;
    const urgency     = computeUrgency(min, autonomy, profileType);
    setUrgencyUI(urgency);

    // Actualizar contador de pérdida
    updateLossCounter(min);
}

function computeUrgency(elapsed, autonomy, profileType) {
    const AVG = 101;
    if (profileType === 'hielera' && elapsed >= 60) return 'critical';
    if (profileType === 'hielera' && elapsed >= 30) return 'high';
    if (autonomy > 0) {
        const rem = autonomy - elapsed;
        if (rem < 0)               return 'critical';
        if (rem < autonomy * 0.15) return 'critical';
        if (rem < autonomy * 0.35) return 'high';
        if (rem < autonomy * 0.60) return 'moderate';
        return 'low';
    }
    if (elapsed >= AVG * 1.5) return 'critical';
    if (elapsed >= AVG)       return 'high';
    if (elapsed >= AVG * 0.5) return 'moderate';
    return 'low';
}

// ── Contador de pérdida económica ─────────────────────────────────────────
function updateLossCounter(elapsedMin) {
    if (!_lossPerHourCop) return;
    const el = document.getElementById('blackout-loss-ticker');
    if (!el) return;
    const loss = Math.round(_lossPerHourCop * elapsedMin / 60);
    el.textContent = `$${loss.toLocaleString('es-CO')} COP`;
}

// ── Perfil en header ──────────────────────────────────────────────────────
function renderProfileLabel(profile) {
    const el = document.getElementById('blackout-profile-label');
    if (!el || !profile) return;
    const kwhText = profile.monthlyConsumptionKwh > 0
        ? ` · ${(profile.monthlyConsumptionKwh / 1000).toFixed(0)} MWh/mes · $${profile.tariffCopKwh}/kWh`
        : '';
    el.textContent = `${profile.name}${kwhText}`;
}

// ── Refrescar plan cada 30 min ────────────────────────────────────────────
async function refreshPlan(elapsed) {
    try {
        const payload = buildPayload(elapsed);
        const data    = await callApi('/api/blackout/activate', 'POST', payload);
        if (data.success) {
            _blackoutData = data.data;
            renderBlackoutData(data.data);
        }
    } catch { /* continuar con el plan anterior */ }
}

// ── Terminar apagón ───────────────────────────────────────────────────────
async function endBlackout() {
    const totalMinutes = getElapsedMinutes();
    stopTimer();
    updateFab(false);

    // Mostrar pantalla de reporte
    showReportLoading(true);
    showSection('blackout-section-report');

    try {
        const payload = {
            profileType:           _activeProfile?.companyType || 'hotel',
            name:                  _activeProfile?.name || 'Mi negocio',
            totalMinutes,
            hasSolarPanels:        _hasSolarPanels,
            hasBattery:            _hasBattery,
            batteryCapacityKwh:    _batteryKwh,
            monthlyConsumptionKwh: parseFloat(_activeProfile?.monthlyConsumptionKwh || 0),
            tariffCopKwh:          parseFloat(_activeProfile?.tariffCopKwh || 1050)
        };

        const data = await callApi('/api/blackout/report', 'POST', payload);
        if (data.success) {
            renderReport(data.data, totalMinutes);
        } else {
            renderOfflineReport(totalMinutes);
        }
    } catch {
        renderOfflineReport(totalMinutes);
    } finally {
        showReportLoading(false);
        // Resetear estado
        _startTime        = null;
        _blackoutData     = null;
        _hasSolarPanels   = false;
        _hasBattery       = false;
        _batteryKwh       = 0;
        _lossPerHourCop   = 0;
        hideLossTicker();
    }
}

function hideLossTicker() {
    const el = document.getElementById('blackout-loss-row');
    if (el) el.style.display = 'none';
}

// ── Cerrar overlay ────────────────────────────────────────────────────────
function closeOverlay() {
    const overlay = document.getElementById('blackout-overlay');
    if (overlay) overlay.style.display = 'none';
}

function showOverlay() {
    const overlay = document.getElementById('blackout-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        showSection('blackout-section-main');
    }
}

// ── Renderizar datos de la IA ─────────────────────────────────────────────
function renderBlackoutData(data) {
    // Status message
    setText('blackout-status-msg', data.statusMessage || '');

    // Perfil en header
    renderProfileLabel(_activeProfile);

    // Alerta crítica
    const alertEl = document.getElementById('blackout-critical-alert');
    if (alertEl) {
        alertEl.textContent   = data.criticalAlert || '';
        alertEl.style.display = data.criticalAlert ? 'block' : 'none';
    }

    // Instrucciones
    setText('blackout-instructions', data.instructions || '');

    // Autonomía
    renderAutonomyBar(data.estimatedAutonomyMinutes, getElapsedMinutes());

    // Comparativa histórica
    setText('blackout-hist-avg', formatMinutes(data.historicalAvgMinutes || 101));

    // Radiación
    if (data.currentRadiationKwhM2 > 0) {
        setText('blackout-radiation', `${data.currentRadiationKwhM2} kWh/m²`);
    }

    // Impacto económico
    if (data.lossPerHourCop > 0) {
        _lossPerHourCop = data.lossPerHourCop;
        const lossRow = document.getElementById('blackout-loss-row');
        if (lossRow) lossRow.style.display = 'block';
        updateLossCounter(getElapsedMinutes());
        const rateEl = document.getElementById('blackout-loss-rate');
        if (rateEl) {
            const rateFormatted = Math.round(data.lossPerHourCop).toLocaleString('es-CO');
            rateEl.textContent = `$${rateFormatted} COP/hora · carga crítica estimada`;
        }
    }

    // Matriz de prioridades
    renderPriorityMatrix(data.priorityMatrix);

    // Acciones de recuperación
    renderRecoveryActions(data.recoveryActions || []);
}

function renderPriorityMatrix(matrix) {
    if (!matrix) return;
    renderLoadList('blackout-keep-list',       matrix.keep       || [], '🟢');
    renderLoadList('blackout-reduce-list',     matrix.reduce     || [], '🟡');
    renderLoadList('blackout-disconnect-list', matrix.disconnect || [], '🔴');
}

function renderLoadList(id, items, icon) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!items.length) {
        el.innerHTML = `<li style="padding:6px 0;font-size:12px;opacity:0.4;font-style:italic">Sin elementos</li>`;
        return;
    }
    el.innerHTML = items.map(item =>
        `<li style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
            <span style="flex-shrink:0;margin-top:1px">${icon}</span>
            <span style="font-size:13px;line-height:1.45;opacity:0.9">${item}</span>
        </li>`
    ).join('');
}

function renderAutonomyBar(autonomyMin, elapsedMin) {
    const bar  = document.getElementById('blackout-autonomy-bar-fill');
    const text = document.getElementById('blackout-autonomy-text');
    if (!bar || !text) return;

    if (autonomyMin <= 0) {
        bar.style.width = '3%';
        bar.style.background = '#374151';
        text.textContent = 'Sin respaldo propio — 100% dependiente de la red';
        return;
    }

    const pct = Math.max(0, Math.min(100, ((autonomyMin - elapsedMin) / autonomyMin) * 100));
    bar.style.width      = `${pct}%`;
    bar.style.background = pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444';

    const remaining = Math.max(0, autonomyMin - elapsedMin);
    text.textContent = remaining > 0
        ? `${formatMinutes(remaining)} restantes de autonomía propia`
        : 'Autonomía agotada — solo red pública';
}

function renderRecoveryActions(actions) {
    const el = document.getElementById('blackout-recovery-list');
    if (!el || !actions.length) return;
    el.innerHTML = actions.map((a, i) =>
        `<li style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
            <span style="background:rgba(251,191,36,0.2);color:#fbbf24;border-radius:50%;min-width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</span>
            <span style="font-size:13px;opacity:0.85;line-height:1.45">${a}</span>
        </li>`
    ).join('');
}

// ── Urgencia visual ───────────────────────────────────────────────────────
function setUrgencyUI(level) {
    const badge  = document.getElementById('blackout-urgency-badge');
    const header = document.getElementById('blackout-header');
    if (!badge) return;

    const config = {
        low:      { label: 'BAJA',     bg: '#16a34a', headerBg: 'linear-gradient(135deg,#052e16 0%,#0f172a 100%)' },
        moderate: { label: 'MODERADA', bg: '#d97706', headerBg: 'linear-gradient(135deg,#1c1003 0%,#0f172a 100%)' },
        high:     { label: 'ALTA',     bg: '#dc2626', headerBg: 'linear-gradient(135deg,#200000 0%,#0f172a 100%)' },
        critical: { label: 'CRÍTICA',  bg: '#7f1d1d', headerBg: 'linear-gradient(135deg,#3b0000 0%,#0f172a 100%)' },
    };
    const cfg = config[level] || config.low;

    badge.textContent         = cfg.label;
    badge.style.background    = cfg.bg;
    if (header) header.style.background = cfg.headerBg;
}

// ── Reporte final ─────────────────────────────────────────────────────────
function renderReport(data, totalMinutes) {
    setText('report-duration',    formatMinutes(totalMinutes));
    setText('report-avg',         formatMinutes(data.historicalAvgMinutes || 101));
    setText('report-summary',     data.summary || '');
    setText('report-battery-rec', data.batteryRecommendation || '');
    setText('report-category',    data.durationCategory || '');

    const catEl = document.getElementById('report-category-badge');
    if (catEl) {
        const colors = { corto: '#16a34a', normal: '#d97706', prolongado: '#dc2626' };
        catEl.style.background = colors[data.durationCategory] || '#374151';
    }
}

function renderOfflineReport(totalMinutes) {
    const AVG = 101;
    const cat = totalMinutes < 60 ? 'corto' : totalMinutes < AVG * 1.2 ? 'normal' : 'prolongado';
    renderReport({
        historicalAvgMinutes:  AVG,
        summary:               `El apagón duró ${formatMinutes(totalMinutes)}. Promedio histórico La Guajira: ${formatMinutes(AVG)}.`,
        batteryRecommendation: 'Considera una batería de respaldo para mantener tus cargas críticas autónomas durante el próximo apagón.',
        durationCategory:      cat
    }, totalMinutes);
}

// ── Fallback offline ──────────────────────────────────────────────────────
function renderOfflineFallback(profileType) {
    const plans = {
        hielera: {
            keep:       ['Compresores principales de congelación', 'Paneles de control y sensores de temperatura', 'Iluminación mínima de seguridad', 'Sistema de alarma térmica'],
            reduce:     ['Ventilación de sala de máquinas — bajar a nivel mínimo (30%)', 'Iluminación de áreas de trabajo — reducir al 40%'],
            disconnect: ['Oficinas y administración', 'Iluminación exterior y letreros', 'A/C de oficinas', 'Sistemas de carga no críticos', 'Pantallas y monitores'],
            instructions: 'PRIORIDAD ABSOLUTA: no abras las puertas de los cuartos fríos bajo ninguna circunstancia. Cada apertura cuesta entre 2°C y 5°C de temperatura interna y acelera la pérdida del inventario. Si tienes termómetros externos, monitoréalos cada 15 minutos.',
            critical:    'NO ABRAS los cuartos fríos — cada apertura cuesta temperatura y puede perderse el inventario del día.'
        },
        restaurant: {
            keep:       ['Cámaras frigoríficas y congeladores', 'POS y sistemas de caja', 'Iluminación de cocina esencial', 'Comunicaciones y teléfono'],
            reduce:     ['A/C del salón — subir a 26°C (ahorra hasta 35% de carga)', 'Iluminación del salón — bajar al 60%'],
            disconnect: ['Letreros luminosos exteriores', 'Cocina industrial no urgente (horno, freidoras)', 'Música ambiental y pantallas decorativas', 'Cafetera industrial y equipos de bar no críticos'],
            instructions: 'Protege las cámaras frigoríficas ante todo — es tu mayor activo en riesgo. Cierra la cocina caliente para nuevos pedidos y prioriza servir lo que ya está preparado. Mantén el POS operativo para cerrar cuentas pendientes.',
            critical:    'Verifica AHORA que las cámaras frigoríficas están cerradas herméticamente y el termómetro marca temperatura correcta.'
        },
        community: {
            keep:       ['Bombas de agua potable', 'Comunicaciones de emergencia y difusión', 'Puntos de recarga comunitarios', 'Iluminación de seguridad en zonas críticas'],
            reduce:     ['Alumbrado público no esencial — apagar el 50% de luminarias', 'Sistemas de riego — diferir para cuando vuelva la energía'],
            disconnect: ['Alumbrado decorativo y ornamental', 'Sistemas no críticos de edificios públicos', 'Señalética no esencial'],
            instructions: 'Activa el protocolo de comunicación de emergencia inmediatamente. Asegura el suministro de agua potable como prioridad 1. Identifica y asiste a adultos mayores, centros médicos y personas vulnerables.',
            critical:    'Activa AHORA el protocolo de comunicación de emergencia e informa a la comunidad sobre el estado del apagón.'
        },
        hotel: {
            keep:       ['Recepción y cerraduras electrónicas', 'Iluminación de emergencia en pasillos', 'Neveras y cuartos fríos de cocina', 'Bombas de agua y presión', 'Comunicaciones (PBX, teléfono)'],
            reduce:     ['A/C en pisos ocupados — subir de 22°C a 26°C (ahorra 30% de carga)', 'Iluminación de pasillos — reducir al 50%'],
            disconnect: ['A/C en pisos sin check-in activo', 'Iluminación exterior decorativa', 'Jacuzzi y piscina', 'Oficinas administrativas y lavandería', 'Letreros y señalética luminosa exterior'],
            instructions: 'Protege a los huéspedes activos primero — informa en recepción sobre el estado y activa iluminación de emergencia en pasillos. Desconecta A/C en pisos vacíos para reducir carga. Mantén neveras de cocina bajo monitoreo constante.',
            critical:    'Informa AHORA a los huéspedes de la situación, activa cerraduras de emergencia y verifica iluminación de pasillos.'
        }
    };

    const plan = plans[profileType] || plans.hotel;
    setText('blackout-status-msg',   'Modo offline — plan de respaldo activado');
    setText('blackout-instructions', plan.instructions);
    setText('blackout-hist-avg',     formatMinutes(101));

    const alertEl = document.getElementById('blackout-critical-alert');
    if (alertEl) { alertEl.textContent = plan.critical; alertEl.style.display = 'block'; }

    renderPriorityMatrix({ keep: plan.keep, reduce: plan.reduce, disconnect: plan.disconnect });
    renderAutonomyBar(0, 0);
    renderRecoveryActions([
        'Espera 3–5 minutos antes de reconectar equipos pesados para evitar picos de demanda.',
        'Verifica temperatura de refrigeración y registra el valor alcanzado.',
        'Reconecta gradualmente: refrigeración primero → iluminación → A/C.',
        'Documenta el evento (hora inicio, fin, impacto) para reclamar ante la operadora si supera 4h.'
    ]);

    renderProfileLabel(_activeProfile);
    _offlineMode = true;
}

// ── Prefetch historial ────────────────────────────────────────────────────
async function prefetchHistory() {
    try {
        await callApi('/api/blackout/history', 'GET');
    } catch { /* silencioso */ }
}

// ── Helpers UI ────────────────────────────────────────────────────────────
function showSection(id) {
    ['blackout-section-main', 'blackout-section-report'].forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = s === id ? 'block' : 'none';
    });
}

function showLoading(show) {
    const el = document.getElementById('blackout-loading');
    if (el) el.style.display = show ? 'flex' : 'none';
    const content = document.getElementById('blackout-content');
    if (content) content.style.display = show ? 'none' : 'block';
}

function showReportLoading(show) {
    const el = document.getElementById('report-loading');
    if (el) el.style.display = show ? 'flex' : 'none';
    const content = document.getElementById('report-content');
    if (content) content.style.display = show ? 'none' : 'block';
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function formatMinutes(min) {
    if (!min || min <= 0) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}min` : `${min} min`;
}

function updateFab(active) {
    const fab = document.getElementById('blackout-fab');
    if (!fab) return;
    if (active) {
        fab.style.background = '#7f1d1d';
        fab.title = 'Ver Modo Apagón activo';
        fab.innerHTML = `
            <span style="font-size:18px">⚡</span>
            <span style="font-size:11px;font-weight:700;letter-spacing:0.05em">ACTIVO</span>`;
    } else {
        fab.style.background = '#b91c1c';
        fab.title = 'Activar Modo Apagón';
        fab.innerHTML = `
            <span style="font-size:18px">⚡</span>
            <span style="font-size:11px;font-weight:700;letter-spacing:0.05em">APAGÓN</span>`;
    }
}

// ── Perfil activo ─────────────────────────────────────────────────────────
function getCurrentProfile() {
    // Lee el perfil activo del dashboard (data-profile-card activo)
    const activeCard = document.querySelector('[data-profile-card].border-emerald-400\\/30, [data-profile-card][style*="emerald"]');
    if (!activeCard) return getProfileByIndex(0);
    const idx = parseInt(activeCard.dataset.profileCard || '0');
    return getProfileByIndex(idx);
}

function getProfileByIndex(idx) {
    const profiles = [
        { name: 'Hotel Majayura',           companyType: 'hotel',      monthlyConsumptionKwh: 12000, tariffCopKwh: 1050 },
        { name: 'Hielera del Caribe',        companyType: 'hielera',    monthlyConsumptionKwh: 28000, tariffCopKwh: 850  },
        { name: 'Restaurante Sazón Guajira', companyType: 'restaurant', monthlyConsumptionKwh: 8500,  tariffCopKwh: 1050 },
        { name: 'Riohacha',                  companyType: 'community',  monthlyConsumptionKwh: 0,     tariffCopKwh: 780  },
    ];
    return profiles[idx] || profiles[0];
}

function buildPayload(elapsedMinutes) {
    const p = _activeProfile || getProfileByIndex(0);
    return {
        profileType:           p.companyType,
        name:                  p.name,
        outageMinutes:         elapsedMinutes,
        hasSolarPanels:        _hasSolarPanels,
        hasBattery:            _hasBattery,
        batteryCapacityKwh:    _batteryKwh,
        criticalLoads:         [],
        monthlyConsumptionKwh: parseFloat(p.monthlyConsumptionKwh || 0),
        tariffCopKwh:          parseFloat(p.tariffCopKwh || 1050)
    };
}

// ── HTTP helper ───────────────────────────────────────────────────────────
async function callApi(path, method = 'GET', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${_apiBase}${path}`, opts);
    return res.json();
}

// Exportar para uso externo
export { closeOverlay };
