# 🌡️ Estación IoT — Monitoreo Ambiental en Tiempo Real

Sistema de monitoreo ambiental basado en Arduino que captura temperatura, humedad y niveles de gas/CO₂, los transmite por USB a un servidor Node.js, los persiste en PostgreSQL y los visualiza en tiempo real desde un navegador web vía WebSockets.

---

## 📐 Arquitectura del proyecto

```
proyecto-iot/
├── arduino/
│   └── sensor_station.ino   # Código del microcontrolador
├── backend/
│   ├── server.js             # Servidor Express + WebSocket + SerialPort
│   ├── db.js                 # Módulo de conexión y consultas a PostgreSQL
│   ├── crear_tabla.sql       # Script SQL para inicializar la base de datos
│   ├── .env                  # Variables de entorno (credenciales, puertos)
│   └── package.json          # Dependencias Node.js
└── frontend/
    ├── index.html            # Interfaz web
    ├── app.js                # Lógica del cliente (WebSocket, gráficas)
    └── style.css             # Estilos
```

**Flujo de datos:**

```
Arduino (sensores)
    │  USB / Serial (JSON, 9600 baud)
    ▼
server.js (Node.js)
    ├──► db.js → PostgreSQL  (persiste cada lectura)
    └──► WebSocket           (broadcast en tiempo real)
                │
                ▼
          Navegador web (frontend)
```

---

## 🔧 Hardware requerido

| Componente | Conexión al Arduino |
|---|---|
| Arduino Uno / Nano | — |
| Sensor DHT11 (temp + humedad) | Pin digital **2** |
| Sensor de gas MQ-series | Pin analógico **A0** |
| Pantalla LCD 16×2 con módulo I2C | **SDA → A4**, **SCL → A5** |

---

## 📋 Prerequisitos de software

- [Node.js](https://nodejs.org/) v18 o superior
- [PostgreSQL](https://www.postgresql.org/) v13 o superior
- [Arduino IDE](https://www.arduino.cc/en/software) (para cargar el sketch)

### Librerías de Arduino necesarias

Instalar desde el **Gestor de Librerías** del Arduino IDE (`Sketch → Include Library → Manage Libraries`):

- `LiquidCrystal_I2C` (por Frank de Brabander)
- `DHT sensor library` (por Adafruit)

---

## 🚀 Puesta en marcha paso a paso

### 1. Descomprimir el proyecto

```powershell
Expand-Archive -Path proyecto-iot.zip -DestinationPath .
cd proyecto-iot
```

### 2. Configurar la base de datos PostgreSQL

#### 2.1 Crear la base de datos

Conectate a PostgreSQL con tu herramienta preferida (pgAdmin, DBeaver o `psql`) usando el usuario `postgres` y ejecutá **solo esta línea primero**:

```sql
CREATE DATABASE iot_sensores;
```

#### 2.2 Crear la tabla `lecturas`

Ahora **conectate a la base de datos `iot_sensores`** que acabás de crear y ejecutá el resto del script:

```sql
CREATE TABLE IF NOT EXISTS lecturas (
  id           SERIAL PRIMARY KEY,
  temperatura  NUMERIC(5, 2) NOT NULL,
  humedad      NUMERIC(5, 2) NOT NULL,
  gas          INTEGER NOT NULL,
  fecha_hora   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

> El archivo completo está en `backend/crear_tabla.sql`. Podés ejecutarlo directamente con:
> ```powershell
> psql -U postgres -d iot_sensores -f backend\crear_tabla.sql
> ```

#### 2.3 Estructura resultante de la tabla

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | Autoincremental |
| `temperatura` | NUMERIC(5,2) | Ej: `25.30` |
| `humedad` | NUMERIC(5,2) | Ej: `60.50` |
| `gas` | INTEGER | Valor analógico 0–1023 |
| `fecha_hora` | TIMESTAMPTZ | Se llena automáticamente |

---

### 3. Configurar las variables de entorno

Editá el archivo `backend/.env` con tus propios valores:

```env
# Puerto del servidor web
PORT=3000

# Credenciales de PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iot_sensores      # ← debe coincidir con la DB que creaste
DB_USER=postgres
DB_PASSWORD=tu_contraseña

# Puerto serial del Arduino
# Ej: COM3, COM4, COM10...
# Encontralo en: Administrador de dispositivos → Puertos (COM y LPT)
SERIAL_PORT=COM10
SERIAL_BAUDRATE=9600
```

> ⚠️ **Importante:** Nunca subas el archivo `.env` a GitHub. Agregalo a `.gitignore`.

#### ¿Cómo encontrar el puerto serial?

Ejecutá esto en PowerShell para ver todos los puertos COM disponibles:

```powershell
Get-PnpDevice -Class Ports | Where-Object { $_.Status -eq 'OK' } | Select-Object FriendlyName
```

O más rápido, abrí el **Administrador de dispositivos** → **Puertos (COM y LPT)** y buscás el Arduino (aparece como *USB Serial Device* o *CH340*).

---

### 4. Cargar el sketch en el Arduino

1. Abrí Arduino IDE.
2. Abrí el archivo `arduino/sensor_station.ino`.
3. Instalá las librerías indicadas en los prerequisitos (si no las tenés).
4. Seleccioná la placa correcta: `Herramientas → Placa → Arduino Uno` (o la tuya).
5. Seleccioná el puerto: `Herramientas → Puerto → COMx`.
6. Cargá el sketch con el botón **→ (Upload)**.

El Arduino comenzará a enviar datos JSON por serial cada 3 segundos con el formato:

```json
{"temperatura":25.0,"humedad":60.0,"gas":312}
```

---

### 5. Instalar dependencias y arrancar el servidor

```powershell
cd backend
npm install
npm start
```

Si todo está bien, verás en consola:

```
✅ Conectado a PostgreSQL correctamente.
🔌 Puerto serial COM10 abierto correctamente.

===========================================
🚀 Servidor corriendo en http://localhost:3000
===========================================

Esperando datos del Arduino...
```

Y a medida que llegan lecturas:

```
📡 Recibido del Arduino: {"temperatura":25.0,"humedad":60.0,"gas":312}
💾 Guardado en DB → id: 1, fecha: 2024-01-15T14:23:05.000Z
```

---

### 6. Abrir el dashboard

Abrí tu navegador y navegá a:

```
http://localhost:3000
```

Los datos se actualizan en tiempo real vía WebSocket cada vez que el Arduino envía una nueva lectura.

---

## 🌐 API REST

El servidor expone tres endpoints:

| Endpoint | Descripción |
|---|---|
| `GET /api/ultima` | Última y anteúltima lectura con análisis de calidad de aire |
| `GET /api/registros` | Hasta 50 registros del mes actual |
| `GET /api/anteriores` | Hasta 100 registros de los 2 meses anteriores |

### Ejemplo de respuesta de `/api/ultima`

```json
{
  "actual": {
    "id": 42,
    "temperatura": 25.3,
    "humedad": 60.5,
    "gas": 312,
    "co2": 312,
    "calidad": "Buena",
    "sugerencia": "Condiciones ambientales dentro de rangos aceptables.",
    "fecha_hora": "15/01/2024, 14:23"
  },
  "anterior": { ... }
}
```

### Umbrales de calidad de aire

| Valor de gas | Calidad |
|---|---|
| 0 – 249 | ✅ Buena |
| 250 – 499 | ⚠️ Moderada → se sugiere ventilar |
| 500+ | 🔴 Crítica → se sugiere ventilar |

---

## 🔌 WebSocket

El servidor transmite cada nueva lectura a todos los navegadores conectados en tiempo real. El frontend se conecta automáticamente a `ws://localhost:3000`.

Formato del mensaje recibido:

```json
{"temperatura": 25.0, "humedad": 60.0, "gas": 312}
```

---

## ⚙️ Dependencias del backend

| Paquete | Versión | Uso |
|---|---|---|
| `express` | ^5.2.1 | Servidor HTTP y rutas API |
| `ws` | ^8.21.0 | Servidor WebSocket |
| `serialport` | ^13.0.0 | Lectura del puerto serial USB |
| `@serialport/parser-readline` | ^13.0.0 | Parser de líneas seriales |
| `pg` | ^8.21.0 | Driver de PostgreSQL |
| `dotenv` | ^17.4.2 | Variables de entorno desde `.env` |

---

## 🐛 Solución de problemas comunes

**❌ `Error al abrir el puerto serial`**
Verificá que el Arduino esté conectado, que el puerto en `.env` sea correcto y que ningún otro programa (como el Monitor Serial del Arduino IDE) lo esté usando al mismo tiempo.

**❌ `Error al conectar con PostgreSQL`**
Revisá que el servicio de PostgreSQL esté corriendo, que las credenciales en `.env` sean correctas y que la base de datos `iot_sensores` exista.

**❌ El LCD no enciende**
Probá cambiando la dirección I2C en el sketch: `#define LCD_DIRECCION 0x3F` en lugar de `0x27`.

**❌ `Error DHT11` en el LCD**
Verificá el cableado del sensor DHT11 en el pin digital 2 del Arduino.

**⚠️ El servidor arranca pero no guarda en la DB**
El servidor es tolerante a fallos de base de datos: seguirá transmitiendo datos al frontend por WebSocket aunque la conexión con PostgreSQL falle. Revisá los logs para ver el error específico.
