-- ============================================================
-- CAMC · Centro de Artes Marciales Chinas
-- Schema Supabase (Postgres) — migración desde Airtable
-- ============================================================

-- 0. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CONFIGURACIÓN DEL DOJO
-- ============================================================
CREATE TABLE config (
    id          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- singleton
    nombre_dojo TEXT NOT NULL DEFAULT 'Centro de Artes Marciales Chinas',
    estilos     TEXT[] NOT NULL DEFAULT '{"Shaolin","Tai Chi"}',
    fajas       TEXT[] NOT NULL DEFAULT '{"Blanca","Amarilla","Naranja","Verde","Azul","Roja","Negra"}',
    cuota       NUMERIC(10,2) NOT NULL DEFAULT 0,
    matricula   NUMERIC(10,2) NOT NULL DEFAULT 0,
    meses_alerta_deuda INT NOT NULL DEFAULT 2,
    msg_whatsapp TEXT DEFAULT 'Hola {nombre}, te recordamos que tu cuota de {mes} en {dojo} está pendiente.',
    tema        TEXT NOT NULL DEFAULT 'light',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fila inicial
INSERT INTO config (id) VALUES (1);

-- ============================================================
-- 2. ALUMNOS
-- ============================================================
CREATE TABLE alumnos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      TEXT NOT NULL,
    apellido    TEXT NOT NULL,
    estilos     TEXT[] NOT NULL DEFAULT '{}',       -- ej: {"Shaolin","Tai Chi"}
    faja        TEXT DEFAULT 'Blanca',
    telefono    TEXT,
    email       TEXT,
    estado      TEXT NOT NULL DEFAULT 'activo'
                    CHECK (estado IN ('activo','inactivo')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alumnos_estado ON alumnos (estado);
CREATE INDEX idx_alumnos_apellido ON alumnos (apellido, nombre);

-- ============================================================
-- 3. ASISTENCIAS
-- ============================================================
CREATE TABLE asistencias (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id   UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
    fecha       DATE NOT NULL,
    estilo      TEXT NOT NULL,
    presente    BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asist_fecha ON asistencias (fecha DESC);
CREATE INDEX idx_asist_alumno ON asistencias (alumno_id, fecha DESC);
CREATE INDEX idx_asist_estilo_fecha ON asistencias (estilo, fecha);

-- Evitar duplicados: un alumno no puede tener dos registros
-- para el mismo estilo en el mismo día
CREATE UNIQUE INDEX idx_asist_unique
    ON asistencias (alumno_id, fecha, estilo);

-- ============================================================
-- 4. PAGOS (cuotas + matrículas)
-- ============================================================
CREATE TABLE pagos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id   UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
    tipo        TEXT NOT NULL CHECK (tipo IN ('cuota','matricula')),
    mes         INT CHECK (mes BETWEEN 1 AND 12),      -- solo cuotas
    anio        INT NOT NULL,
    monto       NUMERIC(10,2) NOT NULL,
    fecha_pago  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagos_alumno ON pagos (alumno_id, anio DESC, mes);
CREATE INDEX idx_pagos_periodo ON pagos (anio, mes);

-- Evitar cuota duplicada para el mismo alumno/mes/año
CREATE UNIQUE INDEX idx_pagos_cuota_unique
    ON pagos (alumno_id, anio, mes) WHERE tipo = 'cuota';

-- Evitar matrícula duplicada para el mismo alumno/año
CREATE UNIQUE INDEX idx_pagos_matricula_unique
    ON pagos (alumno_id, anio) WHERE tipo = 'matricula';

-- ============================================================
-- 5. AUTH (contraseña admin — simple, sin Supabase Auth)
-- ============================================================
CREATE TABLE admin_auth (
    id          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    password_hash TEXT NOT NULL
);

-- ============================================================
-- 6. VISTAS ÚTILES
-- ============================================================

-- Vista: estado de cuota del mes actual por alumno
CREATE OR REPLACE VIEW v_estado_cuota_mes AS
SELECT
    a.id AS alumno_id,
    a.apellido,
    a.nombre,
    a.estilos,
    a.estado,
    EXTRACT(MONTH FROM CURRENT_DATE)::INT AS mes_actual,
    EXTRACT(YEAR FROM CURRENT_DATE)::INT AS anio_actual,
    p.monto,
    p.fecha_pago,
    CASE WHEN p.id IS NOT NULL THEN 'pagado' ELSE 'debe' END AS estado_pago
FROM alumnos a
LEFT JOIN pagos p
    ON  p.alumno_id = a.id
    AND p.tipo = 'cuota'
    AND p.mes = EXTRACT(MONTH FROM CURRENT_DATE)
    AND p.anio = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE a.estado = 'activo';

-- Vista: resumen de asistencia por alumno y estilo
CREATE OR REPLACE VIEW v_asistencia_resumen AS
SELECT
    a.id AS alumno_id,
    a.apellido || ', ' || a.nombre AS alumno,
    asi.estilo,
    COUNT(*)                          AS clases,
    COUNT(*) FILTER (WHERE asi.presente)     AS presentes,
    COUNT(*) FILTER (WHERE NOT asi.presente) AS ausentes,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE asi.presente) / NULLIF(COUNT(*), 0),
        1
    ) AS porcentaje
FROM alumnos a
JOIN asistencias asi ON asi.alumno_id = a.id
GROUP BY a.id, a.apellido, a.nombre, asi.estilo;

-- Vista: ingresos por mes
CREATE OR REPLACE VIEW v_ingresos_mes AS
SELECT
    anio,
    mes,
    COUNT(*) AS cantidad_pagos,
    SUM(monto) AS total
FROM pagos
WHERE tipo = 'cuota'
GROUP BY anio, mes
ORDER BY anio DESC, mes DESC;

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Por ahora la app usa anon key con RLS permisivo
-- porque la autenticación es una sola clave compartida.
-- Cuando migres a Supabase Auth con roles, restringís acá.

ALTER TABLE config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_auth  ENABLE ROW LEVEL SECURITY;

-- Policies: acceso total para anon (el frontend autentica con su propia clave)
CREATE POLICY "anon_all" ON config      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON alumnos     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON asistencias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON pagos       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON admin_auth  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 8. TRIGGERS: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_alumnos_updated
    BEFORE UPDATE ON alumnos
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_config_updated
    BEFORE UPDATE ON config
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
