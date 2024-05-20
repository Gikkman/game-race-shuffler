#! /usr/local/env bash
mkdir -p dist
npm run build
docker run --rm -it -v $PWD:/home/bun/app oven/bun:1.1.8 build ./packages/client/src/index.ts --compile --outfile ./dist/grs-win --target=bun-windows-x64
cp -r ./packages/client/lua ./dist
