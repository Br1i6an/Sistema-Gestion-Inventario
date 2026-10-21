#  Script de arranque/parada del MiniSistema de Gestion de Inventario
#
#  Uso (desde la raiz del proyecto):
#      powershell -ExecutionPolicy Bypass -File scripts\iniciar.ps1
#      powershell -ExecutionPolicy Bypass -File scripts\iniciar.ps1 -Detener
#
#  Inicia en orden:
#    1. PostgreSQL (si el servicio de Windows esta detenido)
#    2. La API REST      -> http://localhost:5099  (Swagger en /swagger)
#    3. El frontend      -> http://localhost:4200

param(
    [switch]$Detener,
    [switch]$SoloApi,
    [switch]$SoloFrontend
)

$ErrorActionPreference = 'Stop'
$Raiz = Split-Path -Parent $PSScriptRoot

function Info($mensaje) { Write-Host $mensaje -ForegroundColor Cyan }
function Ok($mensaje)   { Write-Host $mensaje -ForegroundColor Green }
function Aviso($mensaje) { Write-Host $mensaje -ForegroundColor Yellow }


#  Detener

if ($Detener) {
    Info "Deteniendo la aplicacion..."

    Get-Process -Name 'Inventario.API' -ErrorAction SilentlyContinue |
        Stop-Process -Force -ErrorAction SilentlyContinue

    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like '*angular*' -or $_.CommandLine -like '*ng serve*' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

    Ok "API y frontend detenidos."
    exit 0
}


#  0. Liberar puertos (evita el error "port 4200 is already in use")

function Liberar-Puerto([int]$Puerto) {
    $conexiones = @()
    try {
        $conexiones = Get-NetTCPConnection -LocalPort $Puerto -State Listen -ErrorAction Stop
    } catch {
        $lineas = netstat -ano | Select-String ":$Puerto\s+.*LISTENING"
        $conexiones = $lineas | ForEach-Object {
            $partes = ($_ -split '\s+') | Where-Object { $_ -ne '' }
            [pscustomobject]@{ OwningProcess = [int]$partes[-1] }
        }
    }

    if (-not $conexiones -or $conexiones.Count -eq 0) { return }

    foreach ($processId in ($conexiones.OwningProcess | Sort-Object -Unique)) {
        if ($processId -eq 0) { continue }
        $proceso = Get-Process -Id $processId -ErrorAction SilentlyContinue
        $nombre = if ($proceso) { $proceso.ProcessName } else { 'desconocido' }
        Info "  Liberando puerto $Puerto (deteniendo '$nombre', PID $processId)..."
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}

if (-not $SoloApi -and -not $SoloFrontend) {
    Info "Comprobando puertos..."
    Liberar-Puerto 5099
    Liberar-Puerto 4200
    Ok "Puertos 5099 y 4200 libres."
}


#  1. PostgreSQL

if (-not $SoloApi -and -not $SoloFrontend) {
    $servicio = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1

    if ($servicio -and $servicio.Status -ne 'Running') {
        Info "Iniciando el servicio de PostgreSQL..."
        Start-Service -Name $servicio.Name
        Start-Sleep -Seconds 3
    }

    if ($servicio) {
        Ok "PostgreSQL: $($servicio.Status)"
    } else {
        Aviso "No se encontro el servicio de PostgreSQL. Verifica que este instalado."
    }
}


#  2. API REST

if (-not $SoloFrontend) {
    $apiActiva = $false
    try {
        Invoke-WebRequest 'http://localhost:5099/health' -UseBasicParsing -TimeoutSec 2 | Out-Null
        $apiActiva = $true
    } catch { }

    if ($apiActiva) {
        Ok "La API ya esta corriendo en http://localhost:5099"
    } else {
        Info "Compilando y arrancando la API (puerto 5099)..."
        $api = Start-Process -FilePath 'dotnet' `
            -ArgumentList 'run', '--project', "$Raiz\backend\Inventario.API", '--no-launch-profile' `
            -WorkingDirectory "$Raiz\backend\Inventario.API" `
            -RedirectStandardOutput "$env:TEMP\inventario-api.log" `
            -RedirectStandardError  "$env:TEMP\inventario-api.err.log" `
            -WindowStyle Hidden -PassThru

        for ($i = 0; $i -lt 40; $i++) {
            Start-Sleep -Seconds 1
            try {
                Invoke-WebRequest 'http://localhost:5099/health' -UseBasicParsing -TimeoutSec 2 | Out-Null
                Ok "API lista en http://localhost:5099  (Swagger: /swagger)"
                break
            } catch { }
        }
    }
}


#  3. Frontend

if (-not $SoloApi) {
    $frontActivo = $false
    try {
        Invoke-WebRequest 'http://localhost:4200' -UseBasicParsing -TimeoutSec 2 | Out-Null
        $frontActivo = $true
    } catch { }

    if ($frontActivo) {
        Ok "El frontend ya esta corriendo en http://localhost:4200"
    } else {
        if (-not (Test-Path "$Raiz\frontend\node_modules")) {
            Info "Instalando dependencias del frontend (primera vez)..."
            Start-Process -FilePath 'npm' -ArgumentList 'install' `
                -WorkingDirectory "$Raiz\frontend" -Wait -NoNewWindow
        }

        Info "Arrancando el frontend (puerto 4200)..."
        # Sin --host: el servidor de desarrollo de Vite escucha en 'localhost',
        # que resuelve tanto a 127.0.0.1 como a ::1 en este equipo.
        Start-Process -FilePath 'npm' -ArgumentList 'start', '--', '--port', '4200' `
            -WorkingDirectory "$Raiz\frontend" `
            -RedirectStandardOutput "$env:TEMP\inventario-web.log" `
            -RedirectStandardError  "$env:TEMP\inventario-web.err.log" `
            -WindowStyle Hidden

        for ($i = 0; $i -lt 60; $i++) {
            Start-Sleep -Seconds 1
            try {
                Invoke-WebRequest 'http://localhost:4200' -UseBasicParsing -TimeoutSec 2 | Out-Null
                Ok "Frontend listo en http://localhost:4200"
                break
            } catch { }
        }
    }
}

Write-Host ''
Ok "=========================================================="
Ok "  Aplicacion lista"
Ok "  Frontend  : http://localhost:4200"
Ok "  API       : http://localhost:5099/api"
Ok "  Swagger   : http://localhost:5099/swagger"
Ok "=========================================================="
Write-Host ''
Ok "  Usuarios de prueba:"
Ok "    admin    / Admin123!     (Administrador)"
Ok "    operador / Operador123!  (Operador)"
Ok "    lector   / Lector123!    (Solo lectura)"
Write-Host ''
