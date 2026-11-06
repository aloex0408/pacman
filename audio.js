(() => {
  "use strict";

  const musicTracks = {
    race: { source: "Drifting_Past_The_Gate (1) - copia.mp3" },
    boss: { source: "Button_Mash_Bounty (1) - copia.mp3", bpm: 120, attackBeats: 8 },
    bossEclipse: { source: "Crown_of_Clockwork.mp3", bpm: 120, attackBeats: 8 },
    bossCosmic: { source: "The_Weight_of_a_Promise.mp3", bpm: 120, attackBeats: 8 },
    bossBlackHole: { source: "The_Last_Defiance.mp3", bpm: 120, attackBeats: 8 },
    bossSkull: { source: "Sovereign_of_Iron.mp3", bpm: 120, attackBeats: 6 },
    gulag: { source: "Watch_as_all_the_pixels_fall.mp3" },
    shop: { source: "Three_Pennies_and_a_Wish.mp3" }
  };
  const tracks = new Map(
    Object.entries(musicTracks).map(([mode, config]) => {
      const audio = new Audio(config.source);
      audio.loop = !mode.startsWith("boss");
      audio.preload = "none";
      audio.volume = 0;
      audio.addEventListener("ended", () => {
        if (activeTrack !== audio || currentMode !== mode || !mode.startsWith("boss")) return;
        window.dispatchEvent(new CustomEvent("pacman-boss-track-ended", { detail: { mode } }));
      });
      return [mode, audio];
    })
  );
  const MUSIC_VOLUME = .65;
  const MUSIC_FADE_DURATION = 350;
  const trackFades = new Map();
  const jumpAudio = new Audio("dragon-studio-cartoon-jump-463196 (1) - copia.mp3");
  jumpAudio.preload = "auto";
  jumpAudio.volume = .85;
  const musicToggle = document.getElementById("musicToggle");
  const jumpSoundToggle = document.getElementById("jumpSoundToggle");
  const mobileModeToggle = document.getElementById("mobileModeToggle");
  const reducedAnimationsToggle = document.getElementById("reducedAnimationsToggle");
  const settingsStatus = document.getElementById("settingsStatus");
  const retryAudioButton = document.getElementById("retryAudioButton");
  let musicEnabled = localStorage.getItem("pacman-rush-music-enabled") !== "false";
  let jumpSoundEnabled = localStorage.getItem("pacman-rush-jump-enabled") !== "false";
  const savedMobileMode = localStorage.getItem("pacman-rush-mobile-mode");
  let mobileModeEnabled = savedMobileMode === null
    ? window.matchMedia("(pointer: coarse)").matches
    : savedMobileMode === "true";
  let reducedAnimations = localStorage.getItem("pacman-rush-reduced-animations") === "true";

  let unlocked = false;
  let currentMode = "silence";
  let activeTrack = null;
  let audioPaused = false;
  let musicFailed = false;
  let audioError = "";

  function cancelTrackFade(track) {
    const timer = trackFades.get(track);
    if (timer !== undefined) {
      clearInterval(timer);
      trackFades.delete(track);
    }
  }

  function fadeTrack(track, targetVolume, onComplete) {
    cancelTrackFade(track);
    const startingVolume = track.volume;
    const startedAt = performance.now();
    const timer = setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / MUSIC_FADE_DURATION);
      track.volume = startingVolume + (targetVolume - startingVolume) * progress;
      if (progress < 1) return;
      clearInterval(timer);
      trackFades.delete(track);
      if (onComplete) onComplete();
    }, 30);
    trackFades.set(track, timer);
  }

  function updateSettingsStatus() {
    if (settingsStatus) {
      settingsStatus.textContent = audioError || "Los ajustes se guardan en este dispositivo.";
    }
    if (retryAudioButton) retryAudioButton.hidden = !musicFailed;
  }

  function stopTrack() {
    for (const [mode, track] of tracks) {
      cancelTrackFade(track);
      track.pause();
      if (mode !== "gulag" && !mode.startsWith("boss")) track.currentTime = 0;
      track.volume = 0;
    }
    activeTrack = null;
  }

  function playTrack(mode, retry = false) {
    if ((!musicEnabled && !mode.startsWith("boss")) || !unlocked || audioPaused || mode === "silence") return;
    const track = tracks.get(mode);
    if (!track) return;
    if (musicFailed && !retry) return;

    activeTrack = track;
    void track.play().then(() => {
      if (activeTrack !== track || currentMode !== mode) return;
      if (!audioPaused) fadeTrack(track, musicEnabled ? MUSIC_VOLUME : 0);
      musicFailed = false;
      audioError = "";
      updateSettingsStatus();
      if (mode.startsWith("boss")) {
        window.dispatchEvent(new CustomEvent("pacman-boss-track-ready", { detail: { mode } }));
      }
    }).catch(error => {
      if (activeTrack !== track || currentMode !== mode) return;
      if (audioPaused && error.name === "AbortError") return;
      musicFailed = true;
      audioError = "No se pudo reproducir el audio. Comprueba los archivos de sonido.";
      updateSettingsStatus();
      console.error(`No se pudo reproducir la música (${mode}):`, error);
      if (mode.startsWith("boss")) {
        window.dispatchEvent(new CustomEvent("pacman-boss-track-error", { detail: { mode } }));
      }
    });
  }

  function setMode(mode) {
    if (mode !== "silence" && !tracks.has(mode)) {
      throw new Error(`Unknown game audio mode: ${mode}`);
    }
    if (mode === currentMode) {
      if (mode !== "silence" && (activeTrack !== tracks.get(mode) || activeTrack.paused)) {
        playTrack(mode);
      }
      return;
    }

    const previousTrack = activeTrack;
    const previousMode = currentMode;
    activeTrack = null;
    currentMode = mode;
    musicFailed = false;
    audioError = "";
    updateSettingsStatus();
    if (previousTrack) {
      fadeTrack(previousTrack, 0, () => {
        if (activeTrack === previousTrack) return;
        previousTrack.pause();
        if (previousMode !== "gulag" && !previousMode.startsWith("boss")) previousTrack.currentTime = 0;
      });
    }
    if (mode === "silence") {
      jumpAudio.pause();
      jumpAudio.currentTime = 0;
      return;
    }
    playTrack(mode);
  }

  function startBossTrack(mode) {
    if (!mode.startsWith("boss") || !tracks.has(mode)) {
      throw new Error(`Unknown boss music mode: ${mode}`);
    }
    const track = tracks.get(mode);
    track.currentTime = 0;
    setMode(mode);
  }

  function getCurrentTrackTime() {
    return activeTrack ? activeTrack.currentTime : 0;
  }

  function getCurrentTrackDuration() {
    return activeTrack ? activeTrack.duration : 0;
  }

  function getNextBossAttackTime() {
    const config = musicTracks[currentMode];
    if (!config || !config.bpm || !config.attackBeats) {
      throw new Error(`Boss music timing is not configured for mode: ${currentMode}`);
    }
    const attackInterval = 60 / config.bpm * config.attackBeats;
    return (Math.floor(getCurrentTrackTime() / attackInterval) + 1) * attackInterval;
  }

  function unlock() {
    unlocked = true;
  }

  function pause() {
    audioPaused = true;
    for (const [mode, track] of tracks) {
      cancelTrackFade(track);
      track.pause();
      if (track !== activeTrack) {
        if (mode !== "gulag" && !mode.startsWith("boss")) track.currentTime = 0;
        track.volume = 0;
      }
    }
  }

  function resume() {
    audioPaused = false;
    if ((musicEnabled || currentMode.startsWith("boss")) && currentMode !== "silence") {
      playTrack(currentMode, true);
    }
  }

  function setMusicEnabled(enabled) {
    musicEnabled = enabled;
    localStorage.setItem("pacman-rush-music-enabled", String(enabled));
    if (enabled) {
      musicFailed = false;
      if (currentMode !== "silence") playTrack(currentMode, true);
    } else if (currentMode.startsWith("boss") && activeTrack) {
      fadeTrack(activeTrack, 0);
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

  function setMobileMode(enabled) {
    mobileModeEnabled = enabled;
    localStorage.setItem("pacman-rush-mobile-mode", String(enabled));
    window.dispatchEvent(new CustomEvent("pacman-mobile-mode-change", {
      detail: { enabled }
    }));
    updateSettingsStatus();
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
  if (mobileModeToggle) {
    mobileModeToggle.checked = mobileModeEnabled;
    mobileModeToggle.addEventListener("change", () => setMobileMode(mobileModeToggle.checked));
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
    setMobileMode,
    setReducedAnimations,
    get mobileModeEnabled() {
      return mobileModeEnabled;
    },
    get reducedAnimations() {
      return reducedAnimations;
    }
  };
  window.pacmanAudio = {
    unlock,
    setMode,
    startBossTrack,
    getCurrentTrackTime,
    getCurrentTrackDuration,
    getNextBossAttackTime,
    pause,
    resume,
    playJump
  };
})();
