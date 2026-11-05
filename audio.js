(() => {
  "use strict";

  const musicTracks = {
    race: "Drifting_Past_The_Gate (1) - copia.mp3",
    boss: "Button_Mash_Bounty (1) - copia.mp3",
    gulag: "Watch_as_all_the_pixels_fall.mp3",
    shop: "Three_Pennies_and_a_Wish.mp3"
  };
  const tracks = new Map(
    Object.entries(musicTracks).map(([mode, source]) => {
      const audio = new Audio(source);
      audio.loop = true;
      audio.preload = "none";
      audio.volume = .65;
      return [mode, audio];
    })
  );
  const jumpAudio = new Audio("dragon-studio-cartoon-jump-463196 (1) - copia.mp3");
  jumpAudio.preload = "auto";
  jumpAudio.volume = .85;
  const toggleButton = document.getElementById("audioToggleButton");

  let unlocked = false;
  let muted = false;
  let currentMode = "silence";
  let activeTrack = null;
  let failedPlayback = false;

  function updateButton() {
    if (!toggleButton) return;
    const playing = activeTrack && !activeTrack.paused;
    const label = failedPlayback
      ? "REINTENTAR AUDIO"
      : muted
        ? "AUDIO DESACTIVADO"
        : playing
          ? "AUDIO SONANDO"
          : "AUDIO ACTIVADO";
    toggleButton.textContent = label;
    toggleButton.setAttribute("aria-label", label);
    toggleButton.setAttribute("aria-pressed", String(!muted && Boolean(playing) && !failedPlayback));
    toggleButton.classList.toggle("audio-error", failedPlayback);
  }

  function stopTrack() {
    if (!activeTrack) return;
    activeTrack.pause();
    activeTrack.currentTime = 0;
    activeTrack = null;
  }

  function playTrack(mode, retry = false) {
    if (muted || !unlocked || mode === "silence") return;
    const track = tracks.get(mode);
    if (!track) return;
    if (failedPlayback && !retry) return;

    activeTrack = track;
    void track.play().then(() => {
      if (activeTrack !== track || currentMode !== mode) return;
      failedPlayback = false;
      updateButton();
    }).catch(error => {
      if (activeTrack !== track || currentMode !== mode) return;
      failedPlayback = true;
      updateButton();
      console.error(`No se pudo reproducir la música (${mode}):`, error);
    });
  }

  function setMode(mode) {
    if (mode !== "silence" && !tracks.has(mode)) {
      throw new Error(`Unknown game audio mode: ${mode}`);
    }
    if (mode !== currentMode) {
      stopTrack();
      currentMode = mode;
      failedPlayback = false;
    }
    if (mode === "silence") {
      jumpAudio.pause();
      jumpAudio.currentTime = 0;
      return;
    }
    if (activeTrack !== tracks.get(mode) || activeTrack.paused) {
      playTrack(mode);
    }
  }

  function unlock() {
    unlocked = true;
  }

  function retry() {
    unlocked = true;
    muted = false;
    failedPlayback = false;
    if (currentMode !== "silence") playTrack(currentMode, true);
    updateButton();
  }

  function toggle() {
    if (failedPlayback || muted) {
      retry();
      return;
    }
    muted = true;
    stopTrack();
    jumpAudio.pause();
    jumpAudio.currentTime = 0;
    updateButton();
  }

  function playJump() {
    if (!unlocked || muted) return;
    jumpAudio.currentTime = 0;
    void jumpAudio.play().catch(error => {
      failedPlayback = true;
      updateButton();
      console.error("No se pudo reproducir el sonido de salto:", error);
    });
  }

  if (toggleButton) toggleButton.addEventListener("click", toggle);
  updateButton();
  window.pacmanAudio = { unlock, setMode, playJump, retry };
})();
