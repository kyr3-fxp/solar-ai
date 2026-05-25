import './dashboard.js';
import { initBlackout } from './blackout.js';

document.addEventListener('DOMContentLoaded', () => {
    const apiBase = document.body?.dataset?.apiBase || '';
    initBlackout(apiBase);
});
