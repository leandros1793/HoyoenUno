// ============================================
// SUPABASE INTEGRATION FOR PLAYTOMIX GOLF
// ============================================

// CONFIGURACIÓN DE SUPABASE
// Reemplaza estos valores con los de tu proyecto
const SUPABASE_URL = 'https://uukfxhdnnjjfjsilglov.supabase.co'; // Ejemplo: https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a2Z4aGRubmpqZmpzaWxnbG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MDczODQsImV4cCI6MjA3NzQ4MzM4NH0.m_ESoiJsHBE_cZv6ByfGPuEWmCgIiTZOgeI7SLAfB5I';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// SERVICIOS Y CATEGORÍAS
// ============================================

/**
 * Obtener todas las categorías de servicios
 */
async function getServiceCategories() {
    try {
        const { data, error } = await supabase
            .from('service_categories')
            .select('*')
            .eq('active', true)
            .order('id');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        return [];
    }
}

/**
 * Obtener todos los servicios de una categoría
 */
async function getServicesByCategory(categoryId) {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('*, service_categories(*)')
            .eq('category_id', categoryId)
            .eq('active', true)
            .order('price');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al cargar servicios:', error);
        return [];
    }
}

/**
 * Obtener todos los servicios
 */
async function getAllServices() {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('*, service_categories(*)')
            .eq('active', true)
            .order('category_id, price');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al cargar servicios:', error);
        return [];
    }
}

// ============================================
// RESERVAS
// ============================================

/**
 * Crear una nueva reserva
 */
async function createReservation(reservationData) {
    try {
        const { data, error } = await supabase
            .from('reservations')
            .insert([{
                service_id: reservationData.serviceId,
                reservation_date: reservationData.date,
                reservation_time: reservationData.time,
                quantity: reservationData.quantity || 1,
                customer_name: reservationData.customerName,
                customer_email: reservationData.customerEmail,
                customer_phone: reservationData.customerPhone,
                unit_price: reservationData.unitPrice,
                total_amount: reservationData.totalAmount,
                payment_method: reservationData.paymentMethod,
                notes: reservationData.notes,
                status: 'pending',
                payment_status: 'pending'
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('Reserva creada exitosamente:', data);
        return { success: true, data };
    } catch (error) {
        console.error('Error al crear reserva:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verificar disponibilidad de un horario
 */
async function checkAvailability(serviceId, date, time) {
    try {
        // Verificar si hay reservas confirmadas en ese horario
        const { data: reservations, error } = await supabase
            .from('reservations')
            .select('*')
            .eq('service_id', serviceId)
            .eq('reservation_date', date)
            .eq('reservation_time', time)
            .in('status', ['pending', 'confirmed']);
        
        if (error) throw error;
        
        // Verificar si el horario está bloqueado manualmente
        const { data: blocks, error: blockError } = await supabase
            .from('availability')
            .select('*')
            .eq('service_id', serviceId)
            .eq('date', date)
            .lte('start_time', time)
            .gte('end_time', time)
            .eq('is_blocked', true);
        
        if (blockError) throw blockError;
        
        const isAvailable = reservations.length === 0 && blocks.length === 0;
        
        return {
            available: isAvailable,
            message: isAvailable ? 'Horario disponible' : 'Horario no disponible'
        };
    } catch (error) {
        console.error('Error al verificar disponibilidad:', error);
        return { available: false, message: 'Error al verificar disponibilidad' };
    }
}

/**
 * Obtener reservas de un usuario
 */
async function getUserReservations(userId) {
    try {
        const { data, error } = await supabase
            .from('reservations')
            .select('*, services(*)')
            .eq('user_id', userId)
            .order('reservation_date', { ascending: false })
            .order('reservation_time', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al cargar reservas:', error);
        return [];
    }
}

/**
 * Actualizar estado de una reserva
 */
async function updateReservationStatus(reservationId, newStatus) {
    try {
        const updateData = { status: newStatus };
        
        if (newStatus === 'confirmed') {
            updateData.confirmed_at = new Date().toISOString();
        } else if (newStatus === 'cancelled') {
            updateData.cancelled_at = new Date().toISOString();
        }
        
        const { data, error } = await supabase
            .from('reservations')
            .update(updateData)
            .eq('id', reservationId)
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error al actualizar reserva:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cancelar una reserva
 */
async function cancelReservation(reservationId, reason) {
    try {
        const { data, error } = await supabase
            .from('reservations')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                admin_notes: reason
            })
            .eq('id', reservationId)
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error al cancelar reserva:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================

/**
 * Obtener reservas de hoy
 */
async function getTodaysReservations() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('reservations')
            .select('*, services(*)')
            .eq('reservation_date', today)
            .order('reservation_time');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al cargar reservas de hoy:', error);
        return [];
    }
}

/**
 * Obtener estadísticas del mes
 */
async function getMonthlyStats() {
    try {
        const { data, error } = await supabase
            .from('reservation_stats')
            .select('*')
            .limit(1)
            .order('month', { ascending: false })
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        return null;
    }
}

/**
 * Obtener servicios más populares
 */
async function getPopularServices() {
    try {
        const { data, error } = await supabase
            .from('popular_services')
            .select('*')
            .limit(5);
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al cargar servicios populares:', error);
        return [];
    }
}

// ============================================
// AUTENTICACIÓN (OPCIONAL)
// ============================================

/**
 * Registrar nuevo usuario
 */
async function signUp(email, password, fullName, phone) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone
                }
            }
        });
        
        if (error) throw error;
        
        // Crear perfil
        if (data.user) {
            await supabase
                .from('profiles')
                .insert([{
                    id: data.user.id,
                    email: email,
                    full_name: fullName,
                    phone: phone
                }]);
        }
        
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Iniciar sesión
 */
async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        return { success: true, user: data.user, session: data.session };
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cerrar sesión
 */
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtener usuario actual
 */
async function getCurrentUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        return null;
    }
}

/**
 * Obtener sesión actual
 */
async function getCurrentSession() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    } catch (error) {
        console.error('Error al obtener sesión:', error);
        return null;
    }
}

// ============================================
// CONFIGURACIÓN DEL SISTEMA
// ============================================

/**
 * Obtener configuración del sistema
 */
async function getSystemSettings() {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*');
        
        if (error) throw error;
        
        // Convertir array a objeto para fácil acceso
        const settings = {};
        data.forEach(setting => {
            settings[setting.key] = setting.value;
        });
        
        return settings;
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        return {};
    }
}

/**
 * Actualizar configuración del sistema
 */
async function updateSystemSetting(key, value) {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .update({ value: value, updated_at: new Date().toISOString() })
            .eq('key', key)
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error al actualizar configuración:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Formatear fecha para mostrar
 */
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('es-MX', options);
}

/**
 * Formatear hora para mostrar
 */
function formatTime(timeString) {
    return timeString.substring(0, 5); // HH:MM
}

/**
 * Formatear precio
 */
function formatPrice(amount) {
    return `$${parseFloat(amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Validar email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validar teléfono
 */
function isValidPhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

// ============================================
// SUSCRIPCIONES EN TIEMPO REAL
// ============================================

/**
 * Suscribirse a cambios en reservas
 */
function subscribeToReservations(callback) {
    const subscription = supabase
        .channel('reservations_channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'reservations' },
            callback
        )
        .subscribe();
    
    return subscription;
}

/**
 * Cancelar suscripción
 */
function unsubscribe(subscription) {
    supabase.removeChannel(subscription);
}

// ============================================
// EXPORT PARA USAR EN OTROS ARCHIVOS
// ============================================

// Si estás usando módulos ES6, descomenta estas líneas:
// export {
//     getServiceCategories,
//     getServicesByCategory,
//     getAllServices,
//     createReservation,
//     checkAvailability,
//     getUserReservations,
//     updateReservationStatus,
//     cancelReservation,
//     getTodaysReservations,
//     getMonthlyStats,
//     getPopularServices,
//     signUp,
//     signIn,
//     signOut,
//     getCurrentUser,
//     getCurrentSession,
//     getSystemSettings,
//     updateSystemSetting,
//     subscribeToReservations,
//     unsubscribe
// };

console.log('✅ Supabase Integration cargado correctamente');
