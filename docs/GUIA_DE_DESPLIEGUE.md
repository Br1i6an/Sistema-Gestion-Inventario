# Guía de ejecución

Cómo levantar la aplicación. Son **tres procesos**: la base de datos, la API y el
frontend. Cada uno se arranca en su propia terminal.

> La guía asume que estás en la raíz del proyecto (la carpeta que contiene
> `backend/`, `database/` y `frontend/`).

---

## Requisitos previos

| Herramienta | Versión | Para qué |
|---|---|---|
| .NET SDK | 8 o superior | API |
| Node.js + npm | 20+ / 10+ | Frontend |
| PostgreSQL | 14 o superior | Base de datos |

> Si `psql` no está en el PATH, agregar `C:\Program Files\PostgreSQL\16\bin` a las
> variables de entorno del sistema, o usar la ruta completa a `psql.exe`.

---

## 1. Base de datos

**Terminal 1.** El rol y la base se crean una sola vez, como superusuario:

```bash
psql -U postgres -h localhost -f database/00_crear_base_datos.sql
createdb -U postgres -h localhost -O inventario inventario_db
```

Después, con el rol de la aplicación, el esquema, los procedimientos y los datos de
ejemplo:

```bash
cd database
psql -U inventario -h localhost -d inventario_db -f 01_schema.sql
psql -U inventario -h localhost -d inventario_db -f 02_stored_procedures.sql
psql -U inventario -h localhost -d inventario_db -f 03_seed.sql
```

**Verificar:**

```bash
psql -U inventario -h localhost -d inventario_db -c "SELECT (SELECT COUNT(*) FROM inventario.productos) AS productos, (SELECT COUNT(*) FROM inventario.movimientos_inventario) AS movimientos, (SELECT COUNT(*) FROM inventario.usuarios) AS usuarios;"
```

Se deberían ver **18 productos**, **50 movimientos** y **3 usuarios**.

> Para **recrear la base desde cero** (borra el esquema `inventario` y lo vuelve a
> aplicar con los datos de ejemplo):
> ```bash
> psql -U inventario -h localhost -d inventario_db -f database/reset.sql
> ```

---

## 2. API (backend)

**Terminal 2.**

```bash
cd backend
dotnet restore
dotnet run --project Inventario.API
```

Queda en `http://localhost:5099` · Swagger en `/swagger` · health check en `/health`.

**Verificar:**

```bash
curl http://localhost:5099/health
```

Debe responder `Healthy`.

> También se puede abrir `backend/Inventario.sln` en Visual Studio y pulsar **F5**
> (`Inventario.API` es el primer proyecto de la solución).

---

## 3. Frontend

**Terminal 3.**

```bash
cd frontend
npm install
npm start
```

Queda en `http://localhost:4200`. Abrir esa URL y entrar con `admin` / `Admin123!`.

El servidor de desarrollo usa `frontend/proxy.conf.json` para redirigir `/api` y
`/health` hacia la API, así que **no hay problemas de CORS** y no hay que configurar
ninguna URL.

---

## 4. Verificación integral

Con los tres procesos arriba, en una terminal nueva:

```bash
# la API responde
curl http://localhost:5099/health

# el proxy conecta frontend -> API
curl http://localhost:4200/health
```

Los dos deben responder `Healthy`. Y el frontend se abre en el navegador:
<http://localhost:4200>.

> En **Windows PowerShell**, `curl` es un alias de `Invoke-WebRequest` y puede pedir
> confirmación: usar `curl.exe` o `Invoke-WebRequest http://localhost:5099/health`.

Y las pruebas unitarias:

```bash
cd frontend && npm test              # 204 pruebas (Jest)
cd backend  && dotnet test Inventario.sln   # 21 pruebas (xUnit)
```

---

## 5. Detener todo

En cada terminal, `Ctrl + C`.

PostgreSQL es un **servicio de Windows** y sigue corriendo. Para detenerlo:

```powershell
Stop-Service postgresql-x64-16
```

También hay un atajo que levanta y detiene los tres procesos:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\iniciar.ps1          # levantar
powershell -ExecutionPolicy Bypass -File scripts\iniciar.ps1 -Detener # detener
```

---

## 6. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `psql` no se reconoce | No está en el PATH | Agregar `C:\Program Files\PostgreSQL\16\bin` al PATH |
| `password authentication failed for user "inventario"` | El rol no existe o la contraseña no coincide | Reaplicar `database/00_crear_base_datos.sql` |
| `database "inventario_db" does not exist` | La base no se creó | `createdb -U postgres -h localhost -O inventario inventario_db` |
| La API arranca y da 500 al consultar | El esquema no está aplicado | `psql -U inventario -h localhost -d inventario_db -f database/02_stored_procedures.sql` |
| `Failed to bind to address ... 5099` | Ya hay una instancia de la API corriendo | `powershell -ExecutionPolicy Bypass -File scripts\libera-puerto.ps1` |
| `Port 4200 is already in use` | Quedó un `npm start` anterior | `powershell -ExecutionPolicy Bypass -File scripts\libera-puerto.ps1 -Puerto 4200` |
| Pantalla en blanco o "conexión rechazada" | El frontend no encuentra la API | Verificar que la API esté en `:5099` y que el proxy apunte a ese puerto |

---

## 7. Puertos

| Servicio | Puerto | Dónde se configura |
|---|---|---|
| Frontend | 4200 | `frontend/angular.json` |
| API | 5099 | `backend/Inventario.API/Properties/launchSettings.json` |
| PostgreSQL | 5432 | `backend/Inventario.API/appsettings.json` |
