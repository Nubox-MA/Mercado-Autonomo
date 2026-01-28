@echo off
chcp 65001 >nul
title Corrigir Problemas de Login

echo.
echo ════════════════════════════════════════════════════════════
echo          🛠️  CORRIGINDO PROBLEMAS DE LOGIN
echo ════════════════════════════════════════════════════════════
echo.

echo 🛑 Parando processos existentes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo 🔄 Sincronizando banco de dados...
cd /d "%~dp0"
call npx prisma db push --accept-data-loss

echo 🏗️  Gerando cliente Prisma...
call npx prisma generate

echo 🌱 Restaurando administrador padrão...
call npx prisma db seed

echo.
echo ✅ Tudo pronto! Agora você pode abrir a aplicação novamente.
echo 💡 Use o arquivo ABRIR.bat para iniciar.
echo.
echo Credenciais Admin:
echo Usuário: admin
echo Senha: admin123
echo.
pause
