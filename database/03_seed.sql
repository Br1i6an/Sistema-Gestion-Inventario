-- Datos de ejemplo.
--   * El script es idempotente: puede ejecutarse varias veces sin duplicar datos.
--   * Las contrasenas se hashean con bcrypt usando pgcrypto, de modo que el seed
--     no depende de ningun hash pre-generado ni de tooling externo.
--   * Los movimientos iniciales forman una cadena coherente: cada movimiento
--     parte del stock resultante del anterior y el stock final del producto
--     coincide con el ultimo movimiento registrado.

SET search_path TO inventario, public;

BEGIN;

INSERT INTO inventario.categorias (nombre, descripcion) VALUES
    ('Almacen',       'Insumos y mercaderia general de almacen'),
    ('Limpieza',      'Productos de limpieza e higiene'),
    ('Seguridad',     'Elementos de seguridad y proteccion personal'),
    ('Oficina',       'Suministros de oficina'),
    ('Electronica',   'Equipos y componentes electronicos')
ON CONFLICT (nombre) DO NOTHING;

-- Los usuarios se dan de alta con el stored procedure: el alta aplica la
-- misma validacion, el mismo hasheado y el mismo control de duplicados que
-- usaria la aplicacion.
DO $$
DECLARE
    v_usuario RECORD;
BEGIN
    FOR v_usuario IN
        SELECT * FROM (VALUES
            ('admin',    'admin@inventario.local',    'Admin123!',    'Administrador del Sistema', 'ADMIN'),
            ('operador', 'operador@inventario.local', 'Operador123!', 'Operador de Almacen',    'OPERADOR'),
            ('lector',  'lector@inventario.local',  'Lector123!',   'Consulta y Reportes',     'LECTURA')
        ) AS t(username, email, password, nombre, rol)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM inventario.usuarios WHERE username = v_usuario.username) THEN
            PERFORM * FROM inventario.sp_registrar_usuario(
                v_usuario.username,
                v_usuario.email,
                crypt(v_usuario.password, gen_salt('bf', 11)),
                v_usuario.nombre,
                v_usuario.rol
            );
        END IF;
    END LOOP;
END $$;

DO $$
DECLARE
    v_admin_id    BIGINT;
    v_operador_id BIGINT;
    v_producto_id BIGINT;
    v_stock       INTEGER;
    v_indice      INTEGER := 0;
    r             RECORD;
BEGIN
    SELECT id INTO v_admin_id    FROM inventario.usuarios WHERE username = 'admin';
    SELECT id INTO v_operador_id FROM inventario.usuarios WHERE username = 'operador';

    FOR r IN
        SELECT * FROM (VALUES
            ('ALM-001', 'Caja de carton 30x40',         'Caja de empaque carton corrugado',            'Almacen',     1250.00, 480, 100),
            ('ALM-002', 'Cinta de empaque 48mm',         'Cinta adhesiva transparente de 100 metros',   'Almacen',      850.50, 260,  80),
            ('ALM-003', 'Bolsa de polipropileno 20L',    'Bolsa para contencion de residuos',           'Almacen',     1450.00,  90,  50),
            ('LIM-001', 'Detergente industrial 5L',      'Detergente concentrado para pisos',           'Limpieza',    8900.00,  64,  20),
            ('LIM-002', 'Papel higienico institucional', 'Bobina de papel para turnos',                  'Limpieza',    3200.00, 180,  60),
            ('LIM-003', 'Desinfectante multiuso',         'Desinfectante de superficies',                'Limpieza',    4750.00,  12,  25),
            ('LIM-004', 'Jabon de manos 1L',              'Jabon liquido antibacterial',                  'Limpieza',    2100.00,   0,  30),
            ('SEG-001', 'Casco de seguridad blanco',      'Casco de proteccion industrial',               'Seguridad',   5600.00,  45,  15),
            ('SEG-002', 'Guantes de nitrilo talla M',     'Guantes de proteccion descartables',          'Seguridad',   7800.00, 220, 100),
            ('SEG-003', 'Chaleco reflectivo',             'Chaleco de alta visibilidad',                  'Seguridad',   4300.00,  38,  20),
            ('SEG-004', 'Arnes de seguridad',             'Arnes de seguridad para trabajo en altura',   'Seguridad',  18500.00,   9,  10),
            ('OFI-001', 'Resma de papel A4 75g',          'Resma de 500 hojas bond',                      'Oficina',     2350.00, 310,  80),
            ('OFI-002', 'Boligrafo punta fina azul',      'Boligrafo retractil',                         'Oficina',      450.00, 640, 200),
            ('OFI-003', 'Toner negro compatible',         'Toner para impresora laser',                  'Oficina',    24500.00,  14,   8),
            ('ELE-001', 'Mouse optico',                   'Mouse inalambrico',                           'Electronica', 6900.00,  55,  20),
            ('ELE-002', 'Teclado mecanico',               'Teclado con iluminacion',                     'Electronica',12900.00,  27,  12),
            ('ELE-003', 'Cable HDMI 2m',                  'Cable para monitor o televisor',               'Electronica', 1950.00, 150,  50),
            ('ELE-004', 'Hub USB 4 puertos',              'Hub USB de escritorio',                        'Electronica', 3200.00,   5,  20)
        ) AS t(codigo, nombre, descripcion, categoria, precio, stock, stock_minimo)
    LOOP
        INSERT INTO inventario.productos
            (codigo, nombre, descripcion, categoria_id, precio_unitario, stock_actual, stock_minimo)
        VALUES (
            r.codigo, r.nombre, r.descripcion,
            (SELECT id FROM inventario.categorias WHERE nombre = r.categoria),
            r.precio, 0, r.stock_minimo)
        ON CONFLICT (codigo) DO NOTHING;

        SELECT id INTO v_producto_id FROM inventario.productos WHERE codigo = r.codigo;

        IF EXISTS (SELECT 1 FROM inventario.movimientos_inventario m WHERE m.producto_id = v_producto_id) THEN
            CONTINUE;
        END IF;

        v_indice := v_indice + 1;
        v_stock  := r.stock;

        IF v_stock > 0 THEN
            INSERT INTO inventario.movimientos_inventario
                (producto_id, tipo, cantidad, stock_anterior, stock_resultante,
                 precio_unitario, motivo, referencia, usuario_id, creado_en)
            VALUES (
                v_producto_id, 'ENTRADA', v_stock, 0, v_stock, r.precio,
                'Stock inicial (carga de datos inicial)', 'DOC-INICIAL', v_admin_id,
                now() - INTERVAL '90 days');
        END IF;

        IF v_indice % 2 = 0 AND v_stock >= 5 THEN
            INSERT INTO inventario.movimientos_inventario
                (producto_id, tipo, cantidad, stock_anterior, stock_resultante,
                 precio_unitario, motivo, referencia, usuario_id, creado_en)
            VALUES (
                v_producto_id, 'SALIDA', 5, v_stock, v_stock - 5, r.precio,
                'Despacho a sucursal', 'DOC-' || LPAD(v_indice::TEXT, 5, '0'), v_operador_id,
                now() - INTERVAL '35 days');
            v_stock := v_stock - 5;
        ELSIF v_stock >= 5 THEN
            INSERT INTO inventario.movimientos_inventario
                (producto_id, tipo, cantidad, stock_anterior, stock_resultante,
                 precio_unitario, motivo, referencia, usuario_id, creado_en)
            VALUES (
                v_producto_id, 'ENTRADA', 5, v_stock, v_stock + 5, r.precio,
                'Recepcion de mercaderia', 'DOC-' || LPAD(v_indice::TEXT, 5, '0'), v_operador_id,
                now() - INTERVAL '35 days');
            v_stock := v_stock + 5;
        END IF;

        IF v_indice % 3 = 0 AND v_stock >= 3 THEN
            INSERT INTO inventario.movimientos_inventario
                (producto_id, tipo, cantidad, stock_anterior, stock_resultante,
                 precio_unitario, motivo, referencia, usuario_id, creado_en)
            VALUES (
                v_producto_id, 'SALIDA', 3, v_stock, v_stock - 3, r.precio,
                'Consumo interno', 'DOC-' || LPAD(v_indice::TEXT, 5, '0'), v_operador_id,
                now() - INTERVAL '5 days');
            v_stock := v_stock - 3;
        ELSIF v_stock > 0 THEN
            INSERT INTO inventario.movimientos_inventario
                (producto_id, tipo, cantidad, stock_anterior, stock_resultante,
                 precio_unitario, motivo, referencia, usuario_id, creado_en)
            VALUES (
                v_producto_id, 'ENTRADA', 2, v_stock, v_stock + 2, r.precio,
                'Devolucion de proveedor', 'DOC-' || LPAD(v_indice::TEXT, 5, '0'), v_admin_id,
                now() - INTERVAL '5 days');
            v_stock := v_stock + 2;
        END IF;

        UPDATE inventario.productos
        SET stock_actual = v_stock
        WHERE id = v_producto_id;
    END LOOP;
END
$$;

COMMIT;

DO $$
DECLARE
    v_productos INTEGER;
    v_movs      INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_productos FROM inventario.productos;
    SELECT COUNT(*) INTO v_movs FROM inventario.movimientos_inventario;
    RAISE NOTICE 'Seed completado: % productos, % movimientos, % usuarios, % categorias.',
        v_productos, v_movs,
        (SELECT COUNT(*) FROM inventario.usuarios),
        (SELECT COUNT(*) FROM inventario.categorias);
END
$$;
