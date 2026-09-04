@echo off
echo ========================================
echo   ESP32 Internet Radio Server
echo ========================================
echo.
echo Starting server on port 8000...
echo Press Ctrl+C to stop.
echo.
python radio_server.py 8000
pause
