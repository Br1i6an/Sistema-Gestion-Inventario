-- Recreacion completa del schema "inventario".
--   cd database
--   psql -U inventario -h localhost -d inventario_db -f reset.sql

\echo '>>> Eliminando el schema "inventario"...'
DROP SCHEMA IF EXISTS inventario CASCADE;

\echo '>>> Aplicando 01_schema.sql...'
\i 01_schema.sql

\echo '>>> Aplicando 02_stored_procedures.sql...'
\i 02_stored_procedures.sql

\echo '>>> Aplicando 03_seed.sql...'
\i 03_seed.sql

\echo '>>> Reinicio completado.'
