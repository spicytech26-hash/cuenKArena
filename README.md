# CuenkArena

Deathmatch online estilo Quake que corre en el navegador. Dos mapas que rotan al terminar cada partida: **dm1 · La Represa** (industrial, con lava) y **dm2 · Pan & Manteca** (un boliche con pista LED, plataformas móviles, ascensores y subwoofers que te lanzan). Siete armas, tienda con créditos, taquilla para personalizar tu personaje, bots y movimiento con *strafe jump* y *bunny hop*.

## Modos de juego

Al tocar **Jugar online** (o **Práctica con bots**) elegís el modo. Cada modo es una sala aparte del servidor.

- **Arena**: todos contra todos en La Represa y Pan & Manteca, con créditos y tienda.
- **Gungame**: todos arrancan con la ametralladora y cada baja te da la siguiente arma de una lista de 20 niveles (armas fuertes primero, pistola, riel y francotirador al final, cuchillo en el último). Munición infinita, sin tienda ni armas tiradas. Además de la del nivel tenés siempre el cuchillo: si te matás solo, o te matan con cuchillo, bajás un nivel. Gana el primero en hacer la baja número 20.
- **Captura la bandera**: rojo (Posadas) contra azul (Encarnación) en **ctf1 · El Puente**. Robá la bandera rival del fortín enemigo y llevala hasta el pedestal de tu base (cuenta aunque tu bandera esté robada). Si matan al que la lleva, la bandera queda tirada 20 segundos: si la toca su equipo vuelve a la base. Gana el primero en llegar a 5 capturas. No hay fuego amigo y los equipos se equilibran solos con los bots.

## Armas

Todos arrancan con pistola (automática), escopeta y cuchillo. Las demás se juntan del mapa o se compran.

| Arma | Daño | Notas |
|---|---|---|
| Pistola | 18 por tiro | munición infinita, dispara manteniendo el click |
| Escopeta | 10 perdigones de 9 | |
| Escopeta doble | 12 perdigones de 9 por tiro | dos tiros y recarga (R) |
| Ametralladora | 12 por bala | fuego continuo y preciso |
| Lanzagranadas | 110 de área + 40 directo | radio 5,5 m, explota al tocar a alguien |
| Lanzacohetes | 100 directo + 105 de área | cohete rápido, sirve para rocket jump |
| Rifle de riel | 100 (150 a la cabeza) | atraviesa a todos en línea |
| Cuchillo | 40 por tajo (76 por la espalda) | cuerpo a cuerpo, nunca mata de un golpe a alguien sano |
| Francotirador | 95 (209 a la cabeza) | click derecho para la mira; sin mira es impreciso |

El blindaje absorbe la mitad del daño.

## Dificultad de los bots

Se elige al escoger el modo (y en práctica también desde Ajustes, en plena partida). Cada nivel cambia el tiempo de reacción, la puntería, qué tan rápido siguen tus movimientos, la cadencia, el daño, cuánto ven y cuánto esquivan. Online, el primero que entra a una sala vacía define la dificultad; después se cambia con `/skill 0-3`.

## Créditos y tienda

Cada frag da ¤ 200 (¤ 100 extra si cortás una racha de 3 y ¤ 100 extra con pistola). Arrancás con ¤ 300. Con **B** se abre la tienda: pistola y escopeta vienen gratis; el resto de las armas, el blindaje y la cartuchera doble se desbloquean y quedan tuyos hasta que termina la partida (aparecés con eso cada vez). Los precios están en `SHOP` dentro de `public/game.js`.

## Taquilla

Desde el menú: color de armadura (o uno a elección), color de visor y accesorio. Se guarda en el navegador y los demás lo ven al instante.

No tiene dependencias: solo necesitás **Node.js 18 o más nuevo**.

## Jugar en tu compu o en tu red local

```bash
node server.js
```

- Vos entrás en `http://localhost:3000`.
- Tus amigos conectados al mismo wifi entran con la dirección que imprime la consola, por ejemplo `http://192.168.0.15:3000`. Si no pueden entrar, revisá que el firewall de Windows deje pasar a Node.

## Publicarlo en internet gratis (Render)

1. Subí esta carpeta a un repositorio de GitHub.
2. Entrá a [render.com](https://render.com), creá una cuenta y elegí **New → Blueprint**.
3. Elegí el repositorio. Render lee `render.yaml` y arma todo solo.
4. Cuando termine te da una dirección del tipo `https://cuenkarena.onrender.com`. Esa es la que compartís.

El plan gratuito de Render apaga el servidor después de 15 minutos sin visitas. La primera persona que entra después espera unos 30–50 segundos a que arranque.

### Menos ping desde Argentina: Fly.io en São Paulo

Render solo tiene servidores en EE. UU. y Europa, así que desde Misiones el ping ronda los 150–200 ms. Fly.io tiene región en São Paulo (`gru`) y el repo ya trae `fly.toml` y `Dockerfile`:

1. Instalá `flyctl` y hacé `fly auth signup` (pide tarjeta).
2. En la carpeta del juego: `fly launch --no-deploy --copy-config` (si `cuenkarena` está tomado, elegí otro nombre).
3. `fly deploy`.

La máquina más chica cuesta unos pocos dólares por mes y se apaga sola cuando nadie juega.

Vercel y Netlify **no** sirven para el servidor porque no mantienen conexiones WebSocket abiertas.

## Configuración

Variables de entorno opcionales:

| Variable | Por defecto | Qué hace |
|---|---|---|
| `PORT` | 3000 | Puerto HTTP |
| `BOTS` | 0 | Si es mayor a 0, rellena con bots hasta tener esa cantidad de jugadores. Por defecto la partida online arranca sin bots; se agregan desde el chat con `/bots N` |
| `BOT_SKILL` | 1 | 0 fácil · 1 normal · 2 difícil · 3 pesadilla |
| `FRAGLIMIT` | 20 | Frags para ganar la partida |
| `TIMELIMIT` | 10 | Minutos por partida |
| `MAX_PLAYERS` | 16 | Jugadores máximos, contando bots |
| `MAP` | represa | Mapa inicial de Arena: `represa` o `panymanteca` |
| `CAPLIMIT` | 5 | Capturas para ganar en Captura la bandera |

Comandos en el chat (tecla T): `/bots 6`, `/bots auto`, `/skill 2`, `/fraglimit 30`, `/caplimit 3` (bandera), `/map pan`, `/restart`. Los comandos afectan solo a la sala del modo en el que estás.

## Controles

| Tecla | Acción |
|---|---|
| W A S D | moverse |
| Espacio | saltar (mantenelo para encadenar saltos) |
| Mouse / click | apuntar / disparar |
| 1–9, rueda, Q | armas (Q vuelve a la anterior) |
| F o V | cuchillo |
| R | recargar la escopeta doble |
| Click derecho | mira del francotirador |
| B | tienda |
| Tab | tabla de frags |
| T o Enter | chat |
| + / − | agregar o sacar bots (solo en práctica) |
| Esc | menú y ajustes |

Para ganar velocidad como en Quake: saltá, soltá W, mantené A o D y girá el mouse suave hacia ese lado. Cada salto encadenado suma velocidad. El velocímetro está debajo de la mira (320 u/s es correr normal).

## Cómo está armado

```
server.js          servidor HTTP + WebSocket propio (sin librerías), corre la partida a 40 Hz con paso fijo
public/index.html  cliente: render con three.js, HUD, menú, sonido sintetizado, red
public/game.js     núcleo compartido: mapa, física, armas, ítems, reglas y bots
```

`game.js` lo usan los dos lados. El servidor es la autoridad sobre salud, munición, ítems, frags, proyectiles y bots. Cada cliente simula su propio movimiento (para que se sienta instantáneo) y le avisa al servidor dónde está 30 veces por segundo; el servidor manda el estado de todos 20 veces por segundo y el cliente interpola a los demás con un colchón que se adapta al jitter de la conexión. Los disparos instantáneos los detecta el cliente que dispara y el servidor los valida (distancia, ángulo y que no haya una pared en el medio).

La práctica con bots del menú corre la misma clase `Game` dentro del navegador, sin servidor.

### Editar el mapa

Los mapas están en `buildRepresa()`, `buildPanYManteca()` y `buildPuente()` dentro de `public/game.js`. Todo son cajas, como los *brushes* de Quake:

- `add(x0, y0, z0, x1, y1, z1, 'material')` agrega un bloque sólido.
- `stairs(...)`, `ramp(...)` y `wall(... , [puertas])` arman escaleras, rampas y paredes con aberturas.
- `pads.push(...)` agrega una plataforma de salto con su punto de llegada; `teles.push(...)` un teletransportador.
- `mover(...)` agrega una plataforma móvil (eje, amplitud, período y fase).
- `I('tipo', x, y, z)` coloca un ítem y `spawns` define dónde aparecen los jugadores.

Los bots generan su mapa de navegación solos a partir de las cajas, así que no hace falta marcar caminos a mano.

### Seguridad

El servidor confía en la posición que manda cada cliente, así que alguien con conocimientos podría hacer trampa moviéndose donde quiera. Para jugar con amigos alcanza; para un servidor público grande convendría validar el movimiento del lado del servidor.
