// ============================================
// CONFIGURACIÓN DE MERCADO PAGO - HOYO EN UNO
// Compatible con Mercado Pago SDK v2.x
// ============================================

const { MercadoPagoConfig, Preference } = require('mercadopago');

// ============================================
// CREDENCIALES DE MERCADO PAGO
// ============================================

// 🧪 PRUEBAS (TEST) - Tus credenciales
const MP_ACCESS_TOKEN_TEST = 'APP_USR-4811894341240829-111315-8e028f3d023c159658d61b338b6c3040-2988186552';
const MP_PUBLIC_KEY_TEST = 'APP_USR-2c1b52a6-9084-4ff2-b97c-882f770f0dbd';

// 💰 PRODUCCIÓN (Cobros reales) - Para después
const MP_ACCESS_TOKEN_PROD = 'APP_USR-2c1b52a6-9084-4ff2-b97c-882f770f0dbd';
const MP_PUBLIC_KEY_PROD = 'APP_USR-4811894341240829-111315-8e028f3d023c159658d61b338b6c3040-2988186552';

// MODO: Cambiar a 'production' para cobros reales
const ENVIRONMENT = 'sandbox'; // ✅ SANDBOX para pruebas

// Seleccionar credenciales según ambiente
const MP_ACCESS_TOKEN = ENVIRONMENT === 'production' 
    ? MP_ACCESS_TOKEN_PROD 
    : MP_ACCESS_TOKEN_TEST;

const MP_PUBLIC_KEY = ENVIRONMENT === 'production' 
    ? MP_PUBLIC_KEY_PROD 
    : MP_PUBLIC_KEY_TEST;

// ============================================
// URL BASE (Cambiar según ambiente)
// ============================================

const BASE_URL_DEV = 'https://arbor-conclude-richardson-adware.trycloudflare.com';
const BASE_URL_PROD = 'https://hoyoenuno.golf';

const BASE_URL = ENVIRONMENT === 'production' ? BASE_URL_PROD : BASE_URL_DEV;

console.log('🔍 CONFIG - BASE_URL:', BASE_URL);
console.log('🔍 CONFIG - ENVIRONMENT:', ENVIRONMENT);
// ============================================
// CONFIGURAR MERCADO PAGO (SDK V2)
// ============================================

let client = null;
let preferenceClient = null;

function configureMercadoPago() {
    client = new MercadoPagoConfig({ 
        accessToken: MP_ACCESS_TOKEN,
        options: {
            timeout: 5000,
            idempotencyKey: 'hoyo-en-uno'
        }
    });
    
    preferenceClient = new Preference(client);
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║   MERCADO PAGO - HOYO EN UNO          ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║ SDK Version: 2.x                      ║`);
    console.log(`║ Ambiente: ${ENVIRONMENT.toUpperCase().padEnd(29)}║`);
    console.log(`║ URL Base: ${BASE_URL.substring(0,29).padEnd(29)}║`);
    console.log(`║ Token:    ${'***CONFIGURADO***'.padEnd(29)}║`);
    console.log('╚════════════════════════════════════════╝');
    
    return {
        client: client,
        preference: preferenceClient
    };
}

// ============================================
// EXPORTAR
// ============================================

module.exports = {
    PORT: process.env.PORT || 3000,
    BASE_URL,
    ENVIRONMENT,
    MP_PUBLIC_KEY,
    configureMercadoPago
};