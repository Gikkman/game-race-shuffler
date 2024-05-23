#! /usr/bin/env bash
rm -rf ./dist
mkdir -p ./dist

npm run build
docker run --rm -it -v $PWD:/home/bun/app oven/bun:1.1.8 build ./packages/client/src/index.ts --compile --outfile ./dist/grs-win --target=bun-windows-x64

cp -r ./packages/client/lua ./dist
cp ./client-config.ini ./dist/client-config.ini

cat > ./dist/RUN.bat <<EOF
@echo off

set LOG_LEVEL=DEBUG
start /WAIT /B ./grs-win.exe

echo Press enter to exit...
set /p input=
EOF
