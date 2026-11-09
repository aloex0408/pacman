# Despliegue de Pac-Man Rush

## Publicar y jugar en Vercel

1. Sube toda la carpeta del proyecto a un repositorio de GitHub. Incluye `vercel.json`, `Untitled-3.html`, `Untitled-1.js`, `Untitled-2.css`, `audio.js` y todos los archivos MP3.
2. En Vercel, selecciona **Add New → Project** e importa el repositorio.
3. Elige **Other** como framework. Deja vacío el comando de build y no configures una carpeta de salida separada.
4. Pulsa **Deploy** y abre el dominio asignado. `vercel.json` dirige la página raíz al archivo `Untitled-3.html`.

El juego ya no necesita servidor, base de datos ni variables de entorno: es una aplicación estática. El récord personal y las preferencias de audio, modo celular y animación se guardan localmente en el navegador de cada jugador.

## Audio y controles

`audio.js` reproduce las pistas locales para carrera, jefes, Gulag y tienda, más el efecto de salto. El Arconte Violeta usa **The Weight of a Promise**, la Calavera del Gulag **Sovereign of Iron**, la Singularidad **The Last Defiance** y el Caballero del Eclipse **Crown of Clockwork**; los jefes normales usan **Button Mash Bounty**. Los ataques de jefe se sincronizan con el tiempo de reproducción y el combate termina cuando acaba la canción. La música del Gulag conserva su posición al pausar o cambiar de fase. En la visita a la tienda, RT o E abre el puesto cuando estás cerca; la cruceta o el stick seleccionan mejoras, A/× compra, B/○ cierra y START pausa. Incluye todos los MP3 en el mismo directorio al desplegar; la música se habilita al iniciar la partida para respetar el autoplay del navegador.

El jugador empieza con 3 vidas y puede comprar una vida extra una sola vez en la tienda. Los pickups pueden recuperar vidas hasta 3. Durante los jefes, SHIFT o el botón Y/△ del control activa el dash; en pantallas táctiles, el botón también muestra SHIFT. En controles estándar, RT o B/○ inicia la partida, A/× agacha, B/○ salta y el stick o la cruceta mueve al jugador en jefes y Gulag; START pausa. **Modo celular** mejora la resolución y estabilidad visual sin cambiar movimiento, colisiones ni gameplay. **Reducir animaciones** desactiva los efectos decorativos y los ajustes de audio y accesibilidad se guardan en el navegador.

Cada vez que publiques cambios, súbelos a la rama de GitHub conectada a Production; Vercel creará un nuevo despliegue.
