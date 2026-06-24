// ============================================================
//  server.js — SERVIDOR PRINCIPAL
//
//  Este servidor hace tres cosas en paralelo:
//  1. Lee los datos JSON que llegan del Arduino por USB (serial)
//  2. Envía esos datos a todos los navegadores conectados (WebSocket)
//  3. Sirve los archivos de tu frontend (HTML, CSS, JS)
//  4. Guarda cada lectura en PostgreSQL
// ============================================================

// Cargamos las variables del archivo .env PRIMERO (antes de todo)
require('dotenv').config();

// --- Importamos las librerías necesarias ---

// express: el framework para crear el servidor web
const express = require('express');

// http: módulo nativo de Node.js para crear el servidor HTTP
const http = require('http');

// ws: librería para WebSockets (comunicación en tiempo real)
const { WebSocketServer } = require('ws');

// serialport: para leer el puerto serial del Arduino
const { SerialPort } = require('serialport');

// ReadlineParser: separa el flujo de datos en líneas individuales
// (cada línea es un mensaje JSON completo del Arduino)
const { ReadlineParser } = require('@serialport/parser-readline');

// path: módulo nativo para manejar rutas de archivos
const path = require('path');

const {
  guardarLectura,
  obtenerUltimasLecturas,
  obtenerRegistrosActuales,
  obtenerRegistrosAnteriores
} = require('./db');

// ============================================================
//  CONFIGURACIÓN DEL SERVIDOR WEB (Express)
// ============================================================
const app = express();
const server = http.createServer(app);

// Le decimos a Express que sirva los archivos estáticos de la
// carpeta "../frontend". Cuando el navegador pida index.html,
// Express lo encontrará allí.
const rutaFrontend = path.join(__dirname, '..', 'frontend');
app.use(express.static(rutaFrontend));

// Ruta principal: si el usuario va a http://localhost:3000
// le servimos el index.html del frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(rutaFrontend, 'index.html'));
});

app.get('/api/ultima', async (req, res) => {
  try {
    res.json(await obtenerUltimasLecturas());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/registros', async (req, res) => {
  try {
    res.json(await obtenerRegistrosActuales());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/anteriores', async (req, res) => {
  try {
    res.json(await obtenerRegistrosAnteriores());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  CONFIGURACIÓN DEL SERVIDOR WEBSOCKET
// ============================================================

// Creamos el servidor WebSocket y lo "montamos" sobre el servidor HTTP
// De esta manera, ambos (HTTP y WebSocket) corren en el mismo puerto
const wss = new WebSocketServer({ server });

// Este evento se dispara cada vez que UN NUEVO navegador se conecta
wss.on('connection', (socket) => {
  console.log('🌐 Nuevo cliente conectado al WebSocket.');

  // Cuando el navegador se desconecta, lo registramos en consola
  socket.on('close', () => {
    console.log('🔌 Cliente desconectado del WebSocket.');
  });
});

// ============================================================
//  Función auxiliar: enviarATodosLosClientes
//  Itera sobre todos los navegadores conectados y les envía el dato
// ============================================================
function enviarATodosLosClientes(dato) {
  // wss.clients es un Set con todos los WebSockets activos
  wss.clients.forEach((cliente) => {
    // Verificamos que el cliente esté en estado OPEN (conectado y listo)
    if (cliente.readyState === 1) { // 1 = WebSocket.OPEN
      // Convertimos el objeto a string JSON y lo enviamos
      cliente.send(JSON.stringify(dato));
    }
  });
}

// ============================================================
//  CONFIGURACIÓN DEL PUERTO SERIAL (Conexión con Arduino)
// ============================================================

// Creamos la conexión al puerto serial con los parámetros del .env
const puertoSerial = new SerialPort({
  path:     process.env.SERIAL_PORT,     // Ej: "COM3" en Windows
  baudRate: parseInt(process.env.SERIAL_BAUDRATE), // 9600
  autoOpen: false, // No abrimos automáticamente (lo hacemos manualmente)
});

// Creamos el "parser" que divide el flujo de datos en líneas
// Cada vez que el Arduino envía un println(), esto nos da una línea
const parser = puertoSerial.pipe(new ReadlineParser({ delimiter: '\n' }));

// Abrimos el puerto serial manualmente
puertoSerial.open((err) => {
  if (err) {
    console.error(`❌ Error al abrir el puerto serial "${process.env.SERIAL_PORT}":`, err.message);
    console.error('   ¿Está el Arduino conectado? ¿Es correcto el puerto en .env?');
    console.error('   En Windows usa: COM3, COM4, etc.');
    console.error('   En Mac/Linux usa: /dev/ttyUSB0 o /dev/ttyACM0');
  } else {
    console.log(`🔌 Puerto serial ${process.env.SERIAL_PORT} abierto correctamente.`);
  }
});

// ============================================================
//  Evento 'data': Se dispara cada vez que llega UNA LÍNEA del Arduino
// ============================================================
parser.on('data', async (lineaRaw) => {
  // Limpiamos espacios o saltos de línea extra
  const linea = lineaRaw.trim();

  // Ignoramos líneas vacías
  if (!linea) return;

  // Mostramos en consola lo que llegó del Arduino (para debugging)
  console.log('📡 Recibido del Arduino:', linea);

  try {
    // Intentamos parsear la línea como JSON
    // Si el Arduino envió {"temperatura":25.0,"humedad":60.0,"gas":120}
    // esto lo convierte en un objeto JavaScript
    const datos = JSON.parse(linea);

    // Verificamos que el objeto tenga las propiedades que esperamos
    if (
      typeof datos.temperatura === 'number' &&
      typeof datos.humedad     === 'number' &&
      typeof datos.gas         === 'number'
    ) {
      // 1. Enviamos los datos a todos los navegadores conectados
      enviarATodosLosClientes(datos);

      // 2. Guardamos los datos en PostgreSQL
      try {
        const fila = await guardarLectura(datos);
        console.log(`💾 Guardado en DB → id: ${fila.id}, fecha: ${fila.fecha_hora}`);
      } catch (errorDB) {
        // Si falla la DB, no detenemos el servidor, solo lo registramos
        console.error('⚠️  No se pudo guardar en DB, pero los datos SÍ se enviaron al frontend.');
      }

    } else {
      console.warn('⚠️  Datos JSON inesperados:', datos);
    }

  } catch (errorParseo) {
    // Si el Arduino envió algo que no es JSON válido, lo ignoramos
    console.warn('⚠️  Línea no es JSON válido, ignorada:', linea);
  }
});

// ============================================================
//  ARRANCAR EL SERVIDOR
// ============================================================
const PUERTO = process.env.PORT || 3000;

server.listen(PUERTO, () => {
  console.log('');
  console.log('===========================================');
  console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
  console.log('===========================================');
  console.log('');
  console.log('Abre esa URL en tu navegador para ver tu página web.');
  console.log('Esperando datos del Arduino...');
});
