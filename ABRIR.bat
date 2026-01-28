@echo off
chcp 65001 >nul
title Mercado Autônomo - Inicializador

REM Garante que o script está sendo executado na pasta raiz do projeto
cd /d "%~dp0"

echo.
echo ════════════════════════════════════════════════════════════
echo          🛒 MERCADO AUTÔNOMO - CATÁLOGO DIGITAL
echo ════════════════════════════════════════════════════════════
echo.

REM Verifica se o servidor já está rodando para não abrir duplicado
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Servidor já está rodando!
    echo.
    echo Abrindo aplicação no navegador...
    start http://localhost:3000
    timeout /t 3 >nul
    exit
)

echo 🚀 Iniciando o servidor (npm run dev)...
echo 💡 Mantenha a nova janela que abrirá em segundo plano.
echo.

REM Inicia o servidor em uma nova janela visível para o usuário acompanhar
start "SERVIDOR - Mercado Autônomo" cmd /k "npm run dev"

echo Aguardando o sistema carregar...
echo (Isso pode levar alguns segundos na primeira vez)
echo.

REM Loop para verificar quando a porta 3000 estiver ativa
set /a tentativas=0
:aguardar_servidor
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    goto servidor_pronto
)
set /a tentativas+=1
if %tentativas% lss 20 (
    echo [%tentativas%/20] Aguardando servidor...
    goto aguardar_servidor
)

echo.
echo ⚠️  O servidor está demorando mais que o esperado. 
echo    Verifique se há erros na janela do servidor.
echo.
pause
exit

:servidor_pronto
echo.
echo ✅ Servidor iniciado com sucesso!
echo 🌐 Abrindo: http://localhost:3000
echo.

REM Aguarda mais 2 segundos para garantir que o Next.js compilou a rota inicial
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ✅ Tudo pronto! Você já pode usar a aplicação no seu navegador.
echo 💡 DICA: Não feche a janela preta escrito "SERVIDOR".
echo.
timeout /t 5 >nul
exit
