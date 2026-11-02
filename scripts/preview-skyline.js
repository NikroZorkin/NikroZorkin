// Local demonstration only. GitHub README uses the autonomous SVG image.
const picture = document.querySelector('picture:has(img[src*="skyline-desktop"])');
if (picture) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 600px)');
  let cleanup = () => {};
  let generation = 0;
  let entered = false;

  async function mount() {
    const current = ++generation;
    cleanup();
    cleanup = () => {};
    if (reduced.matches) return;
    try {
      const response = await fetch(`assets/skyline-${mobile.matches ? 'mobile' : 'desktop'}.svg`);
      if (!response.ok) return;
      const xml = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
      if (current !== generation || xml.querySelector('parsererror')) return;
      const svg = document.importNode(xml.documentElement, true);
      svg.style.cssText = 'display:block;width:100%;height:auto;max-width:100%';
      picture.hidden = true;
      picture.after(svg);
      svg.pauseAnimations();
      svg.setCurrentTime(entered ? 5.76 : 0);
      let raf = 0;
      svg.dataset.skylineState = entered ? 'raised' : 'waiting';
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .35)) return;
        entered = true;
        svg.dataset.skylineState = 'rising';
        const start = performance.now();
        const tick = now => {
          if (current !== generation) return;
          const progress = Math.min(1, (now - start) / 4300);
          svg.setCurrentTime(progress * 5.76);
          if (progress < 1) raf = requestAnimationFrame(tick);
          else svg.dataset.skylineState = 'raised';
        };
        raf = requestAnimationFrame(tick);
        observer.disconnect();
      }, { threshold: .35 });
      if (!entered) observer.observe(svg);
      cleanup = () => {
        observer.disconnect();
        cancelAnimationFrame(raf);
        svg.remove();
        picture.hidden = false;
      };
    } catch {
      // The original README image remains the fallback if enhancement fails.
      picture.hidden = false;
    }
  }
  reduced.addEventListener('change', mount);
  mobile.addEventListener('change', mount);
  mount();
}
