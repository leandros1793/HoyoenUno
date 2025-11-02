# 🚀 GUÍA COMPLETA DE IMPLEMENTACIÓN - SUPABASE + PLAYTOMIX GOLF

## 📋 ÍNDICE
1. [Configuración Inicial de Supabase](#paso-1)
2. [Creación de la Base de Datos](#paso-2)
3. [Integración con tu HTML](#paso-3)
4. [Funcionalidades Disponibles](#paso-4)
5. [Testing y Pruebas](#paso-5)
6. [Siguientes Pasos](#paso-6)

---

## 🎯 PASO 1: Configuración Inicial de Supabase {#paso-1}

### 1.1 Crear cuenta en Supabase
1. Ve a: https://supabase.com
2. Click en **"Start your project"**
3. Regístrate con:
   - GitHub (recomendado)
   - Google
   - Email

### 1.2 Crear nuevo proyecto
1. Una vez dentro, click en **"New Project"**
2. Completa los datos:
   ```
   Project Name: playtomix-golf
   Database Password: [Genera una contraseña segura y GUÁRDALA]
   Region: South America (São Paulo) - Es la más cercana a México
   Pricing Plan: Free (perfecto para empezar)
   ```
3. Click en **"Create new project"**
4. Espera 2-3 minutos mientras se crea tu proyecto

### 1.3 Obtener tus credenciales
1. Una vez creado el proyecto, ve a **Settings** (⚙️) en el menú lateral
2. Click en **API**
3. Copia y guarda estos dos valores:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (una cadena muy larga)

---

## 🗄️ PASO 2: Creación de la Base de Datos {#paso-2}

### 2.1 Acceder al SQL Editor
1. En tu proyecto de Supabase, click en **SQL Editor** (icono </>) en el menú lateral
2. Click en **"New query"**

### 2.2 Ejecutar el Schema
1. Abre el archivo `supabase-schema.sql` que te proporcioné
2. Copia TODO el contenido
3. Pégalo en el editor SQL de Supabase
4. Click en **"Run"** (botón verde abajo a la derecha)
5. Deberías ver: ✅ "Success. No rows returned"

### 2.3 Verificar que se crearon las tablas
1. Ve a **Table Editor** (icono de tabla 📊) en el menú lateral
2. Deberías ver estas tablas:
   - ✅ profiles
   - ✅ service_categories
   - ✅ services
   - ✅ reservations
   - ✅ availability
   - ✅ system_settings
   - ✅ reservation_history

### 2.4 Verificar datos iniciales
1. Click en la tabla **service_categories**
2. Deberías ver 2 categorías:
   - 🎓 Academia
   - 🏌️ Simulador

3. Click en la tabla **services**
4. Deberías ver 9 servicios (3 de academia + 6 de simulador)

---

## 🔗 PASO 3: Integración con tu HTML {#paso-3}

### 3.1 Agregar Supabase al HTML

Abre tu archivo `playtomix-golf-simulator.html` y agrega ANTES del `</head>`:

```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### 3.2 Agregar el archivo de integración

ANTES del cierre `</body>`, agrega:

```html
<!-- Supabase Integration -->
<script src="supabase-integration.js"></script>
```

### 3.3 Configurar tus credenciales

1. Abre el archivo `supabase-integration.js`
2. En las líneas 7-8, reemplaza con TUS credenciales:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co'; // Tu Project URL
const SUPABASE_ANON_KEY = 'eyJhbGc...'; // Tu anon key
```

### 3.4 Modificar la función de crear reserva

En tu HTML, encuentra la función `processPayment` y reemplázala con esta:

```javascript
async function processPayment(method) {
    if (cart.length === 0) {
        showNotification('⚠️ Tu carrito está vacío', 'warning');
        return;
    }

    // Mostrar modal para capturar datos del cliente
    const customerName = prompt('Ingresa tu nombre completo:');
    if (!customerName) return;
    
    const customerEmail = prompt('Ingresa tu email:');
    if (!customerEmail || !isValidEmail(customerEmail)) {
        showNotification('⚠️ Email inválido', 'warning');
        return;
    }
    
    const customerPhone = prompt('Ingresa tu teléfono (10 dígitos):');
    if (!customerPhone || !isValidPhone(customerPhone)) {
        showNotification('⚠️ Teléfono inválido', 'warning');
        return;
    }

    // Crear reservas en Supabase
    const reservationPromises = cart.map(async (item) => {
        // Buscar el service_id del servicio
        const services = await getAllServices();
        const service = services.find(s => s.name === item.name);
        
        if (!service) {
            console.error('Servicio no encontrado:', item.name);
            return null;
        }

        const reservationData = {
            serviceId: service.id,
            date: item.date,
            time: item.time,
            quantity: item.quantity,
            customerName: customerName,
            customerEmail: customerEmail,
            customerPhone: customerPhone,
            unitPrice: item.price,
            totalAmount: item.total,
            paymentMethod: method,
            notes: ''
        };

        return await createReservation(reservationData);
    });

    // Esperar a que todas las reservas se creen
    const results = await Promise.all(reservationPromises);
    
    // Verificar si todas fueron exitosas
    const allSuccess = results.every(r => r && r.success);

    if (allSuccess) {
        // Generate WhatsApp message
        let message = '🏌️ *Nueva Reserva - Playtomix Golf*\n\n';
        let total = 0;

        cart.forEach((item, index) => {
            message += `${index + 1}. *${item.name}*\n`;
            message += `   📅 ${formatDate(item.date)} - 🕐 ${item.time}\n`;
            if (item.quantity > 1) {
                message += `   Cantidad: ${item.quantity}\n`;
            }
            message += `   💰 $${item.total.toLocaleString('es-MX')}\n\n`;
            total += item.total;
        });

        message += `*Total: $${total.toLocaleString('es-MX')}*\n\n`;
        message += `*Cliente:* ${customerName}\n`;
        message += `📧 ${customerEmail}\n`;
        message += `📱 ${customerPhone}\n\n`;
        
        if (method === 'online') {
            message += '💳 *Método de pago:* En línea\n';
        } else {
            message += '🏪 *Método de pago:* En establecimiento\n';
            message += '⚠️ Recuerda llegar 5 minutos antes de tu horario.';
        }

        // Open WhatsApp
        const phone = '523322396825';
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');

        // Show success and clear cart
        setTimeout(() => {
            showSuccessModal();
            cart = [];
            updateCartDisplay();
            toggleCart();
        }, 1000);
    } else {
        showNotification('⚠️ Error al procesar algunas reservas', 'warning');
    }
}
```

---

## ✨ PASO 4: Funcionalidades Disponibles {#paso-4}

### 4.1 Funciones de Servicios
```javascript
// Obtener todos los servicios
const services = await getAllServices();

// Obtener servicios por categoría
const academiaServices = await getServicesByCategory(1);
const simuladorServices = await getServicesByCategory(2);
```

### 4.2 Funciones de Reservas
```javascript
// Crear reserva
const result = await createReservation({
    serviceId: 1,
    date: '2025-11-01',
    time: '10:00',
    quantity: 1,
    customerName: 'Juan Pérez',
    customerEmail: 'juan@ejemplo.com',
    customerPhone: '3312345678',
    unitPrice: 720.00,
    totalAmount: 720.00,
    paymentMethod: 'online'
});

// Verificar disponibilidad
const availability = await checkAvailability(1, '2025-11-01', '10:00');
if (availability.available) {
    console.log('Horario disponible');
}

// Obtener reservas de hoy
const todayReservations = await getTodaysReservations();
```

### 4.3 Funciones de Estadísticas
```javascript
// Obtener estadísticas del mes
const stats = await getMonthlyStats();
console.log('Total reservas:', stats.total_reservations);
console.log('Ingresos:', stats.total_revenue);

// Servicios más populares
const popular = await getPopularServices();
```

---

## 🧪 PASO 5: Testing y Pruebas {#paso-5}

### 5.1 Probar conexión a Supabase

Abre la consola de tu navegador (F12) y ejecuta:

```javascript
// Debería mostrar: ✅ Supabase Integration cargado correctamente

// Probar obtener servicios
getAllServices().then(services => {
    console.log('Servicios disponibles:', services);
});
```

### 5.2 Probar creación de reserva

1. Agrega un servicio al carrito
2. Llena los datos de fecha y hora
3. Click en "Pagar en línea" o "Pagar en establecimiento"
4. Ingresa los datos del cliente
5. Verifica que se cree la reserva

### 5.3 Verificar en Supabase

1. Ve a tu proyecto en Supabase
2. Click en **Table Editor**
3. Abre la tabla **reservations**
4. Deberías ver tu reserva de prueba ✅

---

## 🚀 PASO 6: Siguientes Pasos {#paso-6}

### 6.1 Dashboard de Administración

Ahora que tienes el backend funcionando, puedo crear:
- **Dashboard administrativo** para ver todas las reservas
- **Calendario visual** con disponibilidad
- **Panel de estadísticas** en tiempo real
- **Sistema de confirmación** de reservas

### 6.2 Funcionalidades Avanzadas
- Sistema de usuarios con login
- Historial de reservas por cliente
- Notificaciones automáticas por email
- Sistema de cancelaciones
- Gestión de disponibilidad

### 6.3 Integración de Pagos
- Stripe
- MercadoPago
- PayPal

---

## 📊 ESTRUCTURA DE TU PROYECTO ACTUAL

```
playtomix-golf/
├── playtomix-golf-simulator.html    # Frontend (tu e-commerce)
├── supabase-integration.js          # Funciones de Supabase
├── supabase-schema.sql              # Schema de la base de datos
├── hoyoenuno4.mp4                   # Video de fondo
├── hoyoenuno1.mp4                   # Video destacado
└── GUIA-IMPLEMENTACION.md           # Esta guía
```

---

## ❓ PREGUNTAS FRECUENTES

### ¿Cuánto cuesta Supabase?
- **Plan Free**: $0/mes - Perfecto para empezar
  - 500 MB de base de datos
  - 1 GB de almacenamiento
  - 50,000 usuarios activos mensuales
  - Más que suficiente para comenzar

### ¿Cuándo debo upgradear?
Cuando llegues a:
- +500 reservas/mes
- +10 GB de datos
- Necesites soporte prioritario

### ¿Los datos están seguros?
Sí, Supabase usa:
- Encriptación en tránsito (SSL)
- Row Level Security (RLS)
- Backups automáticos diarios
- Infraestructura de AWS

---

## 📞 SOPORTE

Si tienes dudas durante la implementación:
1. Revisa la documentación de Supabase: https://supabase.com/docs
2. Contacta al equipo de Supabase: support@supabase.io
3. O pregúntame, estoy aquí para ayudarte 😊

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Crear cuenta en Supabase
- [ ] Crear proyecto "playtomix-golf"
- [ ] Ejecutar schema SQL completo
- [ ] Verificar que se crearon las tablas
- [ ] Copiar credenciales (URL y anon key)
- [ ] Agregar Supabase al HTML
- [ ] Configurar credenciales en supabase-integration.js
- [ ] Modificar función processPayment
- [ ] Probar crear una reserva de prueba
- [ ] Verificar la reserva en Supabase
- [ ] Celebrar 🎉

---

¡Listo! Ahora tienes un e-commerce completo con backend profesional 🚀
