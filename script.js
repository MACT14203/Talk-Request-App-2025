(() => {
  const appRoot = document.getElementById('app');
  const talkBtn = document.getElementById('talkBtn');
  const quotaBadge = document.getElementById('quotaBadge');
  const quotaText = document.getElementById('quotaText');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const dailyLimitInput = document.getElementById('dailyLimit');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const soundStyleSelect = document.getElementById('soundStyle');
  const volumeSlider = document.getElementById('volume');
  const testSoundBtn = document.getElementById('testSound');
  const vibrateNote = document.getElementById('vibrateNote');

  const presetModal = document.getElementById('presetModal');
  const countdownScreen = document.getElementById('countdownScreen');
  const finishOverlay = document.getElementById('finishOverlay');
  const timeInside = document.getElementById('timeInside');
  const backBtn = document.getElementById('backBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const resetBtn = document.getElementById('resetBtn');
  const okBtn = document.getElementById('okBtn');
  const soundToggle = document.getElementById('soundToggle');
  const vibrateToggle = document.getElementById('vibrateToggle');
  const closeBtns = document.querySelectorAll('.close');
  const chips = document.querySelectorAll('.chip');
  const toast = document.getElementById('toast');

  // SVG circle math
  const fg = document.querySelector('.dial .fg');
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  fg.style.strokeDasharray = String(CIRC);
  fg.style.strokeDashoffset = String(CIRC);
  fg.style.transition = 'none';

  // Storage keys
  const K_LIMIT = 'TR_daily_limit';
  const K_USED = 'TR_used';
  const K_DATE = 'TR_date';
  const K_SOUND = 'TR_sound';
  const K_VOL = 'TR_volume';

  function todayStr(){
    const d = new Date();
    return d.toISOString().slice(0,10);
  }
  function loadLimit(){
    const v = localStorage.getItem(K_LIMIT);
    return v !== null ? Math.max(0, parseInt(v, 10)) : 5;
  }
  function loadUsageEnsureDate(){
    const d = localStorage.getItem(K_DATE);
    const t = todayStr();
    if (d !== t){
      localStorage.setItem(K_DATE, t);
      localStorage.setItem(K_USED, '0');
      return 0;
    }
    const used = parseInt(localStorage.getItem(K_USED) || '0', 10);
    return Math.max(0, used);
  }
  function saveLimit(n){
    localStorage.setItem(K_LIMIT, String(Math.max(0, Math.floor(n))));
  }
  function setUsed(n){
    localStorage.setItem(K_USED, String(Math.max(0, Math.floor(n))));
    localStorage.setItem(K_DATE, todayStr());
  }

  let dailyLimit = loadLimit();
  let usedToday = loadUsageEnsureDate();
  let soundStyle = localStorage.getItem(K_SOUND) || 'beep';
  let volume = parseFloat(localStorage.getItem(K_VOL) || '0.7');

  // Init settings UI
  soundStyleSelect.value = soundStyle;
  volumeSlider.value = String(volume);
  dailyLimitInput.value = String(dailyLimit);

  // Vibrate note
  if (!('vibrate' in navigator)){
    vibrateNote.textContent = 'Vibration is not supported on this device (iPad Safari/PWA). A visual flash and shake will be used instead.';
  } else {
    vibrateNote.textContent = '';
  }

  // Live update daily limit
  dailyLimitInput.addEventListener('input', () => {
    const val = parseInt(dailyLimitInput.value || '0', 10);
    dailyLimit = Math.max(0, val);
    saveLimit(dailyLimit);
    updateQuotaUI();
  });

  // Save button persists sound/volume
  saveSettingsBtn.addEventListener('click', () => {
    soundStyle = soundStyleSelect.value;
    volume = Math.max(0, Math.min(1, parseFloat(volumeSlider.value || '0.7')));
    localStorage.setItem(K_SOUND, soundStyle);
    localStorage.setItem(K_VOL, String(volume));
    hide(settingsModal);
  });

  // Modal helpers
  function show(el){ el.classList.remove('hidden'); el.setAttribute('aria-hidden','false'); }
  function hide(el){ el.classList.add('hidden'); el.setAttribute('aria-hidden','true'); }

  // Audio unlock (iOS)
  let audioCtx = null;
  function ensureAudio(){
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch {}
    return audioCtx;
  }
  const unlock = () => { ensureAudio(); document.removeEventListener('pointerdown', unlock, true); };
  document.addEventListener('pointerdown', unlock, true);

  function tone(frequency=880, duration=400, type='sine'){
    const ctx = ensureAudio();
    if (!ctx || !soundToggle.checked || soundStyle === 'silent') return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = frequency;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    const peak = Math.max(0.05, volume);
    g.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration/1000);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + duration/1000 + 0.01);
  }
  function playChime(){ tone(880, 280, 'sine'); setTimeout(()=> tone(1320, 320, 'sine'), 180); }
  function playBell(){ tone(660, 500, 'sine'); setTimeout(()=> tone(990, 400, 'sine'), 120); }
  function playBuzzer(){ tone(220, 600, 'square'); }
  function playAlarm(){
    switch (soundStyle){
      case 'chime': playChime(); break;
      case 'buzzer': playBuzzer(); break;
      case 'bell': playBell(); break;
      case 'beep':
      default: tone(880, 400, 'sine'); setTimeout(()=>tone(880, 400, 'sine'), 220);
    }
  }

  testSoundBtn.addEventListener('click', () => {
    ensureAudio();
    soundStyle = soundStyleSelect.value;
    volume = Math.max(0, Math.min(1, parseFloat(volumeSlider.value || '0.7')));
    localStorage.setItem(K_SOUND, soundStyle);
    localStorage.setItem(K_VOL, String(volume));
    playAlarm();
  });

  function visualAttention(){
    appRoot.classList.add('flash'); appRoot.classList.add('shake');
    setTimeout(()=> appRoot.classList.remove('flash'), 650);
    setTimeout(()=> appRoot.classList.remove('shake'), 450);
  }
  function doVibrate(){
    if (vibrateToggle.checked && 'vibrate' in navigator) {
      navigator.vibrate([160, 100, 160]);
    } else {
      visualAttention();
    }
  }

  function updateQuotaUI(){
    const remaining = Math.max(0, dailyLimit - usedToday);
    quotaBadge.textContent = `${remaining}/${dailyLimit}`;
    quotaText.textContent = `Requests left today: ${remaining} of ${dailyLimit}`;
    talkBtn.disabled = (remaining <= 0);
    talkBtn.classList.toggle('disabled', remaining <= 0);
  }
  updateQuotaUI();

  // Settings modal open
  settingsBtn.addEventListener('click', () => {
    dailyLimitInput.value = dailyLimit;
    soundStyleSelect.value = soundStyle;
    volumeSlider.value = String(volume);
    show(settingsModal);
  });

  talkBtn.addEventListener('click', () => {
    const remaining = Math.max(0, dailyLimit - usedToday);
    if (remaining <= 0){
      showQuotaToast('No requests left today.');
      talkBtn.style.transform = 'translateY(0) scale(1.02)';
      setTimeout(()=> talkBtn.style.transform = '', 180);
      return;
    }
    show(presetModal);
  });

  closeBtns.forEach(btn => btn.addEventListener('click', () => hide(presetModal)));

  let total = 0;
  let startTime = 0;
  let paused = false;
  let pauseStartedAt = 0;
  let pausedAccum = 0;
  let rafId = 0;

  function fmt(sec){
    const m = Math.floor(sec / 60);
    const s = Math.ceil(sec % 60);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function getElapsedMs(nowMs){
    const currentPause = paused ? (nowMs - pauseStartedAt) : 0;
    return Math.max(0, nowMs - startTime - pausedAccum - currentPause);
  }
  function updateVisual(now){
    const elapsedMs = getElapsedMs(now);
    const totalMs = total*1000;
    const remaining = Math.max(0, totalMs - elapsedMs);
    const remainingSec = remaining/1000;
    timeInside.textContent = fmt(remainingSec);
    const progress = Math.min(1, elapsedMs/totalMs);
    fg.style.strokeDashoffset = String(CIRC * (1 - progress));

    const ratio = remainingSec / total;
    appRoot.classList.remove('state-normal','state-warn','state-danger');
    if (ratio <= 0.10) appRoot.classList.add('state-danger');
    else if (ratio <= 0.25) appRoot.classList.add('state-warn');
    else appRoot.classList.add('state-normal');
    return remaining <= 0;
  }
  function loop(now){
    const done = updateVisual(now);
    if (done){
      cancelAnimationFrame(rafId);
      fg.style.strokeDashoffset = '0';
      playAlarm();
      doVibrate();
      show(finishOverlay);
      return;
    }
    rafId = requestAnimationFrame(loop);
  }
  function startCountdown(seconds){
    total = seconds;
    startTime = performance.now();
    paused = false; pausedAccum = 0;
    timeInside.textContent = fmt(total);
    fg.style.strokeDashoffset = String(CIRC);
    hide(presetModal); show(countdownScreen);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  chips.forEach(chip => chip.addEventListener('click', () => {
    const seconds = Number(chip.dataset.seconds||0);
    const remaining = Math.max(0, dailyLimit - usedToday);
    if (remaining <= 0){
      hide(presetModal);
      showQuotaToast('No requests left today.');
      return;
    }
    if (seconds>0){
      usedToday += 1; setUsed(usedToday); updateQuotaUI();
      startCountdown(seconds);
    }
  }));

  // Controls
  pauseBtn.addEventListener('click', () => {
    if (paused) return;
    paused = true; pauseStartedAt = performance.now();
    pauseBtn.disabled = true; resumeBtn.disabled = false;
  });
  resumeBtn.addEventListener('click', () => {
    if (!paused) return;
    const now = performance.now(); pausedAccum += (now - pauseStartedAt);
    paused = false; pauseBtn.disabled = false; resumeBtn.disabled = true;
  });
  resetBtn.addEventListener('click', () => {
    cancelAnimationFrame(rafId);
    fg.style.strokeDashoffset = String(CIRC);
    hide(countdownScreen); show(presetModal);
    appRoot.classList.remove('state-warn','state-danger'); appRoot.classList.add('state-normal');
  });
  backBtn.addEventListener('click', () => {
    cancelAnimationFrame(rafId);
    fg.style.strokeDashoffset = String(CIRC);
    hide(countdownScreen); show(presetModal);
    appRoot.classList.remove('state-warn','state-danger'); appRoot.classList.add('state-normal');
  });
  okBtn.addEventListener('click', () => {
    hide(finishOverlay); hide(countdownScreen);
    appRoot.classList.remove('state-warn','state-danger'); appRoot.classList.add('state-normal');
  });

  // Toast helpers
  function showQuotaToast(msg){
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(()=> toast.classList.add('hidden'), 1800);
  }

  // Keyboard Esc
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!settingsModal.classList.contains('hidden')) hide(settingsModal);
      else if (!presetModal.classList.contains('hidden')) hide(presetModal);
      else hide(countdownScreen);
    }
  });
})();