#! /usr/bin/env bash
rm -rf ./dist
mkdir -p ./dist

npm run build
case "$OSTYPE" in
  darwin*) bun build ./packages/client/src/index.ts --compile --outfile ./dist/grs-win --target=bun-windows-x64 ;;
  linux*)  docker run --rm -it -v $PWD:/home/bun/app oven/bun:1.1.18 build ./packages/client/src/index.ts --compile --outfile ./dist/grs-win --target=bun-windows-x64 ;;
  *) echo "Unknow OS: $OSTYPE" && exit 1;;
esac;

mkdir ./dist/games
mkdir ./dist/states
cp -r ./packages/client/*.lua ./dist
cp ./client-config.ini ./dist/client-config.ini

cat > ./dist/RUN.bat <<EOF
@echo off

start /WAIT /B ./grs-win.exe

echo Press enter to exit...
set /p input=
EOF
