# CuenkArena — guía para trabajar en el proyecto

CuenkArena es un FPS estilo Quake 3 / TF2 que corre en el navegador (three.js r128), hecho por Santino Calamari.
- **Online:** servidor Node en Render → https://cuenkarena.onrender.com. Render publica solo cada push a `main` (repo `spicytech26-hash/cuenKArena`). Un monitor de UptimeRobot visita `/health` cada 5 min para que no se duerma.
- **Práctica:** la misma página publicada como artifact de Claude (`https://claude.ai/artifact/K8DrDusZ8DQqqXfWZLkfqD`). Se publica `public/index.html` con los archivos `game.js`, `editor.html` y `modelos/modelos.json` (más los `.glb` que haya).
- Textos para los jugadores y comentarios del código: en español rioplatense (voseo).

## Protocolo para ahorrar tokens (seguirlo siempre)

1. **Una conversación por tarea.** Si el pedido cambia de tema, terminar lo que está y sugerir una conversación nueva.
2. **Leer solo lo necesario.** Usá la tabla de abajo para ir directo al archivo, y `grep -n` para encontrar la línea antes de leer. Leé solo el pedazo que vas a cambiar.
3. **Nunca leer ni editar `public/game.js` ni `public/index.html`**: se arman solos desde `src/`. Se edita `src/` y se corre `node herramientas/armar.js`.
4. **Probar con `node herramientas/probar.js`** (alrededor de un minuto, sin navegador): revisa el armado, la sintaxis del cliente, que cada mapa se arme, partidas con bots en todos los modos y que se agarren los botiquines. Con un mapa: `node herramientas/probar.js lacuenca`.
5. **Sin capturas automáticas.** Las pruebas visuales las hace el usuario y manda una captura si algo se ve mal. Usá el navegador headless solo si el usuario lo pide o si no hay otra forma de encontrar un error.
6. **Modelos 3D en archivos `.glb`**, no en código, cuando sea posible (ver "Modelos 3D" abajo). **Mapas con el editor** (`public/editor.html`) cuando sea posible.
7. Respuestas cortas: qué cambió, qué probar y nada más.

## Dónde está cada cosa

### Núcleo compartido → `public/game.js` (lo usan el servidor y la práctica en el navegador)
Las piezas se pegan en orden alfabético; varias no son JS completo por sí solas (por ejemplo, la clase `Game` está repartida en `07-partida/`).

| Archivo | Qué tiene |
|---|---|
| `src/nucleo/00-encabezado.js` | apertura del módulo (UMD) |
| `src/nucleo/01-datos.js` | física `K`, **`WEAPONS` (daño, cadencia, cargador)**, `ITEMS` (respawn), munición, `SHOP` (tienda y precios), `ECON`, **`MODES`** (modos y qué mapas usan; `cards` prende las cartas), **`CARDS`/`CARD_FX`** (cartas de mejora; cada carta lleva `stat` con sus números para el grimorio), gungame, equipos, XP, niveles y medallas |
| `src/nucleo/02-kit-mapas.js` | `mapKit()` (`add`, `ramp`, `wall`, `stairs`, `mover`, `I`, `finish`), `MAPDEFS` y `mapFromData()` (mapas del editor) |
| `src/nucleo/02-mapas/N-id.js` | **un archivo por mapa**: 1 represa, 2 humita (el id interno sigue siendo `panymanteca`, no cambiarlo: lo usan los ajustes guardados, la votación y `public/maps/panymanteca.jpg`), 3 lacuenca, 4 puente (era el de Captura la bandera; hoy se juega en Team Deathmatch), 5 fuertes (francotiradores), 6 cuartotramo, 7 skatenight (de noche, con linternas), 8 pyramid (noche lovecraftiana sin linterna, 5 niveles con pozo de **gravedad cero**: `zerog` en el mapa + `inZeroG`/`ZG` en `04-fisica.js`; usa `navMaxY` para que los bots naveguen por encima de 12,5 m y `theme.ambiente:'piramide'` para su sonido), 9 santuario (**El Santuario Dual**, el mapa de Captura el dominio: ver la sección de abajo). Cada uno termina con `MAPDEFS.id = función;` (el `id`, no el nombre del archivo) |
| `src/nucleo/03-registro-mapas.js` | arma `MAPS`, apariciones seguras, alias de mapas viejos, plataformas móviles, mapa de prueba del editor |
| `src/nucleo/04-fisica.js` | movimiento estilo Quake (`pmove`), saltadores, raycast, impactos a jugadores, proyectiles |
| `src/nucleo/05-navegacion.js` | grafo de navegación de los bots (links tipo 5 = flotar por el pozo de gravedad cero de Pyramid; el bot los recorre con `zgSteer` en `7-bots.js`) |
| `src/nucleo/06-bots-y-filtros.js` | dificultad de bots `SKILL`, palabras censuradas, nombres y pieles |
| `src/nucleo/07-partida/1-base.js` | clase `Game`: constructor, conexiones, mensajes de los clientes, votación para echar |
| `src/nucleo/07-partida/2-aparicion-tienda.js` | aparecer, equipo inicial, tienda, créditos |
| `src/nucleo/07-partida/3-disparos.js` | disparos, proyectiles, **explosiones (daño de área)**, fuego de molotov |
| `src/nucleo/07-partida/4-danio.js` | daño, blindaje, muertes, rachas, gungame. **Arena termina siempre por tiempo**: el corte por frags quedó detrás de la bandera `fragLimit` del modo (hoy ningún modo la prende); los modos por equipos usan `teamLimit` |
| `src/nucleo/07-partida/5-banderas-items.js` | banderas (código viejo de Captura la bandera: quedó apagado, ningún modo lo prende), **`give()` (qué da cada ítem)**, sifón, recoger ítems |
| `src/nucleo/07-partida/6-ciclo.js` | puntajes, fin de partida, votación de mapa, bots de relleno, `tick`, snapshot |
| `src/nucleo/07-partida/5b-dominio.js` | **Captura el dominio**: generadores, barreras, bosses (IA y ataques), quién gana, bots del modo y comandos de prueba |
| `src/nucleo/07-partida/6b-cartas.js` | **cartas de mejora** (roguelike): reparto a las 3, 7 y 12 bajas (`CARD_AT`), elección, fuego del toque ígneo y explosión al morir |
| `src/nucleo/07-partida/6c-corona.js` | **La Corona** (Arena): aparición, quién la lleva, puntos y créditos |
| `src/nucleo/07-partida/6d-tormenta.js` | **la tormenta del último minuto** (Arena): zona segura que se achica y daño afuera |
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
| `js/10-personaje-robot.js` | **personaje robot CUE-87** (hecho en código): `buildPlayer`, colores por parte (`c`, `ck`, `cp`, `cb`, `cl`, `c2`, `c3`, `v`, `em`, `ce`, `img`), esqueleto con cadera, columna, rodillas y pies, agarre del arma con dos manos (IK), animaciones (`rbAnimar`, `rbMuerte`), nivel de detalle (`rbLod`) y colores de las manos en primera persona (`vmSync`) |
| `js/10-personajes-items.js` | modelo del jugador con piel, modelos de ítems (`buildItem`), sifón |
| `js/10b-corona.js` | La Corona: modelo, haz de luz y avisos |
| `js/10c-tormenta.js` | la tormenta: muro, viñeta y HUD |
| `js/10d-dominio.js` | **Captura el dominio**: bosses en código con animación procedural (`buildBoss`, `updBoss`), generadores, barreras, arte del mapa (`dmArt`), avisos, HUD (`domHud`), minimapa (`domMap`) y sonidos `SFX.dom*` |
| `js/11-estado-red.js` | estado del jugador `me`, `LocalNet` (práctica) y red online |
| `js/12-mensajes.js` | mensajes del servidor (`onMsg`), chat, eventos |
| `js/13-disparos.js` | proyectiles del lado del cliente, rocket jump, disparar |
| `js/14-tienda.js` | tienda (B) y taquilla |
| `js/14b-cartas.js` | **cartas de mejora**: el texto de las cartas en HTML por encima de la escena del mercader (`openCards`/`pickCard`), frases del mercader, mazo de abajo a la izquierda, chispas del fuego |
| `js/14c-mercader.js` | **El Mercader del Umbral en 3D**: escena aparte dibujada encima del juego (`drawMerc` al final de `frame`), hecho con primitivas (manto, capucha, seis ojos, barba de tentáculos, manos, farol con luz, neblina). Tiempos y posiciones en la constante `MERC`; se apaga con `S.merc`, se calma con `S.mred` y no existe en calidad Liviana (`S.q`) |
| `js/15-entrada.js` | teclado, mouse, menú de echar (Y) |
| `js/15b-tactil.js` | **controles táctiles** (celulares y tablets): palanca flotante a la izquierda, arrastrar a la derecha para mirar y botones (`TCB`). Se prenden solos con `TACTIL` (`00-inicio-ajustes.js`) o al primer toque; el HUD se reacomoda con `body.tactil` en `estilos.css`. No usan el bloqueo del mouse |
| `js/16-simulacion.js` | movimiento propio e interpolación de los demás |
| `js/17-hud.js` | HUD, fila de líderes por bajas (`renderKillRow`, solo Arena y Gungame) y **El Grimorio del Umbral** (`renderGrimorio`): las cartas que tiene el jugador, abajo del tablero (Tab) |
| `js/18-camara.js` | cámara, arma en mano y jugadores remotos (`updRemote`) |
| `js/18-noche.js` | **modo noche** (mapas con `theme.noche`, hoy solo Skatenight; la linterna se prende con **G**, la T es el chat. Pyramid NO es de noche: su música y ambiente van por `theme.ambiente:'piramide'` en `pyramidAmbient`): linterna del arma, haces y focos de los rivales, visores apagados (`updNight`, `nightRemote`) |
| `js/18-tercera-persona.js` | **vista en tercera persona** (H alterna, J cambia de hombro; Ajustes → Video): cámara sobre el hombro con choque contra paredes, modelo propio animado (`updMiModelo`), apuntado hacia el punto de la mira (`tpApunte`) y boca del arma (`tpMuzzle`). El estado va en `TP` y en `S.view`, `S.shoulder`, `S.tpd` |
| `js/18-espectador.js` | **espectador** al estar muerto: clic izquierdo = mirar a otro jugador vivo, Espacio = cámara orbital; arma en mano del que mirás (`povGun`) |
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

## Captura el dominio (modo `dominio`, mapa `santuario`)

Reemplazó a Captura la bandera (`MODE_ALIAS` manda `ctf` a `dominio`). Rojo (este, se ve naranja) contra azul (oeste). Cada equipo tiene un **boss** de 14 m en su fortaleza, detrás de **3 barreras** de campo de fuerza (carriles norte, centro y sur) que alimentan **2 generadores** cada una. Se rompen los dos generadores, cae la barrera, se entra y se mata al boss: la partida termina en el acto. A los 15 minutos gana el que más vida porcentual le sacó al boss rival; después desempatan barreras tiradas, generadores rotos y daño total; si todo empata, empate.

- **Todo se balancea en `DOM`** (`src/nucleo/01-datos.js`): `GEN_HP`, `BAR_NEED` (1 = con un generador basta), `BAR_REARM` (segundos para que la barrera vuelva; 0 = nunca), `BOSS_HP`, `BOSS_H`, `CORE_MULT`, `WARN`, `GCD`, los ataques (`LASH`, `GRAB`, `PULSE`, `ORBS`, `ZONE`), `SPAWN_INV`, `FWD_SPAWN`, `PAY` (créditos) y `BOT_DODGE`/`BOT_DEF`.
- **Barreras en la física compartida** (`04-fisica.js`): son bloques `clip` con `bar: { team, lane, i, down }`. `PASA` dice para qué equipo se calcula; el movimiento lo toma de `s.tm` y los disparos de `setPasa(equipo)` (siempre restaurar el valor que devuelve). `raycast` devuelve también el bloque (`b`): así se sabe si un tiro dio en un generador (`b.gen`) o en un boss (`b.boss`).
- **El mapa** (`02-mapas/9-santuario.js`, 188 × 136 m) declara `gens`, `bars`, `bosses`, `bossPts`, `defPts`, `tspawns`, `fspawns` (reaparición adelantada) y `deco`. Cada partida trabaja sobre una copia de las barreras (`domSetup`), así las salas no se pisan. Es una arena ancha, no un pasillo: cruzarlo lleva 18-19 s. Cinco zonas en espejo (plaza central, dos tierras de nadie, dos fortalezas) y 1672 bloques armados con un kit de piezas (`caja`, `barril`, `columna`, `arco`, `muroRoto`, `cano`, `engranaje`, `farola`, `reja`, `baranda`, `escombro`, `vitral`, `cupula`). **Todo lo que se ve choca**: no hay bloques `nc` en este mapa (lo controla la sección 9 de `probar.js`); si alguna vez hace falta algo atravesable a propósito, marcalo `nc: 1, atravesable: 1`. El comando de chat `/colisiones` dibuja todas las cajas en wireframe.
- **Puestos de reabastecimiento**: cada carril tiene uno a 13 m de los generadores, del lado del atacante (tarima, parapeto que te tapa de los generadores, botiquín, munición del carril y un chaleco en el centro). Son ítems comunes, con el respawn de `ITEMS`.
- **Ataques de los bosses** (`DOM.ATK`): tres etapas (aviso con la forma marcada en el piso, golpe y recuperación). El boss gira mientras avisa y después queda clavado. Rojo: látigo de cadena, agarre y pisotón en anillo (se esquiva saltando). Azul: pulso, orbes que persiguen y barrido del núcleo. El daño sale exactamente donde y cuando lo mostró el aviso. Debajo de `ENRAGE` entra en furia y ataca más seguido (aviso `furia`).
- **Minions** (`07-partida/5c-minions.js` y `cliente/js/10e-minions.js`), en dos clases. **Guardianes**: `DOM.MIN.POR_GEN` (3) por generador, cuerpo a cuerpo y a distancia, reaparecen cada `RESP` mientras viva el generador. **Oleadas estilo LoL** (`domOla`, `tickOla`): la primera a los `OLA_INI` s y después cada `OLA_CADA`, por los 3 carriles y de los dos equipos: `OLA_C` cuerpo a cuerpo, `OLA_D` a distancia y uno de asedio cada `ASEDIO_CADA` oleadas. Marchan por una ruta sacada de la navegación de los bots (`domRuta`), pelean con prioridad minions → jugador que dañó a un aliado (`p.aggT`) → jugadores → generadores del carril (y el boss si la barrera cayó). La barrera rival los frena (`setPasa`). Crecen `CRECE` cada `CRECE_CADA` s. Tope `MAX` de oleada por equipo. Último golpe: `CRED + LAST_HIT`. Red: mensaje `mn` por jugador, solo los que tiene a menos de `INTERES` m (`domMinEnviar`). Todo se balancea en `DOM.MIN`.
- **Bots**: `domObjective` los reparte por carril (`id % 3`), `domBotTarget` les da a qué estructura tirar, `domDanger` los saca de los ataques avisados. La navegación es una sola; las barreras cerradas se prohíben por equipo en `dijkstra(nav, inicio, ban)`.
- **Red**: `dm` (estado completo) en `welcome`, `start`, `sc` y `end`; en el snapshot solo lo que cambió (`bs`, `gh`, `ob`, `mn` minions); avisos `dom`. Suma unos 0,1 KB/s por jugador (los minions, 0,06 más).
- **Locutor**: avisos `dom` con `a: 'genalert'` (atacan un generador, solo para el que lo defiende, cada `ALERT_EVERY`), `'alert'` (atacan tu boss), `'furia'` y `'tiempo'` (los segundos de `DOM.AVISOS`). El cliente los muestra con `announce()` en `10d-dominio.js`.
- **Tablero**: la columna "Objetivos" trae el detalle por jugador en `s[15] = [generadores, rutas abiertas, daño al boss, minions]` (`scores()` en `6-ciclo.js`, `objCel()` en `cliente/js/17-hud.js`). Las bajas de estructuras salen también en el registro lateral (`feedLine`).
- **Bosses**: no hay `.glb`; están hechos en código a partir de las imágenes. Son fijos (giran, no caminan). El núcleo del pecho es una esfera (`CORE_R`) que solo cuenta de frente.
- **La fortaleza está sellada**: además de las 3 barreras hay un campo permanente (`bar.i = 250`, sin generadores) sobre todo el muro, hasta 70 m. La única entrada para el rival es un portón con la barrera caída.
- **Comandos de prueba** (práctica, u online con `DEV=1`): `/gen 1-12`, `/barrera 1-6` (1-3 rojas, 4-6 azules; norte, centro, sur), `/boss rojo|azul 0-100`, `/tiempo SEGUNDOS` (este anda en todos los modos: sirve para ver la tormenta de Arena), `/ir rojo|azul|centro|1-12`.
- **Pruebas**: secciones 6 (modo), 7 (cañón de plasma), 8 (avisos, estadísticas y puestos), 9 (colisiones) y 10 (oleadas) de `herramientas/probar.js`.
- **Versión del build**: `armar.js` calcula una huella del código y la pone en el menú (abajo a la derecha), en la consola y en `game.js?v=` para que la caché nunca mezcle versiones.

## Tareas comunes

- **Rifle de plasma (arma 6):** se carga manteniendo el botón. Todo está en `CARGA` (`01-datos.js`): `MIN` (menos que eso no dispara), `MAX` (carga llena), `SOBRA` (si la mantenés de más se descarga sola), `DMG_MIN`/`DMG_MAX`/`EXP` (la curva), `HAZ_MIN`/`HAZ_MAX` (cuánto se ve el rayo) y `LENTO` (cuánto te frena). **La carga la mide el servidor** con el reloj de la partida desde el mensaje `chg` (`1-base.js`) hasta el `fire`: el cliente solo la predice para el HUD. Si te pegan mientras cargás, la perdés (`damage()` pone `chgT = 0`). Los bots usan `botCarga()`.
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

## Flujo de trabajo (rama + prueba local, siempre)

1. **Todo cambio se hace en una rama** (`git checkout -b nombre-corto`), nunca directo en `main`. Cada push a `main` se publica solo en Render.
2. Al terminar: `node herramientas/armar.js` y `node herramientas/probar.js` (tiene que decir "Todo bien."), commit en la rama y push de la rama.
3. **El usuario prueba desde el artifact de práctica** (no en su PC): después del push de la rama, publicar `public/index.html`, `game.js`, `editor.html` y `modelos/modelos.json` en el artifact de práctica (ver "Probar y publicar") y avisarle. Si pide los comandos para correrlo en local (Windows, PowerShell): `git fetch`, `git checkout nombre-corto`, `node herramientas/armar.js`, `$env:PORT=3999; node server.js` y abrir http://localhost:3999.
4. **Nunca hacer merge ni push a `main` hasta que el usuario pruebe y diga que está bien o pida publicar.** Si algo se ve mal, corregir en la misma rama.
5. Las cuentas de Google/Supabase pueden no andar en local (las claves no están en el repo, a propósito); para armas, mapas y balance no hacen falta.

## Probar y publicar

```bash
node herramientas/armar.js        # después de cada cambio en src/
node herramientas/probar.js       # prueba rápida; tiene que terminar en "Todo bien."
PORT=3999 node server.js          # jugar localmente en http://localhost:3999 (práctica y online)
```
Publicar (solo después de que el usuario probó la rama): merge a `main` y `git push` (Render despliega solo; si no, "Manual Deploy → Deploy latest commit"). Después actualizar la práctica: publicar el artifact con `public/index.html` y los archivos `game.js`, `editor.html`, `modelos/modelos.json` y los `.glb` que haya.

## Reglas que no se rompen

- La clave secreta de Supabase nunca va al navegador; la tabla `jugadores` mantiene RLS activado.
- No tocar el proyecto de Supabase "RN Negocio Inmobiliario".
- `CUENTAS_SECRET` y la API key de Render no se escriben en el chat ni en el repo.
- El servidor es la autoridad: daño, ítems y puntos se deciden en `src/nucleo/`, nunca solo en el cliente.
- Cuidar el rendimiento: las sombras se hornean una vez por mapa, los jugadores no proyectan sombras reales (tienen sombra de mancha), y cada arma ronda las 10 llamadas de dibujo.
