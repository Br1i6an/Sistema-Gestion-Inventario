-- Creacion del rol de aplicacion.
--   psql -U postgres -h localhost -f database/00_crear_base_datos.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'inventario') THEN
        CREATE ROLE inventario LOGIN PASSWORD 'Inventario2026!' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    ELSE
        ALTER ROLE inventario WITH LOGIN PASSWORD 'Inventario2026!';
    END IF;
END
$$;
