// ============================================================
//  db.js — MÓDULO DE CONEXIÓN A POSTGRESQL
//  Este archivo se encarga de conectarse a la base de datos
//  y de guardar cada lectura de sensores.
// ============================================================

// pg es el driver oficial de PostgreSQL para Node.js
const { Pool } = require('pg');

// Cargamos las variables del archivo .env
require('dotenv').config();

// Creamos un "pool" de conexiones a la base de datos.
// Un pool es un conjunto de conexiones reutilizables (más eficiente
// que abrir y cerrar una conexión nueva cada vez).
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Probamos la conexión al arrancar el módulo
pool.connect((err, client, done) => {
  if (err) {
    console.error('❌ Error al conectar con PostgreSQL:', err.message);
    console.error('   Verifica las credenciales en tu archivo .env');
  } else {
    console.log('✅ Conectado a PostgreSQL correctamente.');
    done(); // Liberamos el cliente de vuelta al pool
  }
});

// ============================================================
//  Función: guardarLectura
//  Recibe un objeto { temperatura, humedad, gas } y lo guarda
//  en la tabla "lecturas" de la base de datos.
// ============================================================
async function guardarLectura({ temperatura, humedad, gas }) {
  // La consulta SQL para insertar una fila nueva
  // Los $1, $2, $3 son parámetros que evitan inyección SQL
  const consulta = `
    INSERT INTO lecturas (temperatura, humedad, gas)
    VALUES ($1, $2, $3)
    RETURNING id, fecha_hora
  `;

  // Los valores que reemplazan $1, $2, $3
  const valores = [temperatura, humedad, gas];

  try {
    // Ejecutamos la consulta
    const resultado = await pool.query(consulta, valores);
    // Retornamos la fila insertada (con su id y fecha_hora asignados por la DB)
    return resultado.rows[0];
  } catch (error) {
    // Si hay un error de base de datos, lo mostramos y relanzamos
    console.error('❌ Error al guardar lectura en DB:', error.message);
    throw error;
  }
}

function analizarLectura({ id, temperatura, humedad, gas, fecha_hora }) {
  const co2 = gas;
  let calidad = 'Buena';
  if (co2 >= 500) calidad = 'Crítica';
  else if (co2 >= 250) calidad = 'Moderada';

  const sugerencias = [];
  if (co2 >= 250) sugerencias.push('Abrir ventanas para reducir el CO₂.');
  if (temperatura < 18 || temperatura > 26) sugerencias.push('Ajustar temperatura del ambiente (18–26°C óptimo).');
  if (humedad < 40 || humedad > 60) sugerencias.push('Considerar humidificador o deshumidificador.');
  if (sugerencias.length === 0) sugerencias.push('Condiciones ambientales dentro de rangos aceptables.');

  const fecha = fecha_hora
    ? new Date(fecha_hora).toLocaleString('es-UY', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : null;

  return {
    id,
    temperatura: parseFloat(temperatura),
    humedad:     parseFloat(humedad),
    gas,
    co2,
    calidad,
    sugerencia: sugerencias.join(' | '),
    fecha_hora: fecha
  };
}

async function obtenerUltimasLecturas() {
  const resultado = await pool.query(
    'SELECT id, temperatura, humedad, gas, fecha_hora FROM lecturas ORDER BY fecha_hora DESC LIMIT 2'
  );
  const [actual, anterior] = resultado.rows.map(analizarLectura);
  return { actual: actual || null, anterior: anterior || null };
}

async function obtenerRegistrosActuales() {
  const resultado = await pool.query(`
    SELECT id, temperatura, humedad, gas, fecha_hora
    FROM lecturas
    WHERE fecha_hora >= date_trunc('month', NOW())
    ORDER BY fecha_hora DESC
    LIMIT 50
  `);
  return resultado.rows.map(analizarLectura);
}

async function obtenerRegistrosAnteriores() {
  const resultado = await pool.query(`
    SELECT id, temperatura, humedad, gas, fecha_hora
    FROM lecturas
    WHERE fecha_hora >= NOW() - INTERVAL '2 months'
      AND fecha_hora < date_trunc('month', NOW())
    ORDER BY fecha_hora DESC
    LIMIT 100
  `);
  return resultado.rows.map(analizarLectura);
}

module.exports = {
  guardarLectura,
  obtenerUltimasLecturas,
  obtenerRegistrosActuales,
  obtenerRegistrosAnteriores
};
