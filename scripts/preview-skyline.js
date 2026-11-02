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
      // Pause before insertion, so an offscreen block remains a flat calendar.
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = 'path{animation-play-state:paused!important}';
      svg.append(style);
      picture.hidden = true;
      picture.after(svg);
      const animations = svg.getAnimations({ subtree: true });
      for (const animation of animations) {
        const frames = animation.effect.getKeyframes()
          .filter(frame => frame.offset <= .32)
          .map(frame => ({ d: frame.d, offset: frame.offset / .32, easing: 'linear' }));
        // Retain only the ascent, then hold the city as in the React reference.
        animation.effect.setKeyframes(frames);
        animation.effect.updateTiming({ duration: 4300, iterations: 1, fill: 'both' });
        animation.pause();
        animation.currentTime = entered ? 4300 : 0;
      }
      svg.dataset.skylineState = entered ? 'raised' : 'waiting';
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .35)) return;
        entered = true;
        svg.dataset.skylineState = 'rising';
        for (const animation of animations) animation.play();
        Promise.all(animations.map(animation => animation.finished)).then(() => {
          if (current === generation) svg.dataset.skylineState = 'raised';
        }).catch(() => {});
        observer.disconnect();
      }, { threshold: .35 });
      if (!entered) observer.observe(svg);
      cleanup = () => {
        observer.disconnect();
        animations.forEach(animation => animation.cancel());
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
