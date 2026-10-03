@echo off
chcp 65001 > nul
echo ========================================================
echo   🚀 رفع لوحة تحكم تطبيق كرامتي على GitHub و Vercel
echo ========================================================
echo.
set /p REPO_URL="أدخل رابط مستودع GitHub الخاص بك (مثال: https://github.com/username/karamty-admin-dashboard.git): "

if "%REPO_URL%"=="" (
    echo [خطأ] لم يتم إدخال الرابط!
    pause
    exit /b
)

echo.
echo [1/3] تهيئة الفرع الرئيسي...
git branch -M main

echo [2/3] ربط المستودع البعيد...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo [3/3] رفع الملفات إلى GitHub...
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   ✅ تم رفع الكود بنجاح إلى GitHub!
    echo   الآن يمكنك ربطه بـ Vercel مباشرة بنقرة واحدة من لوحة Vercel:
    echo   https://vercel.com/new
    echo ========================================================
) else (
    echo.
    echo ❌ حدث خطأ أثناء الرفع، تأكد من صحة الرابط وأنك مسجل الدخول في Git.
)

pause
