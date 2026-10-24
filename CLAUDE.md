# CuenkArena — guía para trabajar en el proyecto

CuenkArena es un FPS estilo Quake 3 / TF2 que corre en el navegador (three.js r128), hecho por Santino Calamari.
- **Online:** servidor Node en Render → https://cuenkarena.onrender.com. Render publica solo cada push a `main` (repo `spicytech26-hash/cuenKArena`). Un monitor de UptimeRobot visita `/health` cada 5 min para que no se duerma.
- **Práctica:** la misma página publicada como artifact de Claude (`https://claude.ai/artifact/K8DrDusZ8DQqqXfWZLkfqD`). Se publica `public/index.html` con los archivos `game.js`, `editor.html` y `modelos/modelos.json` (más los `.glb` que haya).
- Textos para los jugadores y comentarios del código: en español rioplatense (voseo).

## Protocolo para ahorrar tokens (seguirlo siempre)

1. **Una conversación por tarea.** Si el pedido cambia de tema, terminar lo que está y sugerir una conversación nueva.
2. **Leer solo lo necesario.** Usá la tabla de abajo para ir directo al archivo, y `grep -n` para encontrar la línea antes de leer. Leé solo el pedazo que vas a cambiar.
3. **Nunca leer ni editar `public/game.js` ni `public/index.html`**: se arman solos desde `src/`. Se edita `src/` y se corre `node herramientas/armar.js`.
4. **Probar con `node herramientas/probar.js`** (unos 20 s, sin navegador): revisa el armado, la sintaxis del cliente, que cada mapa se arme, partidas con bots en todos los modos y que se agarren los botiquines. Con un mapa: `node herramientas/probar.js lacuenca`.
5. **Sin capturas automáticas.** Las pruebas visuales las hace el usuario y manda una captura si algo se ve mal. Usá el navegador headless solo si el usuario lo pide o si no hay otra forma de encontrar un error.
6. **Modelos 3D en archivos `.glb`**, no en código, cuando sea posible (ver "Modelos 3D" abajo). **Mapas con el editor** (`public/editor.html`) cuando sea posible.
7. Respuestas cortas: qué cambió, qué probar y nada más.

## Dónde está cada cosa

### Núcleo compartido → `public/game.js` (lo usan el servidor y la práctica en el navegador)
Las piezas se pegan en orden alfabético; varias no son JS completo por sí solas (por ejemplo, la clase `Game` está repartida en `07-partida/`).

| Archivo | Qué tiene |
|---|---|
| `src/nucleo/00-encabezado.js` | apertura del módulo (UMD) |
| `src/nucleo/01-datos.js` | física `K`, **`WEAPONS` (daño, cadencia, cargador)**, `ITEMS` (respawn), munición, `SHOP` (tienda y precios), `ECON`, **`MODES`** (modos y qué mapas usan), gungame, equipos, XP, niveles y medallas |
| `src/nucleo/02-kit-mapas.js` | `mapKit()` (`add`, `ramp`, `wall`, `stairs`, `mover`, `I`, `finish`), `MAPDEFS` y `mapFromData()` (mapas del editor) |
| `src/nucleo/02-mapas/N-id.js` | **un archivo por mapa**: 1 represa, 2 panymanteca (Humita), 3 lacuenca, 4 puente (CTF), 5 fuertes (francotiradores). Cada uno termina con `MAPDEFS.id = función;` |
| `src/nucleo/03-registro-mapas.js` | arma `MAPS`, apariciones seguras, alias de mapas viejos, plataformas móviles, mapa de prueba del editor |
| `src/nucleo/04-fisica.js` | movimiento estilo Quake (`pmove`), saltadores, raycast, impactos a jugadores, proyectiles |
| `src/nucleo/05-navegacion.js` | grafo de navegación de los bots |
| `src/nucleo/06-bots-y-filtros.js` | dificultad de bots `SKILL`, palabras censuradas, nombres y pieles |
| `src/nucleo/07-partida/1-base.js` | clase `Game`: constructor, conexiones, mensajes de los clientes, votación para echar |
| `src/nucleo/07-partida/2-aparicion-tienda.js` | aparecer, equipo inicial, tienda, créditos |
| `src/nucleo/07-partida/3-disparos.js` | disparos, proyectiles, **explosiones (daño de área)**, fuego de molotov |
| `src/nucleo/07-partida/4-danio.js` | daño, blindaje, muertes, rachas, gungame |
| `src/nucleo/07-partida/5-banderas-items.js` | captura la bandera, **`give()` (qué da cada ítem)**, sifón, recoger ítems |
| `src/nucleo/07-partida/6-ciclo.js` | puntajes, fin de partida, votación de mapa, bots de relleno, `tick`, snapshot |
| `src/nucleo/07-partida/7-bots.js` | inteligencia de los bots |
| `src/nucleo/99-exportar.js` | lo que el módulo exporta |

### Cliente → `public/index.html`
`src/cliente/pagina.html` (HTML del menú y HUD; `@@ESTILOS@@` y `@@CODIGO@@` se reemplazan al armar) + `src/cliente/estilos.css` + `src/cliente/js/**` (todo dentro de una sola función, así que comparten variables).

| Archivo | Qué tiene |
|---|---|
| `js/00-inicio-ajustes.js` | arranque, ajustes guardados `S`, mapa de prueba del editor |
| `js/01-render-texturas.js` | renderer, sombras, resolución dinámica `DR`, texturas procedurales `T` y materiales `MATS`, cielos |
| `js/02-mapa.js` | arma la geometría del mapa, `loadMap`, ítems del mapa |
| `js/03-decoracion.js` | decoración (palmeras, carteles, **cancha de fútbol `pitch`**), banderas, boliche |
| `js/04-audio.js` | sonidos sintetizados `SFX` y música del boliche |
| `js/05-efectos.js` | partículas, explosiones, marcas |
| `js/06-armas-base.js` | materiales y ayudas para modelar armas (`vRB`, `vT`, `vGrp`…), registro `VMOD`, `vRigs`, `GLB` |
| `js/07-armas/NN-arma.js` | **un archivo por arma**: modelo `VMOD[i]` + animación `vRigs[i]` |
| `js/08-armas-ensamble.js` | `buildGun`, posiciones del arma en pantalla, `vms` |
| `js/09-armas-animacion.js` | manos, ayudas de animación (`VEV`, `H`, `VPR`, `VYAW`, `RH`), aplicar rigs, cuchillo, luces del arma |
| `js/10-personajes-items.js` | modelo del jugador con piel, modelos de ítems (`buildItem`), sifón |
| `js/11-estado-red.js` | estado del jugador `me`, `LocalNet` (práctica) y red online |
| `js/12-mensajes.js` | mensajes del servidor (`onMsg`), chat, eventos |
| `js/13-disparos.js` | proyectiles del lado del cliente, rocket jump, disparar |
| `js/14-tienda.js` | tienda (B) y taquilla |
| `js/15-entrada.js` | teclado, mouse, menú de echar (Y) |
| `js/16-simulacion.js` | movimiento propio e interpolación de los demás |
| `js/17-hud.js` | HUD |
| `js/18-camara.js` | cámara, arma en mano y jugadores remotos (`updRemote`) |
| `js/19-mira-cuenta-fin.js` | mira personalizable, cuentas de Google, pantalla de fin de partida |
| `js/20-modelos-glb.js` | carga de modelos `.glb` |
| `js/21-menu.js` | menú, ajustes, botones de mapa |
| `js/22-bucle.js` | bucle principal (`frame`) |

### Armas (índice: archivo · piezas que se mueven)
0 pistola `00-pistola.js` · slide, mag — 1 escopeta · pump — 2 escopeta doble · brl, sh — 3 ametralladora · mag, cock — 4 lanzagranadas · drum — 5 lanzacohetes · loaded — 6 rifle de plasma · cell — 7 cuchillo (modelo viejo) — 8 francotirador · bolt, mag — 9 rifle de caza · lever, cock — 10 molotov (modelo viejo).
El daño, la cadencia y el cargador de cada arma están en `WEAPONS` (`src/nucleo/01-datos.js`); el precio en `SHOP`.

### Otros
- `server.js`: servidor HTTP + WebSocket, gzip, `/health`. `cuentas.js`: Google + Supabase.
- `public/editor.html`: editor de mapas (un solo archivo).
- `public/modelos/modelos.json` + `.glb`: modelos 3D opcionales.
- `README.md`: descripción del juego para jugadores; actualizarla cuando cambie algo que se ve en el juego.

## Tareas comunes

- **Balance de un arma:** `WEAPONS` en `01-datos.js`. Daño de área: `explode()` en `07-partida/3-disparos.js`. El rocket jump propio está en `13-disparos.js` (`selfBlast`).
- **Cambiar un mapa a mano:** su archivo en `src/nucleo/02-mapas/`. Si se agregan materiales nuevos, van en `MATS` (`01-render-texturas.js`) y en `MATC` del editor.
- **Mapa nuevo con el editor:** el usuario lo exporta (`id.js`) → va en `src/nucleo/02-mapas/6-id.js` → `node herramientas/armar.js` → `node herramientas/probar.js id`. Los modos se eligen en el editor (`modos`); los botones de mapa del menú salen solos. Foto opcional para la votación: `public/maps/id.jpg`.
- **Modelo o animación de un arma:** `src/cliente/js/07-armas/NN-arma.js`.
- **Ítem nuevo:** `ITEMS` (`01-datos.js`), qué da en `give()` (`5-banderas-items.js`), modelo en `buildItem` (`10-personajes-items.js`), color en el editor.

## Modelos 3D (.glb)

`public/modelos/modelos.json` dice qué archivo reemplaza a qué modelo de código. Si un archivo falta o falla, queda el de código.
```json
{ "armas": { "5": { "archivo": "lanzacohetes.glb", "escala": 1, "pos": [0, 0, 0], "rot": [0, 0, 0], "punta": [0, 0.03, -1] } },
  "items": { "health": { "archivo": "botiquin.glb", "escala": 1 } } }
```
- Las armas miran hacia **-z**, con la empuñadura cerca del origen; 1 unidad = 1 metro (una escopeta mide unos 0,9). `punta` es de dónde sale el fogonazo.
- Para que las animaciones sigan andando, las piezas móviles tienen que llamarse como en la lista de armas de arriba (en Blender, el nombre del objeto). Si falta alguna, el arma se ve pero queda quieta.
- Ítems: la clave es el tipo (`health`, `mega`, `armor`, `armorH`, `quad`, `shells`, `bullets`, `rockets`, `grenades`, `slugs`, `caza`, `w1`…`w9`).
- Formato: `.glb` (glTF binario), idealmente con menos de 5.000 triángulos por arma y texturas de 512 px o menos. GLTFLoader se baja solo si hay algún modelo en la lista.

## Probar y publicar

```bash
node herramientas/armar.js        # después de cada cambio en src/
node herramientas/probar.js       # prueba rápida; tiene que terminar en "Todo bien."
PORT=3999 node server.js          # jugar localmente en http://localhost:3999 (práctica y online)
```
Publicar: commit en `main` y `git push` (Render despliega solo; si no, "Manual Deploy → Deploy latest commit"). Después actualizar la práctica: publicar el artifact con `public/index.html` y los archivos `game.js`, `editor.html`, `modelos/modelos.json` y los `.glb` que haya.

## Reglas que no se rompen

- La clave secreta de Supabase nunca va al navegador; la tabla `jugadores` mantiene RLS activado.
- No tocar el proyecto de Supabase "RN Negocio Inmobiliario".
- `CUENTAS_SECRET` y la API key de Render no se escriben en el chat ni en el repo.
- El servidor es la autoridad: daño, ítems y puntos se deciden en `src/nucleo/`, nunca solo en el cliente.
- Cuidar el rendimiento: las sombras se hornean una vez por mapa, los jugadores no proyectan sombras reales (tienen sombra de mancha), y cada arma ronda las 10 llamadas de dibujo.
