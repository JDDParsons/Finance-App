[CmdletBinding()]
param(
    [switch]$RestartSupabase,
    [switch]$SkipMigrations,
    [switch]$OpenBrowser
)

$ErrorActionPreference = 'Stop'

function Get-SupabaseCliPath {
    $supabaseCli = Join-Path $PSScriptRoot 'node_modules\.bin\supabase.cmd'

    if (-not (Test-Path -LiteralPath $supabaseCli)) {
        throw "The local Supabase CLI was not found. Run 'npm install' first."
    }

    return $supabaseCli
}

function Get-SupabaseProjectId {
    $configPath = Join-Path $PSScriptRoot 'supabase\config.toml'
    $projectIdMatch = Select-String -LiteralPath $configPath -Pattern '^\s*project_id\s*=\s*"([^"]+)"'

    if (-not $projectIdMatch) {
        throw "Unable to read project_id from '$configPath'."
    }

    return $projectIdMatch.Matches[0].Groups[1].Value
}

function Get-LocalSupabaseEnvironment {
    param(
        [Parameter(Mandatory)]
        [string]$SupabaseCli
    )

    $statusOutput = & $SupabaseCli status -o env

    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to read the local Supabase environment.'
    }

    $statusVars = @{}

    foreach ($line in $statusOutput) {
        if ($line -notmatch '^([A-Z0-9_]+)=(.*)$') {
            continue
        }

        $value = $Matches[2].Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $statusVars[$Matches[1]] = $value
    }

    $publishableKey = if ($statusVars.ContainsKey('PUBLISHABLE_KEY')) {
        $statusVars['PUBLISHABLE_KEY']
    } else {
        $statusVars['ANON_KEY']
    }

    if ([string]::IsNullOrWhiteSpace($statusVars['API_URL']) -or
        [string]::IsNullOrWhiteSpace($publishableKey) -or
        [string]::IsNullOrWhiteSpace($statusVars['SERVICE_ROLE_KEY'])) {
        throw 'Supabase status did not return the API URL, publishable key, and service-role key.'
    }

    return @{
        ApiUrl          = $statusVars['API_URL']
        PublishableKey  = $publishableKey
        ServiceRoleKey  = $statusVars['SERVICE_ROLE_KEY']
    }
}

function Start-BrowserWhenReady {
    $appUrl = 'http://localhost:3000'
    $studioUrl = 'http://localhost:54323'
    $mailpitUrl = 'http://localhost:54324'

    return Start-Job -ScriptBlock {
        param($AppUrl, $StudioUrl, $MailpitUrl)

        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        while ($timer.Elapsed.TotalSeconds -lt 120) {
            try {
                $response = Invoke-WebRequest -Uri $AppUrl -UseBasicParsing -TimeoutSec 3
                if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                    break
                }
            } catch {
                Start-Sleep -Seconds 1
            }
        }

        if ($timer.Elapsed.TotalSeconds -ge 120) {
            return
        }

        $chrome = Get-Command 'chrome.exe' -ErrorAction SilentlyContinue
        if ($chrome) {
            Start-Process -FilePath $chrome.Source -ArgumentList @(
                '--new-window'
                $AppUrl
                $StudioUrl
                $MailpitUrl
            )
            return
        }

        Start-Process $AppUrl
        Start-Process $StudioUrl
        Start-Process $MailpitUrl
    } -ArgumentList $appUrl, $studioUrl, $mailpitUrl
}

Push-Location $PSScriptRoot

try {
    $browserJob = $null
    $supabaseCli = Get-SupabaseCliPath
    $projectId = Get-SupabaseProjectId

    if ($RestartSupabase) {
        Write-Host "Restarting Supabase project '$projectId' while preserving its local data..." -ForegroundColor Yellow
        & $supabaseCli stop --project-id $projectId
        if ($LASTEXITCODE -ne 0) {
            throw "Unable to stop Supabase project '$projectId'."
        }
    }

    Write-Host "Starting or reusing Supabase project '$projectId'..." -ForegroundColor Cyan
    & $supabaseCli start
    if ($LASTEXITCODE -ne 0) {
        throw 'Supabase failed to start. Make sure Docker Desktop is running and ports 54321-54329 are available.'
    }

    if (-not $SkipMigrations) {
        Write-Host 'Applying pending local Supabase migrations...' -ForegroundColor Cyan
        & $supabaseCli migration up --local
        if ($LASTEXITCODE -ne 0) {
            throw 'Unable to apply pending local Supabase migrations.'
        }
    }

    $localEnvironment = Get-LocalSupabaseEnvironment -SupabaseCli $supabaseCli
    $env:NUXT_PUBLIC_SUPABASE_URL = $localEnvironment.ApiUrl
    $env:NUXT_PUBLIC_SUPABASE_ANON_KEY = $localEnvironment.PublishableKey
    $env:NUXT_SUPABASE_SERVICE_ROLE_KEY = $localEnvironment.ServiceRoleKey

    Write-Host 'Local development services:' -ForegroundColor Green
    Write-Host '  Nuxt:           http://localhost:3000'
    Write-Host '  Supabase API:   http://localhost:54321'
    Write-Host '  Supabase Studio: http://localhost:54323'
    Write-Host '  Mailpit:        http://localhost:54324'
    Write-Host 'Starting Nuxt on the Windows host. Press Ctrl+C to stop Nuxt.' -ForegroundColor Cyan

    if ($OpenBrowser) {
        Write-Host 'The browser tabs will open when Nuxt is ready.' -ForegroundColor DarkGray
        $browserJob = Start-BrowserWhenReady
    }

    & npm.cmd run dev -- --host localhost --port 3000
    if ($LASTEXITCODE -ne 0) {
        throw "Nuxt exited with code $LASTEXITCODE."
    }
} finally {
    if ($browserJob) {
        Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue
    }
    Pop-Location
}
