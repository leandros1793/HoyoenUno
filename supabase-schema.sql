-- ============================================
-- SCHEMA DE BASE DE DATOS PARA PLAYTOMIX GOLF
-- Sistema de reservas de simulador de golf
-- ============================================

-- TABLA 1: Perfiles de Usuarios
CREATE TABLE profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- TABLA 2: Categorías de Servicios
CREATE TABLE service_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Insertar categorías iniciales
INSERT INTO service_categories (name, slug, description, icon) VALUES
('Academia', 'academia', 'Clases profesionales de golf', '🎓'),
('Simulador', 'simulador', 'Renta de simulador por hora', '🏌️');

-- TABLA 3: Servicios
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES service_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_package BOOLEAN DEFAULT FALSE,
    package_sessions INTEGER,
    active BOOLEAN DEFAULT TRUE,
    
    -- Horarios disponibles
    available_days TEXT[], -- ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    start_time TIME,
    end_time TIME,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Insertar servicios iniciales (Academia)
INSERT INTO services (category_id, name, description, price, duration_minutes, is_package, available_days, start_time, end_time) VALUES
(1, 'Clase Individual', 'Instructor profesional personalizado con análisis de swing', 720.00, 60, FALSE, 
 ARRAY['monday','tuesday','wednesday','thursday','friday','saturday'], '07:00', '23:00'),
 
(1, 'Paquete 5 Clases', '5 clases individuales con seguimiento continuo', 2700.00, 60, TRUE,
 ARRAY['monday','tuesday','wednesday','thursday','friday','saturday'], '07:00', '23:00'),
 
(1, 'Paquete 10 Clases', '10 clases individuales con certificado y análisis de video', 5400.00, 60, TRUE,
 ARRAY['monday','tuesday','wednesday','thursday','friday','saturday'], '07:00', '23:00');

-- Insertar servicios de simulador
INSERT INTO services (category_id, name, description, price, duration_minutes, is_package, available_days, start_time, end_time) VALUES
-- Horario 1:00 PM - 4:00 PM (L-S)
(2, '1/2 Hora Simulador (1-4 PM)', 'Media hora de simulador - Lunes a Sábado 1-4 PM', 180.00, 30, FALSE,
 ARRAY['monday','tuesday','wednesday','thursday','friday','saturday'], '13:00', '16:00'),
 
(2, '1 Hora Simulador (1-4 PM)', '1 hora de simulador - Lunes a Sábado 1-4 PM', 360.00, 60, FALSE,
 ARRAY['monday','tuesday','wednesday','thursday','friday','saturday'], '13:00', '16:00'),

-- Horario 4:00 PM - 11:00 PM (L-J)
(2, '1/2 Hora Simulador (4-11 PM L-J)', 'Media hora de simulador - Lunes a Jueves 4-11 PM', 270.00, 30, FALSE,
 ARRAY['monday','tuesday','wednesday','thursday'], '16:00', '23:00'),
 
(2, '1 Hora Simulador (4-11 PM L-J)', '1 hora de simulador - Lunes a Jueves 4-11 PM', 540.00, 60, FALSE,
 ARRAY['monday','tuesday','wednesday','thursday'], '16:00', '23:00'),

-- Horario 4:00 PM - 12:00 AM (V-S)
(2, '1/2 Hora Simulador (4 PM-12 AM V-S)', 'Media hora de simulador - Viernes y Sábado 4 PM-12 AM', 270.00, 30, FALSE,
 ARRAY['friday','saturday'], '16:00', '23:59'),
 
(2, '1 Hora Simulador (4 PM-12 AM V-S)', '1 hora de simulador - Viernes y Sábado 4 PM-12 AM', 540.00, 60, FALSE,
 ARRAY['friday','saturday'], '16:00', '23:59');

-- TABLA 4: Reservas
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    service_id INTEGER REFERENCES services(id) NOT NULL,
    
    -- Información de la reserva
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    quantity INTEGER DEFAULT 1,
    
    -- Información del cliente (si no está registrado)
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    
    -- Precios
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Estado de la reserva
    status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled, no_show
    payment_method TEXT, -- online, in_store
    payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded
    
    -- Notas
    notes TEXT,
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    CONSTRAINT valid_payment_method CHECK (payment_method IN ('online', 'in_store'))
);

-- TABLA 5: Disponibilidad (para bloquear horarios)
CREATE TABLE availability (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    service_id INTEGER REFERENCES services(id),
    is_blocked BOOLEAN DEFAULT FALSE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(date, start_time, service_id)
);

-- TABLA 6: Configuración del sistema
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Insertar configuraciones iniciales
INSERT INTO system_settings (key, value, description) VALUES
('whatsapp_phone', '523322396825', 'Número de WhatsApp para notificaciones'),
('business_email', 'info@playtomix.com', 'Email de contacto del negocio'),
('timezone', 'America/Mexico_City', 'Zona horaria del negocio'),
('advance_booking_days', '30', 'Días de anticipación para reservar'),
('cancellation_hours', '24', 'Horas mínimas para cancelar sin penalización'),
('auto_confirm', 'false', 'Confirmar reservas automáticamente');

-- TABLA 7: Historial de cambios (audit log)
CREATE TABLE reservation_history (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER REFERENCES reservations(id),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL, -- created, updated, confirmed, cancelled, completed, no_show
    old_status TEXT,
    new_status TEXT,
    changes JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_service ON reservations(service_id);
CREATE INDEX idx_reservations_date_time ON reservations(reservation_date, reservation_time);
CREATE INDEX idx_availability_date ON availability(date);
CREATE INDEX idx_services_category ON services(category_id);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a tablas relevantes
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para crear historial automáticamente
CREATE OR REPLACE FUNCTION log_reservation_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO reservation_history (reservation_id, action, new_status)
        VALUES (NEW.id, 'created', NEW.status);
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO reservation_history (reservation_id, action, old_status, new_status)
        VALUES (NEW.id, 'status_changed', OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_reservation_changes AFTER INSERT OR UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION log_reservation_change();

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Reservas del día
CREATE VIEW todays_reservations AS
SELECT 
    r.id,
    r.reservation_date,
    r.reservation_time,
    r.customer_name,
    r.customer_phone,
    r.status,
    r.payment_status,
    s.name as service_name,
    s.duration_minutes,
    r.total_amount
FROM reservations r
JOIN services s ON r.service_id = s.id
WHERE r.reservation_date = CURRENT_DATE
ORDER BY r.reservation_time;

-- Vista: Estadísticas de reservas
CREATE VIEW reservation_stats AS
SELECT 
    DATE_TRUNC('month', reservation_date) as month,
    COUNT(*) as total_reservations,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
    COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
    SUM(total_amount) as total_revenue,
    SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue
FROM reservations
GROUP BY DATE_TRUNC('month', reservation_date)
ORDER BY month DESC;

-- Vista: Servicios más populares
CREATE VIEW popular_services AS
SELECT 
    s.name,
    sc.name as category,
    COUNT(r.id) as total_bookings,
    SUM(r.total_amount) as revenue
FROM services s
LEFT JOIN reservations r ON s.id = r.service_id
LEFT JOIN service_categories sc ON s.category_id = sc.id
GROUP BY s.id, s.name, sc.name
ORDER BY total_bookings DESC;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en tablas sensibles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_history ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver y editar su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Política: Los usuarios pueden ver sus propias reservas
CREATE POLICY "Users can view own reservations" ON reservations
    FOR SELECT USING (auth.uid() = user_id);

-- Política: Los usuarios pueden crear reservas
CREATE POLICY "Users can create reservations" ON reservations
    FOR INSERT WITH CHECK (true);

-- Nota: Las políticas de admin se configurarán en el dashboard de Supabase

-- ============================================
-- DATOS DE PRUEBA (OPCIONAL)
-- ============================================

-- Descomentar estas líneas para insertar datos de prueba

-- INSERT INTO profiles (id, email, full_name, phone) VALUES
-- (gen_random_uuid(), 'cliente@ejemplo.com', 'Cliente Test', '3312345678');

-- INSERT INTO reservations (service_id, reservation_date, reservation_time, customer_name, customer_email, customer_phone, quantity, unit_price, total_amount, status, payment_method)
-- VALUES 
-- (1, CURRENT_DATE + INTERVAL '1 day', '10:00', 'Juan Pérez', 'juan@ejemplo.com', '3312345678', 1, 720.00, 720.00, 'confirmed', 'online'),
-- (4, CURRENT_DATE + INTERVAL '2 days', '14:00', 'María García', 'maria@ejemplo.com', '3398765432', 1, 180.00, 180.00, 'pending', 'in_store');

-- ============================================
-- SCRIPT COMPLETADO
-- ============================================

-- Para aplicar este schema:
-- 1. Ve a tu proyecto en Supabase
-- 2. SQL Editor > New query
-- 3. Pega este código completo
-- 4. Click en "Run"
