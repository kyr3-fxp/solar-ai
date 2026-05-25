// ═══════════════════════════════════════════════════════════════════════════
//  MODO APAGÓN — Sistema de 4 estados
//  idle → alert → blackout → recovery
//
//  Este archivo es la máquina de estados central.
//  Los módulos de UI se construyen encima en pasos posteriores.
// ═══════════════════════════════════════════════════════════════════════════

// ── Estado interno ────────────────────────────────────────────────────────

const STATES = Object.freeze({
    IDLE:     'idle',
    ALERT:    'alert',
    BLACKOUT: 'blackout',
    RECOVERY: 'recovery',
});

let _state   = STATES.IDLE;
let _apiBase = '';

// ── Estado del Módulo 1: Núcleo del Evento ────────────────────────────────
let _blackoutStartTime  = null;
let _coreTimerInterval  = null;

const P50_MIN = 101;
const P90_MIN = 240;
const MAX_MIN = 360;

// ── Nodo raíz ─────────────────────────────────────────────────────────────

function getRootNode() {
    return document.getElementById('blackout-system');
}

// ── Sincronización con el DOM ─────────────────────────────────────────────

function syncDataState(newState) {
    const root = getRootNode();
    if (!root) {
        console.warn('[Blackout] #blackout-system no encontrado en el DOM.');
        return;
    }
    root.dataset.state = newState;
}

// ── Clases de cuerpo por estado ───────────────────────────────────────────

const BODY_CLASSES = {
    [STATES.ALERT]:    'is-blackout-alert',
    [STATES.BLACKOUT]: 'is-blackout-active',
    [STATES.RECOVERY]: 'is-blackout-recovery',
};

function applyBodyClass(newState) {
    // Quitar todas las clases de estado anteriores
    Object.values(BODY_CLASSES).forEach(cls => document.body.classList.remove(cls));
    // En alerta Y apagón, mantener la franja/tono ámbar
    if (newState === STATES.ALERT)    document.body.classList.add(BODY_CLASSES[STATES.ALERT]);
    if (newState === STATES.BLACKOUT) document.body.classList.add(BODY_CLASSES[STATES.ALERT], BODY_CLASSES[STATES.BLACKOUT]);
    if (newState === STATES.RECOVERY) document.body.classList.add(BODY_CLASSES[STATES.RECOVERY]);
}

// ── Transiciones ──────────────────────────────────────────────────────────

function transition(newState) {
    const prev = _state;
    _state = newState;
    syncDataState(newState);
    applyBodyClass(newState);
    console.info(`[Blackout] ${prev} → ${newState}`);
    dispatchStateChange(prev, newState);
}

// ── Evento personalizado ──────────────────────────────────────────────────
//  Otros módulos pueden escuchar: document.addEventListener('blackout:state', e => { ... })

function dispatchStateChange(from, to) {
    const event = new CustomEvent('blackout:state', {
        detail: { from, to },
        bubbles: true,
    });
    document.dispatchEvent(event);
}

// ── Secuencia cinematográfica ─────────────────────────────────────────────

function assembleCinematicText(el, text) {
    el.innerHTML = '';
    el.classList.remove('bs-cinematic-text--visible', 'bs-cinematic-text--exit');

    [...text].forEach((char, i) => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? ' ' : char;
        span.classList.add('bs-char');
        span.style.animationDelay = `${i * 45}ms`;
        el.appendChild(span);
    });

    // Forzar reflow antes de aplicar la clase de animación
    void el.offsetWidth;
    el.classList.add('bs-cinematic-text--visible');
}

function runCinematicTransition() {
    const frame      = document.querySelector('.dashboard-frame');
    const cinematic  = document.getElementById('bs-blackout-cinematic');
    const cinText    = document.getElementById('bs-cinematic-text');

    if (!cinematic) return;

    // ─ 0ms: El dashboard comienza a desvanecerse
    if (frame) {
        frame.style.transition = 'opacity 200ms ease, filter 300ms ease';
        frame.style.opacity    = '0.30';
        frame.style.filter     = 'saturate(0.15) brightness(0.55) sepia(0.15)';
    }

    // ─ 80ms: Primer parpadeo — caída profunda
    setTimeout(() => {
        if (frame) {
            frame.style.transition = 'opacity 60ms ease';
            frame.style.opacity    = '0.08';
        }
    }, 80);

    // ─ 160ms: Recuperación breve
    setTimeout(() => {
        if (frame) {
            frame.style.transition = 'opacity 55ms ease';
            frame.style.opacity    = '0.22';
        }
    }, 160);

    // ─ 240ms: Segundo parpadeo — más profundo
    setTimeout(() => {
        if (frame) {
            frame.style.transition = 'opacity 50ms ease';
            frame.style.opacity    = '0.05';
        }
    }, 240);

    // ─ 300ms: Se estabiliza en estado fantasma (12%)
    setTimeout(() => {
        if (frame) {
            frame.style.transition = 'opacity 250ms ease';
            frame.style.opacity    = '0.12';
        }
    }, 300);

    // ─ 1300ms: Fondo oscuro cálido aparece
    setTimeout(() => {
        cinematic.classList.add('bs-cinematic--visible');
    }, 1300);

    // ─ 1700ms: "APAGÓN DETECTADO" se ensambla letra a letra
    setTimeout(() => {
        if (cinText) assembleCinematicText(cinText, 'APAGÓN DETECTADO');
    }, 1700);

    // ─ 2700ms: Texto se disuelve — los módulos pueden montarse
    setTimeout(() => {
        if (cinText) cinText.classList.add('bs-cinematic-text--exit');
        document.dispatchEvent(new CustomEvent('blackout:modules-ready', { bubbles: true }));
    }, 2700);
}

// ── Módulo 1: Núcleo del Evento ───────────────────────────────────────────

function formatTimer(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startCoreModule() {
    const timerEl  = document.getElementById('bs-core-timer');
    const dotEl    = document.getElementById('bs-tl-dot');
    const fillEl   = document.getElementById('bs-tl-fill');
    const phraseEl = document.getElementById('bs-core-phrase');

    function tick() {
        const elapsedMs  = Date.now() - _blackoutStartTime;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const elapsedMin = elapsedMs / 60000;

        // Timer
        if (timerEl) timerEl.textContent = formatTimer(elapsedSec);

        // Posición en la barra (0–100%)
        const pct = Math.min((elapsedMin / MAX_MIN) * 100, 100);
        if (dotEl)  dotEl.style.left  = `${pct}%`;
        if (fillEl) fillEl.style.width = `${pct}%`;

        // Zona de color
        const zone = elapsedMin < P50_MIN ? 'green'
                   : elapsedMin < P90_MIN ? 'amber'
                   : 'red';
        if (fillEl) fillEl.dataset.zone = zone;

        // Frase contextual
        if (phraseEl) {
            if (elapsedMin < P50_MIN) {
                phraseEl.textContent = 'Apagón dentro del rango habitual. La red típicamente recupera antes de los 101 minutos.';
            } else if (elapsedMin < P90_MIN) {
                phraseEl.textContent = 'Superaste el promedio histórico. La red puede tardar hasta 240 minutos según datos SAIDI de La Guajira.';
            } else {
                phraseEl.textContent = 'Apagón prolongado. Este evento supera el percentil 90 histórico. Activa el protocolo de contingencia.';
            }
        }
    }

    tick();
    _coreTimerInterval = setInterval(tick, 1000);
}

function stopCoreModule() {
    if (_coreTimerInterval) {
        clearInterval(_coreTimerInterval);
        _coreTimerInterval = null;
    }

    // Resetear visuales del módulo
    const timerEl  = document.getElementById('bs-core-timer');
    const dotEl    = document.getElementById('bs-tl-dot');
    const fillEl   = document.getElementById('bs-tl-fill');
    const phraseEl = document.getElementById('bs-core-phrase');

    if (timerEl)  timerEl.textContent  = '00:00:00';
    if (dotEl)    dotEl.style.left     = '0%';
    if (fillEl) { fillEl.style.width   = '0%'; fillEl.dataset.zone = 'green'; }
    if (phraseEl) phraseEl.textContent = 'Apagón dentro del rango habitual. La red típicamente recupera antes de los 101 minutos.';
}

// ── Módulo 2: Continuidad Operativa ──────────────────────────────────────

const OPS_PROFILES = {
    hotel: [
        { name: 'Paneles solares',          status: 'active',  label: 'Activo'           },
        { name: 'Batería de respaldo',       status: 'partial', label: 'En uso'           },
        { name: 'Red eléctrica principal',   status: 'offline', label: 'Fuera de servicio'},
        { name: 'Climatización',             status: 'partial', label: 'Reducida'         },
        { name: 'Iluminación de seguridad',  status: 'active',  label: 'Activo'           },
        { name: 'Sistemas de seguridad',     status: 'active',  label: 'Activo'           },
        { name: 'Cocina y refrigeración',    status: 'offline', label: 'Desconectado'     },
    ],
    hielera: [
        { name: 'Paneles solares',           status: 'active',  label: 'Activo'           },
        { name: 'Batería de respaldo',       status: 'partial', label: 'En uso'           },
        { name: 'Red eléctrica principal',   status: 'offline', label: 'Fuera de servicio'},
        { name: 'Cámaras frigoríficas',      status: 'partial', label: 'Temperatura crítica'},
        { name: 'Sistemas de enfriamiento',  status: 'offline', label: 'Desconectado'     },
        { name: 'Iluminación',               status: 'active',  label: 'Activo'           },
    ],
    restaurant: [
        { name: 'Paneles solares',           status: 'active',  label: 'Activo'           },
        { name: 'Batería de respaldo',       status: 'partial', label: 'En uso'           },
        { name: 'Red eléctrica principal',   status: 'offline', label: 'Fuera de servicio'},
        { name: 'Cocina industrial',         status: 'offline', label: 'Desconectado'     },
        { name: 'Refrigeración',             status: 'partial', label: 'Reducida'         },
        { name: 'Iluminación',               status: 'active',  label: 'Activo'           },
        { name: 'Caja y terminales POS',     status: 'offline', label: 'Sin servicio'     },
    ],
    community: [
        { name: 'Paneles comunitarios',      status: 'active',  label: 'Activo'           },
        { name: 'Batería compartida',        status: 'partial', label: 'En uso'           },
        { name: 'Red eléctrica',             status: 'offline', label: 'Fuera de servicio'},
        { name: 'Alumbrado público',         status: 'active',  label: 'Activo'           },
        { name: 'Bomba de agua',             status: 'offline', label: 'Desconectado'     },
        { name: 'Centro comunitario',        status: 'partial', label: 'Parcial'          },
    ],
};

function renderOpsModule() {
    const container = document.getElementById('bs-module-ops');
    if (!container) return;

    const listEl = container.querySelector('.bs-ops-list');
    if (!listEl) return;

    // Perfil activo — se integrará con backend en paso posterior
    const profileKey = 'hotel';
    const items = OPS_PROFILES[profileKey] || OPS_PROFILES.hotel;

    listEl.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'bs-ops-item';
        div.innerHTML =
            `<span class="bs-ops-dot bs-ops-dot--${item.status}"></span>` +
            `<span class="bs-ops-name">${item.name}</span>` +
            `<span class="bs-ops-label bs-ops-label--${item.status}">${item.label}</span>`;
        listEl.appendChild(div);
    });
}

// ── Módulo 3: Autonomía Inteligente ──────────────────────────────────────

function renderAutonomyModule() {
    const content = document.getElementById('bs-autonomy-content');
    if (!content) return;

    // Estático por ahora — se conectará con el backend en el paso siguiente
    const hasBattery    = false;
    const batteryPct    = 0;
    const estMinutes    = 0;

    if (!hasBattery) {
        content.innerHTML =
            `<p class="bs-autonomy-rec">` +
            `<strong>Sin batería declarada.</strong> Incorporar una batería de 10–15 kWh` +
            ` permitiría +90–120 min de autonomía en cargas críticas durante apagones como este.` +
            `</p>`;
    } else {
        const colorClass = batteryPct > 50 ? '' : batteryPct > 25 ? 'amber' : 'red';
        content.innerHTML =
            `<div class="bs-autonomy-main">≈ ${estMinutes} min</div>` +
            `<div class="bs-autonomy-sub">Autonomía estimada en carga crítica</div>` +
            `<div class="bs-autonomy-bar-wrap">` +
              `<div class="bs-autonomy-bar-fill ${colorClass}" style="width:${batteryPct}%"></div>` +
            `</div>` +
            `<div class="bs-autonomy-sub">${batteryPct}% de batería restante</div>`;
    }
}

// ── Módulo 4: Acciones Inmediatas ─────────────────────────────────────────

const ACTIONS_PROFILES = {
    hotel: [
        { icon: '⚡', text: 'Apaga el aire acondicionado en habitaciones vacías' },
        { icon: '🧊', text: 'Verifica temperatura de refrigeración cada 20 min' },
        { icon: '🔦', text: 'Confirma que la iluminación de emergencia esté activa' },
        { icon: '📋', text: 'Registra la hora exacta del apagón para el reporte ante la SSPD' },
        { icon: '🔋', text: 'Activa modo ahorro en equipos no críticos' },
    ],
    hielera: [
        { icon: '🌡️', text: 'Monitorea temperatura interna cada 15 minutos' },
        { icon: '🚪', text: 'Mantén puertas de cámaras frigoríficas cerradas al mínimo' },
        { icon: '⚡', text: 'Desconecta cargas no críticas para extender autonomía' },
        { icon: '📞', text: 'Notifica a clientes con pedidos urgentes del retraso' },
        { icon: '📋', text: 'Registra hora del apagón y temperatura actual de cámaras' },
    ],
    restaurant: [
        { icon: '🔥', text: 'Apaga equipos de cocina que no sean esenciales' },
        { icon: '🧊', text: 'Verifica temperatura de refrigeración cada 20 min' },
        { icon: '💡', text: 'Confirma iluminación de emergencia activa en el salón' },
        { icon: '📋', text: 'Registra hora del apagón para reporte' },
        { icon: '🔋', text: 'Activa respaldo UPS en caja registradora si dispones de uno' },
    ],
    community: [
        { icon: '📢', text: 'Informa a la comunidad el estado del sistema solar' },
        { icon: '⚡', text: 'Prioriza cargas esenciales: agua potable y salud' },
        { icon: '🔦', text: 'Verifica alumbrado de emergencia en zonas críticas del barrio' },
        { icon: '📋', text: 'Documenta el evento para reporte oficial ante la SSPD' },
        { icon: '🤝', text: 'Activa protocolo de apoyo para adultos mayores y niños' },
    ],
};

function renderActionsModule() {
    const listEl = document.getElementById('bs-actions-list');
    if (!listEl) return;

    const profileKey = 'hotel'; // se integrará con perfil activo en paso posterior
    const actions = ACTIONS_PROFILES[profileKey] || ACTIONS_PROFILES.hotel;

    listEl.innerHTML = '';
    actions.forEach(action => {
        const div = document.createElement('div');
        div.className = 'bs-action-item';
        div.innerHTML =
            `<span class="bs-action-icon">${action.icon}</span>` +
            `<span>${action.text}</span>`;
        listEl.appendChild(div);
    });
}

// ── Módulo 5: Contexto Regional ───────────────────────────────────────────

const REGIONAL_CONTEXT = {
    region:        'La Guajira · Riohacha',
    avgMinutes:    101,
    p90Minutes:    240,
    eventsPerYear: 36,
    saidiHours:    60.45,
    source:        'SSPD 2022–2023',
};

function renderContextModule() {
    const grid = document.getElementById('bs-context-grid');
    if (!grid) return;

    const ctx = REGIONAL_CONTEXT;

    grid.innerHTML =
        `<div class="bs-context-stat">` +
          `<div class="bs-context-stat-value">${ctx.avgMinutes} min</div>` +
          `<div class="bs-context-stat-label">Promedio histórico</div>` +
        `</div>` +
        `<div class="bs-context-stat">` +
          `<div class="bs-context-stat-value">${ctx.p90Minutes} min</div>` +
          `<div class="bs-context-stat-label">Percentil 90</div>` +
        `</div>` +
        `<div class="bs-context-stat">` +
          `<div class="bs-context-stat-value">~${ctx.eventsPerYear}</div>` +
          `<div class="bs-context-stat-label">Eventos por año</div>` +
        `</div>` +
        `<div class="bs-context-stat">` +
          `<div class="bs-context-stat-value">${ctx.saidiHours} h</div>` +
          `<div class="bs-context-stat-label">Horas sin luz / año</div>` +
        `</div>` +
        `<div class="bs-context-source">${ctx.region} · Fuente: ${ctx.source}</div>`;
}

// ── Área de módulos ───────────────────────────────────────────────────────

function showModulesArea() {
    const area = document.getElementById('bs-modules-area');
    if (!area) return;

    // Poblar módulos dinámicos antes de revelar
    renderOpsModule();
    renderAutonomyModule();
    renderActionsModule();
    renderContextModule();

    area.classList.add('bs-modules--visible');

    // Animar cada módulo con retardo escalonado
    const modules = area.querySelectorAll('.bs-module');
    modules.forEach((mod, i) => {
        setTimeout(() => mod.classList.add('bs-module--visible'), i * 200 + 250);
    });
}

function hideModulesArea() {
    const area = document.getElementById('bs-modules-area');
    if (!area) return;

    area.classList.remove('bs-modules--visible');
    area.querySelectorAll('.bs-module').forEach(mod => mod.classList.remove('bs-module--visible'));
}

function resetCinematic() {
    const frame     = document.querySelector('.dashboard-frame');
    const cinematic = document.getElementById('bs-blackout-cinematic');
    const cinText   = document.getElementById('bs-cinematic-text');

    if (frame) {
        frame.style.transition = 'opacity 700ms ease, filter 700ms ease';
        frame.style.opacity    = '';
        frame.style.filter     = '';
    }

    if (cinematic) cinematic.classList.remove('bs-cinematic--visible');
    if (cinText) {
        cinText.classList.remove('bs-cinematic-text--visible', 'bs-cinematic-text--exit');
        cinText.innerHTML = '';
    }

    // Limpiar módulos
    hideModulesArea();
    stopCoreModule();
    _blackoutStartTime = null;
}

// ── Estado 4: Secuencia de recuperación ──────────────────────────────────

function runRecoverySequence() {
    const overlay  = document.getElementById('bs-recovery-overlay');
    const titleEl  = document.getElementById('bs-recovery-title');
    const subEl    = document.getElementById('bs-recovery-sub');
    const frame    = document.querySelector('.dashboard-frame');
    const cinematic = document.getElementById('bs-blackout-cinematic');

    // Capturar duración antes de que el timer se detenga
    const durationText = _blackoutStartTime
        ? formatTimer(Math.floor((Date.now() - _blackoutStartTime) / 1000))
        : '00:00:00';

    // ─ 0ms: Flash blanco + módulos se disuelven + timer se detiene
    document.body.classList.add('bs-recovery-flash');
    setTimeout(() => document.body.classList.remove('bs-recovery-flash'), 300);
    hideModulesArea();
    stopCoreModule();

    // ─ 120ms: Fondo cinematográfico se disuelve
    setTimeout(() => {
        if (cinematic) cinematic.classList.remove('bs-cinematic--visible');
    }, 120);

    // ─ 180ms: Dashboard comienza a recuperar opacidad parcialmente
    setTimeout(() => {
        if (frame) {
            frame.style.transition = 'opacity 900ms ease, filter 900ms ease';
            frame.style.opacity    = '0.30';
            frame.style.filter     = 'saturate(0.25) brightness(0.65)';
        }
    }, 180);

    // ─ 500ms: Overlay de recuperación (verde oscuro) aparece
    setTimeout(() => {
        if (overlay) overlay.classList.add('bs-recovery--visible');
    }, 500);

    // ─ 900ms: "ENERGÍA RESTAURADA" aparece
    setTimeout(() => {
        if (titleEl) titleEl.classList.add('bs-rec--visible');
    }, 900);

    // ─ 1500ms: Subtexto con duración y cierre narrativo
    setTimeout(() => {
        if (subEl) {
            subEl.innerHTML =
                `Apagón de <strong style="color:rgba(255,255,255,0.65)">${durationText}</strong><br>` +
                `Tu sistema solar mantuvo continuidad en las cargas críticas.`;
            subEl.classList.add('bs-rec--visible');
        }
    }, 1500);

    // ─ 2900ms: Todo comienza a desvanecerse — dashboard recupera
    setTimeout(() => {
        if (titleEl) { titleEl.classList.remove('bs-rec--visible'); titleEl.classList.add('bs-rec--exit'); }
        if (subEl)   { subEl.classList.remove('bs-rec--visible');   subEl.classList.add('bs-rec--exit');   }
        if (overlay) { overlay.classList.remove('bs-recovery--visible'); overlay.classList.add('bs-recovery--exit'); }
        if (frame) {
            frame.style.transition = 'opacity 700ms ease, filter 700ms ease';
            frame.style.opacity    = '';
            frame.style.filter     = '';
        }
    }, 2900);

    // ─ 3600ms: Limpieza completa → idle
    setTimeout(() => {
        if (overlay) { overlay.classList.remove('bs-recovery--exit'); }
        if (titleEl) { titleEl.classList.remove('bs-rec--exit'); }
        if (subEl)   { subEl.classList.remove('bs-rec--exit'); subEl.innerHTML = ''; }
        toIdle();
    }, 3600);
}

// ── API pública de transiciones ───────────────────────────────────────────

export function toIdle() {
    if (_state === STATES.IDLE) return;
    resetCinematic();
    transition(STATES.IDLE);
}

export function toAlert() {
    if (_state === STATES.ALERT) return;
    transition(STATES.ALERT);
}

export function toBlackout() {
    if (_state === STATES.BLACKOUT) return;
    _blackoutStartTime = Date.now();   // registrar inicio antes de la secuencia
    transition(STATES.BLACKOUT);
    runCinematicTransition();
}

export function toRecovery() {
    if (_state === STATES.RECOVERY) return;
    transition(STATES.RECOVERY);
    runRecoverySequence();
}

// ── Funciones de desarrollo (consola del navegador) ───────────────────────
//  Acceso global: blackout.simulateAlert(), blackout.simulateBlackout(), etc.

function exposeDevAPI() {
    window.blackout = {
        simulateAlert:    toAlert,
        simulateBlackout: toBlackout,
        simulateRecovery: toRecovery,
        reset:            toIdle,
        getState:         () => _state,
    };
}

// ── Inicialización ────────────────────────────────────────────────────────

export function initBlackout(apiBase) {
    _apiBase = apiBase;

    // Garantizar que el nodo raíz exista y esté en idle
    syncDataState(STATES.IDLE);

    // Botón oculto de presentador → estado alert (esquina inf. izq.)
    const demoAlertBtn = document.getElementById('bs-demo-alert');
    if (demoAlertBtn) demoAlertBtn.addEventListener('click', toAlert);

    // Botón oculto de presentador → estado blackout (esquina inf. der.)
    const demoBlackoutBtn = document.getElementById('bs-demo-blackout');
    if (demoBlackoutBtn) demoBlackoutBtn.addEventListener('click', toBlackout);

    // Botón oculto de presentador → estado recovery (esquina sup. der.)
    const demoRecoveryBtn = document.getElementById('bs-demo-recovery');
    if (demoRecoveryBtn) demoRecoveryBtn.addEventListener('click', toRecovery);

    // Cuando la cinemática termina → mostrar módulos y arrancar timer
    document.addEventListener('blackout:modules-ready', () => {
        showModulesArea();
        startCoreModule();
    });

    // Atajos de teclado para demos (Shift+1 / Shift+2 / Shift+3)
    // Usa e.code para ser independiente del layout de teclado (español, etc.)
    document.addEventListener('keydown', (e) => {
        if (!e.shiftKey) return;
        if (e.code === 'Digit1') { e.preventDefault(); toAlert();    }  // Shift+1 → Alerta
        if (e.code === 'Digit2') { e.preventDefault(); toBlackout(); }  // Shift+2 → Apagón
        if (e.code === 'Digit3') { e.preventDefault(); toRecovery(); }  // Shift+3 → Recuperación
        if (e.code === 'Escape') { e.preventDefault(); toIdle();     }  // Esc    → Reset
    });

    // Exponer API de desarrollo en consola
    exposeDevAPI();

    console.info('[Blackout] Sistema iniciado. Estado: idle');
    console.info('[Blackout] Dev: blackout.simulateAlert() | simulateBlackout() | simulateRecovery() | reset()');
}
