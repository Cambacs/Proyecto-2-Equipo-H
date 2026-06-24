-- ============================================================
--  Script SQL — Crear base de datos y tabla "lecturas"
--  Ejecuta esto en pgAdmin, DBeaver o psql ANTES de arrancar
--  el servidor por primera vez.
-- ============================================================

-- 1. Crear la base de datos (si no existe)
--    Ejecuta solo esta línea primero, conectado a la DB "postgres"
CREATE DATABASE iot_sensores;

-- 2. Conéctate a la base de datos "iot_sensores" y ejecuta lo de abajo

-- 3. Crear la tabla "lecturas"
CREATE TABLE IF NOT EXISTS lecturas (
  -- id: número único que PostgreSQL asigna automáticamente a cada fila
  id           SERIAL PRIMARY KEY,

  -- temperatura: número con decimales (ej: 25.3)
  temperatura  NUMERIC(5, 2) NOT NULL,

  -- humedad: número con decimales (ej: 60.5)
  humedad      NUMERIC(5, 2) NOT NULL,

  -- gas: número entero (valor analógico 0-1023)
  gas          INTEGER NOT NULL,

  -- fecha_hora: se rellena automáticamente con la hora actual
  --             cuando se inserta una fila. No necesitas enviarlo.
  fecha_hora   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. (Opcional) Verificar que la tabla se creó correctamente
SELECT * FROM lecturas LIMIT 10;

-- ============================================================
--  Ejemplo de cómo se verán los datos en la tabla:
--
--   id | temperatura | humedad | gas  | fecha_hora
--  ----+-------------+---------+------+----------------------------
--    1 |       25.30 |   60.50 |  312 | 2024-01-15 14:23:05+00
--    2 |       25.40 |   61.00 |  308 | 2024-01-15 14:23:08+00
-- ============================================================
