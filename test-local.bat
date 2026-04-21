@echo off
REM Test script for recall-ai local development (Windows)
REM Run this after: npm install

echo Testing recall-ai CLI...
echo.

echo 1. Testing --help flag...
node bin/recall.js --help
echo.

echo 2. Testing --version flag...
node bin/recall.js --version
echo.

echo 3. Testing init command help...
node bin/recall.js init --help
echo.

echo 4. Testing scan command help...
node bin/recall.js scan --help
echo.

echo 5. Testing load command help...
node bin/recall.js load --help
echo.

echo 6. Testing status command help...
node bin/recall.js status --help
echo.

echo 7. Testing update command help...
node bin/recall.js update --help
echo.

echo 8. Testing install command help...
node bin/recall.js install --help
echo.

echo 9. Testing config command help...
node bin/recall.js config --help
echo.

echo All help commands tested!
echo.
echo To test full workflow:
echo   1. Get API key: https://aistudio.google.com/app/apikey
echo   2. node bin/recall.js config --key YOUR_KEY
echo   3. node bin/recall.js init
echo   4. node bin/recall.js scan
echo   5. node bin/recall.js status
echo   6. node bin/recall.js load
