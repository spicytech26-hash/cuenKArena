#!/usr/bin/env node
/* Arma los archivos que usa el juego a partir de las piezas chicas de src/.
     src/nucleo/**  → public/game.js     (lo usan el servidor y el navegador)
     src/cliente/** → public/index.html  (pagina.html + estilos.css + js/**)
   Las piezas se pegan en orden alfabético (por eso llevan número adelante).
   Uso:  node herramientas/armar.js            arma los dos archivos
         node herramientas/armar.js --revisar   solo avisa si public/ quedó desactualizado */
'use strict';
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..');
function piezas(dir) {
  const out = [];
  for (const n of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) out.push(...piezas(p));
    else if (n.endsWith('.js')) out.push(p);
  }
  return out;
}
const pegar = dir => piezas(dir).map(p => fs.readFileSync(p, 'utf8')).join('');
function armar() {
  const nucleo = pegar(path.join(RAIZ, 'src/nucleo'));
  const C = path.join(RAIZ, 'src/cliente');
  const pagina = fs.readFileSync(path.join(C, 'pagina.html'), 'utf8')
    .replace('@@ESTILOS@@\n', () => fs.readFileSync(path.join(C, 'estilos.css'), 'utf8'))
    .replace('@@CODIGO@@\n', () => pegar(path.join(C, 'js')));
  return { 'public/game.js': nucleo, 'public/index.html': pagina };
}
const salida = armar(), revisar = process.argv.includes('--revisar');
let viejos = 0;
for (const [f, txt] of Object.entries(salida)) {
  const p = path.join(RAIZ, f), antes = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  if (antes === txt) continue;
  viejos++;
  if (revisar) console.log('Desactualizado: ' + f + ' (corré node herramientas/armar.js)');
  else { fs.writeFileSync(p, txt); console.log('Armado ' + f + ' (' + Math.round(txt.length / 1024) + ' KB)'); }
}
if (!viejos) console.log('public/ está al día con src/');
if (revisar && viejos) process.exit(1);
