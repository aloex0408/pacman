# Despliegue de Pac-Man Rush

## Publicar y jugar en Vercel

1. Sube toda la carpeta del proyecto a un repositorio de GitHub. Incluye `vercel.json`, `Untitled-3.html`, `Untitled-1.js`, `Untitled-2.css`, `audio.js` y los cinco archivos MP3.
2. En Vercel, selecciona **Add New → Project** e importa el repositorio.
3. Elige **Other** como framework. Deja vacío el comando de build y no configures una carpeta de salida separada.
4. Pulsa **Deploy** y abre el dominio asignado. `vercel.json` dirige la página raíz al archivo `Untitled-3.html`.

El juego ya no necesita servidor, base de datos ni variables de entorno: es una aplicación estática. El récord personal se guarda localmente en el navegador de cada jugador.

## Audio

`audio.js` reproduce los archivos MP3 locales según la fase: carrera, jefes, Gulag y tienda, además del efecto de salto. Incluye los cinco MP3 en el mismo directorio al desplegar el juego. La música se habilita al iniciar la partida para respetar las restricciones de reproducción automática del navegador.

Cada vez que publiques cambios, súbelos a la rama de GitHub conectada a Production; Vercel creará un nuevo despliegue.
