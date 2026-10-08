class AudioManager {
    constructor() {
        this.sounds = {};
        this.currentMusic = null;
        this.isInitialized = false;
    }

    // Inicializa el contexto de audio tras la primera interacción del usuario
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        // Desbloquear o reanudar contextos de audio si fuera necesario
        console.log("Audio inicializado por interacción del usuario.");
    }

    loadSound(name, src) {
        const audio = new Audio(src);
        audio.preload = "auto";
        this.sounds[name] = audio;
    }

    playMusic(name, loop = true) {
        if (!this.isInitialized) {
            console.warn("El audio requiere interacción previa del usuario.");
            return;
        }

        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
        }

        const music = this.sounds[name];
        if (music) {
            music.loop = loop;
            music.play().catch(e => console.warn("Error al reproducir música:", e));
            this.currentMusic = music;
        } else {
            console.warn(`Música no encontrada: ${name}`);
        }
    }

    playSound(name) {
        if (!this.isInitialized) return;

        const sound = this.sounds[name];
        if (sound) {
            // Clonar para permitir efectos de sonido superpuestos (múltiples saltos a la vez)
            const clone = sound.cloneNode();
            clone.play().catch(e => console.warn("Error al reproducir efecto:", e));
        } else {
            console.warn(`Efecto de sonido no encontrado: ${name}`);
        }
    }

    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }
}

// Hacer disponible globalmente
window.audioManager = new AudioManager();