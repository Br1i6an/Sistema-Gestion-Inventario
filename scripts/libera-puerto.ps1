#  Libera un puerto TCP matando al proceso que lo tiene ocupado.
#
#  Uso:
#      powershell -ExecutionPolicy Bypass -File scripts\libera-puerto.ps1
#      powershell -ExecutionPolicy Bypass -File scripts\libera-puerto.ps1 -Puerto 5100
#
#  Por que existe:
#      (5099). Si queda una instancia levantada (por ejemplo, un `dotnet run`
#      enlazarse a ese puerto y falla con:
#          "Failed to bind to address http://127.0.0.1:5099:
#           address already in use."
#      Ejecutar este script antes de ejecutar en Visual Studio.

param(
    [int]$Puerto = 5099
)

$ErrorActionPreference = 'Stop'

function Info($mensaje) { Write-Host $mensaje -ForegroundColor Cyan }
function Ok($mensaje)   { Write-Host $mensaje -ForegroundColor Green }
function Aviso($mensaje) { Write-Host $mensaje -ForegroundColor Yellow }

Info "Buscando procesos que ocupen el puerto $Puerto..."

# Get-NetTCPConnection es la forma fiable de saber quien tiene el socket.
$conexiones = @()
try {
    $conexiones = Get-NetTCPConnection -LocalPort $Puerto -State Listen -ErrorAction Stop
} catch {
    # Alternativa con netstat para equipos donde el cmdlet no esta disponible.
    $lineas = netstat -ano | Select-String ":$Puerto\s+.*LISTENING"
    $conexiones = $lineas | ForEach-Object {
        $partes = ($_ -split '\s+') | Where-Object { $_ -ne '' }
        [pscustomobject]@{ OwningProcess = [int]$partes[-1] }
    }
}

if (-not $conexiones -or $conexiones.Count -eq 0) {
    Ok "El puerto $Puerto esta libre. Es posible iniciar la API."
    exit 0
}

$pids = $conexiones.OwningProcess | Sort-Object -Unique

foreach ($processId in $pids) {
    if ($processId -eq 0) { continue }

    $proceso = Get-Process -Id $processId -ErrorAction SilentlyContinue
    $nombre = if ($proceso) { $proceso.ProcessName } else { "desconocido" }

    Info "Deteniendo '$nombre' (PID $processId)..."

    try {
        Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
        Aviso "No se pudo detener el PID $processId : $($_.Exception.Message)"
    }
}

Start-Sleep -Seconds 1

# Comprobacion final.
$restantes = @()
try {
    $restantes = Get-NetTCPConnection -LocalPort $Puerto -State Listen -ErrorAction SilentlyContinue
} catch {
    $restantes = @()
}

if ($restantes) {
    exit 1
}

Ok "Puerto $Puerto liberado."
exit 0
