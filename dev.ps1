Write-Host "Starting Supabase local services..." -ForegroundColor Cyan
supabase start

Write-Host "Starting app..." -ForegroundColor Cyan
docker compose up --build
