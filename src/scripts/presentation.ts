const deck = document.querySelector<HTMLElement>('[data-presentation]');

if (deck) {
  const slides = Array.from(deck.querySelectorAll<HTMLElement>('[data-slide]'));
  const progress = Array.from(deck.querySelectorAll<HTMLButtonElement>('[data-go-slide]'));
  const overviewItems = Array.from(deck.querySelectorAll<HTMLButtonElement>('[data-overview-slide]'));
  const stage = deck.querySelector<HTMLElement>('[data-stage]')!;
  const previous = deck.querySelector<HTMLButtonElement>('[data-prev]')!;
  const next = deck.querySelector<HTMLButtonElement>('[data-next]')!;
  const fullscreen = deck.querySelector<HTMLButtonElement>('[data-fullscreen]')!;
  const overview = deck.querySelector<HTMLDialogElement>('[data-overview]')!;
  const status = deck.querySelector<HTMLElement>('[data-deck-status]')!;
  let current = 0;
  let toastTimer: ReturnType<typeof setTimeout>;

  function announce(message: string) {
    status.textContent = message;
    status.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { status.hidden = true; }, 6000);
  }

  function stopMedia(slide: HTMLElement) {
    slide.querySelectorAll('video').forEach((video) => video.pause());
    // Removing the iframe stops sound immediately, including cross-origin players.
    slide.querySelectorAll<HTMLElement>('[data-youtube]').forEach((embed) => {
      embed.querySelector('[data-video-player]')?.replaceChildren();
      embed.querySelector<HTMLElement>('[data-video-player]')!.hidden = true;
      embed.querySelector<HTMLElement>('.video-launch')!.hidden = false;
      embed.classList.remove('is-playing');
    });
  }

  function goToSlide(index: number, updateHash = true) {
    if (!Number.isInteger(index)) return;
    const target = Math.max(0, Math.min(slides.length - 1, index));
    if (target !== current) {
      status.hidden = true;
      clearTimeout(toastTimer);
    }
    const moveFocus = target !== current && slides[current].contains(document.activeElement);
    slides.forEach((slide, i) => {
      const active = i === target;
      if (!active) stopMedia(slide);
      slide.hidden = !active;
      slide.classList.toggle('is-active', active);
      slide.inert = !active;
      for (const button of [progress[i], overviewItems[i]]) {
        if (active) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      }
    });
    current = target;
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    const name = progress[current].title;
    deck!.querySelector('[data-slide-number]')!.textContent = String(current + 1).padStart(2, '0');
    deck!.querySelector('[data-slide-name]')!.textContent = name;
    deck!.querySelector('[data-slide-announcement]')!.textContent = `Folie ${current + 1} von ${slides.length}: ${name}`;
    if (updateHash) history.replaceState(null, '', `#slide-${current + 1}`);
    if (moveFocus) slides[current].focus({ preventScroll: true });
  }

  function readHash() {
    const match = location.hash.match(/^#slide-(\d+)$/);
    goToSlide(match ? Number(match[1]) - 1 : 0, false);
  }

  previous.addEventListener('click', () => goToSlide(current - 1));
  next.addEventListener('click', () => goToSlide(current + 1));
  progress.forEach((button, i) => button.addEventListener('click', () => goToSlide(i)));
  window.addEventListener('hashchange', readHash);

  function openOverview() {
    if (overview.open) return;
    overview.showModal();
    overviewItems[current].focus();
  }
  deck.querySelector('[data-open-overview]')!.addEventListener('click', openOverview);
  deck.querySelector('[data-close-overview]')!.addEventListener('click', () => overview.close());
  overviewItems.forEach((button, i) => button.addEventListener('click', () => {
    overview.close();
    goToSlide(i);
  }));
  overview.addEventListener('click', (event) => {
    if (event.target !== overview) return;
    const bounds = overview.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) overview.close();
  });

  type FullscreenDocument = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => void };
  const fullDocument = document as FullscreenDocument;
  const fullElement = document.documentElement as FullscreenElement;
  const isFullscreen = () => !!(document.fullscreenElement || fullDocument.webkitFullscreenElement);
  function updateFullscreen() {
    fullscreen.setAttribute('aria-pressed', String(isFullscreen()));
    fullscreen.setAttribute('aria-label', isFullscreen() ? 'Vollbild beenden' : 'Vollbild starten');
    fullscreen.title = isFullscreen() ? 'Vollbild beenden (F / Esc)' : 'Vollbild (F)';
  }
  async function toggleFullscreen() {
    try {
      if (isFullscreen()) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else fullDocument.webkitExitFullscreen?.();
      } else if (fullElement.requestFullscreen) {
        await fullElement.requestFullscreen();
      } else if (fullElement.webkitRequestFullscreen) {
        fullElement.webkitRequestFullscreen();
      } else {
        announce('Dieser Browser unterstützt keinen Seiten-Vollbildmodus. Die Präsentation nutzt bereits die gesamte Fensterfläche.');
      }
    } catch {
      announce('Vollbild konnte nicht gestartet werden. Bitte nutze den Vollbildmodus deines Browsers.');
    }
    updateFullscreen();
  }
  fullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreen);
  document.addEventListener('webkitfullscreenchange', updateFullscreen);

  const interactive = 'a, button, input, select, textarea, label, video, iframe, [contenteditable="true"], [data-youtube], [data-greeting-player]';
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || overview.open) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, select, textarea, video, iframe, [contenteditable="true"]')) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.key)) {
      event.preventDefault();
      goToSlide(current + 1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      goToSlide(current - 1);
    } else if ([' ', 'Enter'].includes(event.key) && !target?.closest('button, a, label')) {
      event.preventDefault();
      goToSlide(current + (event.shiftKey ? -1 : 1));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      goToSlide(event.key === 'Home' ? 0 : slides.length - 1);
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      void toggleFullscreen();
    } else if (event.key.toLowerCase() === 'o') {
      event.preventDefault();
      openOverview();
    }
  });

  let touchStart: { x: number; y: number } | null = null;
  let ignoreClick = false;
  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || (event.target as Element).closest(interactive)) return;
    touchStart = { x: event.clientX, y: event.clientY };
  });
  stage.addEventListener('pointerup', (event) => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      ignoreClick = true;
      goToSlide(current + (dx < 0 ? 1 : -1));
      setTimeout(() => { ignoreClick = false; }, 300);
    }
  });
  stage.addEventListener('pointercancel', () => { touchStart = null; });
  stage.addEventListener('click', (event) => {
    if (ignoreClick || (event.target as Element).closest(interactive) || window.getSelection()?.toString()) return;
    goToSlide(current + 1);
  });

  deck.querySelectorAll<HTMLElement>('[data-youtube]').forEach((embed) => {
    embed.querySelector('[data-play-youtube]')!.addEventListener('click', () => {
      const player = embed.querySelector<HTMLElement>('[data-video-player]')!;
      const frame = document.createElement('iframe');
      frame.title = embed.dataset.videoTitle || 'YouTube-Video';
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(embed.dataset.youtube!)}?autoplay=1&rel=0&playsinline=1`;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      player.replaceChildren(frame);
      player.hidden = false;
      embed.querySelector<HTMLElement>('.video-launch')!.hidden = true;
      embed.classList.add('is-playing');
      frame.focus();
    });
  });

  const fileInput = deck.querySelector<HTMLInputElement>('[data-greeting-file]');
  const localPlayer = deck.querySelector<HTMLElement>('[data-greeting-player]')!;
  const localVideo = deck.querySelector<HTMLVideoElement>('[data-greeting-video]')!;
  let objectUrl: string | null = null;
  deck.querySelector('[data-select-greeting]')?.addEventListener('click', () => {
    if (objectUrl) { localPlayer.hidden = false; void localVideo.play().catch(() => {}); }
    else fileInput?.click();
  });
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v)$/i.test(file.name)) {
      announce('Bitte eine Videodatei auswählen, zum Beispiel MP4 oder WebM.');
      fileInput.value = '';
      return;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    localVideo.src = objectUrl;
    localPlayer.hidden = false;
    deck!.querySelector('[data-select-greeting]')!.textContent = '▶ Videobotschaft abspielen';
    const fileStatus = deck!.querySelector('[data-greeting-status]')!;
    fileStatus.textContent = '';
    const replaceButton = document.createElement('button');
    replaceButton.type = 'button';
    replaceButton.className = 'change-greeting-file';
    replaceButton.textContent = 'Andere Datei auswählen';
    replaceButton.addEventListener('click', () => fileInput.click());
    fileStatus.append(replaceButton);
    void localVideo.play().catch(() => announce('Video bereit. Zum Starten auf Play drücken.'));
  });
  localVideo.addEventListener('error', () => {
    if (!objectUrl) return;
    localPlayer.hidden = true;
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    if (fileInput) fileInput.value = '';
    deck!.querySelector('[data-select-greeting]')!.textContent = '▶ Videobotschaft auswählen';
    announce('Diese Videodatei konnte nicht abgespielt werden. Bitte eine andere Datei verwenden, zum Beispiel MP4 mit H.264.');
  });
  deck.querySelector('[data-close-greeting]')!.addEventListener('click', () => {
    localVideo.pause();
    localPlayer.hidden = true;
    deck!.querySelector<HTMLButtonElement>('[data-select-greeting]')?.focus();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMedia(slides[current]);
  });
  window.addEventListener('pagehide', () => {
    slides.forEach(stopMedia);
  });
  readHash();
}
