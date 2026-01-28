@echo off
echo ========================================
echo INSTALACAO - MERCADO AUTONOMO
echo ========================================
echo.

cd /d "%~dp0"

echo [1/6] Limpando instalacao anterior...
if exist node_modules rmdir /s /q node_modules
if exist .next rmdir /s /q .next
echo OK!
echo.

echo [2/6] Instalando dependencias...
call npm install
if errorlevel 1 (
    echo ERRO ao instalar dependencias!
    pause
    exit /b 1
)
echo OK!
echo.

echo [3/6] Gerando Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo ERRO ao gerar Prisma Client!
    pause
    exit /b 1
)
echo OK!
echo.

echo [4/6] Criando banco de dados...
echo Por favor, certifique-se que o PostgreSQL esta rodando!
echo E que o banco 'mercado_autonomo' foi criado.
pause

echo [5/6] Executando migrations...
call npx prisma migrate dev --name init
if errorlevel 1 (
    echo ERRO nas migrations! Verifique se o banco foi criado.
    pause
    exit /b 1
)
echo OK!
echo.

echo [6/6] Populando banco com dados iniciais...
call npx prisma db seed
if errorlevel 1 (
    echo ERRO ao popular banco!
    pause
    exit /b 1
)
echo OK!
echo.

echo ========================================
echo INSTALACAO CONCLUIDA COM SUCESSO!
echo ========================================
echo.
echo Para iniciar o servidor, execute: npm run dev
echo.
echo CREDENCIAIS:
echo Admin - CPF: 00000000000, Senha: admin123
echo Morador - CPF: qualquer, Nome: seu nome
echo.
pause

