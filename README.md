# CuenkArena

Deathmatch online estilo Quake que corre en el navegador. Al terminar cada partida los jugadores votan el próximo mapa, entre ellos **dm3 · La Cuenca** (la Universidad de la Cuenca del Plata de Posadas, con la plaza y el edificio para recorrer por dentro), **dm1 · La Represa** (industrial, con lava) y **dm2 · Humita** (un boliche con pista LED, plataformas móviles, ascensores y subwoofers que te lanzan). Siete armas, tienda con créditos, taquilla para personalizar tu personaje, bots y movimiento con *strafe jump* y *bunny hop*.

## Modos de juego

Al tocar **Jugar online** (o **Práctica con bots**) elegís el modo. Cada modo es una sala aparte del servidor.

- **Francotiradores** (mapa *snp1 · Fuertes del Cañón*): rojo contra azul, cada equipo en su establo a un lado del cañón. Solo francotirador (mata de un tiro, munición infinita) y cuchillo (con el cuchillo en la mano corrés un 30 % más rápido). Una racha de 6 bajas sin morir desbloquea la escopeta doble (tecla 2) hasta que te maten. Sin tienda y sin mira: la retícula aparece solo al apuntar con el clic derecho. Gana el primer equipo a 30 bajas o el que tenga más a los 6 minutos.
- **Arena**: todos contra todos en La Represa, Humita y La Cuenca, con créditos y tienda. Cada partida dura **6 minutos** (online y en práctica).
- **Gungame**: todos arrancan con la ametralladora y cada baja te da la siguiente arma de una lista de 20 niveles (armas fuertes primero, pistola, riel y francotirador al final, cuchillo en el último). Munición infinita, sin tienda y sin nada tirado en el mapa (ni armas, ni vida, ni blindaje). Además de la del nivel tenés siempre el cuchillo: si te matás solo, o te matan con cuchillo, bajás un nivel. Gana el primero en hacer la baja número 20.
- **Team Deathmatch**: rojo contra azul, cada baja suma para el equipo hasta llegar al límite. Online la sala espera a tener **4 jugadores** (mientras tanto hay calentamiento y las bajas no cuentan) y arranca con una cuenta regresiva. El límite de bajas lo elige el primero en entrar desde la pantalla de modos, y se puede cambiar desde el menú (Esc) mientras esperan.
- **Captura la bandera**: rojo (Posadas) contra azul (Encarnación) en **ctf1 · El Puente**. Robá la bandera rival del fortín enemigo y llevala hasta el pedestal de tu base (cuenta aunque tu bandera esté robada). Si matan al que la lleva, la bandera queda tirada 20 segundos: si la toca su equipo vuelve a la base. Gana el primer equipo en capturarla 3 veces (se cambia con `/caplimit N`). No hay fuego amigo y los equipos se equilibran solos con los bots.

## Armas

Como en Counter-Strike llevás **una sola arma principal** (ranura 1): arrancás con la escopeta, y si comprás otra, la reemplaza (aparecés con la comprada hasta que termina la partida; la escopeta se puede volver a elegir gratis en la tienda). Las armas tiradas en el mapa se levantan solas si todavía tenés la escopeta de base; si ya compraste otra, parate al lado y apretá **E** para cambiarla. Todos arrancan con pistola (automática, 60 balas que comparte con la ametralladora; se recargan juntando cajas de balas), escopeta y cuchillo. En Gungame la munición es infinita. Las demás se juntan del mapa o se compran.

| Arma | Daño | Tiros para matar (100 de vida / con blindaje 100) |
|---|---|---|
| Pistola | 22 | 5 / 8 |
| Escopeta | 10 perdigones de 11 | 1–2 / 2–3 de cerca |
| Escopeta doble | 12 perdigones de 11 por tiro, dos tiros y recarga (R) | 1 / 2 de cerca |
| Ametralladora | 16 | 7 / 10 |
| Lanzagranadas | 110 de área + 40 directo; explota al segundo. Si le pega de lleno a alguien antes de rebotar: 100 directo, explota en el acto y da ¤ 150 | 1 / 2 |
| Lanzacohetes | 80 directo + 85 de área en 4,5 m (el rocket jump empuja igual que antes) | 1 / 1 |
| Rifle de plasma | 110 (atraviesa) | 1 / 2 |
| Cuchillo mariposa | 55, 99 por la espalda; el segundo tajo dentro de 4 s mata siempre; ignora el blindaje; alcance 2,6 m | 2 / 2 |
| Francotirador | 115, 230 a la cabeza (click derecho: mira) | 1 / 2 |
| Bomba molotov (tecla 4 o G) | se rompe al primer golpe y deja 6 s de fuego en 5 m de radio: 5,5 cada décima de segundo, unos 55 por segundo (la mitad a vos). Es de un solo uso: se compra estando vivo por ¤ 300 (3 por compra, hasta 6) y si te matan la perdés | — |
| Rifle de caza | cualquier impacto mata | 1 / 1 — la bala viaja a 260 m/s y cae un poco (67 cm a 100 m); click derecho apunta con las miras de hierro. Los tiros de más de 22 m, al aire o con mucho vuelo dan premio en créditos |

El blindaje absorbe un tercio del daño y llega como máximo a 100; la megasalud sube hasta 150.

## Dificultad de los bots

Se elige al escoger el modo (y en práctica también desde Ajustes, en plena partida). Cada nivel cambia el tiempo de reacción, la puntería, qué tan rápido siguen tus movimientos, la cadencia, el daño, cuánto ven y cuánto esquivan. Online, el primero que entra a una sala vacía define la dificultad; después se cambia con `/skill 0-3`.

## Detalles de juego

- Al terminar una partida se ve el ganador, el próximo mapa y la cuenta regresiva (25 s), con **Seguir jugando** y **Volver al menú**.
- Agacharse con **Ctrl** necesita pantalla completa: el juego la pide al empezar (se desactiva en Ajustes). Sin pantalla completa, Ctrl+W cierra la pestaña en el navegador, así que usá **C**; igual el juego pide confirmación antes de cerrar.
- El rifle de caza se apunta con sus miras de hierro (click derecho), sin mira telescópica.
- En La Represa, si caés al pozo de lava del centro hay dos salidas: el **géiser de magma** del medio, que burbujea para avisar y cada 3,6 s erupciona y te tira afuera (justo sobre el saltador que lleva al balcón), y **cuatro piedras de basalto** que suben y bajan por turnos: abajo quedan a ras de la lava, te subís caminando y desde arriba saltás al borde.
- La Represa renovada:
  - **Sala de compuertas (ala oeste):** la compuerta gigante de la represa en la pared, una **pasarela de la grúa** a 9,5 m que cruza toda la sala (se sube por una escalera nueva desde el nivel alto o con un **ascensor** en el pasillo del medio), con blindaje y celdas de plasma arriba, y cajas para cubrirse.
  - **Patio norte:** una **vagoneta de carga** va y viene sobre rieles cruzando el patio. Sirve de cobertura que se mueve, y si te subís te lleva.
  - **Mirador (techo del sótano):** la terraza vacía ahora tiene un **puesto de vigía** a 9 m con escalera, donde está el francotirador; un **tanque de agua** sobre patas con un saltador para subir (con botiquín arriba); equipos de refrigeración, pretiles y cajas para cubrirse, y una antena.
  - **Subestación (patio norte, lado este):** dos transformadores con aisladores y un murito bajo.
  - **Más curación:** nueve botiquines nuevos repartidos (mirador, patio norte, entrada a la sala de lava, sala de compuertas, entrepiso y atrio).
  - **Sala de turbinas (sótano sur):** carcasas de turbinas contra el fondo y **dos pistones** que suben y bajan por turnos al lado del lanzacohetes, así la cobertura cambia todo el tiempo.
- En La Cuenca, las ventanas de los pisos se pasan saltando y agachándote, y hay un ascensor de salto en el pasillo del primer piso: pisá el saltador de la planta baja para subir y tirate por el hueco para bajar. Detrás del edificio, por el pasillo de atrás, una escalera larga sube pegada a la pared hasta la biblioteca del último piso.

## Créditos y tienda

Cada frag da ¤ 200 (¤ 100 extra si cortás una racha de 3 y ¤ 100 extra con pistola). Arrancás con ¤ 300. Con **B** se abre la tienda: pistola y escopeta vienen gratis; el resto de las armas, el blindaje y la cartuchera doble se desbloquean y quedan tuyos hasta que termina la partida (aparecés con eso cada vez). Los precios están en `SHOP` dentro de `public/game.js`.

## Taquilla

Desde el menú: color de armadura (o uno a elección), color de visor, accesorio e **imagen en el pecho** (una foto PNG o JPG de tu dispositivo, que se recorta cuadrada al centro y se achica a 128×128 para que pese poco; cubre todo el frente del torso). En Ajustes se pueden ocultar las imágenes de los demás. El personaje de la vista previa se gira arrastrándolo (o con las flechas). Se guarda en el navegador (y en tu cuenta si iniciaste sesión) y los demás lo ven al instante.

## Mira

En **Ajustes → Mira** hay 12 formas (cruz, cruz chica, cruz con punto, punto, círculo, círculo con punto, anillo punteado, horizontal, T, cruz hueca, equis y paréntesis), 8 colores o uno a elección y tamaño de 50 % a 250 %. Todas llevan un borde oscuro para verse sobre cualquier fondo.

## Cuentas, niveles y medallas

Con **Iniciar sesión con Google** se guardan en tu cuenta el nombre, el personaje de la taquilla y la mira, y vas sumando experiencia en las partidas **online** (en práctica no se gana):

| Al terminar la partida | XP |
|---|---|
| Por jugarla hasta el final | 50 |
| Por minuto jugado (hasta 15) | 5 |
| Por cada baja | 12 |
| Aguante: por cada minuto de tu vida más larga sin morir (hasta 50) | 10 |
| Si ganás (vos o tu equipo) | 50 |
| Por cada bandera capturada | 40 |

Máximo 700 por partida. Una partida normal de Arena (6 minutos) da unos 200-250 XP (10 bajas y aguantar 2 minutos vivo son 220), así que el primer nivel sale en una partida, el 5 en unas 5 y el 10 en unas 17. Si te vas antes de que termine, te llevás todo menos lo de terminarla y ganar (si te vas antes del primer minuto, solo las bajas). En la pantalla final se ve el detalle de dónde salió cada punto. Cada nivel pide más que el anterior (220 XP el primero y 60 más por cada nivel, hasta el 100). El nivel aparece como medalla en el menú y al lado de tu nombre en la tabla (Tab). Rangos: Recluta (1), Bronce (5), Plata (10), Oro (20), Platino (35), Diamante (50) y Leyenda (75).

### Activar las cuentas en Render

1. **Google:** en [console.cloud.google.com](https://console.cloud.google.com/) → *APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth*, tipo **Aplicación web**. En *Orígenes de JavaScript autorizados* poné `https://cuenkarena.onrender.com` (y `http://localhost:3000` si querés probar en tu compu). Si te pide configurar la *pantalla de consentimiento*, elegí *Externo* y completá nombre y correo. Copiá el **ID de cliente** (termina en `.apps.googleusercontent.com`).
2. **Supabase** (donde se guardan los perfiles): el proyecto *CuenkArena* ya tiene la tabla `jugadores`. En el panel de Supabase → *Project Settings → API Keys* copiá la clave **secreta** (`sb_secret_...`, o la `service_role` en las claves antiguas).
3. **Render** → tu servicio → *Environment* → agregá:
   - `GOOGLE_CLIENT_ID` = el ID de cliente del paso 1
   - `SUPABASE_URL` = `https://kknowhfldecqumkmdwoy.supabase.co`
   - `SUPABASE_KEY` = la clave secreta del paso 2
   - `SESSION_SECRET` (opcional) = cualquier texto largo al azar

La clave secreta queda solo en el servidor; el navegador nunca la ve, y la tabla tiene RLS activado sin políticas, así que nadie puede leerla ni escribirla desde afuera. Sin `GOOGLE_CLIENT_ID` el botón de Google no aparece y el juego funciona igual. Sin Supabase las cuentas se guardan en `data/cuentas.json`, que Render borra en cada deploy.

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

## Daño

Cada impacto muestra al lado de la mira cuánto le sacaste (con un "ding" como en TF2) y suma la ráfaga; cuando dejás de pegarle aparece el **total** que le sacaste.

**Tiro a la cabeza:** cuando le pegás en la cabeza suena una campanita metálica (como el "dink" de Counter-Strike o el ding de TF2) en lugar del ding normal, y el número de daño sale en rojo con "¡CABEZA!".

**Rocket jump (lanzacohetes estilo Soldier de TF2):** a los enemigos les hace el mismo daño de siempre, pero tu propio cohete te saca mucho menos (más o menos 27 de vida si explota a tus pies) y te empuja fuerte hacia arriba y hacia adelante. Disparando al piso quieto subís unos 4 m; si saltás y disparás al piso en el mismo momento (mejor agachado) llegás a unos 7 m, ideal para subir a lugares altos o cruzar el mapa rápido.

**Chat:** cada jugador tiene su propio color de nombre en el chat (claro y fácil de leer, sin importar el color de su armadura). En los modos por equipos, un cuadradito al lado del nombre muestra de qué equipo es.

## Al morir

Como en Team Fortress 2: la cámara vuela hasta quedar enfrente del que te eliminó y lo muestra unos segundos (*Te eliminó X con Y · Reaparecés en 3*), y reaparecés solo a los 3,6 s. Mientras tanto podés abrir la tienda con B. Si te mata la lava, una caída o tu propia explosión, la cámara da una vuelta sobre donde caíste.

Las bajas con francotirador o rifle de caza **sin apuntar con la mira** se anuncian para todos: *JUGADOR mató SIN USAR MIRA a JUGADOR2*.

## Fin de partida

Al terminar aparece la tabla con la cuenta regresiva a la próxima partida. **Jugar de nuevo** en práctica arranca otra al instante; online marca que estás listo (se ve *2/3 jugadores listos*) y, cuando todos los que están en la sala lo apretaron, arranca sin esperar la cuenta.

## Votación para echar a un jugador

En las partidas online, con **Y** (el cartel *Y · KICKEAR* está arriba de *B · TIENDA*) se abre un menú con las personas de la partida: elegís a una con el número o un click y confirmás con Enter. A todos los demás les aparece a la izquierda un panel de votación con barras de sí y no, la marca de cuántos votos hacen falta y una barra del tiempo que queda. También se puede desde el menú de pausa (**Esc**) → el enlace chiquito *Votar para echar a alguien* (abajo de los botones), o con `/echar NOMBRE` en el chat. Todos ven el cartel y votan con **Y** o **N** durante 30 segundos. Pasa si vota que sí más de la mitad de los demás jugadores (hacen falta 3 personas como mínimo). La primera vez que echan a alguien en una partida puede volver a entrar enseguida, y le aparece un cartel avisándole que una segunda echada no lo dejará entrar hasta que termine la partida. Si lo echan por segunda vez, el cartel le muestra cuánto falta para que termine la partida (con cuenta regresiva) y recién ahí puede volver. Al terminar la partida se borra todo y se empieza de cero. Al echado se lo reconoce por su cuenta de Google o por su navegador, nunca por la IP ni por el nombre, así los que juegan en el mismo wifi o se llaman igual no quedan afuera. Cada jugador puede iniciar una votación cada 90 segundos.

## Palabras censuradas

En el chat y en los nombres (también los de las cuentas) se tapan con asteriscos FATI, FATIMA, FATY, ANA, VANI, VANINA, VAGINA, BRENDA, BARBIE, BARBI, BARBARA, AGAZZONI, LEGUIZAMÓN y FAT I, con sus variantes: mayúsculas, tildes, letras repetidas, números en lugar de letras (4N4, F4T1), letras separadas (a n a, f.a.t.i), palabras partidas en dos o tres pedazos (fat i, aga zzoni), diminutivos y plurales. Se comparan palabras enteras, así que *banana*, *mañana* o *Anabel* no se tocan. La lista está en `BAD_WORDS` dentro de `public/game.js`.

## Configuración

Variables de entorno opcionales:

| Variable | Por defecto | Qué hace |
|---|---|---|
| `PORT` | 3000 | Puerto HTTP |
| `BOTS` | 0 | Si es mayor a 0, rellena con bots hasta tener esa cantidad de jugadores. Por defecto la partida online arranca sin bots; se agregan desde el chat con `/bots N` |
| `BOT_SKILL` | 1 | 0 fácil · 1 normal · 2 difícil · 3 pesadilla |
| `FRAGLIMIT` | 20 | Frags para ganar la partida |
| `TIMELIMIT` | 10 | Minutos por partida (la Arena siempre dura 6) |
| `MAX_PLAYERS` | 16 | Jugadores máximos, contando bots |
| `MAP` | represa | Mapa inicial de Arena: `represa` o `panymanteca` |
| `CAPLIMIT` | 3 | Capturas para ganar en Captura la bandera |
| `GOOGLE_CLIENT_ID` | — | Activa el inicio de sesión con Google (ver *Cuentas*) |
| `SUPABASE_URL` / `SUPABASE_KEY` | — | Dónde se guardan las cuentas (clave secreta, solo servidor) |
| `SESSION_SECRET` | derivada | Clave para firmar las sesiones |
| `CUENTAS_URL` / `CUENTAS_SECRET` | — | En lugar de `SUPABASE_KEY`: la función `cuentas` de Supabase, que guarda los perfiles sin exponer la clave secreta |

Comandos en el chat (tecla T): `/bots 6`, `/bots auto`, `/skill 2`, `/fraglimit 30`, `/caplimit 3` (bandera), `/map pan`, `/restart`. Los comandos afectan solo a la sala del modo en el que estás.

## Controles

| Tecla | Acción |
|---|---|
| W A S D | moverse |
| Espacio | saltar (mantenelo para encadenar saltos) |
| Mouse / click | apuntar / disparar |
| 1 · 2 · 3 · 4, rueda, Q | 1 arma principal, 2 pistola, 3 cuchillo (también V), 4 molotov. Q vuelve al arma que tenías antes. En Gungame: 1 el arma del nivel y 3 el cuchillo (acuchillar baja un nivel al otro) |
| E | agarrar el arma tirada al lado: reemplaza tu principal hasta que morís (al reaparecer volvés a tener la comprada). Si tenías un arma principal (comprada o levantada, no la escopeta de base), queda tirada en el mismo lugar donde estaba la que agarraste, para que otro la levante o la vuelvas a cambiar |
| F | inspeccionar el arma (como en CS o Valorant) |
| F o V | cuchillo |
| Ctrl o C | agacharse (más lento y más bajo; saltá y agachate para pasar por ventanas) |
| R | recargar la escopeta doble |
| Click derecho | mira del francotirador: un toque la deja puesta, otro la saca; si lo mantenés, se saca al soltar |
| G | bomba molotov |
| Y | online: abre el menú para elegir a quién echar (número o click, Enter confirma). Si hay una votación en la que no votaste, Y es *sí* |
| N | votar *no* en la votación para echar |
| B | tienda |
| Tab | tabla de frags |
| T o Enter | chat |
| + / − | agregar o sacar bots (solo en práctica) |
| Esc | menú y ajustes |

Para ganar velocidad como en Quake: saltá, soltá W, mantené A o D y girá el mouse suave hacia ese lado. Cada salto encadenado suma velocidad. El velocímetro está debajo de la mira (320 u/s es correr normal).

## Cómo está armado

```
server.js          servidor HTTP + WebSocket propio (sin librerías), corre la partida a 40 Hz con paso fijo; sirve los archivos comprimidos con gzip y con ETag
cuentas.js         inicio de sesión con Google, sesiones firmadas y perfiles en Supabase (o archivo local)
public/index.html  cliente: render con three.js, HUD, menú, sonido sintetizado, red
public/game.js     núcleo compartido: mapa, física, armas, ítems, reglas y bots
```

`game.js` lo usan los dos lados. El servidor es la autoridad sobre salud, munición, ítems, frags, proyectiles y bots. Cada cliente simula su propio movimiento (para que se sienta instantáneo) y le avisa al servidor dónde está 30 veces por segundo; el servidor manda el estado de todos 20 veces por segundo y el cliente interpola a los demás con un colchón que se adapta al jitter de la conexión. Los disparos instantáneos los detecta el cliente que dispara y el servidor los valida (distancia, ángulo y que no haya una pared en el medio).

La práctica con bots del menú corre la misma clase `Game` dentro del navegador, sin servidor.

### Editar el mapa

Los mapas están en `buildRepresa()`, `buildPanYManteca()`, `buildLaCuenca()` y `buildPuente()` dentro de `public/game.js`. Todo son cajas, como los *brushes* de Quake:

- `add(x0, y0, z0, x1, y1, z1, 'material')` agrega un bloque sólido.
- `stairs(...)`, `ramp(...)` y `wall(... , [puertas])` arman escaleras, rampas y paredes con aberturas.
- `pads.push(...)` agrega una plataforma de salto con su punto de llegada; `teles.push(...)` un teletransportador.
- `mover(...)` agrega una plataforma móvil (eje, amplitud, período y fase).
- `I('tipo', x, y, z)` coloca un ítem y `spawns` define dónde aparecen los jugadores.

Los bots generan su mapa de navegación solos a partir de las cajas, así que no hace falta marcar caminos a mano.

### Fluidez

- El mouse se lee **crudo** (`requestPointerLock({ unadjustedMovement: true })`, sin la aceleración del sistema) cuando el navegador lo permite, y solo se descarta un salto absurdo y aislado (más de 1200 px en un evento y 8 veces lo que venía), que es lo que a veces manda Chrome con el puntero bloqueado. Los giros rápidos reales nunca se descartan: Chrome junta en un solo evento todo lo que se movió el mouse en el cuadro.
- Los sombreadores de armas, jugadores, explosiones, rayos y proyectiles se preparan al cargar el mapa, y las explosiones y rayos se reutilizan: así no hay un microcorte la primera vez que aparece cada cosa.
- En la práctica, los bots buscan camino de a uno por paso y reutilizan memoria, y si un cuadro se atrasa no se encadenan pasos extra.
- Si igual notás tirones: activá la *aceleración por hardware* del navegador, probá con las extensiones apagadas, y si tu mouse permite 4000/8000 Hz, bajalo a 1000 Hz (los navegadores todavía no se llevan bien con esas tasas).

### Seguridad

El servidor confía en la posición que manda cada cliente, así que alguien con conocimientos podría hacer trampa moviéndose donde quiera. Para jugar con amigos alcanza; para un servidor público grande convendría validar el movimiento del lado del servidor.

## Rendimiento

- Los rayos (disparos, línea de visión de los bots, explosiones) primero descartan con una prueba rápida que no crea objetos, así no se llena la memoria de basura ni hay pausas del recolector.
- La navegación de los bots se arma varias veces más rápido, y el servidor la prepara para todos los mapas al arrancar. Antes, cada cambio de mapa congelaba la partida un par de segundos para todos. En la práctica se arma la del próximo mapa mientras se ve la tabla final.

## Fin de partida

Al terminar aparece la pantalla final con el ganador en grande, un **podio** con los tres primeros, y una **tabla** con las bajas, muertes, daño hecho (lo que de verdad le sacaste a los demás) y K/D de cada jugador; lo mejor de cada columna se marca. Si tenés cuenta, abajo está tu **tarjeta de experiencia**: la barra se llena con animación desde la XP que tenías hasta la nueva, cuenta los puntos ganados y, si subís de nivel, cambia la medalla con un destello y "¡NIVEL N!".

Si se corta la conexión en medio de una partida online (por ejemplo cuando el servidor se reinicia al publicar una actualización), el juego intenta reconectarse solo durante un minuto.

## Sifón de escudo

Como en Quake Champions: cada jugador o bot que muere suelta **5 mini escudos** que saltan alrededor del cuerpo. Cada uno da **+5 de blindaje** (hasta 100) al que pasa por encima, con un sonidito y el aviso "+5 de escudo". Duran 10 segundos en el piso: a los 8 empiezan a parpadear (cada vez más rápido) y a los 10 desaparecen, así no se llena el mapa de escudos. Los que caen en la lava se derriten. Matar y pasar a buscar el escudo te deja listo para la próxima pelea.

## Escudos y botiquines

Los ítems de ayuda tienen forma propia: el **blindaje** es un escudo verde, el **blindaje pesado** un escudo dorado y rojo más grande, el **botiquín** una valija blanca con cruz roja y manija, y la **megasalud** una valija azul más grande con un anillo de luz.

## Votación del próximo mapa

En la pantalla final hay una tarjeta por cada mapa del modo, con su nombre y una foto chiquita del mapa (sacadas con el mismo motor del juego, en `public/maps/`). Se vota con un click o con 1, 2, 3; cada tarjeta muestra los votos y una estrella en el que va ganando, y se puede cambiar el voto. Gana el más votado; si hay empate entre los más votados, o si nadie vota, el mapa sale **al azar**.

## Novedades de La Cuenca y Humita

- **La Cuenca:** segunda escalera de emergencia en el fondo, del lado este: el que viene por el pasillo derecho ya no termina en un callejón, sube hasta la puerta de la biblioteca. Las **azoteas de los vecinos** ahora se usan: se sube con saltadores desde la calle. La de la derecha (7 m) tiene tanque de agua, equipos de aire, blindaje, botiquín y otro saltador que te lleva al techo del edificio; la de la izquierda (5 m) tiene chimeneas, cajas, antena, blindaje y botiquín.
- **Humita** (antes Pan & Manteca, el mismo boliche y del mismo tamaño): cuatro **tarimas LED** que suben y bajan por turnos en la pista, y la **terraza** del techo del lobby, que antes estaba vacía: barra, sillones, macetones con neón, parlantes, una escalera a la puerta del VIP y la **torre del DJ** con ascensor hasta un mirador a 10 m con el rifle de caza.

## Mapas ampliados

- **La Represa — salas más dinámicas:** en el patio norte, un **ascensor exterior** sube a la torre del riel en segundos (si lo agarrás a tiempo). En la sala de lava, una **barcaza** cruza la pileta por debajo de la pasarela hasta una repisa con saltador a la megasalud, y dos **géiseres de lava** que, si caés, te tiran a la pasarela alta o al andén. En la sala de compuertas, un **puente grúa** sale del ensanche de la pasarela y cruza la sala a 9,5 m.
- **La Cuenca — Polideportivo (al oeste):** se entra desde la calle o por una puerta desde la azotea de las casas. Cancha de madera con aros, **tribuna**, vestuarios con casilleros y bancos, una cubierta caminable arriba de los vestuarios, un balcón con escalera, una **plataforma que cruza la cancha** a 5,5 m y un saltador.
- **Humita — Backstage (detrás del escenario):** se entra por una puerta desde el escenario o desde arriba de las torres de parlantes. **Camarines** con espejo y sillón, el **micro de la gira** en el medio (se sube por las cajas), pasarelas a 5 m con una **pasarela móvil** que las cruza, un **montacargas** y un saltador.

## Muertes con cuchillo

En la lista de bajas, cuando alguien mata con el cuchillo aparece **"jugador1 le entró a pelo a jugador2"**.
- **Parkours más amables en La Represa:** la espiral de la torre tiene 12 plataformas más grandes (2,6 m) y más juntas, con escalones de 0,9 m (el salto llega a 1,4) y borde de neón para ver dónde caer; las columnas sobre la lava son más anchas (3 m) y más seguidas, con escalones de 0,7 m. Siguen pidiendo saltar bien, pero se suben de corrido.

## Fuertes del Cañón

Un cañón de roca roja en capas con un río abajo (si caés, te lleva el río) y una cascada al fondo. En cada meseta hay un **establo** rojo (planta baja con boxes, pajar con ventanas para tirar al otro lado, techo a dos aguas al que se puede subir) y un **mirador** de madera a 9 m con escalera, pretil, techo y la bandera del equipo. Se cruza por el **puente techado** del medio o por dos **puentes de tablones** sin baranda a los costados. En los patios hay fardos de pasto, carreta, rocas y una cerca al borde del cañón.
