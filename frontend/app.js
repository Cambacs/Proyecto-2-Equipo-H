// ============================================================
//  PEGA ESTE CÓDIGO EN TU ARCHIVO app.js
//
//  Este bloque se conecta al servidor via WebSocket y recibe
//  los datos de temperatura, humedad y gas en tiempo real.
//
//  CÓMO USARLO EN TU HTML:
//  Donde quieras mostrar los valores, pon elementos con estos IDs:
//
//    <span id="temperatura">--</span>
//    <span id="humedad">--</span>
//    <span id="gas">--</span>
//
//  Puedes cambiar los IDs o la forma de mostrar los datos
//  en la función "actualizarUI" más abajo.
// ============================================================

// ======================
//  CONFIGURACIÓN
// ======================

// La URL de tu servidor WebSocket.
// "ws://" es el protocolo (como "http://" pero para WebSocket).
// location.host toma automáticamente el host actual (localhost:3000)
// así no tienes que cambiarlo cuando despliegues en producción.
const WS_URL = `ws://${location.host}`;

// Tiempo en ms que espera antes de intentar reconectarse si se cae la conexión
const TIEMPO_RECONEXION = 3000; // 3 segundos

// ======================
//  VARIABLES DE ESTADO
// ======================
let socket = null;               // El objeto WebSocket
let intentosReconexion = 0;      // Contador de intentos fallidos

// ======================
//  FUNCIÓN PRINCIPAL: conectarWebSocket
//  Crea la conexión y define qué hacer con cada evento
// ======================
function conectarWebSocket() {
  console.log('Conectando al servidor WebSocket...');

  // Creamos la conexión WebSocket
  socket = new WebSocket(WS_URL);

  // --- Evento: conexión exitosa ---
  socket.addEventListener('open', () => {
    console.log('✅ WebSocket conectado al servidor.');
    intentosReconexion = 0; // Reiniciamos el contador de errores

    // Si tienes un indicador de estado en tu HTML, aquí puedes actualizarlo
    // Ejemplo: document.getElementById('estado').textContent = 'Conectado';
  });

  // --- Evento: llega un mensaje del servidor ---
  socket.addEventListener('message', (evento) => {
    try {
      // "evento.data" contiene el string JSON que envió el servidor
      // JSON.parse lo convierte en un objeto JavaScript
      const datos = JSON.parse(evento.data);

      // Llamamos a tu función para actualizar la interfaz
      actualizarUI(datos);

    } catch (error) {
      console.error('Error al parsear datos del servidor:', error);
    }
  });

  // --- Evento: la conexión se cerró ---
  socket.addEventListener('close', () => {
    console.warn('⚠️  WebSocket desconectado. Intentando reconectar...');

    // Intentamos reconectarnos después de 3 segundos
    setTimeout(() => {
      intentosReconexion++;
      console.log(`Intento de reconexión #${intentosReconexion}...`);
      conectarWebSocket();
    }, TIEMPO_RECONEXION);
  });

  // --- Evento: ocurrió un error ---
  socket.addEventListener('error', (error) => {
    console.error('❌ Error en WebSocket:', error);
    // El evento 'close' se disparará automáticamente después de un error
  });
}

let lecturaAnteriorWS = null;

function analizarLecturaWS(datos) {
  const co2 = datos.gas;
  let calidad = 'Buena';
  if (co2 >= 500) calidad = 'Crítica';
  else if (co2 >= 250) calidad = 'Moderada';

  const sugerencias = [];
  if (co2 >= 250) sugerencias.push('Abrir ventanas para reducir el CO₂.');
  if (datos.temperatura < 18 || datos.temperatura > 26) sugerencias.push('Ajustar temperatura del ambiente (18–26°C óptimo).');
  if (datos.humedad < 40 || datos.humedad > 60) sugerencias.push('Considerar humidificador o deshumidificador.');
  if (sugerencias.length === 0) sugerencias.push('Condiciones ambientales dentro de rangos aceptables.');

  return {
    temperatura: +datos.temperatura.toFixed(1),
    humedad:     +datos.humedad.toFixed(1),
    co2,
    calidad,
    sugerencia:  sugerencias.join(' | '),
    fecha_hora:  new Date().toLocaleString('es-UY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  };
}

function actualizarUI(datos) {
  const a   = analizarLecturaWS(datos);
  const ant = lecturaAnteriorWS;
  lecturaAnteriorWS = a;

  actualizarPrincipal(a);
  actualizarSensoreo(a, ant);
  console.log('📊 Datos actualizados:', a);
}

// ======================
//  INICIAR LA CONEXIÓN
//  Esto se ejecuta cuando carga la página
// ======================
conectarWebSocket();
/* ──────────────────────────────────────────
   NAVEGACIÓN
────────────────────────────────────────── */
function goTo(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (btn) btn.classList.add('active');
}

/* ──────────────────────────────────────────
   TEMA
────────────────────────────────────────── */
function toggleTheme() {
  const html = document.documentElement;
  const dark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', dark ? 'light' : 'dark');
  document.getElementById('theme-label').textContent = dark ? 'Modo oscuro' : 'Modo claro';
  const icon = document.getElementById('theme-icon');
  icon.innerHTML = dark
    ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
}

/* ──────────────────────────────────────────
   SALIDA
────────────────────────────────────────── */
function confirmExit() {
  if (confirm('¿Salir del sistema Monitor Ambiental?')) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#0F6E56;font-size:18px;">Sesión cerrada. Hasta pronto 👋</div>';
  }
}

/* ──────────────────────────────────────────
   HELPERS
────────────────────────────────────────── */
const badgeClass = {
  'Buena':    'badge-good',
  'Moderada': 'badge-mid',
  'Crítica':  'badge-bad'
};

function actualizarPrincipal(a) {
  const statValues = document.querySelectorAll('#page-principal .stats-grid .stat-card .stat-value');
  if (statValues[0]) statValues[0].innerHTML = `${a.temperatura}<span class="stat-unit">°C</span>`;
  if (statValues[1]) statValues[1].innerHTML = `${a.humedad}<span class="stat-unit">%</span>`;
  if (statValues[2]) statValues[2].innerHTML = `${a.co2}<span class="stat-unit">ppm</span>`;
}

function actualizarSensoreo(a, ant) {
  const metrics = document.querySelectorAll('#page-ultimo-sensoreo .sensor-metric');
  if (!metrics.length) return;

  metrics[0].querySelector('.sensor-metric-value').textContent = a.temperatura;
  if (ant) {
    const dT = +(a.temperatura - ant.temperatura).toFixed(1);
    const cmpT = metrics[0].querySelector('.sensor-compare');
    cmpT.className = 'sensor-compare ' + (dT < 0 ? 'cmp-down' : dT > 0 ? 'cmp-up' : 'cmp-eq');
    cmpT.innerHTML = dT === 0
      ? '<span class="cmp-arrow">→</span><span>Sin cambios respecto al anterior</span>'
      : `<span class="cmp-arrow">${dT > 0 ? '↑' : '↓'}</span>
         <span>${Math.abs(dT)}°C respecto al anterior — <strong>${dT > 0 ? 'empeoró' : 'mejoró'}</strong></span>`;
  }

  metrics[1].querySelector('.sensor-metric-value').textContent = a.humedad;
  if (ant) {
    const dH = +(a.humedad - ant.humedad).toFixed(1);
    const cmpH = metrics[1].querySelector('.sensor-compare');
    cmpH.className = 'sensor-compare ' + (dH === 0 ? 'cmp-eq' : 'cmp-up');
    cmpH.innerHTML = dH === 0
      ? '<span class="cmp-arrow">→</span><span>Sin cambios respecto al anterior</span>'
      : `<span class="cmp-arrow">${dH > 0 ? '↑' : '↓'}</span>
         <span>${Math.abs(dH)}% respecto al anterior</span>`;
  }

  metrics[2].querySelector('.sensor-metric-value').textContent = a.co2;
  if (ant) {
    const dC = a.co2 - ant.co2;
    const cmpC = metrics[2].querySelector('.sensor-compare');
    cmpC.className = 'sensor-compare ' + (dC > 0 ? 'cmp-up' : dC < 0 ? 'cmp-down' : 'cmp-eq');
    cmpC.innerHTML = dC === 0
      ? '<span class="cmp-arrow">→</span><span>Sin cambios respecto al anterior</span>'
      : `<span class="cmp-arrow">${dC > 0 ? '↑' : '↓'}</span>
         <span>${dC > 0 ? '+' : ''}${dC} ppm respecto al anterior — <strong>${dC > 0 ? 'empeoró' : 'mejoró'}</strong></span>`;
  }

  const calBadge = metrics[3].querySelector('.badge');
  if (calBadge) {
    calBadge.textContent = a.calidad;
    calBadge.className   = `badge ${badgeClass[a.calidad] || ''}`;
  }

  const recList = document.querySelector('#page-ultimo-sensoreo .rec-list');
  if (recList && a.sugerencia) {
    const parts = a.sugerencia.split(' | ');
    recList.innerHTML = parts.map(p =>
      `<li class="rec-item rec-mid">
         <svg class="rec-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
         ${p}
       </li>`
    ).join('');
  }

  if (ant) {
    const tbody = document.querySelector('#page-ultimo-sensoreo tbody');
    if (tbody) {
      const dT = +(a.temperatura - ant.temperatura).toFixed(1);
      const dH = +(a.humedad - ant.humedad).toFixed(1);
      const dC = a.co2 - ant.co2;
      tbody.innerHTML = `
        <tr>
          <td style="padding:8px 10px;color:var(--text-2);">Temperatura</td>
          <td style="padding:8px 10px;text-align:right;color:var(--text-1);">${ant.temperatura}°C</td>
          <td style="padding:8px 10px;text-align:right;color:var(--text-1);">${a.temperatura}°C</td>
          <td style="padding:8px 10px;text-align:right;color:${dT > 0 ? '#E24B4A' : '#1D9E75'};font-weight:600;">${dT > 0 ? '+' : ''}${dT}°C ${dT > 0 ? '↑' : dT < 0 ? '↓' : '→'}</td>
        </tr>
        <tr>
          <td style="padding:8px 10px;color:var(--text-2);">Humedad</td>
          <td style="padding:8px 10px;text-align:right;color:var(--text-1);">${ant.humedad}%</td>
          <td style="padding:8px 10px;text-align:right;color:var(--text-1);">${a.humedad}%</td>
          <td style="padding:8px 10px;text-align:right;color:var(--text-3);font-weight:600;">${dH > 0 ? '+' : ''}${dH}% ${dH > 0 ? '↑' : dH < 0 ? '↓' : '→'}</td>
        </tr>
        <tr>
          <td style="padding:8px 10px;color:var(--text-2);">CO₂</td>
          <td style="padding:8px 10px;text-align:right;color:var(--text-1);">${ant.co2} ppm</td>
          <td style="padding:8px 10px;text-align:right;color:var(--text-1);">${a.co2} ppm</td>
          <td style="padding:8px 10px;text-align:right;color:${dC > 0 ? '#E24B4A' : '#1D9E75'};font-weight:600;">${dC > 0 ? '+' : ''}${dC} ${dC > 0 ? '↑' : dC < 0 ? '↓' : '→'}</td>
        </tr>`;
    }
    const fechaEl = document.querySelector('#page-ultimo-sensoreo p[style*="11.5px"]');
    if (fechaEl) {
      fechaEl.innerHTML = `Última lectura: <strong style="color:var(--text-2);">${a.fecha_hora}</strong>`;
    }
  }
}

async function cargarPrincipal() {
  try {
    const res  = await fetch('/api/ultima');
    const data = await res.json();
    if (!data.actual) return;
    actualizarPrincipal(data.actual);
  } catch (e) {
    console.warn('Principal: no se pudo cargar /api/ultima', e);
  }
}

async function cargarUltimoSensoreo() {
  try {
    const res  = await fetch('/api/ultima');
    const data = await res.json();
    if (!data.actual) return;
    lecturaAnteriorWS = data.anterior || lecturaAnteriorWS;
    actualizarSensoreo(data.actual, data.anterior);
  } catch (e) {
    console.warn('UltimoSensoreo: no se pudo cargar /api/ultima', e);
  }
}

/* ──────────────────────────────────────────
   RENDER TABLA GENÉRICA
────────────────────────────────────────── */
function renderTable(rows, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-3);padding:24px;">Sin registros para el período seleccionado.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((r, i) => `
    <tr>
      <td>${r.id ?? (i + 1)}</td>
      <td>${r.fecha_hora}</td>
      <td>${r.temperatura}</td>
      <td>${r.humedad}</td>
      <td>${r.co2}</td>
      <td><span class="badge ${badgeClass[r.calidad] || ''}">${r.calidad}</span></td>
      <td style="font-size:12.5px;color:var(--text-3)">${r.sugerencia}</td>
    </tr>`).join('');
}

/* ──────────────────────────────────────────
   REGISTROS ACTUALES
────────────────────────────────────────── */
let rowsActual = [];

async function cargarRegistros() {
  try {
    const res = await fetch('/api/registros');
    rowsActual = await res.json();
    renderTable(rowsActual, 'reg-body');
  } catch (e) {
    console.warn('Registros: no se pudo cargar /api/registros', e);
    renderTable([], 'reg-body');
  }
}

function filterTable() {
  const from = document.getElementById('f-from').value;
  const to   = document.getElementById('f-to').value;
  const q    = document.getElementById('f-quality').value;
  const filtered = rowsActual.filter(r => {
    const [d] = r.fecha_hora.split(' ');
    const [day, mon, yr] = d.split('/');
    const iso = `${yr}-${mon}-${day}`;
    return (!from || iso >= from) && (!to || iso <= to) && (!q || r.calidad === q);
  });
  renderTable(filtered, 'reg-body');
}

function resetFilter() {
  document.getElementById('f-quality').value = '';
  renderTable(rowsActual, 'reg-body');
}

/* ──────────────────────────────────────────
   REGISTROS ANTERIORES
────────────────────────────────────────── */
let rowsAnt = [];

async function cargarRegistrosAnt() {
  try {
    const res = await fetch('/api/anteriores');
    rowsAnt = await res.json();
    renderTable(rowsAnt, 'reg-ant-body');
  } catch (e) {
    console.warn('RegistrosAnt: no se pudo cargar /api/anteriores', e);
    renderTable([], 'reg-ant-body');
  }
}

function filterTableAnt() {
  const from = document.getElementById('fa-from').value;
  const to   = document.getElementById('fa-to').value;
  const filtered = rowsAnt.filter(r => {
    const [d] = r.fecha_hora.split(' ');
    const [day, mon, yr] = d.split('/');
    const iso = `${yr}-${mon}-${day}`;
    return (!from || iso >= from) && (!to || iso <= to);
  });
  renderTable(filtered, 'reg-ant-body');
}

function resetFilterAnt() {
  renderTable(rowsAnt, 'reg-ant-body');
}

/* ──────────────────────────────────────────
   COUNTDOWN — 10 segundos
────────────────────────────────────────── */
let cdTotal = 10;
let cdLeft  = cdTotal;

function updateCd() {
  cdLeft--;
  if (cdLeft < 0) {
    cdLeft = cdTotal;
    // Recargar datos cuando el contador llega a 0
    cargarPrincipal();
    cargarUltimoSensoreo();
  }
  const m   = String(Math.floor(cdLeft / 60)).padStart(2, '0');
  const s   = String(cdLeft % 60).padStart(2, '0');
  const el  = document.getElementById('countdown');
  const bar = document.getElementById('cd-bar');
  if (el)  el.textContent  = `${m}:${s}`;
  if (bar) bar.style.width = (cdLeft / cdTotal * 100) + '%';
}

setInterval(updateCd, 1000);

/* ──────────────────────────────────────────
   COMENTARIOS
────────────────────────────────────────── */
const sampleComments = [
  {
    name: 'Lucas M.',
    cat:  'Nueva funcionalidad',
    text: 'Sería útil tener una alerta por email cuando el CO₂ supera cierto umbral.',
    date: '03/06/2026'
  },
  {
    name: 'Valentina R.',
    cat:  'Mejora de interfaz',
    text: 'Me gustaría poder ver un gráfico de tendencias a lo largo del día, no solo la tabla.',
    date: '01/06/2026'
  },
  {
    name: 'Diego P.',
    cat:  'Otro',
    text: 'El sistema funciona muy bien, felicitaciones al equipo.',
    date: '29/05/2026'
  }
];

function renderComments(list) {
  document.getElementById('comments-list').innerHTML = list.map(c => `
    <div class="comment-card">
      <div class="comment-header">
        <div class="comment-avatar">
          ${c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div class="comment-author">${c.name}</div>
        <div class="comment-date">${c.date}</div>
      </div>
      <div class="comment-body">${c.text}</div>
      <span class="comment-tag">${c.cat}</span>
    </div>`).join('');
}

renderComments(sampleComments);

function submitComment() {
  const name = document.getElementById('c-name').value.trim();
  const cat  = document.getElementById('c-cat').value;
  const text = document.getElementById('c-text').value.trim();
  if (!name || !text) {
    alert('Por favor completá tu nombre y comentario.');
    return;
  }
  const today = new Date().toLocaleDateString('es-UY');
  sampleComments.unshift({ name, cat, text, date: today });
  renderComments(sampleComments);
  document.getElementById('c-name').value = '';
  document.getElementById('c-text').value = '';
}

/* ──────────────────────────────────────────
   EQUIPO — Sobre nosotros
   Reemplazar con datos reales del equipo
────────────────────────────────────────── */
const team = [
  {
    name: 'Ana Fernández',
    role: 'Desarrollo',
    desc: 'Responsable del frontend y conexión con la base de datos.',
    init: 'AF'
  },
  {
    name: 'Carlos López',
    role: 'Gestión',
    desc: 'Coordinación general del proyecto y comunicación con el cliente.',
    init: 'CL'
  },
  {
    name: 'Sofía Martínez',
    role: 'Análisis',
    desc: 'Interpretación de datos ambientales y generación de reportes.',
    init: 'SM'
  },
  {
    name: 'Nicolás Torres',
    role: 'Hardware / IoT',
    desc: 'Diseño e implementación del sensor Arduino y conectividad.',
    init: 'NT'
  }
];

document.getElementById('team-grid').innerHTML = team.map(t => `
  <div class="team-card">
    <div class="avatar">${t.init}</div>
    <div class="team-name">${t.name}</div>
    <div class="team-role">${t.role}</div>
    <div class="team-desc">${t.desc}</div>
  </div>`).join('');

/* ──────────────────────────────────────────
   MANUAL — navegación interna
────────────────────────────────────────── */
const manualMap = {
  'intro':       'm-intro',
  'navegacion':  'm-navegacion',
  'sensor':      'm-sensor',
  'registros-m': 'm-registros-m',
  'arduino':     'm-arduino'
};

function scrollManual(key, el) {
  document.querySelectorAll('.manual-nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  const target = document.getElementById(manualMap[key]);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ──────────────────────────────────────────
   INICIALIZACIÓN
────────────────────────────────────────── */
cargarPrincipal();
cargarUltimoSensoreo();
cargarRegistros();
cargarRegistrosAnt();
