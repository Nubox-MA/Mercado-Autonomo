# Script de instalação para Windows - Mercado Autônomo
# Execute com: PowerShell -ExecutionPolicy Bypass -File instalar.ps1

Write-Host "========================================"  -ForegroundColor Green
Write-Host "   INSTALAÇÃO - MERCADO AUTÔNOMO"  -ForegroundColor Green
Write-Host "========================================"  -ForegroundColor Green
Write-Host ""

# Ir para o diretório do script
Set-Location $PSScriptRoot

# Verificar se .env existe
Write-Host "[0/6] Verificando arquivo .env..." -ForegroundColor Yellow
if (-Not (Test-Path ".env")) {
    Write-Host "ERRO: Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "Por favor, crie o arquivo .env primeiro!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Use o Bloco de Notas e crie um arquivo .env com:" -ForegroundColor Cyan
    Write-Host '  DATABASE_URL="postgresql://postgres:SUASENHA@localhost:5432/mercado_autonomo?schema=public"' -ForegroundColor White
    Write-Host '  JWT_SECRET="mercado_autonomo_secret_key_2024"' -ForegroundColor White
    Write-Host '  NEXT_PUBLIC_API_URL="http://localhost:3000"' -ForegroundColor White
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "OK! Arquivo .env encontrado." -ForegroundColor Green
Write-Host ""

# Limpar instalações anteriores
Write-Host "[1/6] Limpando instalação anterior..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}
Write-Host "OK!" -ForegroundColor Green
Write-Host ""

# Instalar dependências
Write-Host "[2/6] Instalando dependências (pode demorar)..." -ForegroundColor Yellow
npm install --no-optional
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao instalar dependências!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "OK!" -ForegroundColor Green
Write-Host ""

# Gerar Prisma Client
Write-Host "[3/6] Gerando Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao gerar Prisma Client!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "OK!" -ForegroundColor Green
Write-Host ""

# Avisar sobre banco
Write-Host "[4/6] Verificando banco de dados..." -ForegroundColor Yellow
Write-Host "ATENÇÃO: Certifique-se que:" -ForegroundColor Cyan
Write-Host "  1. PostgreSQL está rodando" -ForegroundColor White
Write-Host "  2. Banco 'mercado_autonomo' foi criado" -ForegroundColor White
Write-Host "  3. Senha no .env está correta" -ForegroundColor White
Write-Host ""
$continue = Read-Host "Tudo pronto? (S/N)"
if ($continue -ne "S" -and $continue -ne "s") {
    Write-Host "Instalação cancelada." -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 0
}

# Migrations
Write-Host "[5/6] Executando migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO nas migrations!" -ForegroundColor Red
    Write-Host "Verifique se o banco foi criado e se a senha está correta no .env" -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "OK!" -ForegroundColor Green
Write-Host ""

# Seed
Write-Host "[6/6] Populando banco com dados iniciais..." -ForegroundColor Yellow
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao popular banco!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "OK!" -ForegroundColor Green
Write-Host ""

# Sucesso
Write-Host "========================================"  -ForegroundColor Green
Write-Host "  INSTALAÇÃO CONCLUÍDA COM SUCESSO!"  -ForegroundColor Green
Write-Host "========================================"  -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar o servidor:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Depois acesse: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "CREDENCIAIS:" -ForegroundColor Yellow
Write-Host "  Admin - CPF: 00000000000, Senha: admin123" -ForegroundColor White
Write-Host "  Morador - CPF: qualquer, Nome: seu nome" -ForegroundColor White
Write-Host ""
Read-Host "Pressione Enter para sair"

