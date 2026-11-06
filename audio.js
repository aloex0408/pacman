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
  const musicToggle = document.getElementById("musicToggle");
  const jumpSoundToggle = document.getElementById("jumpSoundToggle");
  const reducedAnimationsToggle = document.getElementById("reducedAnimationsToggle");
  const settingsStatus = document.getElementById("settingsStatus");
  const retryAudioButton = document.getElementById("retryAudioButton");
  let musicEnabled = localStorage.getItem("pacman-rush-music-enabled") !== "false";
  let jumpSoundEnabled = localStorage.getItem("pacman-rush-jump-enabled") !== "false";
  let reducedAnimations = localStorage.getItem("pacman-rush-reduced-animations") === "true";

  let unlocked = false;
  let currentMode = "silence";
  let activeTrack = null;
  let musicFailed = false;
  let audioError = "";

  function updateSettingsStatus() {
    if (settingsStatus) {
      settingsStatus.textContent = audioError || "Los ajustes se guardan en este dispositivo.";
    }
    if (retryAudioButton) retryAudioButton.hidden = !musicFailed;
  }

  function stopTrack() {
    if (!activeTrack) return;
    activeTrack.pause();
    activeTrack.currentTime = 0;
    activeTrack = null;
  }

  function playTrack(mode, retry = false) {
    if (!musicEnabled || !unlocked || mode === "silence") return;
    const track = tracks.get(mode);
    if (!track) return;
    if (musicFailed && !retry) return;

    activeTrack = track;
    void track.play().then(() => {
      if (activeTrack !== track || currentMode !== mode) return;
      musicFailed = false;
      audioError = "";
      updateSettingsStatus();
    }).catch(error => {
      if (activeTrack !== track || currentMode !== mode) return;
      musicFailed = true;
      audioError = "No se pudo reproducir el audio. Comprueba los archivos de sonido.";
      updateSettingsStatus();
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
      musicFailed = false;
      audioError = "";
      updateSettingsStatus();
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

  function setMusicEnabled(enabled) {
    musicEnabled = enabled;
    localStorage.setItem("pacman-rush-music-enabled", String(enabled));
    if (enabled) {
      musicFailed = false;
      if (currentMode !== "silence") playTrack(currentMode, true);
    } else {
      stopTrack();
    }
    updateSettingsStatus();
  }

  function setJumpSoundEnabled(enabled) {
    jumpSoundEnabled = enabled;
    localStorage.setItem("pacman-rush-jump-enabled", String(enabled));
    if (!enabled) {
      jumpAudio.pause();
      jumpAudio.currentTime = 0;
    }
  }

  function retryMusic() {
    unlocked = true;
    musicFailed = false;
    audioError = "";
    if (musicEnabled && currentMode !== "silence") playTrack(currentMode, true);
    updateSettingsStatus();
  }

  function setReducedAnimations(enabled) {
    reducedAnimations = enabled;
    localStorage.setItem("pacman-rush-reduced-animations", String(enabled));
  }

  if (musicToggle) {
    musicToggle.checked = musicEnabled;
    musicToggle.addEventListener("change", () => setMusicEnabled(musicToggle.checked));
  }
  if (jumpSoundToggle) {
    jumpSoundToggle.checked = jumpSoundEnabled;
    jumpSoundToggle.addEventListener("change", () => setJumpSoundEnabled(jumpSoundToggle.checked));
  }
  if (reducedAnimationsToggle) {
    reducedAnimationsToggle.checked = reducedAnimations;
    reducedAnimationsToggle.addEventListener("change", () => setReducedAnimations(reducedAnimationsToggle.checked));
  }
  if (retryAudioButton) retryAudioButton.addEventListener("click", retryMusic);

  function playJump() {
    if (!unlocked || !jumpSoundEnabled) return;
    jumpAudio.currentTime = 0;
    void jumpAudio.play().catch(error => {
      audioError = "No se pudo reproducir el audio. Comprueba los archivos de sonido.";
      updateSettingsStatus();
      console.error("No se pudo reproducir el sonido de salto:", error);
    });
  }

  updateSettingsStatus();
  window.pacmanSettings = {
    setMusicEnabled,
    setJumpSoundEnabled,
    setReducedAnimations,
    get reducedAnimations() {
      return reducedAnimations;
    }
  };
  window.pacmanAudio = { unlock, setMode, playJump };
})();
