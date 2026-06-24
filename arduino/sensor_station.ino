// ============================================================
//  ESTACIÓN DE SENSORES IoT
//  Hardware: Arduino Uno/Nano
//  - Pantalla LCD 16x2 con módulo I2C  → pines A4 (SDA), A5 (SCL)
//  - Sensor DHT11 (temperatura/humedad) → pin digital 2
//  - Sensor de gas MQ-series            → pin analógico A0
// ============================================================

// --- Librerías necesarias ---
// LiquidCrystal_I2C: controla la pantalla LCD a través del módulo I2C
#include <LiquidCrystal_I2C.h>

// DHT: controla el sensor de temperatura y humedad
#include <DHT.h>

// Wire: protocolo I2C, necesario para la comunicación con el LCD
#include <Wire.h>

// ============================================================
//  CONFIGURACIÓN DE PINES Y CONSTANTES
// ============================================================

// Pin donde está conectado el DHT11
#define PIN_DHT 2

// Tipo de sensor DHT que usamos (hay DHT11, DHT22, etc.)
#define TIPO_DHT DHT11

// Pin analógico donde está conectado el sensor MQ de gas
#define PIN_GAS A0

// Dirección I2C del módulo LCD. La más común es 0x27.
// Si el LCD no enciende, prueba con 0x3F
#define LCD_DIRECCION 0x27

// Dimensiones del LCD: 16 columnas, 2 filas
#define LCD_COLUMNAS 16
#define LCD_FILAS    2

// Intervalo de envío de datos en milisegundos (3000 = 3 segundos)
#define INTERVALO_MS 3000

// ============================================================
//  CREACIÓN DE OBJETOS
// ============================================================

// Objeto para controlar el LCD
// Parámetros: dirección I2C, número de columnas, número de filas
LiquidCrystal_I2C lcd(LCD_DIRECCION, LCD_COLUMNAS, LCD_FILAS);

// Objeto para controlar el sensor DHT
// Parámetros: pin de datos, tipo de sensor
DHT dht(PIN_DHT, TIPO_DHT);

// Variable para guardar el tiempo de la última lectura
unsigned long tiempoAnterior = 0;

// ============================================================
//  SETUP: Se ejecuta UNA SOLA VEZ al encender el Arduino
// ============================================================
void setup() {
  // Iniciamos la comunicación serial a 9600 baudios
  // Esto es el "canal" por donde el Arduino le habla a la PC a través del USB
  Serial.begin(9600);

  // Iniciamos el bus I2C (necesario antes de usar el LCD)
  Wire.begin();

  // Iniciamos el LCD
  lcd.init();

  // Encendemos la luz de fondo del LCD
  lcd.backlight();

  // Mostramos un mensaje de bienvenida en el LCD
  lcd.setCursor(0, 0); // Cursor en columna 0, fila 0 (primera fila)
  lcd.print("  Estacion IoT  ");
  lcd.setCursor(0, 1); // Cursor en columna 0, fila 1 (segunda fila)
  lcd.print("  Iniciando...  ");

  // Iniciamos el sensor DHT11
  dht.begin();

  // Esperamos 2 segundos para que los sensores se estabilicen
  delay(2000);

  // Limpiamos el LCD para mostrar los datos reales
  lcd.clear();

  // Mensaje de confirmación en el monitor serial
  Serial.println("Sistema iniciado correctamente.");
}

// ============================================================
//  LOOP: Se ejecuta CONTINUAMENTE mientras el Arduino esté encendido
// ============================================================
void loop() {
  // Guardamos el tiempo actual en milisegundos desde que encendió el Arduino
  unsigned long tiempoActual = millis();

  // Verificamos si ya pasaron 3 segundos desde la última lectura
  // Usamos esta técnica (en lugar de delay) para no "bloquear" el Arduino
  if (tiempoActual - tiempoAnterior >= INTERVALO_MS) {

    // Actualizamos el tiempo de la última lectura
    tiempoAnterior = tiempoActual;

    // --- LEER SENSORES ---

    // Leemos la humedad del DHT11 (devuelve un número float, ej: 60.5)
    float humedad = dht.readHumidity();

    // Leemos la temperatura en grados Celsius del DHT11
    float temperatura = dht.readTemperature();

    // Leemos el valor analógico del sensor de gas (rango: 0 a 1023)
    int gas = analogRead(PIN_GAS);

    // --- VERIFICAR QUE LA LECTURA DEL DHT SEA VÁLIDA ---
    // La función isnan() detecta si el valor es "Not a Number" (lectura fallida)
    if (isnan(humedad) || isnan(temperatura)) {
      // Si hay error, lo mostramos en el LCD y en serial, y saltamos el resto
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Error DHT11!");
      Serial.println("ERROR: Fallo lectura DHT11. Verifica el cableado.");
      return; // Salimos de esta iteración del loop
    }

    // --- MOSTRAR EN EL LCD ---

    // Fila 0 del LCD: Temperatura y Humedad
    lcd.setCursor(0, 0);
    lcd.print("T:");
    lcd.print(temperatura, 1); // El ",1" muestra 1 decimal
    lcd.print("C H:");
    lcd.print(humedad, 0);     // El ",0" muestra 0 decimales (número entero)
    lcd.print("%  ");          // Espacios al final para borrar caracteres viejos

    // Fila 1 del LCD: Valor del sensor de gas
    lcd.setCursor(0, 1);
    lcd.print("Gas:");
    lcd.print(gas);
    lcd.print("              "); // Espacios para limpiar el resto de la línea

    // --- ENVIAR DATOS POR SERIAL EN FORMATO JSON ---
    // Construimos el mensaje JSON manualmente
    // Formato: {"temperatura": 25.0, "humedad": 60.0, "gas": 120}
    Serial.print("{");
    Serial.print("\"temperatura\":");
    Serial.print(temperatura, 1);    // 1 decimal
    Serial.print(",\"humedad\":");
    Serial.print(humedad, 1);        // 1 decimal
    Serial.print(",\"gas\":");
    Serial.print(gas);               // Sin decimales (es entero)
    Serial.println("}");             // println agrega \n al final (importante para el servidor)
  }
}
