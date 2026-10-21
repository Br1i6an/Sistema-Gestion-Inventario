-- Esquema de la base de datos.
-- Convenciones:
--   * Schema dedicado "inventario" para aislar los objetos del dominio.
--   * Claves primarias BIGSERIAL, FKs con ON DELETE RESTRICT/CASCADE segun el caso.
--   * CHECK constraints para dominio de valores (no solo en la capa de app).
--   * Timestamps con DEFAULT now() y trigger para updated_at.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- generacion de ids auxiliares
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- funciones criptograficas (digest, gen_salt)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- busqueda difusa / ILIKE acelerada con indice GIN

CREATE SCHEMA IF NOT EXISTS inventario;
SET search_path TO inventario, public;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                   WHERE t.typname = 'tipo_movimiento' AND n.nspname = 'inventario') THEN
        CREATE TYPE tipo_movimiento AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                   WHERE t.typname = 'rol_usuario' AND n.nspname = 'inventario') THEN
        CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'OPERADOR', 'LECTURA');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS inventario.usuarios (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL,
    email           VARCHAR(150) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    rol             rol_usuario NOT NULL DEFAULT 'OPERADOR',
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    ultimo_acceso   TIMESTAMPTZ  NULL,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_usuarios_username UNIQUE (username),
    CONSTRAINT uq_usuarios_email    UNIQUE (email)
);

COMMENT ON TABLE  inventario.usuarios IS 'Usuarios con acceso a la API. El hash se genera en la capa de aplicacion (PBKDF2/BCrypt).';
COMMENT ON COLUMN inventario.usuarios.password_hash IS 'Hash con salt. NUNCA almacenar ni registrar la contrasena en claro.';

CREATE TABLE IF NOT EXISTS inventario.categorias (
    id          BIGSERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_categorias_nombre UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS inventario.productos (
    id              BIGSERIAL PRIMARY KEY,
    codigo          VARCHAR(30)  NOT NULL,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     VARCHAR(500) NULL,
    categoria_id    BIGINT       NOT NULL,
    precio_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
    stock_actual    INTEGER      NOT NULL DEFAULT 0,
    stock_minimo    INTEGER      NOT NULL DEFAULT 0,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_productos_codigo      UNIQUE (codigo),
    CONSTRAINT fk_productos_categoria   FOREIGN KEY (categoria_id) REFERENCES inventario.categorias(id) ON DELETE RESTRICT,
    CONSTRAINT ck_productos_precio      CHECK (precio_unitario >= 0),
    CONSTRAINT ck_productos_stock       CHECK (stock_actual >= 0),
    CONSTRAINT ck_productos_stock_min   CHECK (stock_minimo >= 0)
);

COMMENT ON COLUMN inventario.productos.stock_actual IS 'Stock materializado. Se mantiene dentro de la transaccion de los stored procedures de movimiento.';

CREATE TABLE IF NOT EXISTS inventario.movimientos_inventario (
    id               BIGSERIAL PRIMARY KEY,
    producto_id      BIGINT         NOT NULL,
    tipo             tipo_movimiento NOT NULL,
    cantidad         INTEGER        NOT NULL,
    stock_anterior   INTEGER        NOT NULL,
    stock_resultante INTEGER        NOT NULL,
    precio_unitario  NUMERIC(14,2)  NOT NULL DEFAULT 0,
    motivo           VARCHAR(255)   NULL,
    referencia       VARCHAR(100)   NULL,   -- factura, guia de remision, etc.
    usuario_id       BIGINT         NULL,
    creado_en        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT fk_mov_producto FOREIGN KEY (producto_id) REFERENCES inventario.productos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_mov_usuario  FOREIGN KEY (usuario_id)  REFERENCES inventario.usuarios(id)  ON DELETE SET NULL,
    CONSTRAINT ck_mov_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_mov_stock    CHECK (stock_resultante >= 0)
);

CREATE TABLE IF NOT EXISTS inventario.refresh_tokens (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT      NOT NULL,
    token_hash  VARCHAR(128) NOT NULL,
    expira_en   TIMESTAMPTZ NOT NULL,
    revocado    BOOLEAN     NOT NULL DEFAULT FALSE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_usuario FOREIGN KEY (usuario_id) REFERENCES inventario.usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_productos_categoria      ON inventario.productos (categoria_id);
CREATE INDEX IF NOT EXISTS ix_productos_activo         ON inventario.productos (activo);
CREATE INDEX IF NOT EXISTS ix_productos_stock_bajo     ON inventario.productos (stock_actual) WHERE stock_actual <= stock_minimo;
CREATE INDEX IF NOT EXISTS ix_productos_nombre         ON inventario.productos USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_productos_codigo_trgm     ON inventario.productos USING gin (codigo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_mov_producto_fecha       ON inventario.movimientos_inventario (producto_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS ix_mov_tipo_fecha           ON inventario.movimientos_inventario (tipo, creado_en DESC);
CREATE INDEX IF NOT EXISTS ix_mov_usuario              ON inventario.movimientos_inventario (usuario_id);
CREATE INDEX IF NOT EXISTS ix_mov_fecha                ON inventario.movimientos_inventario (creado_en DESC);
CREATE INDEX IF NOT EXISTS ix_refresh_usuario_activo   ON inventario.refresh_tokens (usuario_id) WHERE revocado = FALSE;
CREATE INDEX IF NOT EXISTS ix_refresh_expiracion       ON inventario.refresh_tokens (expira_en);

CREATE OR REPLACE FUNCTION inventario.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_productos_updated_at ON inventario.productos;
CREATE TRIGGER trg_productos_updated_at
    BEFORE UPDATE ON inventario.productos
    FOR EACH ROW EXECUTE FUNCTION inventario.fn_set_updated_at();

CREATE OR REPLACE FUNCTION inventario.fn_limpiar_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
    v_borrados INTEGER;
BEGIN
    DELETE FROM inventario.refresh_tokens WHERE expira_en < now();
    GET DIAGNOSTICS v_borrados = ROW_COUNT;
    RETURN v_borrados;
END;
$$ LANGUAGE plpgsql;

COMMIT;
