-- Stored procedures con toda la logica de negocio.
-- Convenciones:
--   * Los procedures de negocio se implementan como FUNCIONES (CREATE FUNCTION)
--     que retornan TABLE(...). Esto permite componerlos en SQL y mapearlos de
--     forma directa con Dapper/Npgsql:
--         SELECT * FROM inventario.sp_registrar_entrada(@p_producto_id, ...);
--   * Cada operacion de escritura:
--       1. Toma un lock de fila (SELECT ... FOR UPDATE) sobre el producto para
--          evitar lost updates bajo concurrencia.
--       2. Valida las reglas de negocio (stock insuficiente, cantidad invalida).
--       3. Actualiza el stock materializado y escribe la bitacora en la MISMA
--          transaccion, de modo que stock y bitacora nunca divergen.
--   * Los errores de negocio se lanzan con EXCEPTION usando codigos SQLSTATE
--     estables, para que la API los mapee a codigos HTTP correctos:
--       P0001  -> error de negocio generico (400)
--       23505  -> violacion de unicidad (409)
--       22023  -> parametro invalido (400)

SET search_path TO inventario, public;

DROP PROCEDURE IF EXISTS inventario.proc_purgar_refresh_tokens();

DROP FUNCTION IF EXISTS inventario.sp_registrar_entrada(BIGINT, INTEGER, NUMERIC, VARCHAR, VARCHAR, BIGINT);
DROP FUNCTION IF EXISTS inventario.sp_registrar_salida(BIGINT, INTEGER, VARCHAR, VARCHAR, BIGINT);
DROP FUNCTION IF EXISTS inventario.sp_registrar_ajuste(BIGINT, INTEGER, VARCHAR, VARCHAR, BIGINT);
DROP FUNCTION IF EXISTS inventario.sp_consultar_inventario_actual(VARCHAR, BIGINT, BOOLEAN, BOOLEAN, VARCHAR, VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS inventario.sp_consultar_movimientos(BIGINT, VARCHAR, VARCHAR, TIMESTAMP, TIMESTAMP, BIGINT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS inventario.sp_resumen_inventario();
DROP FUNCTION IF EXISTS inventario.sp_obtener_producto(BIGINT);
DROP FUNCTION IF EXISTS inventario.sp_crear_producto(VARCHAR, VARCHAR, BIGINT, VARCHAR, NUMERIC, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS inventario.sp_actualizar_producto(BIGINT, VARCHAR, VARCHAR, VARCHAR, BIGINT, NUMERIC, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS inventario.sp_dar_de_baja_producto(BIGINT);
DROP FUNCTION IF EXISTS inventario.sp_listar_categorias();
DROP FUNCTION IF EXISTS inventario.sp_registrar_usuario(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS inventario.sp_obtener_usuario_por_username(VARCHAR);
DROP FUNCTION IF EXISTS inventario.sp_registrar_ultimo_acceso(BIGINT);
DROP FUNCTION IF EXISTS inventario.sp_guardar_refresh_token(BIGINT, VARCHAR, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS inventario.sp_consumir_refresh_token(VARCHAR);
DROP FUNCTION IF EXISTS inventario.sp_revocar_refresh_tokens(BIGINT);


-- SP 1 - Registrar entrada de producto
CREATE OR REPLACE FUNCTION inventario.sp_registrar_entrada(
    p_producto_id      BIGINT,
    p_cantidad         INTEGER,
    p_precio_unitario  NUMERIC(14,2) DEFAULT NULL,
    p_motivo           VARCHAR(255) DEFAULT NULL,
    p_referencia       VARCHAR(100) DEFAULT NULL,
    p_usuario_id       BIGINT        DEFAULT NULL
)
RETURNS TABLE (
    movimiento_id      BIGINT,
    producto_id        BIGINT,
    producto_codigo    VARCHAR,
    producto_nombre    VARCHAR,
    tipo               VARCHAR,
    cantidad           INTEGER,
    stock_anterior     INTEGER,
    stock_resultante   INTEGER,
    precio_unitario    NUMERIC,
    valor_total        NUMERIC,
    motivo             VARCHAR,
    referencia         VARCHAR,
    usuario_id         BIGINT,
    creado_en          TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_producto        RECORD;
    v_stock_anterior  INTEGER;
    v_stock_nuevo     INTEGER;
    v_precio          NUMERIC(14,2);
    v_movimiento_id   BIGINT;
    v_creado_en       TIMESTAMPTZ := now();
BEGIN
    IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
        RAISE EXCEPTION '[CANTIDAD_INVALIDA] La cantidad debe ser mayor a cero. Recibido: %', p_cantidad
            USING ERRCODE = '22023';
    END IF;

    SELECT pr.* INTO v_producto
    FROM inventario.productos pr
    WHERE pr.id = p_producto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION '[PRODUCTO_NO_ENCONTRADO] El producto con id % no existe.', p_producto_id
            USING ERRCODE = 'P0001';
    END IF;

    IF NOT v_producto.activo THEN
        RAISE EXCEPTION '[PRODUCTO_INACTIVO] El producto % (%) esta inactivo y no admite movimientos.', v_producto.codigo, v_producto.nombre
            USING ERRCODE = 'P0001';
    END IF;

    v_stock_anterior := v_producto.stock_actual;
    v_stock_nuevo    := v_stock_anterior + p_cantidad;
    v_precio         := COALESCE(p_precio_unitario, v_producto.precio_unitario);

    UPDATE inventario.productos pr
    SET stock_actual = v_stock_nuevo
    WHERE pr.id = p_producto_id;

    INSERT INTO inventario.movimientos_inventario AS m (
        producto_id, tipo, cantidad, stock_anterior, stock_resultante,
        precio_unitario, motivo, referencia, usuario_id, creado_en
    )
    VALUES (
        p_producto_id, 'ENTRADA', p_cantidad, v_stock_anterior, v_stock_nuevo,
        v_precio, p_motivo, p_referencia, p_usuario_id, v_creado_en
    )
    RETURNING m.id INTO v_movimiento_id;

    RETURN QUERY SELECT
        v_movimiento_id, v_producto.id, v_producto.codigo, v_producto.nombre,
        'ENTRADA'::VARCHAR, p_cantidad, v_stock_anterior, v_stock_nuevo,
        v_precio, ROUND(v_precio * p_cantidad, 2), p_motivo, p_referencia,
        p_usuario_id, v_creado_en;
END;
$$;

COMMENT ON FUNCTION inventario.sp_registrar_entrada IS 'Registra una entrada de stock: incrementa inventario y escribe bitacora en la misma transaccion.';

-- SP 2 - Registrar salida de producto
CREATE OR REPLACE FUNCTION inventario.sp_registrar_salida(
    p_producto_id      BIGINT,
    p_cantidad         INTEGER,
    p_motivo           VARCHAR(255) DEFAULT NULL,
    p_referencia       VARCHAR(100) DEFAULT NULL,
    p_usuario_id       BIGINT        DEFAULT NULL
)
RETURNS TABLE (
    movimiento_id      BIGINT,
    producto_id        BIGINT,
    producto_codigo    VARCHAR,
    producto_nombre    VARCHAR,
    tipo               VARCHAR,
    cantidad           INTEGER,
    stock_anterior     INTEGER,
    stock_resultante   INTEGER,
    precio_unitario    NUMERIC,
    valor_total        NUMERIC,
    motivo             VARCHAR,
    referencia         VARCHAR,
    usuario_id         BIGINT,
    creado_en          TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_producto        RECORD;
    v_stock_anterior  INTEGER;
    v_stock_nuevo     INTEGER;
    v_movimiento_id   BIGINT;
    v_creado_en       TIMESTAMPTZ := now();
BEGIN
    IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
        RAISE EXCEPTION '[CANTIDAD_INVALIDA] La cantidad debe ser mayor a cero. Recibido: %', p_cantidad
            USING ERRCODE = '22023';
    END IF;

    SELECT pr.* INTO v_producto
    FROM inventario.productos pr
    WHERE pr.id = p_producto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION '[PRODUCTO_NO_ENCONTRADO] El producto con id % no existe.', p_producto_id
            USING ERRCODE = 'P0001';
    END IF;

    IF NOT v_producto.activo THEN
        RAISE EXCEPTION '[PRODUCTO_INACTIVO] El producto % (%) esta inactivo y no admite movimientos.', v_producto.codigo, v_producto.nombre
            USING ERRCODE = 'P0001';
    END IF;

    v_stock_anterior := v_producto.stock_actual;

    IF v_stock_anterior < p_cantidad THEN
        RAISE EXCEPTION '[STOCK_INSUFICIENTE] El producto % (%) tiene % unidad(es) en stock y se intentan retirar %.',
            v_producto.codigo, v_producto.nombre, v_stock_anterior, p_cantidad
            USING ERRCODE = 'P0001';
    END IF;

    v_stock_nuevo := v_stock_anterior - p_cantidad;

    UPDATE inventario.productos pr
    SET stock_actual = v_stock_nuevo
    WHERE pr.id = p_producto_id;

    INSERT INTO inventario.movimientos_inventario AS m (
        producto_id, tipo, cantidad, stock_anterior, stock_resultante,
        precio_unitario, motivo, referencia, usuario_id, creado_en
    )
    VALUES (
        p_producto_id, 'SALIDA', p_cantidad, v_stock_anterior, v_stock_nuevo,
        v_producto.precio_unitario, p_motivo, p_referencia, p_usuario_id, v_creado_en
    )
    RETURNING m.id INTO v_movimiento_id;

    RETURN QUERY SELECT
        v_movimiento_id, v_producto.id, v_producto.codigo, v_producto.nombre,
        'SALIDA'::VARCHAR, p_cantidad, v_stock_anterior, v_stock_nuevo,
        v_producto.precio_unitario, ROUND(v_producto.precio_unitario * p_cantidad, 2),
        p_motivo, p_referencia, p_usuario_id, v_creado_en;
END;
$$;

COMMENT ON FUNCTION inventario.sp_registrar_salida IS 'Registra una salida de stock: valida disponibilidad y descuenta en la misma transaccion.';

-- SP 3 - Registrar ajuste de inventario (conteo fisico)
CREATE OR REPLACE FUNCTION inventario.sp_registrar_ajuste(
    p_producto_id      BIGINT,
    p_stock_final      INTEGER,
    p_motivo           VARCHAR(255) DEFAULT NULL,
    p_referencia       VARCHAR(100) DEFAULT NULL,
    p_usuario_id       BIGINT        DEFAULT NULL
)
RETURNS TABLE (
    movimiento_id      BIGINT,
    producto_id        BIGINT,
    producto_codigo    VARCHAR,
    producto_nombre    VARCHAR,
    tipo               VARCHAR,
    cantidad           INTEGER,
    stock_anterior     INTEGER,
    stock_resultante   INTEGER,
    precio_unitario    NUMERIC,
    valor_total        NUMERIC,
    motivo             VARCHAR,
    referencia         VARCHAR,
    usuario_id         BIGINT,
    creado_en          TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_producto        RECORD;
    v_stock_anterior  INTEGER;
    v_diferencia      INTEGER;
    v_tipo            tipo_movimiento;
    v_movimiento_id   BIGINT;
    v_creado_en       TIMESTAMPTZ := now();
BEGIN
    IF p_stock_final IS NULL OR p_stock_final < 0 THEN
        RAISE EXCEPTION '[STOCK_INVALIDO] El stock final no puede ser negativo. Recibido: %', p_stock_final
            USING ERRCODE = '22023';
    END IF;

    SELECT pr.* INTO v_producto
    FROM inventario.productos pr
    WHERE pr.id = p_producto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION '[PRODUCTO_NO_ENCONTRADO] El producto con id % no existe.', p_producto_id
            USING ERRCODE = 'P0001';
    END IF;

    v_stock_anterior := v_producto.stock_actual;
    v_diferencia     := p_stock_final - v_stock_anterior;

    IF v_diferencia = 0 THEN
        RAISE EXCEPTION '[AJUSTE_SIN_CAMBIO] El stock solicitado (%) coincide con el stock actual; no hay ajuste que registrar.', p_stock_final
            USING ERRCODE = 'P0001';
    END IF;

    v_tipo := CASE WHEN v_diferencia > 0 THEN 'AJUSTE_POSITIVO'::tipo_movimiento
                   ELSE 'AJUSTE_NEGATIVO'::tipo_movimiento END;

    UPDATE inventario.productos pr
    SET stock_actual = p_stock_final
    WHERE pr.id = p_producto_id;

    INSERT INTO inventario.movimientos_inventario AS m (
        producto_id, tipo, cantidad, stock_anterior, stock_resultante,
        precio_unitario, motivo, referencia, usuario_id, creado_en
    )
    VALUES (
        p_producto_id, v_tipo, ABS(v_diferencia), v_stock_anterior, p_stock_final,
        v_producto.precio_unitario, p_motivo, p_referencia, p_usuario_id, v_creado_en
    )
    RETURNING m.id INTO v_movimiento_id;

    RETURN QUERY SELECT
        v_movimiento_id, v_producto.id, v_producto.codigo, v_producto.nombre,
        v_tipo::VARCHAR, ABS(v_diferencia), v_stock_anterior, p_stock_final,
        v_producto.precio_unitario, ROUND(v_producto.precio_unitario * ABS(v_diferencia), 2),
        p_motivo, p_referencia, p_usuario_id, v_creado_en;
END;
$$;

COMMENT ON FUNCTION inventario.sp_registrar_ajuste IS 'Ajusta el stock a un valor absoluto (conteo fisico) dejando auditoria del delta.';

-- SP 4 - Consultar estado actual del inventario
CREATE OR REPLACE FUNCTION inventario.sp_consultar_inventario_actual(
    p_busqueda         VARCHAR(150) DEFAULT NULL,
    p_categoria_id     BIGINT       DEFAULT NULL,
    p_solo_bajo_stock  BOOLEAN      DEFAULT FALSE,
    p_solo_activos     BOOLEAN      DEFAULT TRUE,
    p_orden_por        VARCHAR(30)  DEFAULT 'nombre',
    p_dir_orden        VARCHAR(4)   DEFAULT 'ASC',
    p_pagina           INTEGER      DEFAULT 1,
    p_tamano           INTEGER      DEFAULT 20
)
RETURNS TABLE (
    id                 BIGINT,
    codigo             VARCHAR,
    nombre             VARCHAR,
    descripcion        VARCHAR,
    categoria_id       BIGINT,
    categoria_nombre   VARCHAR,
    precio_unitario    NUMERIC,
    stock_actual       INTEGER,
    stock_minimo       INTEGER,
    stock_faltante     INTEGER,
    estado_stock       VARCHAR,
    valor_total        NUMERIC,
    activo             BOOLEAN,
    actualizado_en     TIMESTAMPTZ,
    total_registros    BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH filtrado AS (
        SELECT
            p.id, p.codigo, p.nombre, p.descripcion, p.categoria_id,
            c.nombre AS categoria_nombre, p.precio_unitario, p.stock_actual,
            p.stock_minimo, p.activo, p.actualizado_en
        FROM inventario.productos p
        JOIN inventario.categorias c ON c.id = p.categoria_id
        WHERE (p_busqueda IS NULL OR p_busqueda = '' OR
               p.nombre ILIKE '%' || p_busqueda || '%' OR
               p.codigo ILIKE '%' || p_busqueda || '%')
          AND (p_categoria_id IS NULL OR p.categoria_id = p_categoria_id)
          AND (NOT p_solo_activos OR p.activo)
          AND (NOT p_solo_bajo_stock OR p.stock_actual <= p.stock_minimo)
    ),
    ordenado AS (
        SELECT f.*,
               GREATEST(f.stock_minimo - f.stock_actual, 0) AS stock_faltante,
               CASE
                   WHEN f.stock_actual = 0 THEN 'AGOTADO'
                   WHEN f.stock_actual <= f.stock_minimo THEN 'BAJO'
                   ELSE 'NORMAL'
               END::VARCHAR AS estado_stock,
               ROUND(f.precio_unitario * f.stock_actual, 2) AS valor_total,
               CASE p_orden_por
                   WHEN 'codigo'    THEN f.codigo
                   WHEN 'categoria' THEN f.categoria_nombre
                   ELSE f.nombre
               END AS orden_texto,
               CASE p_orden_por
                   WHEN 'stock'  THEN f.stock_actual::NUMERIC
                   WHEN 'precio' THEN f.precio_unitario
                   WHEN 'valor'  THEN ROUND(f.precio_unitario * f.stock_actual, 2)
                   ELSE NULL
               END AS orden_numero
        FROM filtrado f
    )
    SELECT
        o.id, o.codigo, o.nombre, o.descripcion, o.categoria_id, o.categoria_nombre,
        o.precio_unitario, o.stock_actual, o.stock_minimo, o.stock_faltante,
        o.estado_stock, o.valor_total, o.activo, o.actualizado_en,
        (SELECT COUNT(*) FROM ordenado) AS total_registros
    FROM ordenado o
    ORDER BY
        (CASE WHEN p_orden_por IN ('nombre','codigo','categoria') AND UPPER(p_dir_orden) = 'ASC'
              THEN o.orden_texto END) NULLS LAST,
        (CASE WHEN p_orden_por IN ('nombre','codigo','categoria') AND UPPER(p_dir_orden) = 'DESC'
              THEN o.orden_texto END) NULLS LAST,
        (CASE WHEN p_orden_por IN ('stock','precio','valor') AND UPPER(p_dir_orden) = 'ASC'
              THEN o.orden_numero END) NULLS LAST,
        (CASE WHEN p_orden_por IN ('stock','precio','valor') AND UPPER(p_dir_orden) = 'DESC'
              THEN -o.orden_numero END) NULLS LAST,
        o.nombre ASC
    LIMIT GREATEST(p_tamano, 1)
    OFFSET GREATEST(p_pagina - 1, 0) * GREATEST(p_tamano, 1);
END;
$$;

COMMENT ON FUNCTION inventario.sp_consultar_inventario_actual IS 'Estado actual del inventario con filtros, ordenamiento, paginacion y clasificacion de stock.';

-- SP 5 - Consultar historial de movimientos
CREATE OR REPLACE FUNCTION inventario.sp_consultar_movimientos(
    p_producto_id      BIGINT       DEFAULT NULL,
    p_tipo             VARCHAR(20)  DEFAULT NULL,
    p_busqueda         VARCHAR(150) DEFAULT NULL,
    p_desde            TIMESTAMP    DEFAULT NULL,
    p_hasta            TIMESTAMP    DEFAULT NULL,
    p_usuario_id       BIGINT       DEFAULT NULL,
    p_pagina           INTEGER      DEFAULT 1,
    p_tamano           INTEGER      DEFAULT 20
)
RETURNS TABLE (
    movimiento_id      BIGINT,
    producto_id        BIGINT,
    producto_codigo    VARCHAR,
    producto_nombre    VARCHAR,
    tipo               VARCHAR,
    cantidad           INTEGER,
    stock_anterior     INTEGER,
    stock_resultante   INTEGER,
    precio_unitario    NUMERIC,
    valor_total        NUMERIC,
    motivo             VARCHAR,
    referencia         VARCHAR,
    usuario_id         BIGINT,
    usuario_nombre     VARCHAR,
    creado_en          TIMESTAMPTZ,
    total_registros    BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH filtrado AS (
        SELECT m.id, m.producto_id, m.tipo, m.cantidad, m.stock_anterior,
               m.stock_resultante, m.precio_unitario, m.motivo, m.referencia,
               m.usuario_id, m.creado_en, p.codigo, p.nombre, u.nombre_completo
        FROM inventario.movimientos_inventario m
        JOIN inventario.productos p ON p.id = m.producto_id
        LEFT JOIN inventario.usuarios u ON u.id = m.usuario_id
        WHERE (p_producto_id IS NULL OR m.producto_id = p_producto_id)
          AND (p_tipo IS NULL OR m.tipo::VARCHAR = p_tipo)
          AND (p_usuario_id IS NULL OR m.usuario_id = p_usuario_id)
          AND (p_desde IS NULL OR m.creado_en::DATE >= p_desde::DATE)
          AND (p_hasta IS NULL OR m.creado_en::DATE <= p_hasta::DATE)
          AND (p_busqueda IS NULL OR p_busqueda = '' OR
               p.nombre ILIKE '%' || p_busqueda || '%' OR
               p.codigo ILIKE '%' || p_busqueda || '%' OR
               m.referencia ILIKE '%' || p_busqueda || '%')
    )
    SELECT
        f.id AS movimiento_id, f.producto_id, f.codigo, f.nombre, f.tipo::VARCHAR, f.cantidad,
        f.stock_anterior, f.stock_resultante, f.precio_unitario,
        ROUND(f.precio_unitario * f.cantidad, 2) AS valor_total,
        f.motivo, f.referencia, f.usuario_id, f.nombre_completo, f.creado_en,
        (SELECT COUNT(*) FROM filtrado) AS total_registros
    FROM filtrado f
    ORDER BY f.creado_en DESC, f.id DESC
    LIMIT GREATEST(p_tamano, 1)
    OFFSET GREATEST(p_pagina - 1, 0) * GREATEST(p_tamano, 1);
END;
$$;

COMMENT ON FUNCTION inventario.sp_consultar_movimientos IS 'Historial de movimientos con filtros por producto, tipo, fecha, usuario y texto libre.';

-- SP 6 - Resumen / KPIs para el dashboard
CREATE OR REPLACE FUNCTION inventario.sp_resumen_inventario()
RETURNS TABLE (
    total_productos        BIGINT,
    productos_activos      BIGINT,
    productos_agotados    BIGINT,
    productos_stock_bajo  BIGINT,
    total_unidades         NUMERIC,
    valor_inventario       NUMERIC,
    entradas_ultimo_mes    BIGINT,
    salidas_ultimo_mes     BIGINT,
    movimientos_total      BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM inventario.productos WHERE activo),
        (SELECT COUNT(*) FROM inventario.productos WHERE activo),
        (SELECT COUNT(*) FROM inventario.productos WHERE activo AND stock_actual = 0),
        (SELECT COUNT(*) FROM inventario.productos WHERE activo AND stock_actual > 0 AND stock_actual <= stock_minimo),
        (SELECT COALESCE(SUM(stock_actual), 0)::NUMERIC FROM inventario.productos WHERE activo),
        (SELECT COALESCE(ROUND(SUM(precio_unitario * stock_actual), 2), 0)::NUMERIC FROM inventario.productos WHERE activo),
        (SELECT COUNT(*) FROM inventario.movimientos_inventario WHERE tipo = 'ENTRADA'  AND creado_en >= date_trunc('month', now())),
        (SELECT COUNT(*) FROM inventario.movimientos_inventario WHERE tipo = 'SALIDA'   AND creado_en >= date_trunc('month', now())),
        (SELECT COUNT(*) FROM inventario.movimientos_inventario);
END;
$$;

COMMENT ON FUNCTION inventario.sp_resumen_inventario IS 'KPIs globales del inventario para el dashboard principal.';

-- SP 7 - Crear producto
CREATE OR REPLACE FUNCTION inventario.sp_crear_producto(
    p_codigo         VARCHAR(30),
    p_nombre         VARCHAR(150),
    p_categoria_id   BIGINT,
    p_descripcion    VARCHAR(500) DEFAULT NULL,
    p_precio_unitario NUMERIC(14,2) DEFAULT 0,
    p_stock_inicial  INTEGER DEFAULT 0,
    p_stock_minimo   INTEGER DEFAULT 0
)
RETURNS TABLE (
    id                 BIGINT,
    codigo             VARCHAR,
    nombre             VARCHAR,
    descripcion        VARCHAR,
    categoria_id       BIGINT,
    categoria_nombre   VARCHAR,
    precio_unitario    NUMERIC,
    stock_actual       INTEGER,
    stock_minimo       INTEGER,
    estado_stock       VARCHAR,
    valor_total        NUMERIC,
    activo             BOOLEAN,
    creado_en          TIMESTAMPTZ,
    actualizado_en     TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_id          BIGINT;
    v_categoria   VARCHAR;
    v_stock       INTEGER;
BEGIN
    IF p_codigo IS NULL OR btrim(p_codigo) = '' THEN
        RAISE EXCEPTION '[CODIGO_REQUERIDO] El codigo del producto es obligatorio.' USING ERRCODE = '22023';
    END IF;

    IF p_nombre IS NULL OR btrim(p_nombre) = '' THEN
        RAISE EXCEPTION '[NOMBRE_REQUERIDO] El nombre del producto es obligatorio.' USING ERRCODE = '22023';
    END IF;

    IF p_stock_inicial < 0 OR p_stock_minimo < 0 THEN
        RAISE EXCEPTION '[STOCK_NEGATIVO] Las cantidades de stock no pueden ser negativas.' USING ERRCODE = '22023';
    END IF;

    SELECT c.nombre INTO v_categoria
    FROM inventario.categorias c
    WHERE c.id = p_categoria_id;

    IF v_categoria IS NULL THEN
        RAISE EXCEPTION '[CATEGORIA_NO_ENCONTRADA] La categoria con id % no existe.', p_categoria_id
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO inventario.productos AS pr (
        codigo, nombre, descripcion, categoria_id, precio_unitario, stock_actual, stock_minimo
    )
    VALUES (
        UPPER(btrim(p_codigo)), btrim(p_nombre), p_descripcion, p_categoria_id,
        COALESCE(p_precio_unitario, 0), COALESCE(p_stock_inicial, 0), COALESCE(p_stock_minimo, 0)
    )
    RETURNING pr.id INTO v_id;

    IF COALESCE(p_stock_inicial, 0) > 0 THEN
        INSERT INTO inventario.movimientos_inventario (
            producto_id, tipo, cantidad, stock_anterior, stock_resultante,
            precio_unitario, motivo, referencia, usuario_id
        )
        VALUES (
            v_id, 'ENTRADA', p_stock_inicial, 0, p_stock_inicial,
            COALESCE(p_precio_unitario, 0), 'Stock inicial (alta de producto)', NULL, NULL
        );
    END IF;

    v_stock := COALESCE(p_stock_inicial, 0);

    RETURN QUERY SELECT
        v_id, UPPER(btrim(p_codigo))::VARCHAR, btrim(p_nombre)::VARCHAR, p_descripcion, p_categoria_id,
        v_categoria, COALESCE(p_precio_unitario, 0), v_stock, COALESCE(p_stock_minimo, 0),
        CASE WHEN v_stock = 0 THEN 'AGOTADO'
             WHEN v_stock <= COALESCE(p_stock_minimo, 0) THEN 'BAJO'
             ELSE 'NORMAL' END::VARCHAR,
        ROUND(COALESCE(p_precio_unitario, 0) * v_stock, 2),
        TRUE, now(), now();
END;
$$;

-- SP 8 - Obtener un producto por id
CREATE OR REPLACE FUNCTION inventario.sp_obtener_producto(p_producto_id BIGINT)
RETURNS TABLE (
    id                 BIGINT,
    codigo             VARCHAR,
    nombre             VARCHAR,
    descripcion        VARCHAR,
    categoria_id       BIGINT,
    categoria_nombre   VARCHAR,
    precio_unitario    NUMERIC,
    stock_actual       INTEGER,
    stock_minimo       INTEGER,
    estado_stock       VARCHAR,
    valor_total        NUMERIC,
    activo             BOOLEAN,
    creado_en          TIMESTAMPTZ,
    actualizado_en     TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id, p.codigo, p.nombre, p.descripcion, p.categoria_id, c.nombre,
        p.precio_unitario, p.stock_actual, p.stock_minimo,
        CASE WHEN p.stock_actual = 0 THEN 'AGOTADO'
             WHEN p.stock_actual <= p.stock_minimo THEN 'BAJO'
             ELSE 'NORMAL' END::VARCHAR,
        ROUND(p.precio_unitario * p.stock_actual, 2),
        p.activo, p.creado_en, p.actualizado_en
    FROM inventario.productos p
    JOIN inventario.categorias c ON c.id = p.categoria_id
    WHERE p.id = p_producto_id;
END;
$$;

-- SP 9 - Actualizar producto
CREATE OR REPLACE FUNCTION inventario.sp_actualizar_producto(
    p_producto_id       BIGINT,
    p_codigo            VARCHAR(30)  DEFAULT NULL,
    p_nombre            VARCHAR(150) DEFAULT NULL,
    p_descripcion       VARCHAR(500) DEFAULT NULL,
    p_categoria_id      BIGINT       DEFAULT NULL,
    p_precio_unitario   NUMERIC(14,2) DEFAULT NULL,
    p_stock_minimo      INTEGER      DEFAULT NULL,
    p_activo            BOOLEAN      DEFAULT NULL
)
RETURNS TABLE (
    id                 BIGINT,
    codigo             VARCHAR,
    nombre             VARCHAR,
    descripcion        VARCHAR,
    categoria_id       BIGINT,
    categoria_nombre   VARCHAR,
    precio_unitario    NUMERIC,
    stock_actual       INTEGER,
    stock_minimo       INTEGER,
    estado_stock       VARCHAR,
    valor_total        NUMERIC,
    activo             BOOLEAN,
    creado_en          TIMESTAMPTZ,
    actualizado_en     TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_actual   RECORD;
    v_categoria VARCHAR;
BEGIN
    SELECT pr.* INTO v_actual
    FROM inventario.productos pr
    WHERE pr.id = p_producto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION '[PRODUCTO_NO_ENCONTRADO] El producto con id % no existe.', p_producto_id
            USING ERRCODE = 'P0001';
    END IF;

    IF p_categoria_id IS NOT NULL THEN
        SELECT c.nombre INTO v_categoria FROM inventario.categorias c WHERE c.id = p_categoria_id;
        IF v_categoria IS NULL THEN
            RAISE EXCEPTION '[CATEGORIA_NO_ENCONTRADA] La categoria con id % no existe.', p_categoria_id
                USING ERRCODE = 'P0001';
        END IF;
    ELSE
        v_categoria := (SELECT c.nombre FROM inventario.categorias c WHERE c.id = v_actual.categoria_id);
    END IF;

    UPDATE inventario.productos pr
    SET codigo           = COALESCE(UPPER(btrim(p_codigo)), v_actual.codigo),
        nombre           = COALESCE(btrim(p_nombre), v_actual.nombre),
        descripcion      = COALESCE(p_descripcion, v_actual.descripcion),
        categoria_id     = COALESCE(p_categoria_id, v_actual.categoria_id),
        precio_unitario  = COALESCE(p_precio_unitario, v_actual.precio_unitario),
        stock_minimo     = COALESCE(p_stock_minimo, v_actual.stock_minimo),
        activo           = COALESCE(p_activo, v_actual.activo)
    WHERE pr.id = p_producto_id;

    RETURN QUERY
    SELECT
        p.id, p.codigo, p.nombre, p.descripcion, p.categoria_id, v_categoria,
        p.precio_unitario, p.stock_actual, p.stock_minimo,
        CASE WHEN p.stock_actual = 0 THEN 'AGOTADO'
             WHEN p.stock_actual <= p.stock_minimo THEN 'BAJO'
             ELSE 'NORMAL' END::VARCHAR,
        ROUND(p.precio_unitario * p.stock_actual, 2),
        p.activo, p.creado_en, p.actualizado_en
    FROM inventario.productos p
    WHERE p.id = p_producto_id;
END;
$$;

-- SP 10 - Listar categorias
CREATE OR REPLACE FUNCTION inventario.sp_listar_categorias()
RETURNS TABLE (
    id                BIGINT,
    nombre            VARCHAR,
    descripcion       VARCHAR,
    total_productos   BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.nombre, c.descripcion,
           (SELECT COUNT(*) FROM inventario.productos p WHERE p.categoria_id = c.id AND p.activo)
    FROM inventario.categorias c
    ORDER BY c.nombre;
END;
$$;

-- SP 11 - Baja logica de producto
CREATE OR REPLACE FUNCTION inventario.sp_dar_de_baja_producto(p_producto_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE inventario.productos pr
    SET activo = FALSE
    WHERE pr.id = p_producto_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION '[PRODUCTO_NO_ENCONTRADO] El producto con id % no existe.', p_producto_id
            USING ERRCODE = 'P0001';
    END IF;
    RETURN TRUE;
END;
$$;

-- SP 12 - Registrar usuario
CREATE OR REPLACE FUNCTION inventario.sp_registrar_usuario(
    p_username        VARCHAR(50),
    p_email           VARCHAR(150),
    p_password_hash   VARCHAR(255),
    p_nombre_completo VARCHAR(150),
    p_rol             VARCHAR(20) DEFAULT 'OPERADOR'
)
RETURNS TABLE (
    id              BIGINT,
    username        VARCHAR,
    email           VARCHAR,
    nombre_completo VARCHAR,
    rol             VARCHAR,
    activo          BOOLEAN,
    creado_en       TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_id BIGINT;
BEGIN
    INSERT INTO inventario.usuarios AS u (username, email, password_hash, nombre_completo, rol)
    VALUES (
        LOWER(btrim(p_username)), LOWER(btrim(p_email)), p_password_hash,
        btrim(p_nombre_completo),
        CASE WHEN p_rol IN ('ADMIN','OPERADOR','LECTURA') THEN p_rol::rol_usuario ELSE 'OPERADOR'::rol_usuario END
    )
    RETURNING u.id INTO v_id;

    RETURN QUERY SELECT u.id, u.username, u.email, u.nombre_completo, u.rol::VARCHAR, u.activo, u.creado_en
    FROM inventario.usuarios u WHERE u.id = v_id;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION '[USUARIO_DUPLICADO] El username o email ya estan registrados.' USING ERRCODE = '23505';
END;
$$;

-- SP 13 - Obtener usuario por nombre
CREATE OR REPLACE FUNCTION inventario.sp_obtener_usuario_por_username(p_username VARCHAR(50))
RETURNS TABLE (
    id              BIGINT,
    username        VARCHAR,
    email           VARCHAR,
    password_hash   VARCHAR,
    nombre_completo VARCHAR,
    rol             VARCHAR,
    activo          BOOLEAN,
    ultimo_acceso   TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.username, u.email, u.password_hash, u.nombre_completo,
           u.rol::VARCHAR, u.activo, u.ultimo_acceso
    FROM inventario.usuarios u
    WHERE u.username = LOWER(btrim(p_username));
END;
$$;

-- SP 14 - Registrar ultimo acceso
CREATE OR REPLACE FUNCTION inventario.sp_registrar_ultimo_acceso(p_usuario_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE inventario.usuarios SET ultimo_acceso = now() WHERE id = p_usuario_id;
END;
$$;

-- SP 15 - Guardar refresh token
CREATE OR REPLACE FUNCTION inventario.sp_guardar_refresh_token(
    p_usuario_id BIGINT,
    p_token_hash VARCHAR(128),
    p_expira_en   TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO inventario.refresh_tokens (usuario_id, token_hash, expira_en)
    VALUES (p_usuario_id, p_token_hash, p_expira_en);
END;
$$;

-- SP 16 - Consumir (revocar) refresh token
CREATE OR REPLACE FUNCTION inventario.sp_consumir_refresh_token(p_token_hash VARCHAR(128))
RETURNS TABLE (
    id          BIGINT,
    usuario_id  BIGINT,
    expira_en   TIMESTAMPTZ,
    revocado    BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE inventario.refresh_tokens rt
    SET revocado = TRUE
    WHERE rt.token_hash = p_token_hash AND rt.revocado = FALSE AND rt.expira_en > now()
    RETURNING rt.id, rt.usuario_id, rt.expira_en, rt.revocado;
END;
$$;

-- SP 17 - Revocar todos los refresh tokens del usuario
CREATE OR REPLACE FUNCTION inventario.sp_revocar_refresh_tokens(p_usuario_id BIGINT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_borrados INTEGER;
BEGIN
    UPDATE inventario.refresh_tokens SET revocado = TRUE WHERE usuario_id = p_usuario_id AND revocado = FALSE;
    GET DIAGNOSTICS v_borrados = ROW_COUNT;
    RETURN v_borrados;
END;
$$;

-- SP 18 - Purgar refresh tokens expirados
CREATE OR REPLACE PROCEDURE inventario.proc_purgar_refresh_tokens()
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM inventario.refresh_tokens WHERE expira_en < now();
END;
$$;

COMMENT ON PROCEDURE inventario.proc_purgar_refresh_tokens IS 'Elimina refresh tokens expirados. Invocar con: CALL inventario.proc_purgar_refresh_tokens();';
