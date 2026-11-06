# Despliegue de Pac-Man Rush

## Publicar y jugar en Vercel

1. Sube toda la carpeta del proyecto a un repositorio de GitHub. Incluye `vercel.json`, `Untitled-3.html`, `Untitled-1.js`, `Untitled-2.css`, `audio.js` y todos los archivos MP3.
2. En Vercel, selecciona **Add New → Project** e importa el repositorio.
3. Elige **Other** como framework. Deja vacío el comando de build y no configures una carpeta de salida separada.
4. Pulsa **Deploy** y abre el dominio asignado. `vercel.json` dirige la página raíz al archivo `Untitled-3.html`.

El juego ya no necesita servidor, base de datos ni variables de entorno: es una aplicación estática. El récord personal y las preferencias de audio, modo celular y animación se guardan localmente en el navegador de cada jugador.

## Audio

`audio.js` reproduce las pistas locales para carrera, jefes, Gulag y tienda, y el efecto de salto. **The Weight of a Promise** acompaña al Arconte Violeta; **Sovereign of Iron**, a la Calavera del Gulag; **The Last Defiance**, a la Singularidad; y **Crown of Clockwork**, al Caballero del Eclipse. Los jefes normales usan **Button Mash Bounty**. Los ataques de jefe se programan usando la posición de reproducción de su pista y el tempo configurado; el jefe se derrota cuando termina la canción. Pausar detiene tanto el combate como la música. El Gulag conserva la posición de su pista al pausar o cambiar de fase.

El juego incluye un botón para pausar y reanudar (también con Escape). En el Gulag, la calavera sigue al corazón con las pupilas; **Reducir animaciones** desactiva los efectos decorativos. Al entrar al Gulag, se muestra un aviso de 3 segundos antes de que comience la ronda. En móvil, el joystick reemplaza los botones direccionales después de 3 segundos. **Modo celular** aumenta la resolución interna del canvas en pantallas táctiles y estabiliza la animación visual, sin cambiar movimiento, colisiones ni gameplay. El menú **Ajustes** permite desactivar la música o el sonido de salto por separado. Incluye todos los MP3 en el mismo directorio al desplegar. La reproducción comienza después de la interacción del jugador para respetar las restricciones de autoplay del navegador.

Cada vez que publiques cambios, súbelos a la rama de GitHub conectada a Production; Vercel creará un nuevo despliegue.
