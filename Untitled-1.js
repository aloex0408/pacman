(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  let canvasResolutionScale = 1;
  const stage = document.getElementById("gameStage");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const multiplierEl = document.getElementById("multiplierValue");
  const startPanel = document.getElementById("startPanel");
  const gameOverPanel = document.getElementById("gameOverPanel");
  const finalScoreEl = document.getElementById("finalScore");
  const victoryPanel = document.getElementById("victoryPanel");
  const victoryScoreEl = document.getElementById("victoryScore");
  const gulagHud = document.getElementById("gulagHud");
  const gulagTitle = document.getElementById("gulagTitle");
  const gulagTimerEl = document.getElementById("gulagTimer");
  const milestoneToast = document.getElementById("milestoneToast");
  const milestoneLabel = document.getElementById("milestoneLabel");
  const milestoneValue = document.getElementById("milestoneValue");
  const bossPanel = document.getElementById("bossPanel");
  const bossName = document.getElementById("bossName");
  const bossLore = document.getElementById("bossLore");
  const bossStatus = document.getElementById("bossStatus");
  const bossAttackStatus = document.getElementById("bossAttackStatus");
  const bossAttackHint = document.getElementById("bossAttackHint");
  const bossIntroStatus = document.getElementById("bossIntroStatus");
  const gamePauseButton = document.getElementById("gamePauseButton");
  const pausePanel = document.getElementById("pausePanel");
  const livesEl = document.getElementById("lives");
  const powerStatusEl = document.getElementById("powerStatus");
  const coinCountEl = document.getElementById("coinCount");
  const sharkShopPanel = document.getElementById("sharkShop");
  const shopCoinCountEl = document.getElementById("shopCoinCount");
  const shopMessageEl = document.getElementById("shopMessage");
  const shopItemButtons = Array.from(sharkShopPanel.querySelectorAll("[data-shop-item]"));
  const actionPrompt = document.getElementById("actionPrompt");
  const mobileControls = document.querySelector(".mobile-controls");
  const moveLeftButton = document.getElementById("moveLeftButton");
  const moveRightButton = document.getElementById("moveRightButton");
  const jumpButton = document.getElementById("jumpButton");
  const dashButton = document.getElementById("dashButton");
  const duckButton = document.getElementById("duckButton");
  const interactButton = document.getElementById("interactButton");
  const gulagJoystick = document.getElementById("gulagJoystick");
  const gulagJoystickBase = gulagJoystick.querySelector(".gulag-joystick-base");
  const gulagJoystickKnob = document.getElementById("gulagJoystickKnob");

  function setCanvasLogicalTransform() {
    ctx.setTransform(canvasResolutionScale, 0, 0, canvasResolutionScale, 0, 0);
  }

  function updateBossAttackCue() {
    const patterns = boss.type.attackSet === "shadow"
      ? ["CORTES UMBRÍOS · CAMBIA DE CARRIL", "LÁTIGOS DE SOMBRA · MUÉVETE", "JUICIO ROJO · DASH PARA ESCAPAR", "ABANICO UMBRÍO · CRUZA LOS PROYECTILES"]
      : boss.type.attackSet === "cosmic"
        ? ["PULSO ESTELAR · BUSCA UN HUECO", "ÓRBITAS VIOLETAS · CRUZA EL PATRÓN", "LLUVIA CÓSMICA · NO TE DETENGAS", "ABANICO CÓSMICO · CAMBIA DE ALTURA"]
        : boss.type.attackSet === "blackHole"
          ? ["MAREA GRAVITATORIA · ALÉJATE", "ANILLO DE EVENTOS · ROMPE LA ÓRBITA", "COLAPSO · DASH AL CARRIL SEGURO", "ABANICO ABISMAL · SIGUE EN MOVIMIENTO"]
          : [
      "RÁFAGA DE HUESOS · CAMBIA DE ALTURA",
      "LLUVIA DE HUESOS · BUSCA UN HUECO",
      "RAYOS · QUEDA UN CARRIL SEGURO",
      "HUESOS TELEDIRIGIDOS · MANTENTE EN MOVIMIENTO",
      "ABANICO ÓSEO · CAMBIA DE ALTURA"
          ];
    setTextIfChanged(bossAttackHint, `SIGUIENTE: ${patterns[skullAttackCount % patterns.length]}`);
  }

  function updateBossAttackCountdown() {
    const seconds = Math.ceil(bossObstacleTimer);
    const countdown = seconds <= 2 ? `¡PREPÁRATE! · ${seconds}s` : `ATAQUE EN: ${seconds}s`;
    setTextIfChanged(bossAttackStatus, countdown);
    bossAttackStatus.classList.toggle("boss-attack-imminent", bossObstacleTimer <= 2);
  }

  function updateCanvasResolution(mobileModeEnabled) {
    const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
    canvasResolutionScale = mobileModeEnabled ? deviceScale : 1;
    const pixelWidth = Math.round(WIDTH * canvasResolutionScale);
    const pixelHeight = Math.round(HEIGHT * canvasResolutionScale);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.imageSmoothingEnabled = true;
    setCanvasLogicalTransform();
  }

  updateCanvasResolution(window.pacmanSettings.mobileModeEnabled);
  window.addEventListener("pacman-mobile-mode-change", event => {
    updateCanvasResolution(event.detail.enabled);
    draw();
  });

  const skyGradient = ctx.createRadialGradient(WIDTH * .5, HEIGHT * .35, 30, WIDTH * .5, HEIGHT * .35, WIDTH * .7);
  skyGradient.addColorStop(0, "#18143f");
  skyGradient.addColorStop(.48, "#0c1738");
  skyGradient.addColorStop(1, "#050a1c");
  const gulagBackdropGradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gulagBackdropGradient.addColorStop(0, "#10070d");
  gulagBackdropGradient.addColorStop(.5, "#260910");
  gulagBackdropGradient.addColorStop(1, "#08070c");
  const GROUND_Y = 355;
  const GRAVITY = 1900;
  const JUMP_SPEED = -700;
  const BASE_SPEED = 190;
  const MAX_SPEED = 340;
  const MILESTONE_INTERVAL = 10000;
  const STREAK_STEP_INCREASE = 4000;
  const BOSS_INTERVAL = 100000;
  const BOSS_UNLOCK_SECONDS = 60;
  const PACMAN_WIDTH = 68;
  const PACMAN_HEIGHT = 66;
  const BOSS_PACMAN_SCALE = .8;
  const GULAG_INTRO_DURATION = 3;
  const BOSS_CONTROL_INTRO_DURATION = 3;
  const DASH_DURATION = .28;
  const DASH_COOLDOWN = 1.8;
  const MAX_LIVES = 4;
  const STARTING_LIVES = 3;
  const GAMEPAD_DEADZONE = .22;
  const CHERRIES_FOR_POWERUP = 5;
  const POWERUP_DURATION = 5;
  const FRENZY_KILLS_FOR_BOSS = 10;
  const FIRST_SHOP_SCORE = 75000;

  let state = "ready";
  let pausedFromState = null;
  let runElapsed = 0;
  let pendingBoss = false;
  let pendingBossAdvancesThreshold = false;
  localStorage.removeItem("pacman-rush-username");
  let score = 0;
  let best = Number(localStorage.getItem("pacman-rush-best") || 0);
  let speed = BASE_SPEED;
  let multiplier = 1;
  let lastTime = 0;
  let spawnTimer = 1.2;
  let backgroundOffset = 0;
  let roadOffset = 0;
  let toastTimer = 0;
  let lastMilestone = 0;
  let cherrySpawnTimer = 4;
  let finSpawnTimer = 4;
  let milestoneInterval = MILESTONE_INTERVAL;
  let streakStartScore = 0;
  let nextBossScore = BOSS_INTERVAL;
  let bossObstacleTimer = 0;
  let bossNextAttackAt = 0;
  let bossMusicError = false;
  let returningToLane = false;
  let bossesDefeated = 0;
  let dashTimer = 0;
  let dashCooldown = 0;
  let dashDirection = { x: 0, y: 0 };
  let gulagDeaths = 0;
  let skullBossCleared = false;
  let gulagLifeActive = false;
  let gulagReentriesAvailable = 0;
  let fallTimer = 0;
  let gulagTime = 0;
  let gulagIntroTime = 0;
  let bossControlsTimer = 0;
  let bossJoystickEnabled = false;
  let gulagDisplayedSecond = -1;
  let gulagSpawnTimer = 0;
  let gulagAttackCount = 0;
  let gulagPlayer = { x: 480, y: 235 };
  let gulagJoystickVector = { x: 0, y: 0 };
  let bossJoystickVector = { x: 0, y: 0 };
  let gulagBones = [];
  let gulagBeams = [];
  let skullAttackCount = 0;
  let ammo = 0;
  let lives = STARTING_LIVES;
  let bonusLifePurchased = false;
  let nextLifeScore = 50000;
  let nextShopScore = FIRST_SHOP_SCORE;
  let coins = 0;
  let cherryCount = 0;
  let powerTimer = 0;
  let frenzyKills = 0;
  let shopVisit = false;
  let shopOpen = false;
  let shopX = 650;
  let selectedShopItemIndex = 0;
  let previousShopAxis = { x: 0, y: 0 };
  let scoreBoostLevel = 0;
  let bossSpeedLevel = 0;
  let dashLevel = 0;
  const movementKeys = new Set();
  const gamepadDirection = { x: 0, y: 0 };
  let previousGamepadButtons = new Set();
  let particles = [];
  let obstacles = [];
  let cherries = [];
  let lifePickups = [];
  let sharkFins = [];
  let ammoPickups = [];
  let brainProjectiles = [];
  let weaponImpacts = [];
  const skullBossType = {
    name: "CALAVERA DEL GULAG",
    primary: "#e7d8c6",
    secondary: "#38212c",
    accent: "#ff244b",
    attackLabel: "PATRÓN ÓSEO",
    musicMode: "bossSkull"
  };
  const planets = [
    { x: 205, y: 100, radius: 48, color: "#7c5cff", ring: true },
    { x: 710, y: 205, radius: 31, color: "#46d7ff", ring: false },
    { x: 850, y: 74, radius: 18, color: "#ffd43b", ring: false }
  ];
  const ghostGradientCache = new Map();
  const ghostVariants = [
    { name: "Blinky", color: "#ff5f54", glow: "#ff8b7e" },
    { name: "Pinky", color: "#ff8cc4", glow: "#ffb6dc" },
    { name: "Inky", color: "#46d7ff", glow: "#8be8ff" },
    { name: "Clyde", color: "#ffd43b", glow: "#ffe98c" }
  ];

  const legacyBossTypes = [
    { name: "ALIENÍGENA", primary: "#7c5cff", secondary: "#542fb0", accent: "#c8ff3d", attackLabel: "PATRÓN ÓSEO", musicMode: "boss" },
    { name: "TITÁN ROBÓTICO", primary: "#46d7ff", secondary: "#126b9b", accent: "#ffd43b", attackLabel: "PATRÓN ÓSEO", musicMode: "boss" },
    { name: "REINA METEORO", primary: "#ff5f54", secondary: "#9d2e55", accent: "#ffd43b", attackLabel: "PATRÓN ÓSEO", musicMode: "boss" },
    { name: "MEDUSA CÓSMICA", primary: "#46d7ff", secondary: "#24687b", accent: "#c8ff3d", attackLabel: "PATRÓN ÓSEO", musicMode: "boss" },
    { name: "CALAVERA ESTELAR", primary: "#f4e7cf", secondary: "#8b6e78", accent: "#ff5f54", attackLabel: "PATRÓN ÓSEO", musicMode: "boss" },
    { name: "POLILLA LUNAR", primary: "#ff8cc4", secondary: "#7c3f9d", accent: "#46d7ff", attackLabel: "PATRÓN ÓSEO", musicMode: "boss" },
    { name: "CRISTAL VORAZ", primary: "#46d7ff", secondary: "#3151a4", accent: "#c8ff3d", attackLabel: "PATRÓN ÓSEO", musicMode: "boss" },
    { name: "DRAGÓN DE NEBULOSA", primary: "#ff5f54", secondary: "#762e52", accent: "#ffd43b", attackLabel: "PATRÓN ÓSEO", musicMode: "boss" },
    { name: "CÍCLOPE SOLAR", primary: "#ffd43b", secondary: "#b6542b", accent: "#ff5f54", attackLabel: "PATRÓN ÓSEO", musicMode: "boss" },
    { name: "ESPECTRO GALÁCTICO", primary: "#7c5cff", secondary: "#29205f", accent: "#46d7ff", attackLabel: "PATRÓN ÓSEO", musicMode: "boss" }
  ];
  const loreBossTypes = [
    { name: "CABALLERO DEL ECLIPSE", primary: "#293044", secondary: "#10121b", accent: "#ff3b55", attackLabel: "JUICIO UMBRÍO", attackSet: "shadow", musicMode: "bossEclipse", lore: "Guardián de una estrella muerta; su juramento convierte la luz en filo." },
    { name: "ARCONTE VIOLETA", primary: "#a66bff", secondary: "#442078", accent: "#f0d7ff", attackLabel: "PULSO ESTELAR", attackSet: "cosmic", musicMode: "bossCosmic", lore: "Conciencia nacida entre galaxias; cada latido pliega el espacio." },
    { name: "SINGULARIDAD · ABISMO FINAL", primary: "#3b1a0b", secondary: "#080606", accent: "#ff6a00", attackLabel: "COLAPSO", attackSet: "blackHole", musicMode: "bossBlackHole", lore: "El universo reducido a un núcleo voraz: cuando despierta, hasta las estrellas caen." }
  ];
  const bossTypes = [...legacyBossTypes, ...loreBossTypes];
  let undefeatedBossTypes = [...bossTypes];

  const boss = {
    active: false,
    health: 8,
    maxHealth: 8,
    type: bossTypes[0],
    x: (WIDTH - 300) / 2,
    y: 10,
    width: 300,
    height: 340,
    anger: 0,
    shake: 0,
    time: 0,
    isSkull: false
  };

  const pacman = {
    x: 115,
    y: GROUND_Y - 66,
    width: PACMAN_WIDTH,
    height: PACMAN_HEIGHT,
    vy: 0,
    grounded: true,
    ducking: false,
    duckHeld: false,
    duckUntil: 0,
    facing: 1,
    runFrame: 0,
    blink: 0,
    hitTimer: 0
  };

  const colors = {
    ink: "#101828",
    yellow: "#ffd43b",
    coral: "#ff5f54",
    violet: "#7c5cff",
    cyan: "#46d7ff",
    sky: "#d9f2f6",
    ground: "#c8d3c2"
  };

  function formatScore(value) {
    return Math.floor(value).toString().padStart(5, "0");
  }

  function setBossPacmanSize(isBossFight) {
    const scale = isBossFight ? BOSS_PACMAN_SCALE : 1;
    const width = PACMAN_WIDTH * scale;
    const height = PACMAN_HEIGHT * scale;
    pacman.x += (pacman.width - width) / 2;
    pacman.width = width;
    pacman.height = height;
  }

  function updateHud() {
    setTextIfChanged(scoreEl, formatScore(score));
    setTextIfChanged(bestEl, formatScore(best));
    setTextIfChanged(multiplierEl, `×${multiplier * 2 ** scoreBoostLevel}`);
    const availableLifeSlots = STARTING_LIVES + Number(bonusLifePurchased);
    setTextIfChanged(
      livesEl,
      "❤".repeat(lives) + "♡".repeat(Math.max(0, availableLifeSlots - lives))
    );
    setTextIfChanged(coinCountEl, String(coins));
    setTextIfChanged(shopCoinCountEl, String(coins));

    if (powerTimer > 0) {
      setTextIfChanged(powerStatusEl, `SPRINT ${powerTimer.toFixed(1)}s`);
    } else if (cherryCount > 0 && cherryCount < CHERRIES_FOR_POWERUP) {
      setTextIfChanged(powerStatusEl, `${CHERRIES_FOR_POWERUP - cherryCount} CEREZAS`);
    } else if (cherryCount >= CHERRIES_FOR_POWERUP) {
      setTextIfChanged(powerStatusEl, "LISTO");
    } else {
      setTextIfChanged(powerStatusEl, "SIN PODER");
    }
    powerStatusEl.parentElement.classList.toggle("power-active", powerTimer > 0);

    if (actionPrompt) {
      setTextIfChanged(actionPrompt, shopOpen
        ? "TIENDA ABIERTA · ELIGE UNA MEJORA"
        : shopVisit
          ? Math.abs(pacman.x + pacman.width / 2 - shopX) <= 115
            ? "PULSA RT / E PARA ABRIR LA TIENDA DEL TIBURÓN"
            : "ACÉRCATE AL TIBURÓN CON A / D"
          : boss.active
                ? "COMBATE DE JEFE · SOBREVIVE ESQUIVANDO · RT / SHIFT PARA DASH"
            : pendingBoss
              ? `JEFE EN ESPERA · DESBLOQUEO EN ${Math.ceil(Math.max(0, BOSS_UNLOCK_SECONDS - runElapsed))}s`
              : powerTimer > 0
                ? `FRENZY ${frenzyKills}/${FRENZY_KILLS_FOR_BOSS} · ELIMINA ENEMIGOS PARA LLEGAR AL JEFE`
                : frenzyKills > 0
                  ? `FRENZY ${frenzyKills}/${FRENZY_KILLS_FOR_BOSS} · ACTIVA EL PODER Y ELIMINA ENEMIGOS`
                  : "SALTA LOS FANTASMAS · AGÁCHATE PARA LAS NAVES");
    }
    jumpButton.setAttribute("aria-label", boss.active ? "Volar hacia arriba" : "Saltar");
    jumpButton.querySelector("span").textContent = boss.active ? "ARRIBA" : "SALTAR";
    duckButton.setAttribute("aria-label", boss.active ? "Volar hacia abajo" : "Agacharse");
    duckButton.querySelector("span").textContent = boss.active ? "ABAJO" : "AGÁCHATE";
    dashButton.setAttribute("aria-label", dashCooldown > 0
      ? `SHIFT: dash en ${dashCooldown.toFixed(1)} segundos`
      : "SHIFT: dash disponible");
    dashButton.querySelector("span").textContent = dashCooldown > 0
      ? `${dashCooldown.toFixed(1)}s`
      : "SHIFT";
    dashButton.classList.toggle("dash-cooldown", dashCooldown > 0);
  }

  function setTextIfChanged(element, text) {
    if (element.textContent !== text) element.textContent = text;
  }

  function compactArray(items, keepItem) {
    let writeIndex = 0;
    for (const item of items) {
      if (keepItem(item)) {
        items[writeIndex] = item;
        writeIndex += 1;
      }
    }
    items.length = writeIndex;
    return items;
  }

  function getShopItemCost(item) {
    if (item === "score") return 12 * 2 ** scoreBoostLevel;
    if (item === "boss-speed") return 12 + bossSpeedLevel * 8;
    if (item === "life") return 16;
    return 16 + dashLevel * 12;
  }

  function getNextBossType() {
    const loreBossIndex = Math.floor(bossesDefeated / 3) - 1;
    const shouldSpawnLoreBoss = bossesDefeated > 0 &&
      bossesDefeated % 3 === 0 &&
      loreBossIndex < loreBossTypes.length;
    if (shouldSpawnLoreBoss) return loreBossTypes[loreBossIndex];
    const availableBosses = undefeatedBossTypes.filter(type => legacyBossTypes.includes(type));
    if (availableBosses.length === 0) return undefeatedBossTypes[0];
    return availableBosses[Math.floor(Math.random() * availableBosses.length)];
  }

  function getNextBossScore(currentScore) {
    const progression = Math.min(bossesDefeated, 5);
    const minGap = 140000 + progression * 15000;
    const maxGap = minGap + 90000;
    const randomGap = minGap + Math.random() * (maxGap - minGap);
    return Math.ceil((currentScore + randomGap) / 10000) * 10000;
  }

  function updateShopInterface() {
    shopCoinCountEl.textContent = String(coins);
    for (const button of shopItemButtons) {
      const item = button.dataset.shopItem;
      const priceEl = button.querySelector(".shop-item-price");
      const descriptionEl = button.querySelector(".shop-item-description");
      const titleEl = button.querySelector("strong");
      let maxed = false;

      if (item === "life") {
        maxed = bonusLifePurchased || lives >= MAX_LIVES;
        titleEl.textContent = "Cuarta vida";
        descriptionEl.textContent = maxed
          ? bonusLifePurchased
            ? "Ya compraste tu única vida extra."
            : "Ya tienes cuatro vidas."
          : "Empiezas con 3; compra una vida extra por partida.";
      } else if (item === "score") {
        maxed = scoreBoostLevel >= 4;
        titleEl.textContent = "Racha x2";
        descriptionEl.textContent = maxed
          ? "Tu bonificación de puntos llegó al máximo."
          : `Duplica tus puntos de racha (nivel ${scoreBoostLevel + 1}/4).`;
      } else if (item === "boss-speed") {
        maxed = bossSpeedLevel >= 3;
        titleEl.textContent = "Botas relámpago";
        descriptionEl.textContent = maxed
          ? "Velocidad máxima alcanzada en los jefes."
          : `+25% de movimiento contra jefes (nivel ${bossSpeedLevel + 1}/3).`;
      } else {
        maxed = dashLevel >= 3;
        titleEl.textContent = ["Impulso rápido", "Dash espectral", "Dash relámpago"][Math.min(dashLevel, 2)];
        descriptionEl.textContent = [
          "Reduce la recarga del dash.",
          "Aumenta la duración y reduce la recarga.",
          "Dash más largo con recarga mínima.",
          "Dash al máximo."
        ][dashLevel];
      }

      const cost = getShopItemCost(item);
      priceEl.textContent = maxed
        ? item === "life"
          ? bonusLifePurchased ? "YA COMPRADA" : "VIDAS LLENAS"
          : "MÁXIMO"
        : `${cost} MONEDAS`;
      button.disabled = maxed || coins < cost;
    }
  }

  function selectShopItem(index) {
    selectedShopItemIndex = (index + shopItemButtons.length) % shopItemButtons.length;
    shopItemButtons.forEach((button, itemIndex) => {
      button.classList.toggle("selected", itemIndex === selectedShopItemIndex);
    });
  }

  function moveShopSelection(horizontal, vertical) {
    const row = Math.floor(selectedShopItemIndex / 2);
    const column = selectedShopItemIndex % 2;
    const nextRow = vertical ? (row + vertical + 2) % 2 : row;
    const nextColumn = horizontal ? (column + horizontal + 2) % 2 : column;
    selectShopItem(nextRow * 2 + nextColumn);
  }

  function activateSelectedShopItem() {
    const button = shopItemButtons[selectedShopItemIndex];
    if (button.disabled) {
      const cost = getShopItemCost(button.dataset.shopItem);
      shopMessageEl.textContent = `Necesitas ${Math.max(0, cost - coins)} monedas más para comprarla.`;
      return;
    }
    button.click();
  }

  function purchaseShopItem(item) {
    if (!shopOpen) return;
    const cost = getShopItemCost(item);
    if (item === "life") {
      if (bonusLifePurchased || lives >= MAX_LIVES || coins < cost) return;
      coins -= cost;
      lives += 1;
      bonusLifePurchased = true;
      shopMessageEl.textContent = "¡Cuarta vida comprada! Esta mejora solo se puede comprar una vez.";
      updateShopInterface();
      updateHud();
      return;
    }

    const level = item === "score" ? scoreBoostLevel : item === "boss-speed" ? bossSpeedLevel : dashLevel;
    const maxLevel = item === "score" ? 4 : 3;
    if (level >= maxLevel || coins < cost) return;

    coins -= cost;
    if (item === "score") scoreBoostLevel += 1;
    else if (item === "boss-speed") bossSpeedLevel += 1;
    else dashLevel += 1;

    shopMessageEl.textContent = "¡Mejora comprada! Puedes comprar otra o continuar.";
    updateShopInterface();
    updateHud();
  }

  function openSharkShop() {
    shopOpen = true;
    stage.classList.add("shop-open");
    mobileControls.classList.add("shop-open");
    window.pacmanAudio.setMode("shop");
    sharkShopPanel.hidden = false;
    shopMessageEl.textContent = coins > 0
      ? "¡Bienvenido! Elige cómo mejorar tu partida."
      : "Aún no tienes monedas. Recoge las aletas amarillas que aparecen durante la carrera.";
    updateShopInterface();
    const firstAvailableItem = shopItemButtons.findIndex(button => !button.disabled);
    selectShopItem(firstAvailableItem >= 0 ? firstAvailableItem : 0);
    if (firstAvailableItem >= 0) shopItemButtons[firstAvailableItem].focus();
    else document.getElementById("shopContinueButton").focus();
  }

  function closeSharkShop() {
    shopOpen = false;
    stage.classList.remove("shop-open");
    window.pacmanAudio.setMode("race");
    sharkShopPanel.hidden = true;
    shopVisit = false;
    stage.classList.remove("shop-visit");
    mobileControls.classList.remove("boss-active", "shop-active", "shop-open");
    moveLeftButton.hidden = true;
    moveRightButton.hidden = true;
    jumpButton.hidden = false;
    duckButton.hidden = false;
    dashButton.hidden = true;
    interactButton.hidden = true;
    movementKeys.clear();
    returningToLane = true;
    pacman.facing = -1;
    shopMessageEl.textContent = "La tienda cerró.";
    updateHud();
  }

  function startSharkShopVisit() {
    shopVisit = true;
    shopOpen = false;
    stage.classList.add("shop-visit");
    shopX = 650;
    obstacles = [];
    cherries = [];
    lifePickups = [];
    sharkFins = [];
    ammoPickups = [];
    movementKeys.clear();
    mobileControls.classList.add("shop-active");
    moveLeftButton.hidden = false;
    moveRightButton.hidden = false;
    jumpButton.hidden = true;
    duckButton.hidden = true;
    dashButton.hidden = true;
    interactButton.hidden = false;
    spawnTimer = Math.max(spawnTimer, 1);
    sharkShopPanel.hidden = true;
    shopMessageEl.textContent = "Acércate al tiburón y pulsa E.";
    createBurst(shopX, GROUND_Y - 35, colors.yellow, 22);
  }

  function spawnSharkFin() {
    const x = WIDTH + 35;
    if (sharkFins.length > 0) return;
    sharkFins.push({
      x,
      y: GROUND_Y - 27,
      width: 30,
      height: 22,
      collected: false
    });
  }

  function showMilestone(nextMultiplier) {
    milestoneLabel.textContent = "RACHA DE";
    milestoneValue.textContent = `×${nextMultiplier}`;
    milestoneToast.classList.remove("frenzy");
    milestoneToast.classList.add("visible");
    milestoneToast.classList.remove("animating");
    void milestoneToast.offsetWidth;
    milestoneToast.classList.add("animating");
    toastTimer = 1.5;
  }

  function activatePowerup() {
    powerTimer = POWERUP_DURATION;
    cherryCount = 0;
    milestoneLabel.textContent = "SPRINT";
    milestoneValue.textContent = `${POWERUP_DURATION}s`;
    milestoneToast.classList.remove("frenzy");
    milestoneToast.classList.add("visible");
    milestoneToast.classList.remove("animating");
    void milestoneToast.offsetWidth;
    milestoneToast.classList.add("animating");
    toastTimer = 1.5;
    createBurst(pacman.x + pacman.width / 2, pacman.y + 10, colors.cyan, 18);
  }

  function handlePlayerHit(obstacle) {
    if (state !== "running" || pacman.hitTimer > 0 || dashTimer > 0) return;
    if (powerTimer > 0 && (obstacle.type === "ghost" || obstacle.type === "ship")) {
      const index = obstacles.indexOf(obstacle);
      if (index >= 0) obstacles.splice(index, 1);
      const reward = 150 * multiplier * 2 ** scoreBoostLevel;
      score += reward;
      milestoneLabel.textContent = "FRENZY · ENEMIGO";
      milestoneValue.textContent = `+${reward}`;
      milestoneToast.classList.add("frenzy", "visible");
      milestoneToast.classList.remove("animating");
      void milestoneToast.offsetWidth;
      milestoneToast.classList.add("animating");
      toastTimer = 1.1;
      createBurst(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, colors.yellow, 18);
      frenzyKills += 1;
      if (frenzyKills >= FRENZY_KILLS_FOR_BOSS) {
        powerTimer = 0;
        activateBoss(false, true);
        milestoneLabel.textContent = "FRENZY COMPLETO";
        milestoneValue.textContent = "¡JEFE!";
        milestoneToast.classList.add("frenzy", "visible");
        milestoneToast.classList.remove("animating");
        void milestoneToast.offsetWidth;
        milestoneToast.classList.add("animating");
        toastTimer = 2;
      } else {
        milestoneLabel.textContent = `FRENZY ${frenzyKills}/${FRENZY_KILLS_FOR_BOSS}`;
        milestoneValue.textContent = `+${reward}`;
      }
      return;
    }

    const lostGulagLife = gulagLifeActive;
    const canReenterGulag = gulagReentriesAvailable > 0;
    if (lostGulagLife) {
      lives = 0;
      gulagLifeActive = false;
      if (canReenterGulag) gulagReentriesAvailable -= 1;
    } else {
      lives = Math.max(0, lives - 1);
    }
    pacman.ducking = false;
    pacman.duckHeld = false;
    pacman.hitTimer = .8;
    pacman.blink = 0;
    stage.classList.remove("damage-shake");
    void stage.offsetWidth;
    stage.classList.add("damage-shake");
    createBurst(pacman.x + 25, pacman.y + 25, colors.coral, 18);
    milestoneLabel.textContent = "VIDA";
    milestoneValue.textContent = `${lives}`;
    milestoneToast.classList.remove("frenzy");
    milestoneToast.classList.add("visible");
    milestoneToast.classList.remove("animating");
    void milestoneToast.offsetWidth;
    milestoneToast.classList.add("animating");
    toastTimer = 1.1;

    if (!lostGulagLife && lives > 0) {
      if (boss.active) {
        pacman.x = (WIDTH - pacman.width) / 2;
        pacman.y = (55 + GROUND_Y - pacman.height) / 2;
        pacman.facing = 1;
      } else {
        pacman.y = GROUND_Y - pacman.height;
      }
      pacman.vy = 0;
      pacman.grounded = !boss.active;
      returningToLane = false;
      obstacles = obstacles.filter(item => item.x > pacman.x + 180);
      updateHud();
      return;
    }

    if (lostGulagLife && !canReenterGulag) {
      updateHud();
      endGame();
      return;
    }

    gulagDeaths += 1;
    state = "falling";
    fallTimer = .7;
    pacman.vy = 180;
    movementKeys.clear();
    mobileControls.classList.remove("boss-active", "boss-joystick-active", "gulag-active");
    gulagJoystick.hidden = true;
    moveLeftButton.hidden = true;
    moveRightButton.hidden = true;
    jumpButton.hidden = true;
    duckButton.hidden = true;
    dashButton.hidden = true;
    interactButton.hidden = true;
    bossPanel.hidden = true;
    bossIntroStatus.hidden = true;
    bossLore.hidden = true;
    pacman.hitTimer = 0;
    updateHud();
  }

  function resetGame() {
    score = 0;
    runElapsed = 0;
    pendingBoss = false;
    pendingBossAdvancesThreshold = false;
    speed = BASE_SPEED;
    multiplier = 1;
    lastMilestone = 0;
    milestoneInterval = MILESTONE_INTERVAL;
    streakStartScore = 0;
    cherrySpawnTimer = 3 + Math.random() * 3;
    finSpawnTimer = 4 + Math.random() * 3;
    nextBossScore = BOSS_INTERVAL;
    bossObstacleTimer = 0;
    bossNextAttackAt = 0;
    bossMusicError = false;
    spawnTimer = 1.15;
    obstacles = [];
    cherries = [];
    lifePickups = [];
    sharkFins = [];
    ammoPickups = [];
    particles = [];
    brainProjectiles = [];
    weaponImpacts = [];
    ammo = 0;
    lives = STARTING_LIVES;
    bonusLifePurchased = false;
    nextLifeScore = 50000;
    nextShopScore = FIRST_SHOP_SCORE;
    coins = 0;
    cherryCount = 0;
    powerTimer = 0;
    frenzyKills = 0;
    shopVisit = false;
    shopOpen = false;
    stage.classList.remove("shop-open");
    scoreBoostLevel = 0;
    bossSpeedLevel = 0;
    dashLevel = 0;
    bossesDefeated = 0;
    gulagDeaths = 0;
    skullBossCleared = false;
    gulagLifeActive = false;
    gulagReentriesAvailable = 0;
    fallTimer = 0;
    gulagTime = 0;
    gulagDisplayedSecond = -1;
    gulagIntroTime = 0;
    gulagSpawnTimer = 0;
    gulagAttackCount = 0;
    gulagBones = [];
    gulagBeams = [];
    undefeatedBossTypes = [...bossTypes];
    boss.active = false;
    boss.isSkull = false;
    bossControlsTimer = 0;
    bossJoystickEnabled = false;
    setBossPacmanSize(false);
    boss.type = bossTypes[0];
    boss.anger = 0;
    boss.shake = 0;
    boss.time = 0;
    dashTimer = 0;
    dashCooldown = 0;
    returningToLane = false;
    pacman.x = 115;
    pacman.facing = 1;
    movementKeys.clear();
    bossPanel.hidden = true;
    bossIntroStatus.hidden = true;
    gulagHud.hidden = true;
    gulagHud.classList.remove("gulag-intro");
    sharkShopPanel.hidden = true;
    mobileControls.classList.remove("boss-active");
    mobileControls.classList.remove("boss-joystick-active");
    mobileControls.classList.remove("gulag-active");
    mobileControls.classList.remove("shop-active", "shop-open");
    gulagJoystick.hidden = true;
    resetGulagJoystick();
    moveLeftButton.hidden = true;
    moveRightButton.hidden = true;
    jumpButton.hidden = false;
    duckButton.hidden = false;
    dashButton.hidden = true;
    interactButton.hidden = true;
    pacman.y = GROUND_Y - pacman.height;
    pacman.vy = 0;
    pacman.grounded = true;
    pacman.ducking = false;
    pacman.duckHeld = false;
    pacman.runFrame = 0;
    stage.classList.remove("shop-visit");
    updateShopInterface();
    updateHud();
  }

  function startGame() {
    state = "running";
    startPanel.hidden = true;
    gameOverPanel.hidden = true;
    victoryPanel.hidden = true;
    resetGame();
    pausedFromState = null;
    syncPauseControls();
    window.pacmanAudio.unlock();
    window.pacmanAudio.setMode("race");
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function syncPauseControls() {
    const canPause = ["running", "falling", "gulagIntro", "gulag", "paused"].includes(state);
    gamePauseButton.hidden = !canPause;
    gamePauseButton.textContent = state === "paused" ? "▶  REANUDAR" : "Ⅱ  PAUSAR";
    gamePauseButton.setAttribute("aria-label", state === "paused" ? "Reanudar juego" : "Pausar juego");
    pausePanel.hidden = state !== "paused";
    mobileControls.classList.toggle("paused", state === "paused");
  }

  function togglePause() {
    if (state === "paused") {
      state = pausedFromState;
      pausedFromState = null;
      movementKeys.clear();
      pacman.duckHeld = false;
      resetGulagJoystick();
      lastTime = performance.now();
      window.pacmanAudio.resume();
      syncPauseControls();
      gamePauseButton.focus();
      requestAnimationFrame(gameLoop);
      return;
    }

    if (!["running", "falling", "gulagIntro", "gulag"].includes(state)) return;
    pausedFromState = state;
    state = "paused";
    movementKeys.clear();
    pacman.duckHeld = false;
    resetGulagJoystick();
    window.pacmanAudio.pause();
    syncPauseControls();
    document.getElementById("resumeButton").focus();
  }

  function jump() {
    if (state === "gulag") {
      movementKeys.add("up");
      return;
    }
    if (state === "running" && boss.active) {
      movementKeys.add("up");
      return;
    }
    if (state !== "running" || !pacman.grounded) return;
    pacman.vy = JUMP_SPEED;
    pacman.grounded = false;
    pacman.ducking = false;
    pacman.duckHeld = false;
    window.pacmanAudio.playJump();
    createBurst(pacman.x + 15, GROUND_Y - 5, colors.yellow, 7);
  }

  function duck() {
    if (state === "gulag") {
      movementKeys.add("down");
      return;
    }
    if (state === "running" && boss.active) {
      movementKeys.add("down");
      return;
    }
    if (state !== "running" || !pacman.grounded || pacman.ducking || shopOpen) return;
    pacman.ducking = true;
    pacman.duckHeld = true;
    pacman.duckUntil = performance.now() + 900;
  }

  function dash() {
    if (state !== "running" || !boss.active || dashCooldown > 0 || shopOpen) return;
    let horizontal = (movementKeys.has("right") ? 1 : 0) - (movementKeys.has("left") ? 1 : 0);
    let vertical = (movementKeys.has("down") ? 1 : 0) - (movementKeys.has("up") ? 1 : 0);
    horizontal += bossJoystickVector.x;
    vertical += bossJoystickVector.y;
    horizontal += gamepadDirection.x;
    vertical += gamepadDirection.y;
    const magnitude = Math.hypot(horizontal, vertical);
    if (magnitude > 0) {
      horizontal /= magnitude;
      vertical /= magnitude;
    } else {
      horizontal = pacman.facing || 1;
    }
    dashDirection.x = horizontal;
    dashDirection.y = vertical;
    dashTimer = DASH_DURATION + dashLevel * .05;
    dashCooldown = Math.max(.75, DASH_COOLDOWN - dashLevel * .3);
    createBurst(
      pacman.x + pacman.width / 2,
      pacman.y + pacman.height / 2,
      "#9af4ff",
      18
    );
    updateHud();
  }

  function activateBoss(advanceBossThreshold = true, bypassUnlock = false) {
    if (!bypassUnlock && runElapsed < BOSS_UNLOCK_SECONDS) {
      pendingBoss = true;
      pendingBossAdvancesThreshold = pendingBossAdvancesThreshold || advanceBossThreshold;
      return;
    }
    pendingBoss = false;
    pendingBossAdvancesThreshold = false;
    if (undefeatedBossTypes.length === 0) return;
    boss.active = true;
    boss.isSkull = false;
    setBossPacmanSize(true);
    bossControlsTimer = BOSS_CONTROL_INTRO_DURATION;
    bossJoystickEnabled = false;
    setBossJoystickControls(false);
    skullAttackCount = 0;
    boss.type = getNextBossType();
    bossMusicError = false;
    window.pacmanAudio.startBossTrack(boss.type.musicMode);
    bossNextAttackAt = window.pacmanAudio.getNextBossAttackTime();
    bossObstacleTimer = bossNextAttackAt;
    returningToLane = false;
    movementKeys.clear();
    mobileControls.classList.remove("shop-active", "shop-open");
    mobileControls.classList.add("boss-active");
    moveLeftButton.hidden = false;
    moveRightButton.hidden = false;
    jumpButton.hidden = false;
    duckButton.hidden = false;
    dashButton.hidden = false;
    interactButton.hidden = true;
    boss.gravityTimer = 0;
    boss.anger = 0;
    boss.shake = 0;
    boss.time = 0;
    pacman.y = GROUND_Y - pacman.height - 90;
    pacman.vy = 0;
    pacman.grounded = false;
    pacman.ducking = false;
    pacman.duckHeld = false;
    if (advanceBossThreshold) nextBossScore = getNextBossScore(nextBossScore);
    cherrySpawnTimer = 4 + Math.random() * 4;
    ammo = 0;
    frenzyKills = 0;
    shopVisit = false;
    shopOpen = false;
    stage.classList.remove("shop-visit");
    stage.classList.remove("shop-open");
    sharkShopPanel.hidden = true;
    bossPanel.hidden = false;
    bossName.textContent = boss.type.name;
    bossLore.textContent = boss.type.lore || "";
    bossLore.hidden = !boss.type.lore;
    bossStatus.textContent = "ESQUIVA HASTA QUE TERMINE LA CANCIÓN";
    updateBossAttackCue();
    updateBossAttackCountdown();
    bossIntroStatus.hidden = false;
    bossIntroStatus.textContent = `JOYSTICK EN ${Math.ceil(bossControlsTimer)}s`;
    brainProjectiles = [];
    weaponImpacts = [];
    ammoPickups = [];
    cherries = [];
    obstacles = [];
    createBurst(boss.x + boss.width / 2, boss.y + boss.height / 2, colors.coral, 36);
  }

  function activateSkullBoss() {
    boss.active = true;
    boss.isSkull = true;
    setBossPacmanSize(true);
    bossControlsTimer = BOSS_CONTROL_INTRO_DURATION;
    bossJoystickEnabled = false;
    setBossJoystickControls(false);
    boss.type = skullBossType;
    bossMusicError = false;
    window.pacmanAudio.startBossTrack(boss.type.musicMode);
    bossNextAttackAt = window.pacmanAudio.getNextBossAttackTime();
    bossObstacleTimer = bossNextAttackAt;
    boss.gravityTimer = 0;
    boss.anger = 0;
    boss.shake = 0;
    boss.time = 0;
    pacman.y = GROUND_Y - pacman.height - 90;
    pacman.vy = 0;
    pacman.grounded = false;
    pacman.ducking = false;
    pacman.duckHeld = false;
    skullAttackCount = 0;
    ammo = 0;
    returningToLane = false;
    movementKeys.clear();
    mobileControls.classList.remove("shop-active", "shop-open");
    mobileControls.classList.add("boss-active");
    moveLeftButton.hidden = false;
    moveRightButton.hidden = false;
    jumpButton.hidden = false;
    duckButton.hidden = false;
    dashButton.hidden = false;
    interactButton.hidden = true;
    stage.classList.remove("shop-visit");
    stage.classList.remove("shop-open");
    sharkShopPanel.hidden = true;
    shopVisit = false;
    shopOpen = false;
    brainProjectiles = [];
    weaponImpacts = [];
    ammoPickups = [];
    obstacles = [];
    bossPanel.hidden = false;
    bossName.textContent = boss.type.name;
    bossLore.textContent = "";
    bossLore.hidden = true;
    bossStatus.textContent = "ESQUIVA HASTA QUE TERMINE LA CANCIÓN";
    updateBossAttackCue();
    updateBossAttackCountdown();
    bossIntroStatus.hidden = false;
    bossIntroStatus.textContent = `JOYSTICK EN ${Math.ceil(bossControlsTimer)}s`;
    createBurst(boss.x + boss.width / 2, boss.y + boss.height / 2, boss.type.accent, 48);
    milestoneLabel.textContent = "JUICIO DESBLOQUEADO";
    milestoneValue.textContent = "¡JEFE SECRETO!";
    milestoneToast.classList.remove("frenzy");
    milestoneToast.classList.add("visible");
    milestoneToast.classList.remove("animating");
    void milestoneToast.offsetWidth;
    milestoneToast.classList.add("animating");
    toastTimer = 3;
  }

  function defeatBoss() {
    const skullBossDefeated = boss.isSkull;
    boss.active = false;
    boss.isSkull = false;
    bossControlsTimer = 0;
    bossJoystickEnabled = false;
    bossIntroStatus.hidden = true;
    setBossJoystickControls(false);
    setBossPacmanSize(false);
    returningToLane = true;
    pacman.y = GROUND_Y - pacman.height;
    pacman.vy = 0;
    pacman.grounded = true;
    pacman.ducking = false;
    pacman.duckHeld = false;
    bossPanel.hidden = true;
    mobileControls.classList.remove("boss-active");
    moveLeftButton.hidden = true;
    moveRightButton.hidden = true;
    dashButton.hidden = true;
    interactButton.hidden = true;
    if (skullBossDefeated) {
      skullBossCleared = true;
      milestoneLabel.textContent = "CALAVERA DERROTADA";
      milestoneValue.textContent = "¡GULAG SUPERADO!";
    } else {
      bossesDefeated += 1;
      undefeatedBossTypes = undefeatedBossTypes.filter(type => type !== boss.type);
      milestoneValue.textContent = "JEFE DERROTADO";
      finSpawnTimer = 5 + Math.random() * 3 + bossesDefeated * 1.25;
      if (bossesDefeated === bossTypes.length) {
        state = "victory";
        syncPauseControls();
        returningToLane = false;
        victoryScoreEl.textContent = formatScore(score);
        victoryPanel.hidden = false;
        window.pacmanAudio.setMode("silence");
      }
    }
    milestoneToast.classList.remove("frenzy");
    milestoneToast.classList.add("visible");
    milestoneToast.classList.remove("animating");
    void milestoneToast.offsetWidth;
    milestoneToast.classList.add("animating");
    toastTimer = 1.5;
    brainProjectiles = [];
    ammoPickups = [];
    ammo = 0;
    obstacles = [];
    createBurst(boss.x + boss.width / 2, boss.y + boss.height / 2, colors.cyan, 40);
  }

  function spawnBossHazard(x, y, width, height, style, vy = 0, bobAmplitude = 0, phase = 0) {
    obstacles.push({
      type: "bossObstacle",
      bossStyle: style,
      x,
      y,
      baseY: y,
      width,
      height,
      vy,
      life: 3,
      telegraph: style === "skullBeam" ? 1.05 : 0,
      bobAmplitude,
      phase,
      passed: false
    });
  }

  function makeBossHazardHome(hazard, projectileSpeed, telegraph = .55) {
    const targetX = pacman.x + pacman.width / 2;
    const targetY = pacman.y + pacman.height / 2;
    const originX = hazard.x + hazard.width / 2;
    const originY = hazard.y + hazard.height / 2;
    const angle = Math.atan2(targetY - originY, targetX - originX);
    hazard.bossVx = Math.cos(angle) * projectileSpeed;
    hazard.vy = Math.sin(angle) * projectileSpeed;
    hazard.bossHoming = true;
    hazard.bossHomingSpeed = projectileSpeed;
    hazard.telegraph = telegraph;
  }

  function placeBossAttack() {
    const startX = boss.x + boss.width / 2;
    const groundY = GROUND_Y;
    skullAttackCount += 1;
    const musicDuration = window.pacmanAudio.getCurrentTrackDuration();
    const enraged = Number.isFinite(musicDuration) &&
      musicDuration > 0 &&
      window.pacmanAudio.getCurrentTrackTime() >= musicDuration * .6;
    const speedMultiplier = enraged ? 1.25 : 1;
    const pattern = (skullAttackCount - 1) % 4;

    if (boss.type.attackSet === "shadow") {
      if (pattern === 0) {
        for (let lane = 0; lane < 3; lane += 1) {
          const hazard = obstacles[obstacles.push({
            type: "bossObstacle",
            bossStyle: "shadow",
            x: WIDTH + 20,
            y: 145 + lane * 75,
            width: 34,
            height: 24,
            bossVx: -330 * speedMultiplier,
            vy: lane === 1 ? 0 : (lane === 0 ? 70 : -70),
            life: 3.2,
            telegraph: .45,
            passed: false
          }) - 1];
          makeBossHazardHome(hazard, 330 * speedMultiplier, .45);
        }
      } else if (pattern === 1) {
        for (const x of [365, 595]) {
          spawnBossHazard(x, 105, 38, groundY - 105, "skullBeam");
          obstacles[obstacles.length - 1].telegraph = .95;
        }
      } else if (pattern === 2) {
        for (const angleOffset of [-.38, -.19, 0, .19, .38]) {
          const originX = boss.x + 25;
          const originY = boss.y + 155;
          const targetAngle = Math.atan2(
            pacman.y + pacman.height / 2 - originY,
            pacman.x + pacman.width / 2 - originX
          ) + angleOffset;
          const hazard = obstacles[obstacles.push({
            type: "bossObstacle",
            bossStyle: "shadow",
            x: originX,
            y: originY,
            width: 30,
            height: 22,
            bossVx: Math.cos(targetAngle) * 295 * speedMultiplier,
            vy: Math.sin(targetAngle) * 295 * speedMultiplier,
            life: 3,
            telegraph: .5,
            passed: false
          }) - 1];
          hazard.bossHoming = true;
          hazard.bossHomingSpeed = 295 * speedMultiplier;
        }
      } else {
        spawnBossFanAttack(startX, boss.y + 155, "shadow", speedMultiplier);
      }
    } else if (boss.type.attackSet === "cosmic") {
      if (pattern === 0 || pattern === 2) {
        const count = pattern === 0 ? 10 : 14;
        const phase = pattern === 0 ? 0 : Math.PI / count;
        for (let index = 0; index < count; index += 1) {
          const angle = index * Math.PI * 2 / count + phase;
          const hazard = obstacles[obstacles.push({
            type: "bossObstacle",
            bossStyle: "cosmic",
            x: startX,
            y: boss.y + 170,
            width: 24,
            height: 24,
            bossVx: Math.cos(angle) * 230 * speedMultiplier,
            vy: Math.sin(angle) * 230 * speedMultiplier,
            life: 3.4,
            telegraph: .55,
            passed: false
          }) - 1];
          hazard.angle = angle;
        }
      } else if (pattern === 1) {
        const safeLane = Math.max(1, Math.min(7, Math.floor(
          (pacman.x + pacman.width / 2) / (WIDTH / 8)
        )));
        for (let lane = 0; lane < 8; lane += 1) {
          if (lane === safeLane) continue;
          const hazard = obstacles[obstacles.push({
            type: "bossObstacle",
            bossStyle: "cosmic",
            x: lane * WIDTH / 8 + WIDTH / 16,
            y: -25,
            width: 25,
            height: 25,
            bossVx: 0,
            vy: 245 * speedMultiplier,
            life: 3.5,
            telegraph: .7,
            passed: false
          }) - 1];
          hazard.angle = Math.PI / 2;
        }
      } else {
        spawnBossFanAttack(startX, boss.y + 170, "cosmic", speedMultiplier);
      }
    } else if (boss.type.attackSet === "blackHole") {
      if (pattern === 0) {
        boss.gravityTimer = 2.4;
        for (let index = 0; index < 12; index += 1) {
          const angle = index * Math.PI / 6;
          const hazard = obstacles[obstacles.push({
            type: "bossObstacle",
            bossStyle: "blackHole",
            x: startX,
            y: boss.y + 165,
            width: 34,
            height: 34,
            bossVx: Math.cos(angle) * 205 * speedMultiplier,
            vy: Math.sin(angle) * 205 * speedMultiplier,
            life: 3.6,
            telegraph: .65,
            passed: false
          }) - 1];
          hazard.angle = angle;
        }
      } else if (pattern === 1) {
        const targetLane = Math.max(0, Math.min(7, Math.floor(
          (pacman.x + pacman.width / 2) / (WIDTH / 8)
        )));
        for (let lane = 0; lane < 8; lane += 1) {
          if (Math.abs(lane - targetLane) <= 1) continue;
          spawnBossHazard(lane * WIDTH / 8, 118, 34, groundY - 118, "skullBeam");
          obstacles[obstacles.length - 1].telegraph = 1.05;
        }
      } else if (pattern === 2) {
        for (let index = 0; index < 9; index += 1) {
          const angle = index * Math.PI * 2 / 9;
          const hazard = obstacles[obstacles.push({
            type: "bossObstacle",
            bossStyle: "blackHole",
            x: startX + Math.cos(angle) * 88,
            y: boss.y + 165 + Math.sin(angle) * 88,
            width: 28,
            height: 28,
            bossVx: -Math.cos(angle) * 255 * speedMultiplier,
            vy: -Math.sin(angle) * 255 * speedMultiplier,
            life: 3.2,
            telegraph: .7,
            passed: false
          }) - 1];
          hazard.angle = angle + Math.PI;
        }
      } else {
        spawnBossFanAttack(startX, boss.y + 165, "blackHole", speedMultiplier);
      }
    } else {
      const standardPattern = (skullAttackCount - 1) % 5;

      if (standardPattern === 0) {
        const originX = boss.x + 25;
        const originY = boss.y + 155;
        const targetX = pacman.x + pacman.width / 2;
        const targetY = pacman.y + pacman.height / 2;
        const count = enraged ? 7 : 5;
        const baseAngle = Math.atan2(targetY - originY, targetX - originX);
        for (let index = 0; index < count; index += 1) {
          const angle = baseAngle + (index - (count - 1) / 2) * (enraged ? .2 : .27);
          const projectileSpeed = 260 * speedMultiplier;
          spawnBossHazard(
            originX,
            originY,
            28,
            20,
            "bone",
            Math.sin(angle) * projectileSpeed
          );
          makeBossHazardHome(obstacles[obstacles.length - 1], projectileSpeed, .55);
        }
      } else if (standardPattern === 1) {
        const count = enraged ? 9 : 7;
        const spacing = WIDTH / count;
        const safeLane = Math.max(0, Math.min(
          count - 1,
          Math.floor((pacman.x + pacman.width / 2) / spacing)
        ));
        for (let index = 0; index < count; index += 1) {
          if (index === safeLane) continue;
          const y = index % 2 === 0 ? -30 : -95;
          spawnBossHazard(index * spacing + spacing / 2, y, 26, 26, "bone");
          makeBossHazardHome(obstacles[obstacles.length - 1], 245 * speedMultiplier, .65);
        }
      } else if (standardPattern === 2) {
        const count = enraged ? 4 : 3;
        const laneWidth = WIDTH / (count + 1);
        const safeLane = Math.max(0, Math.min(
          count,
          Math.round((pacman.x + pacman.width / 2) / laneWidth)
        ));
        for (let lane = 0; lane <= count; lane += 1) {
          if (lane === safeLane) continue;
          spawnBossHazard(lane * laneWidth, 120, 32, groundY - 120, "skullBeam");
        }
      } else if (standardPattern === 3) {
        const count = enraged ? 7 : 5;
        const targetX = pacman.x + pacman.width / 2;
        for (let index = 0; index < count; index += 1) {
          const offset = (index - (count - 1) / 2) * 42;
          const x = Math.max(0, Math.min(WIDTH - 30, targetX + offset));
          const y = index % 2 === 0 ? groundY - 36 : 105;
          spawnBossHazard(x, y, 30, 22, "bone");
          makeBossHazardHome(obstacles[obstacles.length - 1], 220 * speedMultiplier, .8);
        }
      } else {
        spawnBossFanAttack(boss.x + 25, boss.y + 155, "bone", speedMultiplier);
      }
    }

    createBurst(startX, groundY - 35, boss.type.accent, enraged ? 16 : 10);
  }

  function spawnBossFanAttack(originX, originY, style, speedMultiplier) {
    const targetAngle = Math.atan2(
      pacman.y + pacman.height / 2 - originY,
      pacman.x + pacman.width / 2 - originX
    );
    const count = 5;
    for (let index = 0; index < count; index += 1) {
      const angle = targetAngle + (index - (count - 1) / 2) * .22;
      const projectileSpeed = 275 * speedMultiplier;
      const hazard = obstacles[obstacles.push({
        type: "bossObstacle",
        bossStyle: style,
        x: originX,
        y: originY,
        width: 30,
        height: 24,
        bossVx: Math.cos(angle) * projectileSpeed,
        vy: Math.sin(angle) * projectileSpeed,
        life: 3,
        telegraph: .6,
        passed: false,
        angle
      }) - 1];
      hazard.bossHoming = true;
      hazard.bossHomingSpeed = projectileSpeed;
    }
  }

  function spawnAmmoPickup() {
    const positions = [];
    for (let x = 340; x <= WIDTH - 70; x += 80) {
      for (let y = 110; y <= GROUND_Y - 70; y += 65) {
        const distance = Math.hypot(
          x + 24 - (pacman.x + pacman.width / 2),
          y + 20 - (pacman.y + pacman.height / 2)
        );
        if (distance >= 180) positions.push({ x, y });
      }
    }
    const position = positions[Math.floor(Math.random() * positions.length)] || {
      x: WIDTH - 100,
      y: 145
    };
    ammoPickups.push({
      ...position,
      width: 48,
      height: 40,
      life: 12,
      phase: Math.random() * Math.PI * 2,
      collected: false
    });
  }

  function spawnLifePickup() {
    const clearance = 150;
    const x = Math.max(
      WIDTH + 30,
      ...obstacles.map(obstacle => obstacle.x + obstacle.width + clearance),
      ...cherries.map(cherry => cherry.x + cherry.width + clearance),
      ...lifePickups.map(pickup => pickup.x + pickup.width + clearance)
    );
    lifePickups.push({
      x,
      y: GROUND_Y - 36,
      width: 34,
      height: 34,
      collected: false
    });
  }

  function spawnCherry() {
    const airborne = Math.random() < .6;
    const height = 34;
    const y = airborne
      ? GROUND_Y - (95 + Math.random() * 55)
      : GROUND_Y - height - 4;
    const x = WIDTH + 30;
    const clearGap = 140;
    const spawnAreaBlocked = obstacles.some(obstacle =>
      x < obstacle.x + obstacle.width + clearGap &&
      x + 36 > obstacle.x - clearGap
    );
    if (spawnAreaBlocked) {
      cherrySpawnTimer = .35;
      return;
    }

    cherries.push({
      x,
      y,
      width: 36,
      height
    });
  }

  function collectCherry(cherry) {
    const bonus = 500 * multiplier * 2 ** scoreBoostLevel;
    score += bonus;
    cherryCount += 1;
    if (cherryCount >= CHERRIES_FOR_POWERUP) {
      activatePowerup();
      milestoneLabel.textContent = "POWER-UP";
      milestoneValue.textContent = "SPRINT 3s";
    } else {
      milestoneLabel.textContent = "CEREZA";
      milestoneValue.textContent = `+${bonus}`;
    }
    milestoneToast.classList.remove("frenzy");
    milestoneToast.classList.add("visible");
    milestoneToast.classList.remove("animating");
    void milestoneToast.offsetWidth;
    milestoneToast.classList.add("animating");
    toastTimer = 1.5;
    createBurst(cherry.x + cherry.width / 2, cherry.y + cherry.height / 2, "#ff355e", 14);
    updateHud();
  }

  function createBurst(x, y, color, count = 8) {
    if (window.pacmanSettings.reducedAnimations) return;
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x,
        y,
        vx: (Math.random() - .5) * 160,
        vy: -Math.random() * 100,
        life: .45 + Math.random() * .3,
        size: 3 + Math.random() * 4,
        color
      });
    }
  }

  function spawnObstacle() {
    const type = Math.random() < .65 ? "ghost" : "ship";
    const variant = ghostVariants[Math.floor(Math.random() * ghostVariants.length)];

    if (type === "ghost") {
      const height = 52;
      obstacles.push({
        type,
        variant,
        x: WIDTH + 35,
        y: GROUND_Y - height + 6,
        width: 46,
        height,
        passed: false,
        lastShot: 0
      });
      return;
    }

    const width = 110 + Math.random() * 20;
    const height = 30 + Math.random() * 8;
    const yOffset = 48 + Math.random() * 12;
    const ship = {
      type,
      variant,
      x: WIDTH + 35,
      y: GROUND_Y - height - yOffset,
      width,
      height,
      passed: false,
      lastShot: 0,
      showDuckHint: !obstacles.some(obstacle => obstacle.type === "ship")
    };
    obstacles.push(ship);
  }

  function getPacmanHitBox() {
    const scale = boss.active ? BOSS_PACMAN_SCALE : 1;
    if (pacman.ducking) {
      return {
        x: pacman.x + 12 * scale,
        y: GROUND_Y - 28 * scale,
        width: 38 * scale,
        height: 28 * scale
      };
    }
    return {
      x: pacman.x + 10 * scale,
      y: pacman.y + 7 * scale,
      width: 40 * scale,
      height: 52 * scale
    };
  }

  function collides(a, b) {
    return a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y;
  }

  function endGame() {
    if (state === "gameover") return;
    state = "gameover";
    syncPauseControls();
    window.pacmanAudio.setMode("silence");
    gulagHud.hidden = true;
    setGulagControls(false);
    best = Math.max(best, Math.floor(score));
    localStorage.setItem("pacman-rush-best", String(best));
    finalScoreEl.textContent = Math.floor(score);
    updateHud();
    gameOverPanel.hidden = false;
    createBurst(pacman.x + 25, pacman.y + 30, colors.coral, 22);
  }

  function setGulagControls(active) {
    mobileControls.classList.toggle("gulag-active", active);
    mobileControls.classList.remove("boss-joystick-active");
    gulagJoystick.hidden = !active;
    dashButton.hidden = !(!active && state === "running" && boss.active);
    if (active) {
      mobileControls.classList.remove("boss-active");
      moveLeftButton.hidden = true;
      moveRightButton.hidden = true;
      jumpButton.hidden = true;
      duckButton.hidden = true;
      interactButton.hidden = true;
      resetGulagJoystick();
    } else if (state === "running" && boss.active && bossJoystickEnabled) {
      mobileControls.classList.add("boss-active", "boss-joystick-active");
      gulagJoystick.hidden = false;
      moveLeftButton.hidden = true;
      moveRightButton.hidden = true;
      jumpButton.hidden = true;
      duckButton.hidden = true;
      interactButton.hidden = true;
    } else if (state === "running" && boss.active) {
      mobileControls.classList.add("boss-active");
      moveLeftButton.hidden = false;
      moveRightButton.hidden = false;
      jumpButton.hidden = false;
      duckButton.hidden = false;
      interactButton.hidden = true;
    } else {
      mobileControls.classList.remove("boss-active");
      moveLeftButton.hidden = true;
      moveRightButton.hidden = true;
      jumpButton.hidden = false;
      duckButton.hidden = false;
      interactButton.hidden = true;
    }
  }

  function setBossJoystickControls(active) {
    bossJoystickEnabled = active;
    mobileControls.classList.toggle("boss-joystick-active", active);
    gulagJoystick.hidden = !active;
    moveLeftButton.hidden = active;
    moveRightButton.hidden = active;
    jumpButton.hidden = active;
    duckButton.hidden = active;
    dashButton.hidden = false;
    interactButton.hidden = true;
    resetGulagJoystick();
  }

  function resetGulagJoystick() {
    gulagJoystickVector.x = 0;
    gulagJoystickVector.y = 0;
    bossJoystickVector.x = 0;
    bossJoystickVector.y = 0;
    gulagJoystickKnob.style.transform = "translate(0, 0)";
  }

  function updateGulagJoystick(event) {
    const bounds = gulagJoystickBase.getBoundingClientRect();
    const radiusX = bounds.width * .34;
    const radiusY = bounds.height * .34;
    let x = (event.clientX - (bounds.left + bounds.width / 2)) / radiusX;
    let y = (event.clientY - (bounds.top + bounds.height / 2)) / radiusY;
    const distance = Math.hypot(x, y);
    if (distance > 1) {
      x /= distance;
      y /= distance;
    }
    if (Math.hypot(x, y) < .16) x = y = 0;
    const activeVector = state === "running" && boss.active
      ? bossJoystickVector
      : gulagJoystickVector;
    activeVector.x = x;
    activeVector.y = y;
    gulagJoystickKnob.style.transform = `translate(${x * radiusX}px, ${y * radiusY}px)`;
  }

  function startGulag() {
    state = "gulagIntro";
    const nightmareUnlocked = gulagDeaths >= 10 && !skullBossCleared;
    gulagTime = nightmareUnlocked
      ? 15 + Math.min(gulagDeaths - 10, 5)
      : 4 + Math.min(gulagDeaths - 1, 8) * .65;
    gulagIntroTime = GULAG_INTRO_DURATION;
    gulagDisplayedSecond = Math.ceil(gulagTime);
    gulagSpawnTimer = .45;
    gulagAttackCount = 0;
    gulagPlayer = { x: WIDTH / 2, y: HEIGHT / 2 + 10 };
    resetGulagJoystick();
    gulagBones = [];
    gulagBeams = [];
    movementKeys.clear();
    pacman.duckHeld = false;
    bossPanel.hidden = true;
    gulagHud.hidden = false;
    gulagHud.classList.add("gulag-intro");
    gulagTitle.textContent = nightmareUnlocked
      ? "JUICIO FINAL · FASE EXTRA"
      : `EL GULAG · CAÍDA ${gulagDeaths}`;
    gulagHud.querySelector("p").textContent = nightmareUnlocked
      ? "ESQUIVA HUESOS, RÁFAGAS Y RAYOS. SOBREVIVE PARA ENFRENTAR A LA CALAVERA."
      : window.matchMedia("(pointer: coarse)").matches
        ? "USA EL JOYSTICK O W A S D PARA ESQUIVAR."
        : "MUÉVETE CON W A S D O LAS FLECHAS";
    gulagTimerEl.textContent = `COMIENZA EN ${Math.ceil(gulagIntroTime)}`;
  }

  function updateGulagIntro(dt) {
    gulagIntroTime = Math.max(0, gulagIntroTime - dt);
    gulagTimerEl.textContent = `COMIENZA EN ${Math.ceil(gulagIntroTime)}`;
    if (gulagIntroTime > 0) return;
    state = "gulag";
    gulagHud.classList.remove("gulag-intro");
    gulagTimerEl.textContent = `SOBREVIVE ${gulagDisplayedSecond} s`;
    setGulagControls(true);
  }

  function escapeGulag() {
    state = "running";
    lives = 1;
    gulagLifeActive = true;
    gulagHud.hidden = true;
    gulagHud.classList.remove("gulag-intro");
    movementKeys.clear();
    obstacles = [];
    pacman.x = (WIDTH - pacman.width) / 2;
    pacman.y = boss.active
      ? (55 + GROUND_Y - pacman.height) / 2
      : GROUND_Y - pacman.height;
    pacman.vy = 0;
    pacman.grounded = true;
    pacman.ducking = false;
    pacman.duckHeld = false;
    pacman.hitTimer = 1;
    returningToLane = false;
    bossPanel.hidden = !boss.active;
    setGulagControls(false);
    updateHud();
    if (gulagDeaths >= 10 && !skullBossCleared && !boss.isSkull) activateSkullBoss();
  }

  function launchGulagBone(x, y, targetX, targetY, speed, angleOffset = 0, size = 1) {
    const angle = Math.atan2(targetY - y, targetX - x) + angleOffset;
    gulagBones.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      size
    });
  }

  function launchGulagBeam(count = 1) {
    const lanes = [350, 430, 510, 590, 650];
    const safeLanes = lanes.filter(x => Math.abs(x - gulagPlayer.x) > 55);
    for (let i = 0; i < count; i += 1) {
      if (safeLanes.length === 0) break;
      const laneIndex = Math.floor(Math.random() * safeLanes.length);
      const [x] = safeLanes.splice(laneIndex, 1);
      gulagBeams.push({
        x,
        warning: .65,
        active: .34
      });
    }
  }

  function spawnGulagBones() {
    gulagAttackCount += 1;
    const arena = { left: 300, top: 125, right: 660, bottom: 355 };
    const edge = Math.floor(Math.random() * 4);
    let x;
    let y;
    if (edge === 0) {
      x = arena.left;
      y = arena.top + Math.random() * (arena.bottom - arena.top);
    } else if (edge === 1) {
      x = arena.right;
      y = arena.top + Math.random() * (arena.bottom - arena.top);
    } else if (edge === 2) {
      x = arena.left + Math.random() * (arena.right - arena.left);
      y = arena.top;
    } else {
      x = arena.left + Math.random() * (arena.right - arena.left);
      y = arena.bottom;
    }

    const difficulty = gulagDeaths - 1;
    const speed = Math.min(620, 190 + difficulty * 34);
    const aimedCount = Math.min(4, 1 + Math.floor(difficulty / 3));
    const targetX = gulagPlayer.x + (Math.random() - .5) * 100;
    const targetY = gulagPlayer.y + (Math.random() - .5) * 80;
    for (let index = 0; index < aimedCount; index += 1) {
      launchGulagBone(
        x + (Math.random() - .5) * 24,
        y + (Math.random() - .5) * 24,
        targetX,
        targetY,
        speed,
        (index - (aimedCount - 1) / 2) * .12,
        1 + Math.random() * .35
      );
    }

    if (difficulty >= 1 && gulagAttackCount % 2 === 0) {
      const fanOriginX = edge === 0 ? arena.left : edge === 1 ? arena.right : x;
      const fanOriginY = edge < 2 ? y : edge === 2 ? arena.top : arena.bottom;
      for (const spread of [-.38, 0, .38]) {
        launchGulagBone(fanOriginX, fanOriginY, gulagPlayer.x, gulagPlayer.y, speed * 1.08, spread);
      }
    }

    if (difficulty >= 3 && gulagAttackCount % 2 === 1) {
      const fromLeft = Math.random() < .5;
      const sweepY = 155 + Math.random() * 165;
      const direction = fromLeft ? 1 : -1;
      for (const offset of [-38, 0, 38]) {
        gulagBones.push({
          x: fromLeft ? arena.left : arena.right,
          y: sweepY + offset,
          vx: direction * speed * 1.15,
          vy: 0,
          angle: fromLeft ? 0 : Math.PI,
          size: 1.05
        });
      }
    }

    if (difficulty >= 5 && gulagAttackCount % 3 === 0) {
      const burstX = gulagPlayer.x < 480 ? 565 : 395;
      const burstY = gulagPlayer.y < 235 ? 300 : 160;
      const radialCount = difficulty >= 9 ? 12 : 8;
      for (let index = 0; index < radialCount; index += 1) {
        const angle = index * Math.PI * 2 / radialCount;
        gulagBones.push({
          x: burstX,
          y: burstY,
          vx: Math.cos(angle) * speed * 1.12,
          vy: Math.sin(angle) * speed * 1.12,
          angle,
          size: 1.15
        });
      }
    }

    if (difficulty >= 7 && gulagAttackCount % 3 === 0) {
      launchGulagBeam(difficulty >= 9 ? 3 : 2);
    }

    if (difficulty >= 9 && gulagAttackCount % 4 === 0) {
      for (let index = 0; index < 5; index += 1) {
        const laneX = arena.left + 30 + index * 70;
        if (Math.abs(laneX - gulagPlayer.x) > 48) {
          launchGulagBone(
            laneX,
            arena.top,
            laneX + (Math.random() - .5) * 45,
            arena.bottom,
            speed * 1.15,
            0,
            1.4
          );
        }
      }
    }

    if (difficulty >= 9 && gulagAttackCount % 2 === 0) {
      launchGulagBeam(3);
    }
  }

  function updateGulag(dt) {
    updateHud();
    gulagTime -= dt;
    const remainingSecond = Math.ceil(Math.max(0, gulagTime));
    if (remainingSecond !== gulagDisplayedSecond) {
      gulagDisplayedSecond = remainingSecond;
      gulagTimerEl.textContent = `SOBREVIVE ${remainingSecond} s`;
    }

    let horizontal = Math.max(-1, Math.min(1,
      (movementKeys.has("right") ? 1 : 0) - (movementKeys.has("left") ? 1 : 0) +
      gulagJoystickVector.x + gamepadDirection.x
    ));
    let vertical = Math.max(-1, Math.min(1,
      (movementKeys.has("down") ? 1 : 0) - (movementKeys.has("up") ? 1 : 0) +
      gulagJoystickVector.y + gamepadDirection.y
    ));
    const magnitude = Math.hypot(horizontal, vertical) || 1;
    const moveSpeed = 260;
    gulagPlayer.x = Math.max(316, Math.min(644, gulagPlayer.x + horizontal / magnitude * moveSpeed * dt));
    gulagPlayer.y = Math.max(142, Math.min(338, gulagPlayer.y + vertical / magnitude * moveSpeed * dt));

    gulagSpawnTimer -= dt;
    if (gulagSpawnTimer <= 0) {
      spawnGulagBones();
      const difficulty = gulagDeaths - 1;
      gulagSpawnTimer = Math.max(
        gulagDeaths >= 10 ? .15 : .19,
        .72 - difficulty * .055
      );
    }

    for (const bone of gulagBones) {
      bone.x += bone.vx * dt;
      bone.y += bone.vy * dt;
      if (Math.hypot(bone.x - gulagPlayer.x, bone.y - gulagPlayer.y) < 17 * bone.size) {
        endGame();
        return;
      }
    }
    gulagBones = compactArray(gulagBones, bone =>
      bone.x > 280 && bone.x < 680 && bone.y > 105 && bone.y < 375
    );

    for (const beam of gulagBeams) {
      if (beam.warning > 0) {
        beam.warning -= dt;
      } else {
        beam.active -= dt;
        if (beam.active > 0 && Math.abs(gulagPlayer.x - beam.x) < 20) {
          endGame();
          return;
        }
      }
    }
    gulagBeams = compactArray(gulagBeams, beam => beam.warning > 0 || beam.active > 0);

    if (gulagTime <= 0) escapeGulag();
  }

  function gameLoop(timestamp) {
    if (state !== "running" && state !== "falling" && state !== "gulagIntro" && state !== "gulag") return;

    const dt = Math.max(0, Math.min((timestamp - lastTime) / 1000, .05));
    lastTime = timestamp;
    dashTimer = Math.max(0, dashTimer - dt);
    dashCooldown = Math.max(0, dashCooldown - dt);
    const musicMode = shopOpen
      ? "shop"
      : state === "gulagIntro" || state === "gulag" || state === "falling"
        ? "gulag"
        : boss.active
          ? boss.type.musicMode
          : state === "running"
            ? "race"
            : "silence";
    window.pacmanAudio.setMode(musicMode);
    if (state === "falling") {
      pacman.vy += GRAVITY * dt;
      pacman.y += pacman.vy * dt;
      fallTimer -= dt;
      if (fallTimer <= 0) startGulag();
      draw();
      if (state === "falling" || state === "gulagIntro" || state === "gulag") requestAnimationFrame(gameLoop);
      return;
    }
    if (state === "gulagIntro") {
      updateGulagIntro(dt);
      drawGulag();
      if (state === "gulagIntro" || state === "gulag") requestAnimationFrame(gameLoop);
      return;
    }
    if (state === "gulag") {
      updateGulag(dt);
      draw();
      if (state === "gulag" || state === "running") requestAnimationFrame(gameLoop);
      return;
    }

    runElapsed += dt;
    if (!shopVisit) {
      backgroundOffset += speed * dt * .22;
      roadOffset += speed * dt;
    }

    if (boss.active) {
      boss.time += dt;
      if (!bossMusicError) bossStatus.textContent = "ESQUIVA HASTA QUE TERMINE LA CANCIÓN";
    }

    if (boss.active) {
      if (bossControlsTimer > 0) {
        bossControlsTimer = Math.max(0, bossControlsTimer - dt);
        bossIntroStatus.textContent = `JOYSTICK EN ${Math.ceil(bossControlsTimer)}s`;
        if (bossControlsTimer === 0) {
          bossIntroStatus.hidden = true;
          setBossJoystickControls(true);
        }
      }
      if (bossIntroStatus && bossControlsTimer <= 0) bossIntroStatus.hidden = true;
      boss.anger = Math.max(0, boss.anger - dt * 2.2);
      boss.shake = Math.max(0, boss.shake - dt * 2.5);
      boss.gravityTimer = Math.max(0, boss.gravityTimer - dt);
      bossObstacleTimer = Math.max(
        0,
        bossNextAttackAt - window.pacmanAudio.getCurrentTrackTime()
      );
      if (bossObstacleTimer <= 0) {
        placeBossAttack();
        bossNextAttackAt = window.pacmanAudio.getNextBossAttackTime();
        bossObstacleTimer = bossNextAttackAt - window.pacmanAudio.getCurrentTrackTime();
        updateBossAttackCue();
      }
      updateBossAttackCountdown();
    } else if (!shopVisit) {
      score += speed * dt * multiplier * 2 ** scoreBoostLevel;
      speed = Math.min(MAX_SPEED, BASE_SPEED + score * .012);
      if (powerTimer > 0) {
        speed = Math.min(MAX_SPEED + 120, speed + 110);
      }
      while (score - streakStartScore >= milestoneInterval) {
        streakStartScore += milestoneInterval;
        milestoneInterval += STREAK_STEP_INCREASE + multiplier * 1000;
        multiplier += 1;
      }

      if (score >= nextShopScore) {
        nextShopScore *= 10;
        startSharkShopVisit();
      }

      if (!shopVisit && score >= nextBossScore) {
        score = nextBossScore;
        activateBoss();
      }
    }

    if (pendingBoss && runElapsed >= BOSS_UNLOCK_SECONDS && !shopVisit) {
      activateBoss(pendingBossAdvancesThreshold);
    }

    while (score >= nextLifeScore) {
      spawnLifePickup();
      nextLifeScore *= 10;
    }

    if (!boss.active && !shopVisit && !returningToLane) {
      cherrySpawnTimer -= dt;
      if (cherrySpawnTimer <= 0 && cherries.length === 0) {
        spawnCherry();
        if (cherries.length > 0) cherrySpawnTimer = 4 + Math.random() * 4;
      }

      if (sharkFins.length === 0) {
        finSpawnTimer -= dt;
        if (finSpawnTimer <= 0) {
          spawnSharkFin();
          finSpawnTimer = 5 + Math.random() * 3 + bossesDefeated * 1.25;
        }
      }
    }

    if (multiplier > lastMilestone) {
      lastMilestone = multiplier;
      showMilestone(multiplier);
    }

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) milestoneToast.classList.remove("visible");
      if (toastTimer <= 0) milestoneToast.classList.remove("frenzy");
    }

    if (powerTimer > 0 && !shopVisit) {
      powerTimer = Math.max(0, powerTimer - dt);
      if (powerTimer <= 0) {
        milestoneLabel.textContent = "PODER";
        milestoneValue.textContent = "TERMINADO";
        milestoneToast.classList.remove("frenzy");
        milestoneToast.classList.add("visible");
        milestoneToast.classList.remove("animating");
        void milestoneToast.offsetWidth;
        milestoneToast.classList.add("animating");
        toastTimer = 1.3;
      }
    }

    pacman.runFrame += state === "running" ? dt * 13 : 0;
    pacman.blink = Math.max(0, pacman.blink - dt * 1.8);
    pacman.hitTimer = Math.max(0, pacman.hitTimer - dt);
    if (pacman.duckHeld) {
      pacman.duckUntil = performance.now() + 900;
    }

    if (boss.active) {
      let horizontalDirection =
        (movementKeys.has("right") ? 1 : 0) - (movementKeys.has("left") ? 1 : 0) +
        gamepadDirection.x;
      let verticalDirection =
        (movementKeys.has("down") ? 1 : 0) - (movementKeys.has("up") ? 1 : 0) +
        gamepadDirection.y;
      if (bossJoystickEnabled) {
        horizontalDirection += bossJoystickVector.x;
        verticalDirection += bossJoystickVector.y;
      }
      if (dashTimer > 0) {
        horizontalDirection = dashDirection.x;
        verticalDirection = dashDirection.y;
      }
      const directionMagnitude = Math.hypot(horizontalDirection, verticalDirection);
      if (directionMagnitude > 1) {
        horizontalDirection /= directionMagnitude;
        verticalDirection /= directionMagnitude;
      }
      if (boss.gravityTimer > 0 && dashTimer <= 0) {
        horizontalDirection += Math.sign(boss.x + boss.width / 2 - pacman.x) * .22;
        verticalDirection += Math.sign(boss.y + boss.height / 2 - pacman.y) * .22;
      }
      const bossMoveSpeed = 360 * (1 + bossSpeedLevel * .25) * (dashTimer > 0 ? 2.8 : 1);
      pacman.x = Math.max(0, Math.min(
        WIDTH - pacman.width,
        pacman.x + horizontalDirection * bossMoveSpeed * dt
      ));
      pacman.y = Math.max(
        55,
        Math.min(GROUND_Y - pacman.height, pacman.y + verticalDirection * 300 * dt)
      );
      if (horizontalDirection !== 0) pacman.facing = Math.sign(horizontalDirection);
      pacman.vy = 0;
      pacman.grounded = false;
      pacman.ducking = false;
    } else if (!pacman.grounded) {
      pacman.vy += GRAVITY * dt;
      pacman.y += pacman.vy * dt;
      if (pacman.y >= GROUND_Y - pacman.height) {
        pacman.y = GROUND_Y - pacman.height;
        pacman.vy = 0;
        pacman.grounded = true;
      }
    }

    if (!boss.active && shopVisit && !shopOpen) {
      const movingLeft = movementKeys.has("left");
      const movingRight = movementKeys.has("right");
      const direction = Math.max(-1, Math.min(1,
        (movingLeft ? -1 : 0) + (movingRight ? 1 : 0) + gamepadDirection.x
      ));
      pacman.x = Math.max(0, Math.min(WIDTH - pacman.width, pacman.x + direction * 340 * dt));
      if (direction !== 0) pacman.facing = direction;
    } else if (returningToLane) {
      const laneX = 115;
      const distance = laneX - pacman.x;
      pacman.x += Math.sign(distance) * Math.min(Math.abs(distance), 420 * dt);
      if (pacman.x === laneX) {
        returningToLane = false;
        pacman.facing = 1;
      }
    }

    if (!shopVisit && !returningToLane) spawnTimer -= dt;
    if (!boss.active && !shopVisit && !returningToLane && spawnTimer <= 0) {
      const incomingObstacle = { x: WIDTH + 35, width: 130 };
      const cherryInSpawnArea = cherries.some(cherry =>
        incomingObstacle.x < cherry.x + cherry.width + 140 &&
        incomingObstacle.x + incomingObstacle.width > cherry.x - 140
      );
      const lifeInSpawnArea = lifePickups.some(pickup =>
        incomingObstacle.x < pickup.x + pickup.width + 140 &&
        incomingObstacle.x + incomingObstacle.width > pickup.x - 140
      );
      if (cherryInSpawnArea || lifeInSpawnArea) {
        spawnTimer = .1;
      } else {
        spawnObstacle();
        spawnTimer = Math.max(1.05, 1.8 - score / 24000);
      }
    }

    for (const obstacle of obstacles) {
      if (obstacle.type === "bossObstacle") {
        obstacle.life -= dt;
        if (obstacle.life <= 0) continue;
        if (obstacle.bossHoming && obstacle.telegraph <= 0) {
          const targetX = pacman.x + pacman.width / 2;
          const targetY = pacman.y + pacman.height / 2;
          const currentAngle = Math.atan2(obstacle.vy, obstacle.bossVx);
          const targetAngle = Math.atan2(
            targetY - (obstacle.y + obstacle.height / 2),
            targetX - (obstacle.x + obstacle.width / 2)
          );
          const angleDifference = Math.atan2(
            Math.sin(targetAngle - currentAngle),
            Math.cos(targetAngle - currentAngle)
          );
          const angle = currentAngle + Math.max(-1.5 * dt, Math.min(1.5 * dt, angleDifference));
          obstacle.bossVx = Math.cos(angle) * obstacle.bossHomingSpeed;
          obstacle.vy = Math.sin(angle) * obstacle.bossHomingSpeed;
        }
        obstacle.x += (obstacle.bossVx || 0) * dt;
      } else {
        obstacle.x -= speed * dt;
        obstacle.x += (obstacle.bossVx || 0) * dt;
      }
      obstacle.y += (obstacle.vy || 0) * dt;
      if (obstacle.telegraph > 0) obstacle.telegraph = Math.max(0, obstacle.telegraph - dt);
      if (obstacle.bobAmplitude) {
        obstacle.y = obstacle.baseY + Math.sin(timestamp / 300 + obstacle.phase) * obstacle.bobAmplitude;
      }
      if (obstacle.type !== "bossObstacle" && !obstacle.passed && obstacle.x + obstacle.width < pacman.x) {
        obstacle.passed = true;
        score += 50 * multiplier * 2 ** scoreBoostLevel;
      }

      if (obstacle.type === "alien") {
        obstacle.y += Math.sin(timestamp / 280 + obstacle.x) * .25;
      }

      if (obstacle.type === "ship") {
        const inRange = obstacle.x + obstacle.width > pacman.x - 10 && obstacle.x < pacman.x + pacman.width + 10;
        const jumpIntent = !pacman.ducking && pacman.vy < -40;
        if (inRange && jumpIntent) {
          handlePlayerHit(obstacle);
          break;
        }
      }
    }

    obstacles = compactArray(obstacles, obstacle => obstacle.type === "bossObstacle"
      ? obstacle.life > 0 &&
        obstacle.x < WIDTH + 100 &&
        obstacle.x + obstacle.width > -100 &&
        obstacle.y < GROUND_Y + 120 &&
        obstacle.y + obstacle.height > -120
      : obstacle.x > -100);

    const obstacleBesidePacman = obstacles.some(obstacle =>
      obstacle.x < pacman.x + pacman.width &&
      obstacle.x + obstacle.width > pacman.x
    );
    if (pacman.ducking && !pacman.duckHeld &&
        performance.now() >= pacman.duckUntil && !obstacleBesidePacman) {
      pacman.ducking = false;
    }

    const pacmanBox = getPacmanHitBox();
    for (const obstacle of obstacles) {
      if (obstacle.type === "bossObstacle" && obstacle.life <= 0) continue;
      if (obstacle.telegraph > 0) continue;
      const obstacleBox = obstacle.type === "ship"
        ? { x: obstacle.x + 10, y: obstacle.y + 8, width: obstacle.width - 20, height: obstacle.height - 10 }
        : { x: obstacle.x + 3, y: obstacle.y + 3, width: obstacle.width - 6, height: obstacle.height - 4 };

      if (pacman.ducking && obstacle.type === "ship") {
        const duckHitBox = { x: pacman.x + 12, y: GROUND_Y - 28, width: 38, height: 28 };
        if (collides(duckHitBox, obstacleBox)) {
          continue;
        }
      }

      if (collides(pacmanBox, obstacleBox)) {
        handlePlayerHit(obstacle);
        break;
      }
    }

    if (state !== "running") {
      updateHud();
      draw();
      requestAnimationFrame(gameLoop);
      return;
    }

    for (const cherry of cherries) {
      cherry.x -= speed * dt;
      const cherryHitBox = {
        x: cherry.x + 1,
        y: cherry.y + 12,
        width: cherry.width - 2,
        height: cherry.height - 12
      };
      if (state === "running" && collides(pacmanBox, cherryHitBox)) {
        collectCherry(cherry);
        cherry.collected = true;
      }
    }
    cherries = compactArray(cherries, cherry => !cherry.collected && cherry.x > -cherry.width);

    for (const fin of sharkFins) {
      fin.x -= speed * dt;
      const finBox = {
        x: fin.x + 4,
        y: fin.y + 3,
        width: fin.width - 8,
        height: fin.height - 5
      };
      if (!fin.collected && collides(pacmanBox, finBox)) {
        fin.collected = true;
        const coinReward = Math.max(1, 5 - bossesDefeated);
        coins += coinReward;
        updateHud();
        milestoneLabel.textContent = "ALETA ATRAPADA";
        milestoneValue.textContent = `+${coinReward} MONEDA${coinReward === 1 ? "" : "S"}`;
        milestoneToast.classList.remove("frenzy");
        milestoneToast.classList.add("visible");
        milestoneToast.classList.remove("animating");
        void milestoneToast.offsetWidth;
        milestoneToast.classList.add("animating");
        toastTimer = 1.2;
        createBurst(fin.x + fin.width / 2, fin.y + fin.height / 2, colors.yellow, 12);
      }
    }
    sharkFins = compactArray(sharkFins, fin => !fin.collected && fin.x > -fin.width);

    for (const pickup of lifePickups) {
      pickup.x -= speed * dt;
      const pickupBox = {
        x: pickup.x + 4,
        y: pickup.y + 4,
        width: pickup.width - 8,
        height: pickup.height - 8
      };
      if (lives < STARTING_LIVES && collides(pacmanBox, pickupBox)) {
        lives += 1;
        if (gulagLifeActive) gulagReentriesAvailable += 1;
        pickup.collected = true;
        milestoneLabel.textContent = "VIDA RECUPERADA";
        milestoneValue.textContent = "+1";
        milestoneToast.classList.remove("frenzy");
        milestoneToast.classList.add("visible");
        milestoneToast.classList.remove("animating");
        void milestoneToast.offsetWidth;
        milestoneToast.classList.add("animating");
        toastTimer = 1.5;
        createBurst(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2, "#ff5f8f", 16);
      }
    }
    lifePickups = compactArray(lifePickups, pickup => !pickup.collected && pickup.x > -pickup.width);

    for (const particle of particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 300 * dt;
      particle.life -= dt;
    }
    particles = compactArray(particles, particle => particle.life > 0);

    updateHud();
    draw();
    if (state === "running") requestAnimationFrame(gameLoop);
  }

  function draw() {
    if (state === "gulag" || state === "gulagIntro") {
      drawGulag();
      return;
    }
    setCanvasLogicalTransform();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawSky();
    drawGalaxy();
    drawPlanets();
    drawGround();
    drawObstacles();
    drawCherries();
    drawLifePickups();
    drawSharkFins();
    drawAmmoPickups();
    drawBoss();
    drawSharkMerchant();
    drawWeaponImpacts();
    drawBrainProjectiles();
    drawParticles();
    drawSpeedLines();
    drawDashTrail();
    drawPacman();
  }

  function drawDashTrail() {
    if (!boss.active || dashTimer <= 0 || window.pacmanSettings.reducedAnimations) return;
    const duration = DASH_DURATION + dashLevel * .05;
    const fade = Math.min(1, dashTimer / duration);
    const centerX = pacman.x + pacman.width / 2;
    const centerY = pacman.y + pacman.height / 2;
    const angle = Math.atan2(dashDirection.y, dashDirection.x);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    for (let index = 0; index < 3; index += 1) {
      ctx.globalAlpha = fade * (.5 - index * .12);
      ctx.fillStyle = index === 0 ? "#ffffff" : "#46d7ff";
      ctx.shadowColor = "#46d7ff";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(-18 - index * 14, 0, 20 - index * 3, 8 - index, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawGulag() {
    const reducedAnimations = window.pacmanSettings.reducedAnimations;
    const animationTime = reducedAnimations ? 0 : performance.now() / 1000;
    setCanvasLogicalTransform();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = gulagBackdropGradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const pulse = reducedAnimations
      ? .75
      : .75 + Math.sin(performance.now() / 180) * .12;
    ctx.save();
    ctx.globalAlpha = .4;
    ctx.shadowColor = "#ff153c";
    ctx.shadowBlur = 35;
    ctx.fillStyle = "#e8ded4";
    ctx.strokeStyle = "#571b29";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(480, 45);
    ctx.bezierCurveTo(365, 45, 305, 120, 317, 229);
    ctx.bezierCurveTo(323, 293, 354, 324, 380, 343);
    ctx.lineTo(392, 382);
    ctx.lineTo(427, 362);
    ctx.lineTo(451, 389);
    ctx.lineTo(480, 365);
    ctx.lineTo(509, 389);
    ctx.lineTo(533, 362);
    ctx.lineTo(568, 382);
    ctx.lineTo(580, 343);
    ctx.bezierCurveTo(606, 324, 637, 293, 643, 229);
    ctx.bezierCurveTo(655, 120, 595, 45, 480, 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = "#ff123b";
    ctx.shadowBlur = 34 * pulse;
    ctx.fillStyle = "#15070d";
    ctx.beginPath();
    ctx.ellipse(412, 213, 48, 60, -.12, 0, Math.PI * 2);
    ctx.ellipse(548, 213, 48, 60, .12, 0, Math.PI * 2);
    ctx.fill();
    const leftEyeDirection = Math.atan2(gulagPlayer.y - 213, gulagPlayer.x - 412);
    const rightEyeDirection = Math.atan2(gulagPlayer.y - 213, gulagPlayer.x - 548);
    const leftEyeOffsetX = Math.cos(leftEyeDirection) * 15;
    const leftEyeOffsetY = Math.sin(leftEyeDirection) * 17;
    const rightEyeOffsetX = Math.cos(rightEyeDirection) * 15;
    const rightEyeOffsetY = Math.sin(rightEyeDirection) * 17;
    ctx.fillStyle = "#ff153c";
    ctx.beginPath();
    ctx.ellipse(416 + leftEyeOffsetX, 214 + leftEyeOffsetY, 10, 27, -.1, 0, Math.PI * 2);
    ctx.ellipse(544 + rightEyeOffsetX, 214 + rightEyeOffsetY, 10, 27, .1, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#16070d";
    ctx.beginPath();
    ctx.moveTo(480, 248);
    ctx.lineTo(460, 286);
    ctx.lineTo(500, 286);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#73535a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(408, 316);
    ctx.lineTo(552, 316);
    ctx.stroke();
    for (let tooth = 0; tooth < 6; tooth += 1) {
      const x = 420 + tooth * 24;
      ctx.beginPath();
      ctx.moveTo(x, 314);
      ctx.lineTo(x, 341 + (tooth % 2) * 4);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(72, 18, 32, .8)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(367, 103);
    ctx.lineTo(393, 132);
    ctx.lineTo(382, 157);
    ctx.moveTo(579, 93);
    ctx.lineTo(557, 128);
    ctx.lineTo(573, 151);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "rgba(5, 4, 8, .7)";
    ctx.fillRect(300, 125, 360, 230);
    ctx.strokeStyle = `rgba(255, 36, 72, ${pulse})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = "#ff173d";
    ctx.shadowBlur = 20;
    ctx.strokeRect(300, 125, 360, 230);
    ctx.shadowBlur = 0;

    if (!reducedAnimations) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let ember = 0; ember < 16; ember += 1) {
        const phase = (animationTime * (.12 + ember % 4 * .035) + ember * .173) % 1;
        const x = 310 + (ember * 71) % 340 + Math.sin(animationTime + ember) * 5;
        const y = 350 - phase * 212;
        ctx.globalAlpha = .12 + Math.sin(phase * Math.PI) * .32;
        ctx.fillStyle = ember % 3 === 0 ? "#ffc2cb" : "#ff3152";
        ctx.shadowColor = "#ff153c";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, ember % 4 === 0 ? 2.2 : 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    for (const beam of gulagBeams) {
      ctx.save();
      ctx.globalAlpha = beam.warning > 0
        ? window.pacmanSettings.reducedAnimations
          ? .6
          : .35 + Math.sin(performance.now() / 55) * .25
        : .9;
      ctx.fillStyle = beam.warning > 0 ? "#ffd8e0" : "#ff173d";
      ctx.shadowColor = "#ff173d";
      ctx.shadowBlur = beam.warning > 0 ? 9 : 28;
      ctx.fillRect(beam.x - 11, 126, 22, 228);
      if (beam.warning <= 0) {
        ctx.fillStyle = "#fff1f4";
        ctx.fillRect(beam.x - 3, 126, 6, 228);
      }
      ctx.restore();
    }

    for (const bone of gulagBones) {
      ctx.save();
      ctx.translate(bone.x, bone.y);
      ctx.rotate(bone.angle);
      ctx.scale(bone.size, bone.size);
      ctx.shadowColor = "#ff3152";
      ctx.shadowBlur = 11;
      ctx.fillStyle = "#f1d9c9";
      ctx.fillRect(-13, -4, 26, 8);
      for (const end of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(end * 13, -4, 5, 0, Math.PI * 2);
        ctx.arc(end * 13, 4, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const heartX = gulagPlayer.x;
    const heartY = gulagPlayer.y;
    ctx.save();
    ctx.translate(heartX, heartY);
    ctx.scale(1.15, 1.15);
    ctx.shadowColor = "#ff153c";
    ctx.shadowBlur = reducedAnimations ? 12 : 14 + Math.sin(animationTime * 8) * 5;
    ctx.fillStyle = "#ff244b";
    ctx.beginPath();
    ctx.moveTo(0, 11);
    ctx.bezierCurveTo(-4, 7, -14, 0, -14, -7);
    ctx.bezierCurveTo(-14, -15, -4, -17, 0, -9);
    ctx.bezierCurveTo(4, -17, 14, -15, 14, -7);
    ctx.bezierCurveTo(14, 0, 4, 7, 0, 11);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawSky() {
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.globalAlpha = .7;
    for (let i = 0; i < 110; i += 1) {
      const x = (i * 137 + backgroundOffset * .08) % WIDTH;
      const y = (i * 83 + backgroundOffset * .025) % 350;
      const radius = i % 9 === 0 ? 1.7 : .7;
      ctx.fillStyle = i % 5 === 0 ? colors.cyan : "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGalaxy() {
    const galaxyX = WIDTH * .72 - backgroundOffset * .025;
    ctx.save();
    ctx.globalAlpha = .2;
    ctx.strokeStyle = colors.violet;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(galaxyX, 160, 300, 110, -.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(galaxyX - 90, 160, 190, 70, .25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlanets() {
    for (const planet of planets) {
      const x = ((planet.x - backgroundOffset * .08) % (WIDTH + 100) + WIDTH + 100) % (WIDTH + 100) - 50;
      ctx.save();
      ctx.translate(x, planet.y);
      ctx.shadowColor = planet.color;
      ctx.shadowBlur = 22;
      ctx.fillStyle = planet.color;
      ctx.beginPath();
      ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (planet.ring) {
        ctx.strokeStyle = "rgba(70, 215, 255, .75)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.radius * 1.45, planet.radius * .48, -.22, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255,255,255,.18)";
      ctx.beginPath();
      ctx.arc(-planet.radius * .28, -planet.radius * .2, planet.radius * .28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawGround() {
    ctx.fillStyle = "#070b1d";
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

    ctx.strokeStyle = "rgba(70, 215, 255, .42)";
    ctx.lineWidth = 2;
    for (let x = -80 + (roadOffset % 80); x < WIDTH + 80; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 32);
      ctx.lineTo(x + 38, GROUND_Y + 32);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate((roadOffset * .55) % (WIDTH + 300) - 150, GROUND_Y + 24);
    ctx.fillStyle = colors.yellow;
    ctx.shadowColor = colors.yellow;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(22, -2);
    ctx.lineTo(34, 10);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "rgba(70, 215, 255, .2)";
    for (let x = -50 + (roadOffset % 100); x < WIDTH + 100; x += 100) {
      ctx.fillRect(x, GROUND_Y + 50, 45, 3);
    }
  }

  function drawBoss() {
    if (!boss.active) return;
    ctx.save();
    ctx.globalAlpha = .68;
    if (boss.isSkull) {
      drawSkullBoss();
      ctx.restore();
      return;
    }
    const type = boss.type;
    const design = bossTypes.indexOf(type);
    if (design >= legacyBossTypes.length) {
      drawLoreBoss(design);
      ctx.restore();
      return;
    }
    const t = window.pacmanSettings.reducedAnimations ? 0 : boss.time;
    const bob = Math.sin(t * 2.7) * 12;
    const pulse = 1 + Math.sin(t * 3.2) * .06;
    const swing = Math.sin(t * 2.1) * .22;

    ctx.save();
    ctx.translate(boss.x + boss.width / 2, boss.y + boss.height / 2 + bob);
    ctx.rotate(Math.sin(t * 1.5) * .045);
    ctx.scale(pulse * 1.8, pulse * 1.8);
    if (!window.pacmanSettings.reducedAnimations && boss.shake > 0) {
      ctx.translate((Math.random() - .5) * 8 * boss.shake, (Math.random() - .5) * 6 * boss.shake);
    }

    ctx.shadowColor = boss.anger > .2 ? colors.coral : type.primary;
    ctx.shadowBlur = window.pacmanSettings.reducedAnimations
      ? 0
      : boss.anger > .2 ? 34 : 24;

    ctx.save();
    ctx.strokeStyle = type.secondary;
    ctx.fillStyle = type.secondary;
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    if (design === 3) {
      for (let i = -1; i <= 2; i += 1) {
        const x = (i - .5) * 30;
        const offset = Math.sin(t * 4 + i) * 10;
        ctx.beginPath();
        ctx.moveTo(x, 25);
        ctx.quadraticCurveTo(x + offset, 55, x - offset, 83);
        ctx.stroke();
        ctx.fillStyle = type.accent;
        ctx.beginPath();
        ctx.arc(x - offset, 83, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (design === 5) {
      ctx.save();
      ctx.rotate(swing);
      ctx.beginPath();
      ctx.ellipse(-67, -2, 35, 57, -.4, 0, Math.PI * 2);
      ctx.ellipse(67, -2, 35, 57, .4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.rotate(swing);
      ctx.beginPath();
      ctx.moveTo(-43, 8);
      ctx.quadraticCurveTo(-81, 17, -73, 54);
      ctx.lineTo(-49, 43);
      ctx.moveTo(43, 8);
      ctx.quadraticCurveTo(81, 17, 73, 54);
      ctx.lineTo(49, 43);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    ctx.fillStyle = type.secondary;
    ctx.beginPath();
    if (design === 1) {
      ctx.roundRect(-62, -68, 124, 140, 22);
    } else if (design === 3) {
      ctx.ellipse(0, -4, 61, 66, 0, 0, Math.PI * 2);
    } else if (design === 4) {
      ctx.ellipse(0, -22, 59, 62, 0, 0, Math.PI * 2);
    } else if (design === 6) {
      ctx.moveTo(0, -88);
      ctx.lineTo(62, -34);
      ctx.lineTo(49, 47);
      ctx.lineTo(0, 83);
      ctx.lineTo(-49, 47);
      ctx.lineTo(-62, -34);
      ctx.closePath();
    } else if (design === 7) {
      ctx.moveTo(-62, -51);
      ctx.lineTo(22, -70);
      ctx.lineTo(62, -31);
      ctx.lineTo(45, 33);
      ctx.lineTo(-21, 55);
      ctx.lineTo(-59, 16);
      ctx.closePath();
    } else if (design === 9) {
      ctx.moveTo(-58, -47);
      ctx.quadraticCurveTo(0, -90, 58, -47);
      ctx.lineTo(53, 43);
      ctx.quadraticCurveTo(34, 28, 17, 48);
      ctx.quadraticCurveTo(0, 28, -17, 48);
      ctx.quadraticCurveTo(-34, 28, -53, 43);
      ctx.closePath();
    } else {
      ctx.ellipse(0, -15, 62, 69, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = type.primary;
    ctx.beginPath();
    if (design === 1) {
      ctx.roundRect(-54, -61, 108, 110, 17);
    } else if (design === 4) {
      ctx.ellipse(0, -24, 52, 56, 0, 0, Math.PI * 2);
    } else if (design === 6) {
      ctx.moveTo(0, -78);
      ctx.lineTo(51, -31);
      ctx.lineTo(39, 37);
      ctx.lineTo(0, 68);
      ctx.lineTo(-39, 37);
      ctx.lineTo(-51, -31);
      ctx.closePath();
    } else if (design === 7) {
      ctx.moveTo(-53, -43);
      ctx.lineTo(20, -59);
      ctx.lineTo(51, -28);
      ctx.lineTo(37, 25);
      ctx.lineTo(-18, 45);
      ctx.lineTo(-50, 11);
      ctx.closePath();
    } else {
      ctx.ellipse(0, -15, 54, 61, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.fillStyle = type.accent;
    ctx.beginPath();
    if (design === 0) {
      ctx.moveTo(-45, -52);
      ctx.lineTo(-57, -83);
      ctx.lineTo(-29, -67);
      ctx.lineTo(-17, -91);
      ctx.lineTo(0, -69);
      ctx.lineTo(18, -91);
      ctx.lineTo(31, -67);
      ctx.lineTo(57, -83);
      ctx.lineTo(44, -51);
      ctx.closePath();
      ctx.fill();
    } else if (design === 1) {
      ctx.fillRect(-40, -7, 80, 8);
      ctx.fillRect(-46, 30, 14, 18);
      ctx.fillRect(32, 30, 14, 18);
    } else if (design === 2) {
      ctx.strokeStyle = type.accent;
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-42, -51);
      ctx.lineTo(-64, -77);
      ctx.lineTo(-28, -67);
      ctx.moveTo(42, -51);
      ctx.lineTo(64, -77);
      ctx.lineTo(28, -67);
      ctx.stroke();
    } else if (design === 4) {
      ctx.beginPath();
      ctx.roundRect(-33, 18, 66, 30, 8);
      ctx.fill();
      ctx.fillStyle = type.secondary;
      for (let i = -2; i <= 2; i += 1) ctx.fillRect(i * 11 - 3, 18, 6, 15);
    } else if (design === 5) {
      ctx.strokeStyle = type.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-20, -67);
      ctx.quadraticCurveTo(-39, -99, -48, -78);
      ctx.moveTo(20, -67);
      ctx.quadraticCurveTo(39, -99, 48, -78);
      ctx.stroke();
    } else if (design === 7) {
      ctx.beginPath();
      ctx.moveTo(-38, -48);
      ctx.lineTo(-58, -80);
      ctx.lineTo(-17, -62);
      ctx.moveTo(32, -49);
      ctx.lineTo(52, -79);
      ctx.lineTo(18, -62);
      ctx.fill();
    } else if (design === 8) {
      ctx.beginPath();
      for (let i = 0; i < 12; i += 1) {
        const angle = i * Math.PI / 6;
        const radius = i % 2 ? 72 : 88;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius - 15;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (design === 9) {
      ctx.strokeStyle = type.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -15, 82, 34, swing, 0, Math.PI * 2);
      ctx.ellipse(0, -15, 69, 25, -swing, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#101828";
    ctx.beginPath();
    if (design === 1) {
      ctx.roundRect(-43, -39, 86, 40, 7);
    } else {
      ctx.roundRect(-47, -39, 94, 45, 17);
    }
    ctx.fill();

    ctx.shadowColor = type.accent;
    ctx.shadowBlur = window.pacmanSettings.reducedAnimations ? 0 : 16;
    ctx.fillStyle = type.accent;
    ctx.beginPath();
    if (design === 8) {
      ctx.ellipse(0, -19, 19, 17, 0, 0, Math.PI * 2);
    } else if (design === 3) {
      ctx.ellipse(-24, -20, 8, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(0, -22, 8, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(24, -20, 8, 9, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(-23, -20, 11, 12, -.2, 0, Math.PI * 2);
      ctx.ellipse(23, -20, 11, 12, .2, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-20, 12);
    ctx.lineTo(20, 12);
    ctx.lineTo(12, 25);
    ctx.lineTo(4, 18);
    ctx.lineTo(-4, 25);
    ctx.lineTo(-12, 18);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  function drawLoreBoss(design) {
    const type = boss.type;
    const t = window.pacmanSettings.reducedAnimations ? 0 : boss.time;
    const pulse = 1 + Math.sin(t * 3.2) * .045;
    ctx.save();
    ctx.translate(
      boss.x + boss.width / 2,
      boss.y + boss.height / 2 + Math.sin(t * 2.4) * 10 + (design === 12 ? 12 : 0)
    );
    ctx.scale((design === 12 ? 1.78 : 1.7) * pulse, (design === 12 ? 1.78 : 1.7) * pulse);
    ctx.shadowColor = type.accent;
    ctx.shadowBlur = window.pacmanSettings.reducedAnimations ? 0 : 30;

    if (design === 10) {
      ctx.fillStyle = "#090b12";
      ctx.beginPath();
      ctx.moveTo(-38, -30);
      ctx.lineTo(-86, 93);
      ctx.lineTo(-39, 72);
      ctx.lineTo(-12, 104);
      ctx.lineTo(0, 68);
      ctx.lineTo(25, 103);
      ctx.lineTo(39, 72);
      ctx.lineTo(86, 93);
      ctx.lineTo(38, -30);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = type.secondary;
      ctx.beginPath();
      ctx.moveTo(-48, -19);
      ctx.lineTo(-68, 23);
      ctx.lineTo(-42, 18);
      ctx.lineTo(-29, 48);
      ctx.lineTo(0, 34);
      ctx.lineTo(29, 48);
      ctx.lineTo(42, 18);
      ctx.lineTo(68, 23);
      ctx.lineTo(48, -19);
      ctx.lineTo(0, -49);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = type.primary;
      ctx.beginPath();
      ctx.moveTo(-44, -30);
      ctx.lineTo(-36, -69);
      ctx.lineTo(-15, -83);
      ctx.lineTo(0, -68);
      ctx.lineTo(15, -83);
      ctx.lineTo(36, -69);
      ctx.lineTo(44, -30);
      ctx.lineTo(31, 5);
      ctx.lineTo(0, 20);
      ctx.lineTo(-31, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = type.accent;
      ctx.fillRect(-28, -34, 56, 8);
      ctx.fillStyle = "#fff2f4";
      ctx.fillRect(-23, -32, 12, 3);
      ctx.fillRect(11, -32, 12, 3);
      ctx.fillStyle = "#111522";
      ctx.beginPath();
      ctx.moveTo(-19, 28);
      ctx.lineTo(0, 40);
      ctx.lineTo(19, 28);
      ctx.lineTo(13, 61);
      ctx.lineTo(0, 75);
      ctx.lineTo(-13, 61);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = type.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-13, 47);
      ctx.lineTo(13, 47);
      ctx.stroke();
    } else if (design === 11) {
      ctx.strokeStyle = type.secondary;
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      for (let tentacle = 0; tentacle < 6; tentacle += 1) {
        const side = tentacle < 3 ? -1 : 1;
        const offset = (tentacle % 3 - 1) * 22;
        ctx.beginPath();
        ctx.moveTo(side * 30, 30);
        ctx.quadraticCurveTo(side * 95, 4 + offset, side * (78 + Math.sin(t + tentacle) * 12), 72 + offset);
        ctx.stroke();
        ctx.fillStyle = type.accent;
        ctx.beginPath();
        ctx.arc(side * (78 + Math.sin(t + tentacle) * 12), 72 + offset, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = type.secondary;
      ctx.beginPath();
      ctx.moveTo(-43, 4);
      ctx.lineTo(-62, 94);
      ctx.lineTo(0, 70);
      ctx.lineTo(62, 94);
      ctx.lineTo(43, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = type.primary;
      ctx.beginPath();
      ctx.ellipse(0, -31, 57, 57, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = type.accent;
      ctx.lineWidth = 3;
      for (let orbit = 0; orbit < 2; orbit += 1) {
        ctx.beginPath();
        ctx.ellipse(0, -31, 75 - orbit * 11, 24 + orbit * 12, t * (orbit ? -.2 : .2), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#f4eaff";
      for (let star = 0; star < 5; star += 1) {
        const angle = star * Math.PI * 2 / 5 + t * .3;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 33, -31 + Math.sin(angle) * 33, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#210b3c";
      ctx.beginPath();
      ctx.ellipse(0, -30, 17, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = type.accent;
      ctx.beginPath();
      ctx.ellipse(0, -31, 7, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.shadowColor = "#ff4b00";
      ctx.shadowBlur = window.pacmanSettings.reducedAnimations ? 0 : 44;
      ctx.fillStyle = "#080606";
      ctx.beginPath();
      ctx.moveTo(-44, 5);
      ctx.lineTo(-72, -3);
      ctx.lineTo(-108, -35);
      ctx.lineTo(-98, 13);
      ctx.lineTo(-127, 34);
      ctx.lineTo(-83, 39);
      ctx.lineTo(-74, 88);
      ctx.lineTo(-34, 60);
      ctx.lineTo(0, 105);
      ctx.lineTo(34, 60);
      ctx.lineTo(74, 88);
      ctx.lineTo(83, 39);
      ctx.lineTo(127, 34);
      ctx.lineTo(98, 13);
      ctx.lineTo(108, -35);
      ctx.lineTo(72, -3);
      ctx.lineTo(44, 5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#8f2d08";
      ctx.lineWidth = 18;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-40, 0);
      ctx.quadraticCurveTo(-105, 18, -78, 82);
      ctx.moveTo(40, 0);
      ctx.quadraticCurveTo(105, 18, 78, 82);
      ctx.stroke();
      ctx.strokeStyle = "#ff8a00";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-40, 0);
      ctx.quadraticCurveTo(-105, 18, -78, 82);
      ctx.moveTo(40, 0);
      ctx.quadraticCurveTo(105, 18, 78, 82);
      ctx.stroke();

      ctx.fillStyle = "#170b06";
      ctx.beginPath();
      ctx.moveTo(-48, -1);
      ctx.lineTo(-68, 61);
      ctx.lineTo(-39, 50);
      ctx.lineTo(-22, 83);
      ctx.lineTo(0, 69);
      ctx.lineTo(22, 83);
      ctx.lineTo(39, 50);
      ctx.lineTo(68, 61);
      ctx.lineTo(48, -1);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#ff9d00";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(0, -42, 91, 29, -.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#ff4b00";
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.ellipse(0, -42, 79, 21, -.28, Math.PI * .05, Math.PI * .92);
      ctx.stroke();
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -42, 68, 16, -.28, Math.PI * 1.05, Math.PI * 1.88);
      ctx.stroke();

      ctx.fillStyle = "#080606";
      ctx.beginPath();
      ctx.ellipse(0, -42, 61, 58, 0, 0, Math.PI * 2);
      ctx.fill();
      const eventHorizon = ctx.createRadialGradient(0, -42, 28, 0, -42, 60);
      eventHorizon.addColorStop(0, "#000000");
      eventHorizon.addColorStop(.72, "#080606");
      eventHorizon.addColorStop(.9, "#7b2708");
      eventHorizon.addColorStop(1, "#ff6a00");
      ctx.fillStyle = eventHorizon;
      ctx.beginPath();
      ctx.ellipse(0, -42, 57, 55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffae32";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, -42, 46, 44, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();

      ctx.fillStyle = "#080606";
      ctx.beginPath();
      ctx.ellipse(0, -42, 35, 38, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = "#ff6a00";
      ctx.shadowBlur = window.pacmanSettings.reducedAnimations ? 0 : 24;
      ctx.fillStyle = "#ffae32";
      ctx.beginPath();
      ctx.arc(0, -42, 5 + Math.sin(t * 5) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ff6a00";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-28, 21);
      ctx.lineTo(0, 38);
      ctx.lineTo(28, 21);
      ctx.lineTo(16, 59);
      ctx.lineTo(0, 70);
      ctx.lineTo(-16, 59);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "#100805";
      ctx.fill();
      ctx.fillStyle = "#ff6a00";
      ctx.beginPath();
      ctx.moveTo(-9, 33);
      ctx.lineTo(0, 42);
      ctx.lineTo(9, 33);
      ctx.lineTo(4, 55);
      ctx.lineTo(0, 61);
      ctx.lineTo(-4, 55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSkullBoss() {
    const t = window.pacmanSettings.reducedAnimations ? 0 : boss.time;
    const pulse = 1 + Math.sin(t * 4) * .055;
    ctx.save();
    ctx.translate(boss.x + boss.width / 2, boss.y + boss.height / 2 + Math.sin(t * 2.6) * 12);
    ctx.scale(1.7 * pulse, 1.7 * pulse);
    if (!window.pacmanSettings.reducedAnimations && boss.shake > 0) {
      ctx.translate((Math.random() - .5) * 9 * boss.shake, (Math.random() - .5) * 7 * boss.shake);
    }
    ctx.shadowColor = skullBossType.accent;
    ctx.shadowBlur = window.pacmanSettings.reducedAnimations
      ? 0
      : boss.anger > .2 ? 42 : 28;
    ctx.fillStyle = skullBossType.secondary;
    ctx.strokeStyle = "#f2e2d1";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-60, -43);
    ctx.bezierCurveTo(-64, -99, 61, -101, 60, -43);
    ctx.lineTo(52, 26);
    ctx.lineTo(34, 61);
    ctx.lineTo(-34, 61);
    ctx.lineTo(-52, 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#130910";
    ctx.beginPath();
    ctx.ellipse(-26, -23, 19, 25, -.15, 0, Math.PI * 2);
    ctx.ellipse(26, -23, 19, 25, .15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "#ff173d";
    ctx.shadowBlur = window.pacmanSettings.reducedAnimations ? 0 : 25;
    ctx.fillStyle = "#ff244b";
    ctx.beginPath();
    ctx.ellipse(-25, -24, 7, 16, -.15, 0, Math.PI * 2);
    ctx.ellipse(25, -24, 7, 16, .15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#140910";
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(-11, 16);
    ctx.lineTo(11, 16);
    ctx.closePath();
    ctx.fill();
    const jawDrop = Math.sin(t * 5) * 5;
    ctx.strokeStyle = "#f2e2d1";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-35, 31 + jawDrop);
    ctx.lineTo(35, 31 + jawDrop);
    ctx.stroke();
    for (let tooth = -2; tooth <= 2; tooth += 1) {
      const x = tooth * 13;
      ctx.fillStyle = "#f2e2d1";
      ctx.beginPath();
      ctx.moveTo(x - 4, 29 + jawDrop);
      ctx.lineTo(x + 4, 29 + jawDrop);
      ctx.lineTo(x, 41 + jawDrop);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = skullBossType.accent;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-42, -66);
    ctx.lineTo(-67, -94);
    ctx.lineTo(-64, -53);
    ctx.moveTo(42, -66);
    ctx.lineTo(67, -94);
    ctx.lineTo(64, -53);
    ctx.stroke();
    ctx.restore();
  }

  function drawWeaponImpacts() {
    for (const impact of weaponImpacts) {
      const progress = 1 - impact.life / .6;
      const radius = 10 + progress * 36;
      const alpha = impact.life / .6;
      const color = impact.weaponLevel === 3
        ? "#c8ff3d"
        : impact.weaponLevel === 2
          ? colors.coral
          : colors.cyan;

      ctx.save();
      ctx.translate(impact.x, impact.y);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = impact.weaponLevel === 1 ? 3 : 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;

      if (impact.weaponLevel === 1) {
        for (let ring = 0; ring < 3; ring += 1) {
          ctx.beginPath();
          ctx.arc(0, 0, radius * (.55 + ring * .2), -.8 + ring, .8 + ring);
          ctx.stroke();
        }
      } else if (impact.weaponLevel === 2) {
        ctx.rotate(progress * Math.PI);
        for (let ray = 0; ray < 10; ray += 1) {
          const angle = ray * Math.PI / 5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * radius * .35, Math.sin(angle) * radius * .35);
          ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, radius * .38, 0, Math.PI * 2);
        ctx.stroke();
      } else if (impact.weaponLevel === 3) {
        ctx.rotate(progress * Math.PI * 2);
        ctx.beginPath();
        for (let bolt = 0; bolt < 4; bolt += 1) {
          const angle = bolt * Math.PI / 2;
          const inner = radius * .35;
          const outer = radius;
          ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
          ctx.lineTo(Math.cos(angle + .12) * outer * .55, Math.sin(angle + .12) * outer * .55);
          ctx.lineTo(Math.cos(angle - .08) * outer, Math.sin(angle - .08) * outer);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, radius * .42, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawBrainProjectiles() {
    for (const projectile of brainProjectiles) {
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.scale(projectile.vx > 0 ? 1 : -1, 1);
      const projectileColor = projectile.weaponLevel === 3
        ? "#c8ff3d"
        : projectile.weaponLevel === 2
          ? colors.coral
          : colors.cyan;
      ctx.shadowColor = projectileColor;
      ctx.shadowBlur = 16 + projectile.damage * 2;
      if (projectile.weaponLevel === 1) {
        ctx.fillStyle = projectileColor;
        ctx.beginPath();
        ctx.roundRect(-30, -5, 38, 10, 5);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-23, -2, 28, 3);
      } else if (projectile.weaponLevel === 2) {
        const pulse = 1 + Math.sin(projectile.time * 20) * .16;
        ctx.scale(pulse, pulse);
        ctx.fillStyle = projectileColor;
        ctx.beginPath();
        ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffd43b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, projectile.radius + 4, projectile.time * 7, projectile.time * 7 + Math.PI * 1.45);
        ctx.stroke();
      } else if (projectile.weaponLevel === 3) {
        ctx.strokeStyle = projectileColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-28, 0);
        ctx.lineTo(0, -projectile.radius - 2);
        ctx.lineTo(12, 0);
        ctx.lineTo(0, projectile.radius + 2);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = colors.cyan;
        ctx.beginPath();
        ctx.arc(0, 0, projectile.radius * .7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = projectileColor;
        ctx.beginPath();
        ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-2, -2, 1.5, 0, Math.PI * 2);
        ctx.arc(2, -2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawAmmoPickups() {
    for (const pickup of ammoPickups) {
      const reducedAnimations = window.pacmanSettings.reducedAnimations;
      const bob = reducedAnimations ? 0 : Math.sin(performance.now() / 130 + pickup.phase) * 4;
      const pulse = reducedAnimations ? 1 : .8 + Math.sin(performance.now() / 110 + pickup.phase) * .2;
      ctx.save();
      ctx.translate(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2 + bob);
      ctx.globalAlpha = reducedAnimations ? 1 : .8 + pulse * .2;
      ctx.shadowColor = "#46d7ff";
      ctx.shadowBlur = 20;
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#153950";
      ctx.beginPath();
      ctx.roundRect(-21, -15, 42, 30, 7);
      ctx.fill();
      ctx.strokeStyle = "#a9f8ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-21, -15, 42, 30, 7);
      ctx.stroke();
      ctx.fillStyle = "#ffd43b";
      ctx.beginPath();
      ctx.roundRect(-14, -9, 28, 18, 4);
      ctx.fill();
      ctx.fillStyle = "#153950";
      ctx.font = "900 15px 'DM Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+1", 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 9px 'DM Mono', monospace";
      ctx.fillText("BALA", 0, 25);
      ctx.restore();
    }
  }

  function drawSharkFins() {
    for (const fin of sharkFins) {
      const bob = state === "running" ? Math.sin(performance.now() / 110 + fin.x) * 3 : 0;
      ctx.save();
      ctx.translate(fin.x + fin.width / 2, fin.y + fin.height / 2 + bob);
      ctx.shadowColor = "#ffd43b";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#ffd43b";
      ctx.beginPath();
      ctx.moveTo(-14, 8);
      ctx.quadraticCurveTo(-6, 1, -4, -11);
      ctx.quadraticCurveTo(1, -3, 14, 7);
      ctx.quadraticCurveTo(0, 5, -14, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 12);
      ctx.quadraticCurveTo(0, 9, 11, 12);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSharkMerchant() {
    if (!shopVisit) return;
    const bob = shopOpen ? 0 : Math.sin(performance.now() / 260) * 3;
    ctx.save();
    ctx.translate(shopX, GROUND_Y - 44 + bob);
    ctx.shadowColor = "#36d9d0";
    ctx.shadowBlur = 20;

    ctx.fillStyle = "#123c52";
    ctx.beginPath();
    ctx.moveTo(-52, -2);
    ctx.lineTo(-82, -26);
    ctx.lineTo(-73, 1);
    ctx.lineTo(-84, 22);
    ctx.lineTo(-52, 12);
    ctx.closePath();
    ctx.fill();

    const bodyGradient = ctx.createLinearGradient(0, -34, 0, 32);
    bodyGradient.addColorStop(0, "#75eee0");
    bodyGradient.addColorStop(.48, "#20aeb7");
    bodyGradient.addColorStop(1, "#087a91");
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(-59, -1);
    ctx.quadraticCurveTo(-43, -30, -5, -31);
    ctx.lineTo(13, -52);
    ctx.lineTo(30, -29);
    ctx.quadraticCurveTo(54, -27, 68, -11);
    ctx.quadraticCurveTo(77, -5, 88, 0);
    ctx.quadraticCurveTo(78, 7, 66, 9);
    ctx.quadraticCurveTo(49, 31, 8, 31);
    ctx.quadraticCurveTo(-38, 29, -59, -1);
    ctx.fill();

    ctx.fillStyle = "#d6f5e9";
    ctx.beginPath();
    ctx.moveTo(-45, 8);
    ctx.quadraticCurveTo(-10, 4, 17, 12);
    ctx.quadraticCurveTo(41, 18, 64, 8);
    ctx.quadraticCurveTo(47, 31, 8, 31);
    ctx.quadraticCurveTo(-28, 29, -45, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#0e5068";
    ctx.beginPath();
    ctx.moveTo(-2, 20);
    ctx.lineTo(16, 8);
    ctx.lineTo(31, 30);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(5, 67, 87, .7)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (let gill = 0; gill < 3; gill += 1) {
      ctx.beginPath();
      ctx.moveTo(-31 + gill * 10, -8);
      ctx.quadraticCurveTo(-38 + gill * 10, 1, -30 + gill * 10, 8);
      ctx.stroke();
    }

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(40, -15, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.ink;
    ctx.beginPath();
    ctx.arc(42, -15, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#062b3e";
    ctx.beginPath();
    ctx.moveTo(29, -1);
    ctx.quadraticCurveTo(55, 9, 82, 1);
    ctx.quadraticCurveTo(62, 18, 35, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff8db";
    for (let tooth = 0; tooth < 5; tooth += 1) {
      const toothX = 42 + tooth * 7;
      ctx.beginPath();
      ctx.moveTo(toothX, 4);
      ctx.lineTo(toothX + 4, 11);
      ctx.lineTo(toothX + 7, 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 18);
    ctx.quadraticCurveTo(9, 31, 27, 17);
    ctx.stroke();
    ctx.fillStyle = "#ffbd35";
    ctx.beginPath();
    ctx.arc(9, 29, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#704313";
    ctx.font = "bold 9px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 9, 29);

    ctx.shadowColor = "#123c52";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#123c52";
    ctx.beginPath();
    ctx.moveTo(-35, -25);
    ctx.lineTo(-19, -45);
    ctx.lineTo(4, -26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(-37, -28, 43, 5);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("MERCADER", 0, -68);
    if (Math.abs(pacman.x + pacman.width / 2 - shopX) <= 115) {
      ctx.fillStyle = "#c8ff3d";
      ctx.font = "bold 11px 'DM Mono', monospace";
      ctx.fillText("PULSA E", 0, -83);
    }
    ctx.restore();
  }

  function drawPacman() {
    const isActive = state === "running";
    const stableSprites = window.pacmanSettings.reducedAnimations || window.pacmanSettings.mobileModeEnabled;
    const running = pacman.grounded && isActive && !stableSprites ? Math.sin(pacman.runFrame) : 0;
    const mouth = isActive && !stableSprites ? .12 + Math.abs(Math.sin(pacman.runFrame * 1.4)) * .46 : .24;
    const bounce = pacman.grounded && !pacman.ducking && isActive && !stableSprites
      ? Math.abs(running) * 2
      : 0;
    const centerX = pacman.x + pacman.width / 2;
    const centerY = pacman.y + pacman.height / 2 + bounce;
    const damageIntensity = Math.min(1, pacman.hitTimer / .8);
    const damagePulse = pacman.hitTimer > 0 && !stableSprites
      ? Math.sin(performance.now() * .055) * damageIntensity
      : 0;
    const hitFlash = Math.max(
      0,
      pacman.blink,
      damageIntensity * (stableSprites ? .35 : Math.sin(performance.now() * .045) > 0 ? 1 : .35)
    );

    ctx.save();
    setCanvasLogicalTransform();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.translate(centerX, centerY);
    if (boss.active) ctx.scale(BOSS_PACMAN_SCALE, BOSS_PACMAN_SCALE);
    if (pacman.facing < 0) {
      ctx.scale(-1, 1);
    }
    if (pacman.ducking) {
      ctx.translate(0, 20);
      ctx.scale(1.38, .7);
    } else if (!pacman.grounded) {
      ctx.translate(0, -10);
      ctx.scale(1.22, 1.42);
    } else {
      ctx.scale(1, 1);
    }

    ctx.save();
    if (damageIntensity > 0 && !stableSprites) {
      ctx.save();
      ctx.rotate(performance.now() * .025);
      ctx.strokeStyle = `rgba(255, 75, 70, ${.8 * damageIntensity})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = "#ff3f5f";
      ctx.shadowBlur = 18;
      for (let i = 0; i < 3; i += 1) {
        const angle = i * Math.PI * 2 / 3;
        ctx.beginPath();
        ctx.arc(0, 0, 39 + i * 4, angle, angle + .72);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.rotate(damageIntensity > 0 && !stableSprites
      ? Math.sin(performance.now() * .055) * .38 * damageIntensity + damagePulse * .24
      : 0);
    const bodyGradient = ctx.createRadialGradient(-10, -14, 3, 0, 0, 34);
    bodyGradient.addColorStop(0, hitFlash > 0 ? "#fffdf6" : "#fff18a");
    bodyGradient.addColorStop(.55, hitFlash > 0 ? "#ffd085" : colors.yellow);
    bodyGradient.addColorStop(1, hitFlash > 0 ? "#e34d24" : "#f3a900");
    ctx.shadowColor = hitFlash > 0 ? "rgba(255, 92, 92, .9)" : "rgba(255,212,59,.8)";
    ctx.shadowBlur = hitFlash > 0 ? 28 : 18;
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(mouth) * 29, Math.sin(mouth) * 29);
    ctx.arc(0, 0, 29, mouth, Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    if (hitFlash > 0 && !stableSprites) {
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.beginPath();
      ctx.arc(-2, -6, 21, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,.42)";
    ctx.beginPath();
    ctx.ellipse(-10, -16, 8, 4, -.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.ink;
    ctx.beginPath();
    ctx.ellipse(10, -17, 4.5, 5.5, -.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(11, -19, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function drawGhost(obstacle) {
    const { width, height, variant } = obstacle;
    const color = variant?.color || colors.coral;
    const glow = variant?.glow || "#ff8b7e";
    const stableSprites = window.pacmanSettings.reducedAnimations || window.pacmanSettings.mobileModeEnabled;
    const activeMotion = state === "running" && !stableSprites;
    const bob = activeMotion ? Math.sin(performance.now() / 125 + obstacle.x * .035) * 2 : 0;
    const sway = activeMotion ? Math.sin(performance.now() / 230 + obstacle.x * .02) * .035 : 0;
    const gradientKey = `${glow}|${color}|${width}|${height}`;
    let gradient = ghostGradientCache.get(gradientKey);
    if (!gradient) {
      gradient = ctx.createLinearGradient(0, 0, width * .45, height);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(.12, glow);
      gradient.addColorStop(.68, color);
      gradient.addColorStop(1, "#25204b");
      ghostGradientCache.set(gradientKey, gradient);
    }

    ctx.save();
    ctx.translate(obstacle.x + width / 2, obstacle.y + height / 2 + bob);
    ctx.rotate(sway);
    ctx.scale(1 + sway * .35, 1 - Math.abs(sway) * .25);
    ctx.translate(-width / 2, -height / 2);
    ctx.shadowColor = color;
    ctx.shadowBlur = stableSprites ? 0 : 16;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(width * .08, height * .82);
    ctx.lineTo(width * .08, height * .43);
    ctx.bezierCurveTo(width * .08, height * .14, width * .27, height * .04, width * .5, height * .06);
    ctx.bezierCurveTo(width * .76, height * .04, width * .94, height * .18, width * .92, height * .45);
    ctx.lineTo(width * .92, height * .82);
    ctx.quadraticCurveTo(width * .82, height * .68, width * .69, height * .82);
    ctx.quadraticCurveTo(width * .57, height * .96, width * .5, height * .82);
    ctx.quadraticCurveTo(width * .36, height * .68, width * .24, height * .82);
    ctx.quadraticCurveTo(width * .14, height * .94, width * .08, height * .82);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,255,255,.23)";
    ctx.beginPath();
    ctx.ellipse(width * .26, height * .28, width * .08, height * .13, -.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(width * .37, height * .43, width * .16, height * .2, -.08, 0, Math.PI * 2);
    ctx.ellipse(width * .68, height * .43, width * .16, height * .2, .08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#17213b";
    ctx.beginPath();
    ctx.ellipse(width * .34, height * .45, width * .065, height * .1, 0, 0, Math.PI * 2);
    ctx.ellipse(width * .65, height * .45, width * .065, height * .1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(width * .35, height * .42, Math.max(1, width * .025), 0, Math.PI * 2);
    ctx.arc(width * .66, height * .42, Math.max(1, width * .025), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.beginPath();
    ctx.ellipse(width * .13, height * .59, width * .055, height * .035, 0, 0, Math.PI * 2);
    ctx.ellipse(width * .87, height * .59, width * .055, height * .035, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(37,32,75,.72)";
    ctx.lineWidth = Math.max(1.5, width * .045);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(width * .39, height * .66);
    ctx.quadraticCurveTo(width * .5, height * .73, width * .61, height * .66);
    ctx.stroke();
    ctx.restore();
  }

  function drawDuckHint(obstacle) {
    if (!obstacle.showDuckHint) return;

    const x = obstacle.x + obstacle.width / 2;
    const y = obstacle.y - 18;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI);
    ctx.shadowColor = "rgba(70, 215, 255, .95)";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "#dff6ff";
    ctx.fillStyle = "#46d7ff";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(12, 0);
    ctx.lineTo(7, 0);
    ctx.lineTo(7, 18);
    ctx.lineTo(-7, 18);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawCherries() {
    for (const cherry of cherries) {
      const centerX = cherry.x + cherry.width / 2;
      const centerY = cherry.y + cherry.height / 2;
      ctx.save();
      ctx.strokeStyle = "#8bf05a";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 5);
      ctx.quadraticCurveTo(centerX + 2, centerY - 22, centerX + 11, centerY - 23);
      ctx.moveTo(centerX + 1, centerY - 8);
      ctx.quadraticCurveTo(centerX - 7, centerY - 21, centerX - 12, centerY - 19);
      ctx.stroke();

      ctx.shadowColor = "#ff355e";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#ff355e";
      ctx.beginPath();
      ctx.arc(centerX - 7, centerY + 5, 10, 0, Math.PI * 2);
      ctx.arc(centerX + 7, centerY + 5, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.65)";
      ctx.beginPath();
      ctx.arc(centerX - 10, centerY + 1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawLifePickups() {
    for (const pickup of lifePickups) {
      const pulse = state === "running"
        ? 1 + Math.sin(performance.now() / 130) * .08
        : 1;
      ctx.save();
      ctx.translate(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = "#ff4f82";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#ff4f82";
      ctx.beginPath();
      ctx.moveTo(0, 13);
      ctx.bezierCurveTo(-4, 8, -15, 1, -15, -6);
      ctx.bezierCurveTo(-15, -15, -4, -17, 0, -9);
      ctx.bezierCurveTo(4, -17, 15, -15, 15, -6);
      ctx.bezierCurveTo(15, 1, 4, 8, 0, 13);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,.7)";
      ctx.beginPath();
      ctx.ellipse(-7, -8, 3, 4, -.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawObstacles() {
    for (const obstacle of obstacles) {
      if (obstacle.type === "ship") {
        drawDuckHint(obstacle);
        ctx.save();
        ctx.translate(obstacle.x, obstacle.y);
        const shipColor = obstacle.variant?.color || colors.coral;
        const shipGlow = obstacle.variant?.glow || "#ff8b7e";
        const shipLengthBoost = 1.08;
        const shipHeightBoost = 1.85;

        ctx.shadowColor = shipColor;
        ctx.shadowBlur = 18;
        ctx.fillStyle = shipColor;
        ctx.beginPath();
        ctx.moveTo(obstacle.width * .12 * shipLengthBoost, obstacle.height * .7 * shipHeightBoost);
        ctx.lineTo(obstacle.width * .22 * shipLengthBoost, obstacle.height * .18 * shipHeightBoost);
        ctx.lineTo(obstacle.width * .78 * shipLengthBoost, obstacle.height * .18 * shipHeightBoost);
        ctx.lineTo(obstacle.width * .88 * shipLengthBoost, obstacle.height * .7 * shipHeightBoost);
        ctx.lineTo(obstacle.width * .72 * shipLengthBoost, obstacle.height * .86 * shipHeightBoost);
        ctx.lineTo(obstacle.width * .28 * shipLengthBoost, obstacle.height * .86 * shipHeightBoost);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = shipGlow;
        ctx.beginPath();
        ctx.moveTo(obstacle.width * .5 * shipLengthBoost, 0);
        ctx.lineTo(obstacle.width * .72 * shipLengthBoost, obstacle.height * .26 * shipHeightBoost);
        ctx.lineTo(obstacle.width * .28 * shipLengthBoost, obstacle.height * .26 * shipHeightBoost);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.beginPath();
        ctx.ellipse(obstacle.width * .38 * shipLengthBoost, obstacle.height * .46 * shipHeightBoost, obstacle.width * .12, obstacle.height * .09 * shipHeightBoost, 0, 0, Math.PI * 2);
        ctx.ellipse(obstacle.width * .62 * shipLengthBoost, obstacle.height * .46 * shipHeightBoost, obstacle.width * .12, obstacle.height * .09 * shipHeightBoost, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#101828";
        ctx.beginPath();
        ctx.ellipse(obstacle.width * .38 * shipLengthBoost, obstacle.height * .46 * shipHeightBoost, obstacle.width * .05, obstacle.height * .04 * shipHeightBoost, 0, 0, Math.PI * 2);
        ctx.ellipse(obstacle.width * .62 * shipLengthBoost, obstacle.height * .46 * shipHeightBoost, obstacle.width * .05, obstacle.height * .04 * shipHeightBoost, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,.75)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obstacle.width * .18 * shipLengthBoost, obstacle.height * .7 * shipHeightBoost);
        ctx.lineTo(obstacle.width * .34 * shipLengthBoost, obstacle.height * .9 * shipHeightBoost);
        ctx.lineTo(obstacle.width * .66 * shipLengthBoost, obstacle.height * .9 * shipHeightBoost);
        ctx.lineTo(obstacle.width * .82 * shipLengthBoost, obstacle.height * .7 * shipHeightBoost);
        ctx.stroke();

        ctx.fillStyle = "#ffd43b";
        ctx.beginPath();
        ctx.arc(obstacle.width * .5 * shipLengthBoost, obstacle.height * .78 * shipHeightBoost, obstacle.width * .08, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (obstacle.type === "ghost") {
        drawGhost(obstacle);
        continue;
      }

      ctx.save();
      ctx.translate(obstacle.x, obstacle.y);

      if (obstacle.type === "bossObstacle") {
        const hazardStyle = obstacle.bossStyle;
        const hazardColor = boss.type.primary;
        ctx.shadowColor = hazardColor;
        ctx.shadowBlur = 14;
        ctx.fillStyle = hazardColor;
        ctx.strokeStyle = boss.type.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (hazardStyle === "skullBeam") {
          if (obstacle.telegraph > 0) {
            ctx.globalAlpha = window.pacmanSettings.reducedAnimations
              ? .6
              : .4 + Math.sin(performance.now() / 50) * .2;
            ctx.fillStyle = "#fff1f4";
            ctx.fillRect(obstacle.width * .42, 0, obstacle.width * .16, obstacle.height);
            ctx.strokeRect(1, 1, obstacle.width - 2, obstacle.height - 2);
          } else {
            ctx.fillRect(obstacle.width * .25, 0, obstacle.width * .5, obstacle.height);
            ctx.fillStyle = "#fff1f4";
            ctx.fillRect(obstacle.width * .43, 0, obstacle.width * .14, obstacle.height);
          }
        } else if (hazardStyle === "bone") {
          if (obstacle.telegraph > 0) {
            ctx.globalAlpha = .72;
            ctx.shadowColor = boss.type.accent;
            ctx.shadowBlur = 12;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(-4, -4, obstacle.width + 8, obstacle.height + 8);
            ctx.setLineDash([]);
          }
          ctx.lineCap = "round";
          ctx.lineWidth = 7;
          ctx.moveTo(obstacle.width * .2, obstacle.height * .8);
          ctx.lineTo(obstacle.width * .8, obstacle.height * .2);
          ctx.stroke();
          for (const end of [[.2, .8], [.8, .2]]) {
            ctx.beginPath();
            ctx.arc(obstacle.width * end[0], obstacle.height * end[1], 6, 0, Math.PI * 2);
            ctx.fillStyle = boss.type.accent;
            ctx.fill();
          }
        } else if (hazardStyle === "shadow") {
          ctx.rotate(obstacle.angle || 0);
          if (obstacle.telegraph > 0) {
            ctx.globalAlpha = .65;
            ctx.strokeStyle = "#ffb8c2";
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(-5, -4, obstacle.width + 10, obstacle.height + 8);
            ctx.setLineDash([]);
          }
          ctx.fillStyle = "#100d18";
          ctx.beginPath();
          ctx.moveTo(0, obstacle.height / 2);
          ctx.lineTo(obstacle.width * .72, 0);
          ctx.lineTo(obstacle.width, obstacle.height / 2);
          ctx.lineTo(obstacle.width * .72, obstacle.height);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#ff3b55";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(3, obstacle.height / 2);
          ctx.lineTo(obstacle.width - 3, obstacle.height / 2);
          ctx.stroke();
        } else if (hazardStyle === "cosmic") {
          ctx.rotate(obstacle.angle || 0);
          if (obstacle.telegraph > 0) {
            ctx.globalAlpha = .55;
            ctx.strokeStyle = "#f4eaff";
            ctx.setLineDash([3, 5]);
            ctx.beginPath();
            ctx.arc(obstacle.width / 2, obstacle.height / 2, obstacle.width, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.fillStyle = "#6b35c9";
          ctx.beginPath();
          ctx.moveTo(obstacle.width / 2, 0);
          ctx.lineTo(obstacle.width, obstacle.height / 2);
          ctx.lineTo(obstacle.width / 2, obstacle.height);
          ctx.lineTo(0, obstacle.height / 2);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#f0d7ff";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(obstacle.width / 2, obstacle.height / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (hazardStyle === "blackHole") {
          ctx.rotate(obstacle.angle || 0);
          if (obstacle.telegraph > 0) {
            ctx.globalAlpha = .5;
            ctx.strokeStyle = "#d9c4ff";
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(obstacle.width / 2, obstacle.height / 2, obstacle.width * 1.1, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.fillStyle = "#05030a";
          ctx.beginPath();
          ctx.arc(obstacle.width / 2, obstacle.height / 2, obstacle.width * .42, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#53f5ff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(obstacle.width / 2, obstacle.height / 2, obstacle.width * .62, obstacle.height * .25, -.28, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          throw new Error(`Unknown boss hazard style: ${hazardStyle}`);
        }
        ctx.shadowBlur = 0;
        ctx.restore();
        continue;
      }

      const ghostColor = obstacle.variant?.color || "#ff5f54";
      const ghostGlow = obstacle.variant?.glow || "#ff8b7e";
      const ghostGradient = ctx.createLinearGradient(0, 0, obstacle.width, obstacle.height);
      ghostGradient.addColorStop(0, ghostGlow);
      ghostGradient.addColorStop(.55, ghostColor);
      ghostGradient.addColorStop(1, "#1d1a4c");

      ctx.shadowColor = ghostColor;
      ctx.shadowBlur = 18;
      ctx.fillStyle = ghostGradient;
      ctx.beginPath();
      if (obstacle.type === "alien") {
        ctx.moveTo(obstacle.width * .5, 0);
        ctx.lineTo(obstacle.width, obstacle.height * .28);
        ctx.lineTo(obstacle.width * .82, obstacle.height);
        ctx.lineTo(obstacle.width * .18, obstacle.height);
        ctx.lineTo(0, obstacle.height * .28);
      } else {
        ctx.moveTo(obstacle.width / 2, 0);
        ctx.lineTo(obstacle.width * .93, obstacle.height * .28);
        ctx.lineTo(obstacle.width * .84, obstacle.height);
        ctx.lineTo(obstacle.width * .16, obstacle.height);
        ctx.lineTo(obstacle.width * .07, obstacle.height * .28);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(obstacle.width * .37, obstacle.height * .34, 4.4, 6.2, 0, 0, Math.PI * 2);
      ctx.ellipse(obstacle.width * .63, obstacle.height * .34, 4.4, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.ink;
      ctx.beginPath();
      ctx.ellipse(obstacle.width * .37, obstacle.height * .34, 1.8, 2.8, 0, 0, Math.PI * 2);
      ctx.ellipse(obstacle.width * .63, obstacle.height * .34, 1.8, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (obstacle.type === "alien") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(obstacle.width * .17, obstacle.height * .62);
        ctx.lineTo(obstacle.width * .03, obstacle.height * .86);
        ctx.moveTo(obstacle.width * .83, obstacle.height * .62);
        ctx.lineTo(obstacle.width * .97, obstacle.height * .86);
        ctx.stroke();
        ctx.fillStyle = colors.coral;
        ctx.beginPath();
        ctx.arc(obstacle.width * .5, obstacle.height * .82, 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = ghostGlow;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(obstacle.width * .24, obstacle.height * .58);
        ctx.lineTo(obstacle.width * .38, obstacle.height * .69);
        ctx.lineTo(obstacle.width * .5, obstacle.height * .57);
        ctx.lineTo(obstacle.width * .62, obstacle.height * .69);
        ctx.lineTo(obstacle.width * .76, obstacle.height * .58);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255,255,255,.25)";
      ctx.beginPath();
      ctx.ellipse(obstacle.width * .25, obstacle.height * .15, 8, 17, -.25, 0, Math.PI * 2);
      ctx.fill();

      if (obstacle.type === "alien") {
        ctx.fillStyle = "#c8ff3d";
        ctx.beginPath();
        ctx.arc(obstacle.width * .5, obstacle.height * .9, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = colors.yellow;
        ctx.beginPath();
        ctx.arc(obstacle.width * .5, obstacle.height * .83, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function drawParticles() {
    if (window.pacmanSettings.reducedAnimations) {
      particles = [];
      return;
    }
    for (const particle of particles) {
      ctx.globalAlpha = Math.min(1, particle.life / .7);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSpeedLines() {
    if (state !== "running") return;
    ctx.strokeStyle = "rgba(16,24,40,.1)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 1) {
      const x = (i * 135 + roadOffset * .35) % (WIDTH + 150) - 80;
      ctx.beginPath();
      ctx.moveTo(x, 95 + i * 20);
      ctx.lineTo(x + 50, 95 + i * 20);
      ctx.stroke();
    }
  }

  function pollGamepad() {
    let activeGamepad = null;
    if (typeof navigator.getGamepads === "function") {
      activeGamepad = Array.from(navigator.getGamepads()).find(gamepad =>
        gamepad && gamepad.connected
      ) || null;
    }

    const pressedButtons = new Set();
    const pressed = buttonIndex => {
      const button = activeGamepad && activeGamepad.buttons[buttonIndex];
      const isPressed = Boolean(button && (button.pressed || button.value > .5));
      if (isPressed) pressedButtons.add(buttonIndex);
      return isPressed;
    };
    const justPressed = buttonIndex =>
      pressedButtons.has(buttonIndex) && !previousGamepadButtons.has(buttonIndex);

    if (!activeGamepad) {
      gamepadDirection.x = 0;
      gamepadDirection.y = 0;
      previousShopAxis = { x: 0, y: 0 };
      if (previousGamepadButtons.has(0)) {
        pacman.duckHeld = false;
        movementKeys.delete("down");
      }
    } else {
      const axis = (index, invert = false) => {
        let value = activeGamepad.axes[index] || 0;
        if (Math.abs(value) < GAMEPAD_DEADZONE) value = 0;
        return invert ? -value : value;
      };
      const moveLeft = pressed(14);
      const moveRight = pressed(15);
      const moveUp = pressed(12);
      const moveDown = pressed(13);
      const duckPressed = pressed(0);
      const jumpPressed = pressed(1);
      const dashPressed = pressed(7);
      const startGamePressed = justPressed(1) || justPressed(7);
      const startPressed = pressed(9);
      const axisX = axis(0);
      const axisY = axis(1);

      if (shopOpen) {
        gamepadDirection.x = 0;
        gamepadDirection.y = 0;
        if (state === "paused") {
          if (justPressed(9)) togglePause();
          previousGamepadButtons = pressedButtons;
          requestAnimationFrame(pollGamepad);
          return;
        }
        const shopAxisX = Math.abs(axisX) > .65 ? Math.sign(axisX) : 0;
        const shopAxisY = Math.abs(axisY) > .65 ? Math.sign(axisY) : 0;
        const horizontal = justPressed(14) ? -1
          : justPressed(15) ? 1
            : shopAxisX && shopAxisX !== previousShopAxis.x ? shopAxisX : 0;
        const vertical = justPressed(12) ? -1
          : justPressed(13) ? 1
            : shopAxisY && shopAxisY !== previousShopAxis.y ? shopAxisY : 0;
        previousShopAxis = { x: shopAxisX, y: shopAxisY };
        if (horizontal || vertical) moveShopSelection(horizontal, vertical);
        if (justPressed(0)) activateSelectedShopItem();
        if (justPressed(1)) closeSharkShop();
        if (justPressed(9)) togglePause();
        previousGamepadButtons = pressedButtons;
        requestAnimationFrame(pollGamepad);
        return;
      }

      previousShopAxis = { x: 0, y: 0 };
      gamepadDirection.x = Math.max(-1, Math.min(1,
        axisX + (moveRight ? 1 : 0) - (moveLeft ? 1 : 0)
      ));
      gamepadDirection.y = Math.max(-1, Math.min(1,
        axisY + (moveDown ? 1 : 0) - (moveUp ? 1 : 0)
      ));

      if (shopVisit && justPressed(7)) interactWithShop();

      if (startGamePressed && (state === "ready" || state === "gameover")) {
        startGame();
      } else if (justPressed(1) && state === "running" && !boss.active) {
        jump();
      }
      if (state === "running" && !boss.active && duckPressed && !previousGamepadButtons.has(0)) {
        duck();
      }
      if (!duckPressed && previousGamepadButtons.has(0)) {
        pacman.duckHeld = false;
        movementKeys.delete("down");
      }
      if (justPressed(3) || (boss.active && dashPressed && justPressed(7))) dash();
      if (justPressed(9)) {
        if (state === "ready" || state === "gameover") startGame();
        else togglePause();
      }
    }

    previousGamepadButtons = pressedButtons;
    requestAnimationFrame(pollGamepad);
  }

  function handleKey(event) {
    if (shopOpen && state !== "paused") {
      if (event.code === "ArrowLeft" || event.code === "ArrowRight" ||
          event.code === "ArrowUp" || event.code === "ArrowDown") {
        event.preventDefault();
        const horizontal = event.code === "ArrowLeft" ? -1 : event.code === "ArrowRight" ? 1 : 0;
        const vertical = event.code === "ArrowUp" ? -1 : event.code === "ArrowDown" ? 1 : 0;
        moveShopSelection(horizontal, vertical);
      } else if (event.code === "Enter" || event.code === "Space") {
        event.preventDefault();
        activateSelectedShopItem();
      } else if (event.code === "Escape" || event.code === "KeyE") {
        event.preventDefault();
        closeSharkShop();
      }
      return;
    }
    if (event.code === "Escape") {
      if (document.getElementById("settingsMenu").open) return;
      event.preventDefault();
      if (!event.repeat) togglePause();
      return;
    }
    if (state === "paused") return;
    if (event.code === "KeyF" && (state === "gameover" || state === "victory")) {
      event.preventDefault();
      startGame();
      return;
    }
    if (event.code === "KeyE" && state === "running" && shopVisit) {
      event.preventDefault();
      interactWithShop();
      return;
    }
    if ((event.code === "ShiftLeft" || event.code === "ShiftRight") &&
        !event.repeat) {
      event.preventDefault();
      dash();
      return;
    }
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      event.preventDefault();
      if (state === "ready" || state === "gameover") startGame();
      else jump();
    }
    if (event.code === "ArrowDown" || event.code === "KeyS") {
      event.preventDefault();
      duck();
    }
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      event.preventDefault();
      movementKeys.add("left");
    }
    if (event.code === "ArrowRight" || event.code === "KeyD") {
      event.preventDefault();
      movementKeys.add("right");
    }
  }

  function interactWithShop() {
    if (state !== "running" || !shopVisit) return;
    if (shopOpen) {
      closeSharkShop();
    } else if (Math.abs(pacman.x + pacman.width / 2 - shopX) <= 115) {
      openSharkShop();
      movementKeys.clear();
      updateHud();
    } else {
      shopMessageEl.textContent = "Acércate al tiburón con ← / → para abrir la tienda.";
    }
  }

  function handleKeyUp(event) {
    if (event.code === "ArrowDown" || event.code === "KeyS") {
      pacman.duckHeld = false;
      movementKeys.delete("down");
    }
    if (event.code === "ArrowUp" || event.code === "KeyW" || event.code === "Space") {
      movementKeys.delete("up");
    }
    if (event.code === "ArrowLeft" || event.code === "KeyA") movementKeys.delete("left");
    if (event.code === "ArrowRight" || event.code === "KeyD") movementKeys.delete("right");
  }

  function bindMovementButton(button, direction) {
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      movementKeys.add(direction);
    });
    const stopMoving = () => movementKeys.delete(direction);
    button.addEventListener("pointerup", stopMoving);
    button.addEventListener("pointercancel", stopMoving);
    button.addEventListener("lostpointercapture", stopMoving);
  }

  document.getElementById("startButton").addEventListener("click", startGame);
  document.getElementById("restartButton").addEventListener("click", startGame);
  document.getElementById("victoryRestartButton").addEventListener("click", startGame);
  gamePauseButton.addEventListener("click", togglePause);
  document.getElementById("resumeButton").addEventListener("click", togglePause);
  document.getElementById("pauseRestartButton").addEventListener("click", startGame);
  document.getElementById("shopContinueButton").addEventListener("click", closeSharkShop);
  for (const shopItemButton of shopItemButtons) {
    shopItemButton.addEventListener("click", () => purchaseShopItem(shopItemButton.dataset.shopItem));
  }
  jumpButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (state === "gulag") jumpButton.setPointerCapture(event.pointerId);
    jump();
  });
  const releaseJump = () => movementKeys.delete("up");
  jumpButton.addEventListener("pointerup", releaseJump);
  jumpButton.addEventListener("pointercancel", releaseJump);
  jumpButton.addEventListener("lostpointercapture", releaseJump);
  duckButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    duckButton.setPointerCapture(event.pointerId);
    duck();
  });
  const releaseDuck = () => {
    pacman.duckHeld = false;
    movementKeys.delete("down");
  };
  duckButton.addEventListener("pointerup", releaseDuck);
  duckButton.addEventListener("pointercancel", releaseDuck);
  duckButton.addEventListener("lostpointercapture", releaseDuck);
  dashButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    dash();
  });
  interactButton.addEventListener("click", interactWithShop);
  bindMovementButton(moveLeftButton, "left");
  bindMovementButton(moveRightButton, "right");
  gulagJoystick.addEventListener("pointerdown", event => {
    if (state !== "gulag" && !(state === "running" && boss.active && bossJoystickEnabled)) return;
    event.preventDefault();
    gulagJoystick.setPointerCapture(event.pointerId);
    updateGulagJoystick(event);
  });
  gulagJoystick.addEventListener("pointermove", event => {
    if ((state === "gulag" || (state === "running" && boss.active && bossJoystickEnabled)) &&
        gulagJoystick.hasPointerCapture(event.pointerId)) {
      updateGulagJoystick(event);
    }
  });
  const releaseGulagJoystick = () => resetGulagJoystick();
  gulagJoystick.addEventListener("pointerup", releaseGulagJoystick);
  gulagJoystick.addEventListener("pointercancel", releaseGulagJoystick);
  gulagJoystick.addEventListener("lostpointercapture", releaseGulagJoystick);
  window.addEventListener("keydown", handleKey);
  window.addEventListener("keyup", handleKeyUp);
  requestAnimationFrame(pollGamepad);
  window.addEventListener("pacman-boss-track-ended", event => {
    if (!boss.active || state !== "running" || event.detail.mode !== boss.type.musicMode) return;
    defeatBoss();
    draw();
  });
  window.addEventListener("pacman-boss-track-error", event => {
    if (!boss.active || event.detail.mode !== boss.type.musicMode) return;
    bossMusicError = true;
    bossStatus.textContent = "NO SE PUDO CARGAR LA CANCIÓN · REINTENTA AUDIO EN AJUSTES";
  });
  window.addEventListener("pacman-boss-track-ready", event => {
    if (!boss.active || event.detail.mode !== boss.type.musicMode) return;
    bossMusicError = false;
    bossStatus.textContent = "ESQUIVA HASTA QUE TERMINE LA CANCIÓN";
  });
  window.addEventListener("blur", () => {
    movementKeys.clear();
    pacman.duckHeld = false;
    resetGulagJoystick();
  });
  stage.addEventListener("pointerdown", event => {
    if (event.target.closest("button, input, label")) return;
    if (state === "ready" || state === "gameover") startGame();
    else jump();
  });

  updateHud();
  draw();
})();
