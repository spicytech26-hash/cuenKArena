# CuenkArena

Deathmatch online estilo Quake que corre en el navegador. Mapa **dm1 · La Represa**, siete armas, plataformas de salto, teletransportador, daño cuádruple, bots y movimiento con *strafe jump* y *bunny hop*.

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

Otras opciones que también soportan WebSockets: Railway, Fly.io (hay un `Dockerfile`) o cualquier VPS con `node server.js`. Vercel y Netlify **no** sirven para el servidor porque no mantienen conexiones WebSocket abiertas.

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

Comandos en el chat (tecla T): `/bots 6`, `/bots auto`, `/skill 2`, `/fraglimit 30`, `/restart`.

## Controles

| Tecla | Acción |
|---|---|
| W A S D | moverse |
| Espacio | saltar (mantenelo para encadenar saltos) |
| Mouse / click | apuntar / disparar |
| 1–7, rueda, Q | armas (Q vuelve a la anterior) |
| Tab | tabla de frags |
| T o Enter | chat |
| + / − | agregar o sacar bots (solo en práctica) |
| Esc | menú y ajustes |

Para ganar velocidad como en Quake: saltá, soltá W, mantené A o D y girá el mouse suave hacia ese lado. Cada salto encadenado suma velocidad. El velocímetro está debajo de la mira (320 u/s es correr normal).

## Cómo está armado

```
server.js          servidor HTTP + WebSocket propio (sin librerías), corre la partida a 60 Hz
public/index.html  cliente: render con three.js, HUD, menú, sonido sintetizado, red
public/game.js     núcleo compartido: mapa, física, armas, ítems, reglas y bots
```

`game.js` lo usan los dos lados. El servidor es la autoridad sobre salud, munición, ítems, frags, proyectiles y bots. Cada cliente simula su propio movimiento (para que se sienta instantáneo) y le avisa al servidor dónde está 30 veces por segundo; el servidor manda el estado de todos 20 veces por segundo y el cliente interpola a los demás. Los disparos instantáneos los detecta el cliente que dispara y el servidor los valida (distancia, ángulo y que no haya una pared en el medio).

La práctica con bots del menú corre la misma clase `Game` dentro del navegador, sin servidor.

### Editar el mapa

El mapa está en `buildMap()` dentro de `public/game.js`. Todo son cajas, como los *brushes* de Quake:

- `add(x0, y0, z0, x1, y1, z1, 'material')` agrega un bloque sólido.
- `stairs(...)`, `ramp(...)` y `wall(... , [puertas])` arman escaleras, rampas y paredes con aberturas.
- `pads.push(...)` agrega una plataforma de salto con su punto de llegada; `teles.push(...)` un teletransportador.
- `I('tipo', x, y, z)` coloca un ítem y `spawns` define dónde aparecen los jugadores.

Los bots generan su mapa de navegación solos a partir de las cajas, así que no hace falta marcar caminos a mano.

### Seguridad

El servidor confía en la posición que manda cada cliente, así que alguien con conocimientos podría hacer trampa moviéndose donde quiera. Para jugar con amigos alcanza; para un servidor público grande convendría validar el movimiento del lado del servidor.
