// ============================================
// SUPABASE INTEGRATION FOR HOYO EN UNO
// Versión con Mercado Pago integrado
// ============================================

// ============================================
// 1. CONFIGURACIÓN DE SUPABASE
// ============================================

const SUPABASE_URL = 'https://uukfxhdnnjjfjsilglov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a2Z4aGRubmpqZmpzaWxnbG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MDczODQsImV4cCI6MjA3NzQ4MzM4NH0.m_ESoiJsHBE_cZv6ByfGPuEWmCgIiTZOgeI7SLAfB5I';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constantes
const BUSINESS_WHATSAPP = '523322396825';
const ADMIN_WHATSAPP = '523322396825';

// ============================================
// MERCADO PAGO - CONFIGURACIÓN
// ============================================

const API_URL = 'https://hoyo-en-uno-backend.onrender.com'; // Forzar localhost por ahora // ⚠️ Cambiar cuando tengas dominio

console.log('✅ API URL configurada:', API_URL);
console.log('✅ Configuración de WhatsApp cargada');

let cart = []; // Array para almacenar items del carrito

console.log('✅ Supabase client inicializado');
console.log('✅ Sistema de pagos Mercado Pago integrado');

// ============================================
// 2. SERVICIOS Y CATEGORÍAS
// ============================================

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
// 3. GENERADOR DE HORARIOS DINÁMICOS
// ============================================

async function getServiceByDateTime(categoryId, date, duration) {
    try {
        const selectedDate = new Date(date + 'T00:00:00');
        const dayOfWeek = selectedDate.getDay();
        
        const dayNames = {
            0: 'sunday',
            1: 'monday',
            2: 'tuesday',
            3: 'wednesday',
            4: 'thursday',
            5: 'friday',
            6: 'saturday'
        };
        
        const dayName = dayNames[dayOfWeek];
        
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('category_id', categoryId)
            .eq('duration_minutes', duration)
            .contains('available_days', [dayName])
            .eq('active', true);
        
        if (error) throw error;
        return data;
        
    } catch (error) {
        console.error('Error al obtener servicios:', error);
        return [];
    }
}

function generateTimeSlots(service, selectedDate) {
    const slots = [];
    
    if (!service || !service.start_time || !service.end_time) {
        return slots;
    }
    
    let [startHour, startMin] = service.start_time.split(':').map(Number);
    let [endHour, endMin] = service.end_time.split(':').map(Number);
    
    const duration = service.duration_minutes;
    const crossesMidnight = endHour < startHour;
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (true) {
        if (!crossesMidnight) {
            if (currentHour > endHour || (currentHour === endHour && currentMin >= endMin)) {
                break;
            }
        } else {
            if (currentHour >= startHour) {
                // Rango inicial (16:00 - 23:59)
            } else if (currentHour <= endHour && currentHour < startHour) {
                // Después de medianoche (00:00 - 01:00)
            } else {
                break;
            }
        }
        
        const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}:00`;
        
        let endSlotHour = currentHour;
        let endSlotMin = currentMin + duration;
        
        if (endSlotMin >= 60) {
            endSlotHour++;
            endSlotMin -= 60;
        }
        
        if (endSlotHour >= 24) {
            endSlotHour -= 24;
        }
        
        const display = formatTimeTo12Hour(currentHour, currentMin, endSlotHour, endSlotMin);
        
        slots.push({
            time: timeString,
            display: display,
            startHour: currentHour,
            startMin: currentMin,
            endHour: endSlotHour,
            endMin: endSlotMin
        });
        
        currentMin += duration;
        if (currentMin >= 60) {
            currentHour++;
            currentMin -= 60;
        }
        
        if (currentHour >= 24) {
            currentHour -= 24;
        }
    }
    
    return slots;
}

function formatTimeTo12Hour(startHour, startMin, endHour, endMin) {
    const formatHour = (hour, min) => {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
    };
    
    return `${formatHour(startHour, startMin)} - ${formatHour(endHour, endMin)}`;
}

async function loadDynamicTimeSlots(selectId, categoryId, date, duration) {
    const selectElement = document.getElementById(selectId);
    
    if (!selectElement) {
        console.error(`Select con id "${selectId}" no encontrado`);
        return;
    }
    
    if (!date) {
        selectElement.innerHTML = '<option value="">Primero selecciona una fecha</option>';
        selectElement.disabled = true;
        return;
    }
    
    if (!duration) {
        selectElement.innerHTML = '<option value="">Primero selecciona duración</option>';
        selectElement.disabled = true;
        return;
    }
    
    selectElement.innerHTML = '<option value="">⏳ Cargando horarios...</option>';
    selectElement.disabled = true;
    
    try {
        const services = await getServiceByDateTime(categoryId, date, duration);
        
        if (services.length === 0) {
            selectElement.innerHTML = '<option value="">❌ No hay servicios disponibles para este día</option>';
            return;
        }
        
        let allSlots = [];
        
        for (const service of services) {
            const slots = generateTimeSlots(service, date);
            
            slots.forEach(slot => {
                slot.serviceId = service.id;
                slot.serviceName = service.name;
                slot.price = service.price;
            });
            
            allSlots = allSlots.concat(slots);
        }
        
        allSlots.sort((a, b) => {
            if (a.startHour !== b.startHour) {
                return a.startHour - b.startHour;
            }
            return a.startMin - b.startMin;
        });
        
        const availableSlots = [];
        
        for (const slot of allSlots) {
            const availability = await checkAvailability(slot.serviceId, date, slot.time);
            
            if (availability.available) {
                availableSlots.push(slot);
            }
        }
        
        selectElement.innerHTML = '<option value="">Selecciona un horario</option>';
        
        if (availableSlots.length === 0) {
            selectElement.innerHTML += '<option value="" disabled>❌ No hay horarios disponibles</option>';
            selectElement.disabled = true;
            return;
        }
        
        availableSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = JSON.stringify({
                time: slot.time,
                serviceId: slot.serviceId,
                price: slot.price
            });
            option.textContent = `✅ ${slot.display} - $${slot.price.toLocaleString('es-MX')}`;
            option.dataset.serviceId = slot.serviceId;
            option.dataset.price = slot.price;
            selectElement.appendChild(option);
        });
        
        selectElement.disabled = false;
        
        console.log(`✅ ${availableSlots.length} horarios disponibles cargados`);
        
    } catch (error) {
        console.error('Error al cargar horarios:', error);
        selectElement.innerHTML = '<option value="" disabled>❌ Error al cargar horarios</option>';
        selectElement.disabled = true;
    }
}

// ============================================
// 4. RESERVAS - CRUD
// ============================================

async function createReservation(reservationData) {
    const validMethods = ['efectivo', 'tarjeta', 'transferencia'];
    if (!validMethods.includes(reservationData.paymentMethod)) {
        console.warn(`⚠️ Método de pago inválido: ${reservationData.paymentMethod}, se usará 'efectivo'`);
        reservationData.paymentMethod = 'efectivo';
    }

    try {
        console.log("🧩 Datos enviados a Supabase:", reservationData);
        
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
        
        console.log('✅ Reserva creada exitosamente:', data);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Error al crear reserva:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
        });
        return { success: false, error: error.message };
    }
}

async function checkAvailability(serviceId, date, time) {
    try {
        const { data: reservations, error } = await supabase
            .from('reservations')
            .select('*')
            .eq('service_id', serviceId)
            .eq('reservation_date', date)
            .eq('reservation_time', time)
            .in('status', ['pending', 'confirmed']);
        
        if (error) throw error;
        
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

async function createReservationWithCheck(reservationData) {
    try {
        console.log('Verificando disponibilidad...');
        const availability = await checkAvailability(
            reservationData.serviceId,
            reservationData.date,
            reservationData.time
        );
        
        if (!availability.available) {
            return {
                success: false,
                error: 'Este horario ya no está disponible. Por favor selecciona otro.'
            };
        }
        
        console.log('Horario disponible, creando reserva...');
        const result = await createReservation(reservationData);
        
        return result;
        
    } catch (error) {
        console.error('Error al crear reserva con verificación:', error);
        return {
            success: false,
            error: error.message || 'Error al crear la reserva'
        };
    }
}

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
// 5. INICIALIZACIÓN DE FORMULARIOS
// ============================================

function initAllReservationForms() {
    console.log('🔄 Inicializando formularios de reserva...');
    
    const today = new Date().toISOString().split('T')[0];
    
    initAcademiaForm('academia-1', 1, today);
    initAcademiaForm('academia-2', 2, today);
    initAcademiaForm('academia-3', 3, today);
    
    initSimuladorForm('simulador', 2, today);
    
    console.log('✅ Formularios inicializados correctamente');
}

function initAcademiaForm(formId, serviceId, minDate) {
    const dateInput = document.getElementById(`date-${formId}`);
    const timeSelect = document.getElementById(`time-${formId}`);
    
    if (!dateInput || !timeSelect) {
        console.warn(`⚠️ Formulario ${formId} no encontrado`);
        return;
    }
    
    dateInput.setAttribute('min', minDate);
    
    dateInput.addEventListener('change', async function() {
        const selectedDate = this.value;
        
        if (!selectedDate) {
            timeSelect.innerHTML = '<option value="">Selecciona fecha primero</option>';
            timeSelect.disabled = true;
            return;
        }
        
        const selected = new Date(selectedDate + 'T00:00:00');
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        if (selected < now) {
            alert('❌ No puedes reservar en el pasado');
            dateInput.value = '';
            return;
        }
        
        timeSelect.innerHTML = '<option value="">⏳ Cargando horarios...</option>';
        timeSelect.disabled = true;
        
        try {
            await loadTimeSlotsForSpecificService(`time-${formId}`, serviceId, selectedDate);
        } catch (error) {
            console.error('Error al cargar horarios:', error);
            timeSelect.innerHTML = '<option value="">❌ Error al cargar</option>';
            timeSelect.disabled = true;
        }
    });
    
    console.log(`✅ Academia ${formId} inicializada con serviceId: ${serviceId}`);
}

async function loadTimeSlotsForSpecificService(selectId, serviceId, date) {
    const selectElement = document.getElementById(selectId);
    
    if (!selectElement) {
        console.error(`Select con id "${selectId}" no encontrado`);
        return;
    }
    
    if (!date) {
        selectElement.innerHTML = '<option value="">Primero selecciona una fecha</option>';
        selectElement.disabled = true;
        return;
    }
    
    selectElement.innerHTML = '<option value="">⏳ Cargando...</option>';
    selectElement.disabled = true;
    
    try {
        const [serviceResult, reservationsResult] = await Promise.all([
            supabase
                .from('services')
                .select('*')
                .eq('id', serviceId)
                .eq('active', true),
            
            supabase
                .from('reservations')
                .select('reservation_time')
                .eq('service_id', serviceId)
                .eq('reservation_date', date)
                .in('status', ['pending', 'confirmed'])
        ]);
        
        if (serviceResult.error) throw serviceResult.error;
        if (reservationsResult.error) throw reservationsResult.error;
        
        const service = serviceResult.data?.[0];
        
        if (!service) {
            console.warn('⚠️ Servicio no encontrado:', serviceId);
            selectElement.innerHTML = '<option value="">❌ Servicio no encontrado</option>';
            return;
        }
        
        console.log('✅ Servicio encontrado:', service.name);
        
        const selectedDate = new Date(date + 'T00:00:00');
        const dayOfWeek = selectedDate.getDay();
        
        const dayNames = {
            0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
            4: 'thursday', 5: 'friday', 6: 'saturday'
        };
        
        const dayName = dayNames[dayOfWeek];
        
        if (!service.available_days.includes(dayName)) {
            selectElement.innerHTML = '<option value="">❌ Servicio no disponible este día</option>';
            return;
        }
        
        const slots = generateTimeSlots(service, date);
        
        if (slots.length === 0) {
            selectElement.innerHTML = '<option value="">❌ No hay horarios para este servicio</option>';
            return;
        }
        
        console.log(`📊 Generados ${slots.length} slots`);
        
        const occupiedTimes = new Set(
            reservationsResult.data.map(r => r.reservation_time)
        );
        
        console.log(`🚫 ${occupiedTimes.size} horarios ocupados`);
        
        const availableSlots = slots.filter(slot => {
            return !occupiedTimes.has(slot.time);
        }).map(slot => ({
            ...slot,
            serviceId: service.id,
            price: service.price
        }));
        
        selectElement.innerHTML = '<option value="">Selecciona un horario</option>';
        
        if (availableSlots.length === 0) {
            selectElement.innerHTML += '<option value="" disabled>❌ No hay horarios disponibles</option>';
            selectElement.disabled = true;
            return;
        }
        
        availableSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = JSON.stringify({
                time: slot.time,
                serviceId: slot.serviceId,
                price: slot.price
            });
            option.textContent = `✅ ${slot.display} - $${slot.price.toLocaleString('es-MX')}`;
            selectElement.appendChild(option);
        });
        
        selectElement.disabled = false;
        
        console.log(`✅ ${availableSlots.length} horarios disponibles (${service.name} - $${service.price})`);
        
    } catch (error) {
        console.error('❌ Error al cargar horarios:', error);
        selectElement.innerHTML = '<option value="" disabled>❌ Error al cargar horarios</option>';
        selectElement.disabled = true;
    }
}

function initSimuladorForm(formId, categoryId, minDate) {
    const dateInput = document.getElementById(`date-${formId}`);
    const durationSelect = document.getElementById(`duration-${formId}`);
    const timeSelect = document.getElementById(`time-${formId}`);
    
    if (!dateInput || !durationSelect || !timeSelect) {
        console.warn(`⚠️ Formulario ${formId} no encontrado`);
        return;
    }
    
    dateInput.setAttribute('min', minDate);
    
    async function updateSimulatorTimes() {
        const selectedDate = dateInput.value;
        const selectedDuration = parseInt(durationSelect.value);
        
        if (!selectedDate) {
            timeSelect.innerHTML = '<option value="">Selecciona fecha primero</option>';
            timeSelect.disabled = true;
            return;
        }
        
        if (!selectedDuration) {
            timeSelect.innerHTML = '<option value="">Selecciona duración primero</option>';
            timeSelect.disabled = true;
            return;
        }
        
        const selected = new Date(selectedDate + 'T00:00:00');
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        if (selected < now) {
            alert('❌ No puedes reservar en el pasado');
            dateInput.value = '';
            return;
        }
        
        timeSelect.innerHTML = '<option value="">⏳ Cargando horarios...</option>';
        timeSelect.disabled = true;
        
        try {
            await loadDynamicTimeSlots(`time-${formId}`, categoryId, selectedDate, selectedDuration);
        } catch (error) {
            console.error('Error al cargar horarios:', error);
            timeSelect.innerHTML = '<option value="">❌ Error al cargar</option>';
            timeSelect.disabled = true;
        }
    }
    
    dateInput.addEventListener('change', updateSimulatorTimes);
    durationSelect.addEventListener('change', updateSimulatorTimes);
    
    console.log(`✅ Simulador ${formId} inicializado`);
}

// ============================================
// 6. CARRITO - AGREGAR/REMOVER/ACTUALIZAR
// ============================================

async function realizarReserva(button, serviceName, basePrice = null) {
    try {
        const card = button.closest('.service-card');
        const serviceId = card.getAttribute('data-service-id');
        const category = card.getAttribute('data-category');
        
        console.log('🔍 Procesando reserva:', { serviceId, category, serviceName, basePrice });
        
        // SIMULADOR
        if (category === 'simulador') {
            const dateInput = document.getElementById('date-simulador');
            const durationSelect = document.getElementById('duration-simulador');
            const timeSelect = document.getElementById('time-simulador');
            
            if (!dateInput.value) {
                showNotification('❌ Por favor selecciona una fecha', 'error');
                return;
            }
            
            if (!durationSelect.value) {
                showNotification('❌ Por favor selecciona la duración', 'error');
                return;
            }
            
            if (!timeSelect.value) {
                showNotification('❌ Por favor selecciona un horario', 'error');
                return;
            }
            
            const slotData = JSON.parse(timeSelect.value);
            const selectedOption = timeSelect.options[timeSelect.selectedIndex];
            const timeDisplay = selectedOption.text;
            const duration = parseInt(durationSelect.value);
            const durationText = duration === 30 ? '30 minutos' : '1 hora';
            
            const cartItem = {
                id: Date.now(),
                serviceId: slotData.serviceId,
                serviceName: `${serviceName} - ${durationText}`,
                serviceDescription: timeDisplay,
                date: dateInput.value,
                time: slotData.time,
                duration: duration,
                quantity: 1,
                unitPrice: slotData.price,
                totalPrice: slotData.price,
                category: category
            };
            
            cart.push(cartItem);
            updateCartUI();
            toggleCart();
            showNotification('✅ Agregado al carrito exitosamente', 'success');
            
            dateInput.value = '';
            durationSelect.value = '';
            timeSelect.innerHTML = '<option value="">Primero selecciona fecha y duración</option>';
            timeSelect.disabled = true;
            
            return;
        }
        
        // ACADEMIA
        if (category === 'academia') {
            let formId = '';
            if (serviceId === '1') formId = 'academia-1';
            else if (serviceId === '2') formId = 'academia-2';
            else if (serviceId === '3') formId = 'academia-3';
            
            const dateInput = document.getElementById(`date-${formId}`);
            const timeSelect = document.getElementById(`time-${formId}`);
            const qtyDisplay = card.querySelector('.qty-display');
            
            if (!dateInput.value) {
                showNotification('❌ Por favor selecciona una fecha', 'error');
                return;
            }
            
            if (!timeSelect.value) {
                showNotification('❌ Por favor selecciona un horario', 'error');
                return;
            }
            
            const quantity = qtyDisplay ? parseInt(qtyDisplay.textContent) : 1;
            const slotData = JSON.parse(timeSelect.value);
            const selectedOption = timeSelect.options[timeSelect.selectedIndex];
            const timeDisplay = selectedOption.text;
            
            const cartItem = {
                id: Date.now(),
                serviceId: slotData.serviceId,
                serviceName: serviceName,
                serviceDescription: timeDisplay,
                date: dateInput.value,
                time: slotData.time,
                duration: 60,
                quantity: quantity,
                unitPrice: slotData.price,
                totalPrice: slotData.price * quantity,
                category: category
            };
            
            cart.push(cartItem);
            updateCartUI();
            toggleCart();
            showNotification('✅ Agregado al carrito exitosamente', 'success');
            
            dateInput.value = '';
            timeSelect.innerHTML = '<option value="">Selecciona fecha primero</option>';
            timeSelect.disabled = true;
            if (qtyDisplay) qtyDisplay.textContent = '1';
            
            return;
        }
        
        showNotification('❌ Categoría no reconocida', 'error');
        
    } catch (error) {
        console.error('❌ Error al agregar al carrito:', error);
        showNotification('❌ Error al agregar al carrito', 'error');
    }
}

function updateCartUI() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartFooter = document.getElementById('cartFooter');
    const cartTotal = document.getElementById('cartTotal');
    const cartBadge = document.getElementById('cartBadge');

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🛒</div>
                <p>Tu carrito está vacío</p>
            </div>
        `;
        cartFooter.style.display = 'none';
        if (cartBadge) cartBadge.textContent = '0';
        return;
    }
    
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item" data-item-id="${item.id}">
            <div class="cart-item-info">
                <h4>${item.serviceName}</h4>
                <p class="cart-item-details">
                    📅 ${formatDate(item.date)}<br>
                    🕐 ${formatTime(item.time)}<br>
                    🔢 Cantidad: ${item.quantity}
                </p>
                <p class="cart-item-price">$${item.totalPrice.toLocaleString('es-MX')}</p>
            </div>
            <button class="remove-item-btn" onclick="removeFromCart(${item.id})">
                🗑️
            </button>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    cartTotal.textContent = `$${total.toLocaleString('es-MX')}`;

    if (cartBadge) {
        cartBadge.textContent = cart.length;
    }
    
    cartFooter.style.display = 'block';
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCartUI();
    actualizarBadgeNavbar();
    console.log('🗑️ Item removido del carrito');
}

function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    if (!cartSidebar) return;
    
    if (cartSidebar.classList.contains('open')) {
        cartSidebar.classList.remove('open');
    } else {
        cartSidebar.classList.add('open');
        updateCartUI();
    }
}

function actualizarBadgeNavbar() {
    const cartBadge = document.getElementById('cartBadge');
    
    if (cartBadge) {
        cartBadge.textContent = cart.length;
        
        if (cart.length > 0) {
            cartBadge.style.transform = 'scale(1.3)';
            setTimeout(() => {
                cartBadge.style.transform = 'scale(1)';
            }, 200);
        }
    }
}

function updateQty(button, delta) {
    const qtyDisplay = button.parentElement.querySelector('.qty-display');
    if (!qtyDisplay) return;
    
    let currentQty = parseInt(qtyDisplay.textContent);
    let newQty = currentQty + delta;
    
    if (newQty < 1) newQty = 1;
    if (newQty > 10) newQty = 10;
    
    qtyDisplay.textContent = newQty;
}

// ============================================
// OBTENER CARRITO - FUNCIÓN HELPER
// ============================================

function getCart() {
    return cart;
}

// ============================================
// 7. MERCADO PAGO - PROCESAR PAGO ONLINE
// ============================================

// ============================================
// MERCADO PAGO - PROCESAR PAGO ONLINE (ACTUALIZADO)
// Incluye modal para pedir datos del cliente
// ============================================

function mostrarLoading(show) {
    let loader = document.getElementById('payment-loader');
    
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'payment-loader';
        loader.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
            ">
                <div style="
                    background: white;
                    padding: 2rem;
                    border-radius: 16px;
                    text-align: center;
                ">
                    <div style="
                        width: 50px;
                        height: 50px;
                        border: 4px solid #e0e0e0;
                        border-top-color: #25d366;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 1rem;
                    "></div>
                    <p style="margin: 0; color: #333; font-weight: 600;">
                        Procesando pago...
                    </p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.appendChild(loader);
    }
    
    loader.style.display = show ? 'flex' : 'none';
}

// ===== NUEVA FUNCIÓN: Pedir datos del cliente antes de pagar =====
function pedirDatosCliente() {
    return new Promise((resolve) => {
        const modalHTML = `
            <div class="modal-overlay" id="customerModalMP" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 1rem;
            ">
                <div class="modal-content" style="
                    background: white;
                    border-radius: 16px;
                    padding: 2rem;
                    max-width: 500px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                ">
                    <div class="modal-header" style="
                        margin-bottom: 1.5rem;
                        padding-bottom: 1rem;
                        border-bottom: 2px solid #e0e0e0;
                        text-align: center;
                    ">
                        <h2 style="margin: 0; color: #1a472a; font-size: 1.5rem;">
                            📝 Completa tus datos
                        </h2>
                        <p style="margin: 0.5rem 0 0 0; color: #666; font-size: 0.9rem;">
                            Para procesar tu pago con Mercado Pago
                        </p>
                    </div>
                    
                    <div class="modal-body">
                        <form id="customerFormMP">
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="
                                    display: block;
                                    margin-bottom: 0.5rem;
                                    color: #333;
                                    font-weight: 600;
                                ">Nombre completo *</label>
                                <input 
                                    type="text" 
                                    id="mpCustomerName" 
                                    required 
                                    placeholder="Juan Pérez"
                                    style="
                                        width: 100%;
                                        padding: 0.75rem;
                                        border: 2px solid #e0e0e0;
                                        border-radius: 8px;
                                        font-size: 1rem;
                                    ">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="
                                    display: block;
                                    margin-bottom: 0.5rem;
                                    color: #333;
                                    font-weight: 600;
                                ">Email *</label>
                                <input 
                                    type="email" 
                                    id="mpCustomerEmail" 
                                    required
                                    placeholder="juan@email.com"
                                    style="
                                        width: 100%;
                                        padding: 0.75rem;
                                        border: 2px solid #e0e0e0;
                                        border-radius: 8px;
                                        font-size: 1rem;
                                    ">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="
                                    display: block;
                                    margin-bottom: 0.5rem;
                                    color: #333;
                                    font-weight: 600;
                                ">Teléfono (WhatsApp) *</label>
                                <input 
                                    type="tel" 
                                    id="mpCustomerPhone" 
                                    required 
                                    pattern="[0-9]{10}"
                                    placeholder="3312345678"
                                    maxlength="10"
                                    style="
                                        width: 100%;
                                        padding: 0.75rem;
                                        border: 2px solid #e0e0e0;
                                        border-radius: 8px;
                                        font-size: 1rem;
                                    ">
                                <small style="color: #666; font-size: 0.85rem;">10 dígitos sin espacios</small>
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1.5rem;">
                                <label style="
                                    display: block;
                                    margin-bottom: 0.5rem;
                                    color: #333;
                                    font-weight: 600;
                                ">Notas adicionales (opcional)</label>
                                <textarea 
                                    id="mpCustomerNotes" 
                                    rows="3"
                                    placeholder="Comentarios o peticiones especiales"
                                    style="
                                        width: 100%;
                                        padding: 0.75rem;
                                        border: 2px solid #e0e0e0;
                                        border-radius: 8px;
                                        font-size: 1rem;
                                        resize: vertical;
                                    "></textarea>
                            </div>
                            
                            <div style="display: flex; gap: 1rem;">
                                <button 
                                    type="button" 
                                    onclick="cerrarModalMP()"
                                    style="
                                        flex: 1;
                                        padding: 1rem;
                                        background: #e0e0e0;
                                        color: #333;
                                        border: none;
                                        border-radius: 8px;
                                        font-weight: 600;
                                        cursor: pointer;
                                    ">
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    style="
                                        flex: 2;
                                        padding: 1rem;
                                        background: #25d366;
                                        color: white;
                                        border: none;
                                        border-radius: 8px;
                                        font-weight: 600;
                                        cursor: pointer;
                                        transition: background 0.3s;
                                    ">
                                    💳 Continuar al pago
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Auto-focus en el primer campo
        setTimeout(() => {
            document.getElementById('mpCustomerName')?.focus();
        }, 100);
        
        // Handler del formulario
        const form = document.getElementById('customerFormMP');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('mpCustomerName').value.trim();
            const email = document.getElementById('mpCustomerEmail').value.trim();
            const phone = document.getElementById('mpCustomerPhone').value.trim();
            const notes = document.getElementById('mpCustomerNotes').value.trim();
            
            // Validaciones
            if (!name || name.length < 3) {
                alert('❌ Por favor ingresa tu nombre completo');
                return;
            }
            
            if (!email || !isValidEmail(email)) {
                alert('❌ Por favor ingresa un email válido');
                return;
            }
            
            if (!phone || !isValidPhone(phone)) {
                alert('❌ El teléfono debe tener 10 dígitos');
                return;
            }
            
            // Cerrar modal y devolver datos
            document.getElementById('customerModalMP').remove();
            resolve({ name, email, phone, notes });
        });
        
        // Función global para cerrar el modal
        window.cerrarModalMP = () => {
            document.getElementById('customerModalMP')?.remove();
            resolve(null); // Retornar null si cancela
        };
    });
}

// ===== FUNCIÓN PRINCIPAL ACTUALIZADA =====
async function procesarPagoMercadoPago() {
    try {
        console.log('💳 Iniciando pago con Mercado Pago...');
        
        // ===== PASO 1: Pedir datos del cliente =====
        const customerData = await pedirDatosCliente();
        
        if (!customerData) {
            console.log('❌ Usuario canceló el proceso de pago');
            return;
        }

        console.log('✅ Datos del cliente recibidos:', customerData.name);

        // ===== PASO 2: Obtener carrito =====
        const carritoActual = getCart();
        
        console.log('📦 Carrito obtenido:', carritoActual);
        console.log('📊 Items en carrito:', carritoActual.length);
        
        // Validar carrito
        if (!carritoActual || carritoActual.length === 0) {
            alert('El carrito está vacío. Agrega servicios antes de continuar.');
            return;
        }
        
        // ===== PASO 3: Calcular total y preparar datos =====
        const total = carritoActual.reduce((sum, item) => sum + item.totalPrice, 0);
        
        // Crear título descriptivo
        let titulo = '';
        if (carritoActual.length === 1) {
            titulo = carritoActual[0].serviceName;
        } else {
            titulo = `Paquete Hoyo en Uno (${carritoActual.length} servicios)`;
        }
        
        // Preparar datos para el pago (AHORA CON DATOS COMPLETOS)
        const paymentData = {
            title: titulo,
            quantity: 1,
            price: total,
            description: carritoActual.map(item => 
                `${item.serviceName} x${item.quantity || 1}`
            ).join(', '),
            // ⬇️ NUEVOS CAMPOS
            cart: carritoActual, // ⬅️ Todo el carrito con reservas
            customerName: customerData.name,
            customerEmail: customerData.email,
            customerPhone: customerData.phone,
            customerNotes: customerData.notes || null
        };
        
        console.log('📤 Datos del pago completos:', {
            ...paymentData,
            cart: `${paymentData.cart.length} items`
        });
        
        // ===== PASO 4: Mostrar loading =====
        mostrarLoading(true);
        
        // ===== PASO 5: Llamar a la API =====
        console.log('🔍 Enviando petición a:', `${API_URL}/payment/create_preference`);

        try {
            const response = await fetch(`${API_URL}/payment/create_preference`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });

            // Verificar si la respuesta es JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('❌ La respuesta no es JSON:', textResponse.substring(0, 500));
                throw new Error('La respuesta del servidor no es un JSON válido');
            }

            const data = await response.json();
            mostrarLoading(false);
            
            if (!response.ok) {
                console.error('❌ Error en la respuesta:', data);
                throw new Error(data.message || data.error || 'Error al crear el pago');
            }
            
            console.log('✅ Preferencia creada:', data);
            console.log(`✅ ${data.reservations_created} reserva(s) guardada(s) en Supabase`);
            
            // ===== PASO 6: Redirigir a Mercado Pago =====
            if (data.checkout_url) {
                console.log('🚀 Redirigiendo a Mercado Pago...');
                
                // Limpiar carrito antes de redirigir
                // (opcional, puedes dejarlo para que el usuario vea qué compró)
                // cart = [];
                // updateCartUI();
                
                window.location.href = data.checkout_url;
            } else {
                throw new Error('No se recibió la URL de pago');
            }
        } catch (fetchError) {
            console.error('❌ Error en la petición:', fetchError);
            mostrarLoading(false);
            alert('Error al procesar el pago: ' + fetchError.message);
            throw fetchError;
        }
        
    } catch (error) {
        console.error('❌ Error general:', error);
        mostrarLoading(false);
        alert('Error al procesar el pago: ' + error.message);
    }
}

// ============================================
// HELPER FUNCTIONS (ya las tenés, pero por si acaso)
// ============================================

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}
// ============================================
// 8. PROCESAR PAGO - SELECTOR DE MÉTODO
// ============================================

function processPayment(paymentMethod) {
    const carritoActual = getCart();
    
    if (!carritoActual || carritoActual.length === 0) {
        alert('El carrito está vacío');
        return;
    }
    
    if (paymentMethod === 'online') {
        // ✅ PAGO CON MERCADO PAGO
        procesarPagoMercadoPago();
    } else {
        // Pago en establecimiento (flujo original)
        mostrarModalDatosCliente(paymentMethod);
    }
}

// ============================================
// 9. FLUJO ORIGINAL - PAGO EN ESTABLECIMIENTO
// ============================================

function mostrarModalDatosCliente(paymentMethod) {
    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const modalHTML = `
        <div class="modal-overlay" id="customerModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📝 Completa tus datos</h2>
                    <button class="modal-close" onclick="cerrarModal()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="reservation-summary">
                        <h3>📋 Resumen del Pedido</h3>
                        ${cart.map(item => `
                            <div class="summary-item">
                                <strong>${item.serviceName}</strong><br>
                                📅 ${formatDate(item.date)} | 🕐 ${formatTime(item.time)}<br>
                                $${item.totalPrice.toLocaleString('es-MX')}
                            </div>
                        `).join('')}
                        <div class="summary-total">
                            <strong>Total: $${total.toLocaleString('es-MX')}</strong>
                        </div>
                    </div>
                    
                    <form id="customerForm" onsubmit="return false;">
                        <div class="form-group">
                            <label>Nombre completo *</label>
                            <input type="text" id="customerName" required placeholder="Juan Pérez">
                        </div>
                        
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" id="customerEmail" required placeholder="juan@email.com">
                        </div>
                        
                        <div class="form-group">
                            <label>Teléfono (WhatsApp) *</label>
                            <input type="tel" id="customerPhone" required placeholder="3312345678" pattern="[0-9]{10}">
                        </div>
                        
                        <div class="form-group">
                            <label>Notas adicionales (opcional)</label>
                            <textarea id="customerNotes" rows="3" placeholder="Comentarios o peticiones especiales"></textarea>
                        </div>
                        
                        <button type="button" class="confirm-btn" onclick="confirmarReservas('${paymentMethod}')">
                            ✅ Confirmar Reservas
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('customerName')?.focus();
}

async function confirmarReservas(paymentMethod) {
    console.log('💾 Guardando reservas...');
    
    const customerName = document.getElementById('customerName')?.value.trim();
    const customerEmail = document.getElementById('customerEmail')?.value.trim();
    const customerPhone = document.getElementById('customerPhone')?.value.trim();
    const customerNotes = document.getElementById('customerNotes')?.value.trim();
    
    if (!customerName || !customerEmail || !customerPhone) {
        alert('❌ Por favor completa todos los campos obligatorios');
        return;
    }
    
    if (!isValidEmail(customerEmail)) {
        alert('❌ Email inválido');
        return;
    }
    
    if (!isValidPhone(customerPhone)) {
        alert('❌ Teléfono debe tener 10 dígitos');
        return;
    }
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';
    
    try {
        const reservations = [];
        
        for (const item of cart) {
            const reservationData = {
                serviceId: parseInt(item.serviceId),
                date: item.date,
                time: item.time,
                quantity: item.quantity,
                customerName: customerName,
                customerEmail: customerEmail,
                customerPhone: customerPhone,
                unitPrice: item.unitPrice,
                totalAmount: item.totalPrice,
                paymentMethod: paymentMethod === 'online' ? 'tarjeta' : 'efectivo',
                notes: customerNotes || null
            };
            
            const result = await createReservationWithCheck(reservationData);
            
            if (!result.success) {
                alert(`❌ Error en: ${item.serviceName}\n${result.error}`);
                btn.disabled = false;
                btn.textContent = originalText;
                return;
            }
            
            reservations.push({
                ...result.data,
                serviceName: item.serviceName
            });
        }
        
        console.log('✅ Todas las reservas guardadas:', reservations);
        
        const adminWhatsAppUrl = await notificarAdminNuevaReserva(reservations);
        
        if (adminWhatsAppUrl) {
            setTimeout(() => {
                window.open(adminWhatsAppUrl, '_blank');
                console.log('📱 WhatsApp del admin abierto automáticamente');
            }, 1000);
        }
        
        cerrarModal();
        toggleCart();
        
        cart = [];
        updateCartUI();
        
        mostrarModalExito(reservations, paymentMethod, adminWhatsAppUrl);
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al guardar las reservas. Intenta de nuevo.');
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function notificarAdminNuevaReserva(reservations) {
    try {
        const total = reservations.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
        const cliente = reservations[0];
        
        const adminMessage = `
🔔 *NUEVA RESERVA - HOYO EN UNO*

━━━━━━━━━━━━━━━━━━━━
📋 *DETALLES DE LA RESERVA*
━━━━━━━━━━━━━━━━━━━━

${reservations.map((r, i) => `
*${i + 1}. ${r.serviceName || 'Servicio'}*
📅 Fecha: ${formatDate(r.reservation_date)}
🕐 Hora: ${formatTime(r.reservation_time)}
💰 Monto: $${parseFloat(r.total_amount).toLocaleString('es-MX')}
🔖 ID: #${r.id}
`).join('\n━━━━━━━━━━━━━━━━━━━━\n')}

💵 *TOTAL: $${total.toLocaleString('es-MX')}*

━━━━━━━━━━━━━━━━━━━━
👤 *DATOS DEL CLIENTE*
━━━━━━━━━━━━━━━━━━━━

• Nombre: ${cliente.customer_name}
• Email: ${cliente.customer_email}
• Teléfono: ${cliente.customer_phone}

${cliente.notes ? `📝 *Notas:* ${cliente.notes}` : ''}

━━━━━━━━━━━━━━━━━━━━
⚠️ *ESTADO: PENDIENTE DE APROBACIÓN*

🔗 *Panel Admin:*
${window.location.origin}/admin-login.html

━━━━━━━━━━━━━━━━━━━━
Para aprobar esta reserva, ingresa al panel de administración.
        `.trim();
        
        const adminWhatsAppUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(adminMessage)}`;
        
        console.log('📨 Notificación preparada para admin:', ADMIN_WHATSAPP);
        
        return adminWhatsAppUrl;
        
    } catch (error) {
        console.error('❌ Error al preparar notificación:', error);
        return null;
    }
}

function mostrarModalExito(reservations, paymentMethod, adminWhatsAppUrl) {
    const total = reservations.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
    
    const clientMessage = `
Hola, acabo de hacer ${reservations.length} reserva(s) en Hoyo en Uno:

${reservations.map((r, i) => `
${i + 1}. ${r.serviceName}
   📅 ${formatDate(r.reservation_date)}
   🕐 ${formatTime(r.reservation_time)}
   💰 $${parseFloat(r.total_amount).toLocaleString('es-MX')}
   ID: #${r.id}
`).join('\n')}

💵 Total: $${total.toLocaleString('es-MX')}
👤 ${reservations[0].customer_name}
📱 ${reservations[0].customer_phone}

Por favor confirma mis reservas. ¡Gracias!
    `.trim();
    
    const clientWhatsAppUrl = `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(clientMessage)}`;
    
    const modalHTML = `
        <div class="modal-overlay success-modal" id="successModal">
            <div class="modal-content">
                <div class="success-icon">✅</div>
                <h2>¡Reservas Creadas!</h2>
                
                <div class="success-details">
                    <p><strong>${reservations.length} reserva(s) confirmada(s)</strong></p>
                    ${reservations.map(r => `
                        <div class="reservation-item">
                            <p><strong>${r.serviceName}</strong></p>
                            <p>📅 ${formatDate(r.reservation_date)} | 🕐 ${formatTime(r.reservation_time)}</p>
                            <p>🔖 ID: #${r.id} | 📊 Estado: <span style="color: #f59e0b; font-weight: 600;">PENDIENTE</span></p>
                        </div>
                    `).join('')}
                    <p class="total-amount"><strong>Total: $${total.toLocaleString('es-MX')}</strong></p>
                </div>
                
                <div class="next-steps">
                    <h3>📱 Próximo Paso:</h3>
                    <p>Tu reserva está <strong>pendiente de aprobación</strong>. El administrador la revisará y te confirmará por WhatsApp.</p>
                    <p style="margin-top: 0.75rem; font-size: 0.9rem;">
                        ✅ <strong>Se ha notificado automáticamente al administrador</strong>
                    </p>
                </div>
                
                <div class="button-group">
                    <a href="${clientWhatsAppUrl}" target="_blank" class="whatsapp-btn-large">
                        💬 Contactar por WhatsApp
                    </a>
                    <button onclick="cerrarModalExito()" class="btn-secondary">
                        Cerrar
                    </button>
                </div>
                
                ${adminWhatsAppUrl ? `
                <div style="margin-top: 1rem; padding: 1rem; background: #f3f4f6; border-radius: 12px; text-align: center; border: 2px dashed #d1d5db;">
                    <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #6b7280;">
                        🔔 <strong>Notificación enviada al admin</strong>
                    </p>
                    <p style="margin: 0; font-size: 0.75rem; color: #9ca3af;">
                        El administrador recibirá tu reserva inmediatamente
                    </p>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function cerrarModal() {
    document.getElementById('customerModal')?.remove();
}

function cerrarModalExito() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.remove();
    }
}

// ============================================
// 10. UTILIDADES Y HELPERS
// ============================================

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('es-MX', options);
}

function formatTime(timeString) {
    return timeString.substring(0, 5);
}

function formatPrice(amount) {
    return `$${parseFloat(amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

function showNotification(message, type = 'success') {
    let notification = document.querySelector('.notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    const icon = type === 'success' ? '✅' : '❌';
    notification.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-text">${message}</span>
    `;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ============================================
// 11. INICIALIZACIÓN AUTO
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllReservationForms);
} else {
    initAllReservationForms();
}

console.log('✅ Supabase Integration completo cargado');
console.log('💳 Mercado Pago integrado - API URL:', API_URL);
console.log('📱 WhatsApp Business:', BUSINESS_WHATSAPP);
console.log('🔧 WhatsApp Admin:', ADMIN_WHATSAPP);s