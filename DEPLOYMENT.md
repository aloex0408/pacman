# Despliegue de Pac-Man Rush

## Publicar y jugar en Vercel

1. Sube toda la carpeta del proyecto a un repositorio de GitHub. Incluye `vercel.json`, `Untitled-3.html`, `Untitled-1.js`, `Untitled-2.css`, `audio.js` y los cinco archivos MP3.
2. En Vercel, selecciona **Add New → Project** e importa el repositorio.
3. Elige **Other** como framework. Deja vacío el comando de build y no configures una carpeta de salida separada.
4. Pulsa **Deploy** y abre el dominio asignado. `vercel.json` dirige la página raíz al archivo `Untitled-3.html`.

El juego ya no necesita servidor, base de datos ni variables de entorno: es una aplicación estática. El récord personal y las preferencias de audio, modo celular y animación se guardan localmente en el navegador de cada jugador.

## Audio

`audio.js` reproduce los archivos MP3 locales según la fase: **Drifting Past** durante la carrera, **Button Mash Bounty** durante los jefes, y las pistas del Gulag y la tienda, además del efecto de salto. Las transiciones entre canciones usan un fundido corto, y la música del Gulag conserva su posición cuando se pausa o cambia de fase. El juego incluye un botón para pausar y reanudar (también con Escape); al pausar se detienen la partida y la música. Las señales del jefe muestran el tipo del próximo patrón, una cuenta regresiva destacada y avisos visibles antes de huesos y rayos. Al entrar al Gulag, se muestra una sola vez un aviso de 3 segundos antes de que comience la ronda. En el combate, los huesos siguen la posición de Pac-Man y los rayos dejan una vía de escape junto a él; en móvil, el joystick reemplaza los botones direccionales después de 3 segundos y el botón de disparo permanece visible. La munición aparece como un cargador brillante fijo en la arena. Los jefes son translúcidos y Pac-Man se reduce durante el combate, recuperando su tamaño al terminar. **Modo celular** aumenta la resolución interna del canvas según la pantalla del dispositivo (se activa por defecto en pantallas táctiles) y estabiliza la animación visual de Pac-Man y los fantasmas para evitar parpadeos, sin cambiar movimiento, colisiones ni gameplay. **Reducir animaciones** sigue disponible como alternativa global para celulares con problemas de rendimiento. El menú **Ajustes** también permite desactivar la música o el sonido de salto por separado. Incluye los cinco MP3 en el mismo directorio al desplegar el juego. La música se habilita al iniciar la partida para respetar las restricciones de reproducción automática del navegador.

Cada vez que publiques cambios, súbelos a la rama de GitHub conectada a Production; Vercel creará un nuevo despliegue.
