/* script.js - VERSIÓN FINAL CORREGIDA (Sábados/Domingos bloqueados + Gestión) */

// 1. CONFIGURACIÓN FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyA6WW4ZiFeH64U_ICC2hbCc_M_eqq6tUzU",
  authDomain: "zapata-barberia-app.firebaseapp.com",
  projectId: "zapata-barberia-app",
  storageBucket: "zapata-barberia-app.firebasestorage.app",
  messagingSenderId: "785125206064",
  appId: "1:785125206064:web:b47eb5e9db9ebe2f4c25f5",
  measurementId: "G-3GFVB1646F"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. DATOS
const servicios = [
    { id: 'corte', nombre: "Corte Clásico", precio: 70, duracion: 30 },
    { id: 'corte_barba', nombre: "Corte + Barba", precio: 100, duracion: 45 },
    { id: 'completo', nombre: "Servicio Completo", precio: 150, duracion: 60 },
    { id: 'recorte', nombre: "Recorte", precio: 40, duracion: 20 }
];

// Solo Gabriel
const barberos = [ { id: 'gabriel', nombre: "Gabriel", telefono: "3341013535" } ];

// Horarios (Aunque bloqueemos fines de semana en calendario, dejamos la config por si acaso)
const horarioTrabajo = {
    semana: { inicio: 16 * 60, fin: 22 * 60 },
    sabado: { inicio: 16 * 60, fin: 19 * 60 },
    domingo: { inicio: 11 * 60, fin: 18 * 60 }
};

let cita = {
    paso: 1,
    servicio: null,
    barbero: null,
    fecha: null,
    horaInicio: null,
    horaFin: null
};

// Variables calendario
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// 3. INICIO
document.addEventListener('DOMContentLoaded', () => {
    cargarServicios();
    cargarBarberos();
    renderCalendar(currentMonth, currentYear);

    // Listeners
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
    document.getElementById('client-name').addEventListener('input', validarPaso3);
    document.getElementById('client-phone').addEventListener('input', validarPaso3);
    document.querySelectorAll('.next-btn').forEach(btn => btn.addEventListener('click', () => cambiarPaso(1)));
    document.querySelectorAll('.prev-btn').forEach(btn => btn.addEventListener('click', () => cambiarPaso(-1)));
    document.getElementById('booking-form').addEventListener('submit', confirmarCita);
});

// 4. LÓGICA CALENDARIO (UI)
function renderCalendar(month, year) {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('month-year');
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    monthLabel.innerText = `${monthNames[month]} ${year}`;
    grid.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-btn empty';
        grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const btn = document.createElement('button');
        btn.innerText = day;
        btn.className = 'day-btn';
        btn.type = 'button';
        const btnDate = new Date(year, month, day);

        // Bloquear días pasados
        if (btnDate < today) btn.disabled = true;

        // --- NUEVO: BLOQUEAR SÁBADOS (6) Y DOMINGOS (0) ---
        if (btnDate.getDay() === 0 || btnDate.getDay() === 6) {
            btn.disabled = true;
            btn.style.opacity = "0.3"; 
            btn.style.cursor = "not-allowed";
            btn.title = "No laboramos fines de semana";
        }
        // --------------------------------------------------

        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        if (cita.fecha === dateStr) btn.classList.add('selected');

        // Solo permitir clic si no está deshabilitado
        if (!btn.disabled) {
            btn.onclick = () => seleccionarFecha(dateStr, btn);
        }
        grid.appendChild(btn);
    }
}

function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar(currentMonth, currentYear);
}

function seleccionarFecha(dateStr, btn) {
    cita.fecha = dateStr;
    cita.horaInicio = null; 
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    renderHorarios();
}

// 5. WIZARD & DATA
function cambiarPaso(dir) {
    const nuevo = cita.paso + dir;
    if (nuevo >= 1 && nuevo <= 3) {
        cita.paso = nuevo;
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        
        document.querySelector(`.step[data-step="${cita.paso}"]`).classList.add('active');
        
        document.querySelectorAll('.step-indicator span').forEach((span, idx) => {
            if (idx + 1 === cita.paso) span.classList.add('active');
            else span.classList.remove('active');
        });
        validarBotones();
    }
}

function validarBotones() {
    const p1 = document.querySelector('.step[data-step="1"] .next-btn');
    if (p1) p1.disabled = !cita.servicio;
    const p2 = document.querySelector('.step[data-step="2"] .next-btn');
    if (p2) p2.disabled = !cita.barbero;
    validarPaso3();
}

function validarPaso3() {
    const n = document.getElementById('client-name').value.trim();
    const t = document.getElementById('client-phone').value.trim();
    const ok = cita.fecha && cita.horaInicio && n && t;
    document.getElementById('confirm-btn').disabled = !ok;
}

function cargarServicios() {
    const c = document.getElementById('services-container');
    c.innerHTML = '';
    servicios.forEach(s => {
        const d = document.createElement('div');
        d.className = 'selection-item';
        d.innerHTML = `<h4>${s.nombre}</h4><p>$${s.precio}</p>`;
        d.onclick = () => {
            cita.servicio = s;
            document.querySelectorAll('#services-container .selection-item').forEach(x => x.classList.remove('selected'));
            d.classList.add('selected');
            document.getElementById('service-summary').innerText = `Seleccionado: ${s.nombre}`;
            validarBotones();
        };
        c.appendChild(d);
    });
}

function cargarBarberos() {
    const c = document.getElementById('barber-container');
    c.innerHTML = '';
    barberos.forEach(b => {
        const d = document.createElement('div');
        d.className = 'selection-item';
        d.innerHTML = `<h4>${b.nombre}</h4><p>Barbero Principal</p>`;
        d.onclick = () => {
            cita.barbero = b;
            document.querySelectorAll('#barber-container .selection-item').forEach(x => x.classList.remove('selected'));
            d.classList.add('selected');
            validarBotones();
        };
        c.appendChild(d);
    });
}

// 6. HORARIOS
function minutesAHora(m) {
    const hh = Math.floor(m / 60).toString().padStart(2, '0');
    const mm = (m % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
}

function horaAMinutos(str) {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
}

async function renderHorarios() {
    const c = document.getElementById('hours-container');
    c.innerHTML = '<p>Buscando...</p>';
    if (!cita.fecha || !cita.barbero || !cita.servicio) return;

    const dia = new Date(cita.fecha + 'T00:00:00').getDay();
    let rango = null;
    if (dia >= 1 && dia <= 5) rango = horarioTrabajo.semana;
    else if (dia === 6) rango = horarioTrabajo.sabado;
    else if (dia === 0) rango = horarioTrabajo.domingo;

    // Aunque ya bloqueamos en calendario, doble seguridad aquí:
    if (!rango) { c.innerHTML = '<p>Cerrado.</p>'; return; }

    const snap = await db.collection('citas')
        .where('barberoId', '==', cita.barbero.id)
        .where('fecha', '==', cita.fecha).get();
    
    const ocupados = [];
    snap.forEach(d => {
        const data = d.data();
        ocupados.push({ inicio: horaAMinutos(data.hora24), fin: horaAMinutos(data.fin) });
    });

    const slots = [];
    const dur = cita.servicio.duracion;
    for (let t = rango.inicio; t <= rango.fin - dur; t += 30) {
        const ft = t + dur;
        const choca = ocupados.some(o => (t < o.fin && ft > o.inicio));
        if (!choca) slots.push(minutesAHora(t));
    }

    c.innerHTML = '';
    if (slots.length === 0) { c.innerHTML = '<p>Lleno.</p>'; return; }

    slots.forEach(h => {
        const b = document.createElement('button');
        b.className = 'hour-card';
        b.innerText = h;
        b.type = 'button';
        b.onclick = () => seleccionarHora(h);
        c.appendChild(b);
    });
}

function seleccionarHora(h) {
    cita.horaInicio = h;
    const ini = horaAMinutos(h);
    cita.horaFin = minutesAHora(ini + cita.servicio.duracion);
    
    document.querySelectorAll('.hour-card').forEach(b => b.classList.remove('selected'));
    Array.from(document.querySelectorAll('.hour-card')).find(b => b.innerText === h)?.classList.add('selected');
    
    document.getElementById('final-summary').innerHTML = `
        <p><strong>Cita:</strong> ${cita.servicio.nombre}</p>
        <p><strong>Fecha:</strong> ${cita.fecha} - ${cita.horaInicio}</p>
        <p><strong>Total:</strong> $${cita.servicio.precio}</p>
    `;
    validarPaso3();
}

// 7. FUNCIONES EXTRA: GENERAR LINK DE CALENDARIO
function generarLinkCalendario(c) {
    const fechaSinGuiones = c.fecha.replace(/-/g, '');
    const horaSinPuntos = c.horaInicio.replace(/:/g, '');
    
    const inicioMins = horaAMinutos(c.horaInicio);
    const finMins = inicioMins + c.servicio.duracion;
    const horaFinFormat = minutesAHora(finMins).replace(/:/g, '');
    
    const start = `${fechaSinGuiones}T${horaSinPuntos}00`;
    const end = `${fechaSinGuiones}T${horaFinFormat}00`;
    
    const titulo = encodeURIComponent(`Cita Barbería: ${c.servicio.nombre} - ${c.cliente}`);
    const detalles = encodeURIComponent(`Cliente: ${c.cliente}\nTel: ${c.telefono}\nServicio: ${c.servicio.nombre}`);
    const location = encodeURIComponent("Zapata y sus Bigotes");

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${start}/${end}&details=${detalles}&location=${location}`;
}

// 8. CONFIRMAR
async function confirmarCita(e) {
    e.preventDefault();
    const btn = document.getElementById('confirm-btn');
    btn.disabled = true;
    btn.innerText = "Guardando...";

    const nombre = document.getElementById('client-name').value;
    const tel = document.getElementById('client-phone').value;

    const nuevaCita = {
        barberoId: cita.barbero.id,
        barbero: cita.barbero.nombre,
        fecha: cita.fecha,
        hora24: cita.horaInicio,
        fin: cita.horaFin,
        duracion: cita.servicio.duracion,
        servicios: [cita.servicio.nombre],
        cliente: nombre,
        telefono: tel,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('citas').add(nuevaCita);
        
        const linkCal = generarLinkCalendario({...cita, cliente: nombre, telefono: tel});
        
        const textoWA = `Hola, soy ${nombre}. Reservé ${cita.servicio.nombre} el ${cita.fecha} a las ${cita.horaInicio}.\n\n📅 *Agrégalo a tu calendario aquí (te avisa 15 min antes):* \n${linkCal}`;
        
        const linkWA = `https://wa.me/52${cita.barbero.telefono}?text=${encodeURIComponent(textoWA)}`;
        
        window.open(linkWA, '_blank');
        alert("¡Cita agendada! Se abrirá WhatsApp para enviar la confirmación.");
        location.reload();
    } catch (err) {
        console.error(err);
        alert("Error al guardar.");
        btn.disabled = false;
        btn.innerText = "Reintentar";
    }
}

// 9. GESTIÓN DE CITAS (WhatsApp Directo)
function gestionarCita(accion) {
    const telefono = "523341013535"; // El número de Gabriel
    let mensaje = "";

    if (accion === 'cancelar') {
        mensaje = "Hola Zapata y sus Bigotes, tengo una cita agendada pero necesito CANCELARLA. ¿Me apoyas?";
    } else if (accion === 'reagendar') {
        mensaje = "Hola, tengo una cita agendada pero necesito CAMBIAR LA FECHA (Reagendar). ¿Qué horarios tienes disponibles?";
    }

    const link = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(link, '_blank');
}