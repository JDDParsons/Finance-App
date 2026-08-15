[CmdletBinding()]
param(
    [switch]$StopDocker
)

$ErrorActionPreference = 'Stop'

function Test-DockerEngine {
    & docker info *> $null
    return $LASTEXITCODE -eq 0
}

function Get-SupabaseProjectId {
    $configPath = Join-Path $PSScriptRoot 'supabase\config.toml'
    $projectIdMatch = Select-String -LiteralPath $configPath -Pattern '^\s*project_id\s*=\s*"([^"]+)"'

    if (-not $projectIdMatch) {
        throw "Unable to read project_id from '$configPath'."
    }

    return $projectIdMatch.Matches[0].Groups[1].Value
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory)]
        [string]$Description,

        [Parameter(Mandatory)]
        [scriptblock]$Command
    )

    & $Command

    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE."
    }
}

Push-Location $PSScriptRoot

try {
    if (Test-DockerEngine) {
        Write-Host 'Stopping the Nuxt development container...' -ForegroundColor Cyan
        Invoke-CheckedCommand -Description 'Docker Compose shutdown' -Command {
            & docker compose down --remove-orphans
        }

        $projectId = Get-SupabaseProjectId
        Write-Host "Stopping Supabase project '$projectId' while preserving its local data..." -ForegroundColor Cyan
        Invoke-CheckedCommand -Description 'Supabase shutdown' -Command {
            & npx.cmd supabase stop --project-id $projectId
        }

        Write-Host 'Project services are stopped.' -ForegroundColor Green
    } else {
        Write-Host 'Docker is already stopped; the project services are not running.' -ForegroundColor Yellow
    }

    if ($StopDocker) {
        Write-Host 'Stopping Docker Desktop...' -ForegroundColor Cyan
        Invoke-CheckedCommand -Description 'Docker Desktop shutdown' -Command {
            & docker desktop stop
        }
        Write-Host 'Docker Desktop is stopped.' -ForegroundColor Green
    } else {
        Write-Host "Docker Desktop was left running. Use '.\stop-app.ps1 -StopDocker' to stop it too." -ForegroundColor DarkGray
    }
} finally {
    Pop-Location
}
