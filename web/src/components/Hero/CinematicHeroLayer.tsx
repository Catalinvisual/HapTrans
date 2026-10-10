'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage, type Language } from '@/context/LanguageContext';
import original from './Hero.module.css';
import styles from './CinematicHeroLayer.module.css';
const source = '/herovideo.mp4';
// Same uploaded video as fallback when the preview branch lacks the local asset.
const uploadedSource = 'https://raw.githubusercontent.com/Catalinvisual/HapTrans/aa668d53747ee57914eddbdf31efea5d2d9d08da/web/public/herovideo.mp4';
const labels: Record<Language, readonly [string, string]> = {
  RO: ['Redă fundalul video', 'Oprește fundalul video'],
  EN: ['Play background video', 'Pause background video'],
  NL: ['Achtergrondvideo afspelen', 'Achtergrondvideo pauzeren'],
  DE: ['Hintergrundvideo abspielen', 'Hintergrundvideo pausieren'],
  FR: ['Lire la vidéo de fond', 'Mettre en pause'],
  ES: ['Reproducir vídeo de fondo', 'Pausar vídeo de fondo'],
  PL: ['Odtwórz wideo w tle', 'Wstrzymaj wideo w tle'],
};
function VideoBackground() {
  const { lang } = useLanguage();
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const userPaused = useRef(false);
  const toggleRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const media: HTMLVideoElement = element;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    let disposed = false;
    let manualPlay = false;
    let request = 0;
    let usingUploadedSource = false;
    function allowed() {
      return !disposed && visible && !document.hidden && !userPaused.current && (!motion.matches || manualPlay);
    }
    function sync() {
      const current = ++request;
      if (!allowed()) { media.pause(); return; }
      media.muted = true;
      if (!media.hasAttribute('src')) media.src = source;
      void media.play().catch(() => {
        if (!disposed && request === current) setPlaying(false);
      }).then(() => { if (!allowed()) media.pause(); });
    }
    function recoverSource() {
      if (disposed) return;
      if (usingUploadedSource) { setFailed(true); setPlaying(false); return; }
      usingUploadedSource = true;
      setFailed(false);
      setReady(false);
      media.src = uploadedSource;
      media.load();
      sync();
    }
    function motionChanged() { manualPlay = false; sync(); }
    toggleRef.current = () => {
      if (!media.paused) { userPaused.current = true; manualPlay = false; }
      else { userPaused.current = false; manualPlay = true; }
      sync();
    };
    media.addEventListener('error', recoverSource);
    motion.addEventListener('change', motionChanged);
    document.addEventListener('visibilitychange', sync);
    
    // Start playback immediately
    sync();

    return () => {
      disposed = true;
      request++;
      media.removeEventListener('error', recoverSource);
      motion.removeEventListener('change', motionChanged);
      document.removeEventListener('visibilitychange', sync);
      toggleRef.current = null;
      media.pause();
    };
  }, []);
  return <>
    <div className={styles.background} aria-hidden="true">
      <video ref={video} src={source} className={styles.video} style={{ opacity: ready && !failed ? 1 : 0 }} muted loop playsInline preload="auto" tabIndex={-1}
        onPlaying={() => { setFailed(false); setReady(true); setPlaying(true); }} onPause={() => setPlaying(false)} onError={() => setPlaying(false)} />
      <div className={styles.shade} />
    </div>
    {!failed && <button className={styles.control} type="button" onClick={() => toggleRef.current?.()} aria-label={labels[lang][playing ? 1 : 0]}>{playing ? 'Ⅱ' : '▷'}</button>}
  </>;
}
export default function CinematicHeroLayer({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const cleanup = useRef<() => void>(() => {});
  const attach = useCallback((root: HTMLDivElement | null) => {
    cleanup.current();
    cleanup.current = () => {};
    if (!root) return;
    const element = root.getElementsByClassName(original.hero)[0];
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
    cleanup.current = () => {
      touched.forEach(node => delete node.dataset.videoHero);
      element.style.removeProperty('--hero-offset');
      window.removeEventListener('resize', measure);
    };
    setHost(element);
  }, []);
  return <div ref={attach} className={styles.root}>
    {children}
    {host && createPortal(<VideoBackground />, host)}
  </div>;
}
