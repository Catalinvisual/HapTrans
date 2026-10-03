'use client';
import { useLayoutEffect, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage, type Language } from '@/context/LanguageContext';
import original from './Hero.module.css';
import styles from './CinematicHeroLayer.module.css';
// EJ Merl / Pexels 17899033: real red semi-truck, 1080p, 10 seconds.
// License: https://www.pexels.com/license/
const source = 'https://videos.pexels.com/video-files/17899033/17899033-hd_1920_1080_24fps.mp4';
const poster = 'https://images.pexels.com/videos/17899033/pexels-photo-17899033.jpeg';
const labels: Record<Language, readonly [string, string]> = {
  RO: ['Redă fundalul video', 'Oprește fundalul video'],
  EN: ['Play background video', 'Pause background video'],
  NL: ['Achtergrondvideo afspelen', 'Achtergrondvideo pauzeren'],
  DE: ['Hintergrundvideo abspielen', 'Hintergrundvideo pausieren'],
  FR: ['Lire la vidéo de fond', 'Mettre en pause'],
  ES: ['Reproducir vídeo de fondo', 'Pausar vídeo de fondo'],
};
export default function CinematicHeroLayer({ children }: { children: ReactNode }) {
  const { lang } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const userPaused = useRef(false);
  useLayoutEffect(() => {
    const container = root.current;
    const element = container?.getElementsByClassName(original.hero)[0];
    if (!(element instanceof HTMLElement)) return;
    const touched: HTMLElement[] = [];
    for (const key of ['hero', 'container', 'content', 'fleetColumn', 'title', 'subtitle', 'badge', 'ctaGroup', 'dynamicBadges'] as const) {
      const node = key === 'hero' ? element : element.getElementsByClassName(original[key])[0];
      if (node instanceof HTMLElement) { node.dataset.videoHero = key; touched.push(node); }
    }
    const measure = () => {
      const top = Math.max(0, element.getBoundingClientRect().top + window.scrollY);
      element.style.setProperty('--hero-offset', top + 'px');
    };
    measure();
    window.addEventListener('resize', measure);
    setHost(element);
    return () => {
      touched.forEach(node => delete node.dataset.videoHero);
      element.style.removeProperty('--hero-offset');
      window.removeEventListener('resize', measure);
    };
  }, []);
  useEffect(() => {
    const player = video.current;
    if (!host || !player) return;
    const media: HTMLVideoElement = player;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let disposed = false;
    function sync() {
      if (disposed) return;
      if (visible && !document.hidden && !motion.matches && !userPaused.current) {
        media.muted = true;
        if (!media.hasAttribute('src')) media.src = source;
        void media.play().catch(() => { if (!disposed) setPlaying(false); });
      } else media.pause();
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .05 });
    observer.observe(host);
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      disposed = true;
      observer.disconnect();
      motion.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      media.pause();
    };
  }, [host]);
  function toggle() {
    const media = video.current;
    if (!media) return;
    if (!media.paused) { userPaused.current = true; media.pause(); }
    else {
      userPaused.current = false;
      media.muted = true;
      if (!media.hasAttribute('src')) media.src = source;
      void media.play().catch(() => setPlaying(false));
    }
  }
  return <div ref={root} className={styles.root}>
    {children}
    {host && createPortal(<>
      <div className={styles.background} style={{ backgroundImage: 'url(' + poster + ')' }} aria-hidden="true">
        <video ref={video} className={styles.video} style={{ opacity: ready && !failed ? 1 : 0 }} muted loop playsInline preload="none" poster={poster} tabIndex={-1}
          onPlaying={() => { setReady(true); setPlaying(true); }} onPause={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false); }} />
        <div className={styles.shade} />
      </div>
      {!failed && <button className={styles.control} type="button" onClick={toggle} aria-label={labels[lang]?.[playing ? 1 : 0] || 'Toggle'}>{playing ? '||' : '►'}</button>}
    </>, host)}
  </div>;
}
