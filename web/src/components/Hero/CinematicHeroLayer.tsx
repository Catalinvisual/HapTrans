'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Script from 'next/script';
import { useLanguage, type Language } from '@/context/LanguageContext';
import original from './Hero.module.css';
import styles from './CinematicHeroLayer.module.css';

const copy: Record<Language, { steps: readonly string[]; story: readonly string[]; play: string; pause: string; hint: string }> = {
  RO: { steps: ['Încărcare', 'Transport', 'Livrare'], story: ['Pregătit de plecare.', 'Drumul face parte din promisiune.', 'Până la ultima livrare.'], play: 'Redă călătoria', pause: 'Pauză', hint: 'Derulează pentru a explora' },
  EN: { steps: ['Loading', 'Transport', 'Delivery'], story: ['Ready for the journey.', 'The road is part of the promise.', 'Through to the final delivery.'], play: 'Play journey', pause: 'Pause', hint: 'Scroll to explore' },
  NL: { steps: ['Laden', 'Transport', 'Levering'], story: ['Klaar voor vertrek.', 'De weg is deel van de belofte.', 'Tot aan de laatste levering.'], play: 'Reis afspelen', pause: 'Pauze', hint: 'Scroll om te ontdekken' },
  DE: { steps: ['Beladung', 'Transport', 'Lieferung'], story: ['Bereit zur Abfahrt.', 'Der Weg gehört zum Versprechen.', 'Bis zur letzten Lieferung.'], play: 'Reise abspielen', pause: 'Pause', hint: 'Scrollen und entdecken' },
  FR: { steps: ['Chargement', 'Transport', 'Livraison'], story: ['Prêt pour le départ.', 'La route fait partie de la promesse.', 'Jusqu’à la dernière livraison.'], play: 'Lancer le voyage', pause: 'Pause', hint: 'Défilez pour explorer' },
  ES: { steps: ['Carga', 'Transporte', 'Entrega'], story: ['Listo para salir.', 'El camino es parte de la promesa.', 'Hasta la última entrega.'], play: 'Reproducir viaje', pause: 'Pausa', hint: 'Desplázate para explorar' },
};

type Trigger = { kill: () => void };
type AnimationWindow = Window & {
  gsap?: { registerPlugin: (plugin: object) => void };
  ScrollTrigger?: { create: (options: { trigger: HTMLElement; start: string; end: string; pin: false; onUpdate: (self: { progress: number }) => void }) => Trigger };
};
type Controls = { seek: (progress: number) => void; toggle: () => void };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const segment = (p: number, start: number, end: number) => clamp((p - start) / (end - start));
const smooth = (p: number) => p * p * (3 - 2 * p);

export default function CinematicHeroLayer({ children }: { children: ReactNode }) {
  const { lang } = useLanguage();
  const text = copy[lang] || copy.EN;
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [coreReady, setCoreReady] = useState(false);
  const [pluginReady, setPluginReady] = useState(false);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const controls = useRef<Controls | null>(null);
  const progressRef = useRef(0);
  const cleanupRef = useRef<() => void>(() => {});
  const sceneRef = useRef<HTMLDivElement>(null);

  const attach = useCallback((root: HTMLDivElement | null) => {
    cleanupRef.current();
    cleanupRef.current = () => {};
    if (!root) return;
    const hero = root.getElementsByClassName(original.hero)[0];
    if (!(hero instanceof HTMLElement)) return;
    const touched: HTMLElement[] = [];
    for (const key of ['hero', 'container', 'content', 'fleetColumn', 'title', 'subtitle', 'badge', 'ctaGroup', 'dynamicBadges'] as const) {
      const node = key === 'hero' ? hero : hero.getElementsByClassName(original[key])[0];
      if (node instanceof HTMLElement) {
        node.dataset.cinematic = key;
        touched.push(node);
      }
    }
    setHost(hero);
    cleanupRef.current = () => touched.forEach((node) => delete node.dataset.cinematic);
  }, []);

  // One renderer for autoplay, chapter controls, native scroll and ScrollTrigger.
  // No pin spacers, no fixed-height gate, no dependency on CDN availability.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!host || !scene) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const parts = new Map<string, SVGElement[]>();
    scene.querySelectorAll<SVGElement>('[data-part]').forEach((node) => {
      const name = node.dataset.part!;
      parts.set(name, [...(parts.get(name) || []), node]);
    });
    const transform = (name: string, value: string) => parts.get(name)?.forEach((node) => node.setAttribute('transform', value));
    const opacity = (name: string, value: number) => parts.get(name)?.forEach((node) => { node.style.opacity = String(value); });
    const bar = scene.querySelector<HTMLElement>('[data-progress]');
    let frame = 0;
    let p = progressRef.current;
    let lastPhase = -1;
    let visible = false;
    let auto = !motion.matches && p < 1;
    let lastTime = 0;
    let manualUntil = 0;
    let previousY = window.scrollY;
    let lastScrollProgress = -1;

    function render(value: number) {
      p = clamp(value);
      progressRef.current = p;
      const drive = smooth(segment(p, .25, .76));
      const loading = smooth(segment(p, .01, .2));
      const unload = smooth(segment(p, .83, .99));
      const next = p < .25 ? 0 : p < .79 ? 1 : 2;
      if (next !== lastPhase) { lastPhase = next; setPhase(next); }
      transform('truck', `translate(${drive * 28} ${-Math.sin(drive * Math.PI) * 5})`);
      transform('origin', `translate(${-drive * 800} 0)`);
      opacity('origin', 1 - segment(p, .28, .46));
      transform('destination', `translate(${(1 - smooth(segment(p, .58, .78))) * 950} 0)`);
      opacity('destination', segment(p, .58, .72));
      transform('landscape', `translate(${-drive * 95} 0)`);
      transform('road', `translate(${-drive * 840} 0)`);
      transform('wheel', `rotate(${drive * 1260})`);
      opacity('door', segment(p, .2, .24) * (1 - segment(p, .8, .83)));
      transform('loader', `translate(${loading * 160} 0)`);
      opacity('loader', 1 - segment(p, .22, .28));
      transform('cargo-in', `translate(${loading * 160} 0)`);
      opacity('cargo-in', 1 - segment(p, .18, .21));
      transform('cargo-out', `translate(${-unload * 145} 0)`);
      opacity('cargo-out', segment(p, .82, .84));
      opacity('headlight', Math.sin(drive * Math.PI) * .32);
      scene.style.setProperty('--warmth', String(.14 + drive * .2));
      if (bar) bar.style.transform = `scaleX(${p})`;
    }
    function stop() {
      auto = false;
      setPlaying(false);
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
    function tick(time: number) {
      frame = 0;
      if (!auto || !visible || motion.matches || document.hidden) return;
      const delta = lastTime ? Math.min(time - lastTime, 50) : 0;
      lastTime = time;
      render(p + delta / 11000);
      if (p >= 1) { stop(); return; }
      frame = window.requestAnimationFrame(tick);
    }
    function resume() {
      lastTime = 0;
      if (auto && visible && !motion.matches && !document.hidden && !frame) {
        setPlaying(true);
        frame = window.requestAnimationFrame(tick);
      }
    }
    function scrub(value: number) {
      if (!visible || motion.matches || performance.now() < manualUntil) return;
      if (Math.abs(value - lastScrollProgress) < .001) return;
      lastScrollProgress = value;
      stop();
      render(value);
    }
    function onScroll() {
      const y = window.scrollY;
      if (Math.abs(y - previousY) < 1) return;
      previousY = y;
      const box = host!.getBoundingClientRect();
      if (box.bottom <= 0 || box.top > window.innerHeight) return;
      scrub(clamp(-box.top / Math.max(1, box.height - window.innerHeight * .35)));
    }
    function onMotion() {
      if (motion.matches) { stop(); render(.52); }
    }
    function onVisibility() {
      if (document.hidden) { window.cancelAnimationFrame(frame); frame = 0; }
      else resume();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) resume();
      else { window.cancelAnimationFrame(frame); frame = 0; }
    }, { threshold: .12 });
    observer.observe(scene);
    motion.addEventListener('change', onMotion);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    let trigger: Trigger | undefined;
    const engine = window as AnimationWindow;
    if (engine.gsap && engine.ScrollTrigger) {
      try {
        engine.gsap.registerPlugin(engine.ScrollTrigger);
        trigger = engine.ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom 35%', pin: false, onUpdate: (self) => {
          if (Math.abs(window.scrollY - previousY) > 1) scrub(self.progress);
        } });
      } catch { /* Native scroll renderer remains available. */ }
    }
    controls.current = {
      seek: (value) => { stop(); manualUntil = performance.now() + 400; render(value); },
      toggle: () => {
        if (motion.matches) { render(p < .5 ? .52 : .99); return; }
        if (auto) stop();
        else { if (p >= .99) render(0); auto = true; manualUntil = performance.now() + 400; resume(); }
      },
    };
    render(motion.matches ? .52 : p);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      trigger?.kill();
      motion.removeEventListener('change', onMotion);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      controls.current = null;
    };
  }, [host, pluginReady]);

  const paint = (name: string) => `url(#${id}-${name})`;
  const artwork = <div ref={sceneRef} className={styles.scene}>
    <div className={styles.halo} aria-hidden="true" />
    <svg className={styles.art} viewBox="0 0 1200 680" aria-hidden="true" focusable="false" fill="none">
      <defs>
        <linearGradient id={`${id}-body`} x1="550" y1="180" x2="570" y2="490" gradientUnits="userSpaceOnUse"><stop stopColor="#fffef9"/><stop offset=".25" stopColor="#f1f4f3"/><stop offset=".72" stopColor="#d2dce0"/><stop offset="1" stopColor="#8499a5"/></linearGradient>
        <linearGradient id={`${id}-cab`} x1="900" y1="230" x2="1080" y2="520" gradientUnits="userSpaceOnUse"><stop stopColor="#fbfdfb"/><stop offset=".35" stopColor="#f1f6f5"/><stop offset=".7" stopColor="#b3c5ce"/><stop offset="1" stopColor="#667f90"/></linearGradient>
        <linearGradient id={`${id}-front`} x1="1000" y1="270" x2="1110" y2="510" gradientUnits="userSpaceOnUse"><stop stopColor="#e8eeed"/><stop offset=".48" stopColor="#cbd9df"/><stop offset="1" stopColor="#6a8495"/></linearGradient>
        <linearGradient id={`${id}-glass`} x1="866" y1="275" x2="1070" y2="375" gradientUnits="userSpaceOnUse"><stop stopColor="#8ba7b6"/><stop offset=".22" stopColor="#385567"/><stop offset=".55" stopColor="#102938"/><stop offset="1" stopColor="#071724"/></linearGradient>
        <linearGradient id={`${id}-road`} x2="0" y2="1"><stop stopColor="#40515a"/><stop offset="1" stopColor="#101f2b"/></linearGradient>
        <radialGradient id={`${id}-rim`}><stop stopColor="#c4d0d6"/><stop offset=".35" stopColor="#849ba8"/><stop offset=".72" stopColor="#f3f6f6"/><stop offset="1" stopColor="#4b6577"/></radialGradient>
        <linearGradient id={`${id}-beam`}><stop stopColor="#d0edff" stopOpacity=".65"/><stop offset="1" stopColor="#d0edff" stopOpacity="0"/></linearGradient>
        <pattern id={`${id}-grain`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".45" fill="#fff" opacity=".035"/></pattern>
      </defs>
      <g data-part="landscape">
        <path d="M-100 422 120 268 253 360 380 250 573 395 780 265 1000 358 1340 270V540H-100Z" fill="#a6b6bf" opacity=".1"/>
        <path d="M-100 452 135 392 390 444 644 360 872 454 1134 388 1400 439V556H-100Z" fill="#4c6573" opacity=".45"/>
        <path d="M-100 510Q180 440 410 499T920 478T1400 493V580H-100Z" fill="#172f3f"/>
      </g>
      <g data-part="origin">
        <path d="M-100 298 87 249 325 307V520H-100Z" fill="#344b5b"/><path d="m-100 298 187-49 238 58" stroke="#8c9fa9" strokeWidth="4"/>
        {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M-100 ${320 + i * 26}H325`} stroke="#6a828f" strokeOpacity=".32"/>)}
        <path d="M166 351H282V512H166Z" fill="#091d2a"/><path d="M165 347H284" stroke="#ffbc87" strokeWidth="4"/>
        <path d="M110 512H323V537H110Z" fill="#526775"/>
      </g>
      <g data-part="destination" opacity="0">
        <path d="M-100 311 155 255 349 309V519H-100Z" fill="#465d68"/>
        {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M-100 ${328 + i * 25}H349`} stroke="#94a6ad" strokeOpacity=".25"/>)}
        <path d="M203 362H314V510H203Z" fill="#102330"/><path d="M204 357H315" stroke="#ffcf9d" strokeWidth="4"/>
        <path d="M119 512H350V537H119Z" fill="#657c87"/>
      </g>
      <path d="M-100 548H1350V680H-100Z" fill={paint('road')}/>
      <path d="M-100 557H1350" stroke="#b8c5ca" strokeOpacity=".32"/>
      <g data-part="road">{Array.from({ length: 18 }, (_, i) => <path key={i} d={`M${i * 155 - 200} 621h80`} stroke="#dfe3dd" strokeWidth="3" opacity=".3"/>)}</g>
      <ellipse cx="699" cy="567" rx="445" ry="24" fill="#020b13" opacity=".65"/>
      <g data-part="cargo-in"><path d="M123 429h43v57h-43Z" fill="#b78c5f"/><path d="M145 429v57" stroke="#eac598" strokeWidth="4"/><path d="M118 488h54v8h-54Z" fill="#79553a"/></g>
      <g data-part="loader"><path d="M72 499H118V531H62V513Z" fill="#d57536"/><path d="M98 498v-64h21v65M111 495h59" stroke="#34424b" strokeWidth="6"/><path d="M77 499v-46h19v46" stroke="#7d939d" strokeWidth="4"/><circle cx="73" cy="532" r="12" fill="#10222c"/><circle cx="111" cy="532" r="9" fill="#10222c"/></g>
      <g data-part="truck">
        <path d="M292 483H1054V519H292Z" fill="#152a37"/><path d="M505 517H676V542H505Z" fill="#10212d"/>
        <path d="M645 506h134v31H645Z" fill="#8197a4"/><path d="M659 509v27M766 508v27" stroke="#c1ced4" strokeWidth="4"/>
        <path d="M309 218 792 159 817 457 310 505Z" fill={paint('body')}/>
        <path d="m309 218-28-18 490-62 21 21Z" fill="#f9fcfa"/>
        <path d="M281 200 309 218 310 505 280 483Z" fill="#718999"/>
        <path d="m285 215 20 14v258l-20-16Z" fill="#0a1b27"/>
        <path data-part="door" d="m285 215 20 14v258l-20-16Z" fill="#b9c8d0" opacity="0"/>
        <path d="m316 225 470-58M316 493l492-45" stroke="#fff" strokeOpacity=".62" strokeWidth="2"/>
        {Array.from({ length: 20 }, (_, i) => <path key={i} d={`M${327 + i * 23} ${224 - i * 2.85}l8 ${265 - i * .6}`} stroke="#516e80" strokeOpacity=".105"/>)}
        <path d="m310 503 507-46" stroke="#556f81" strokeWidth="6"/>
        {[350, 478, 606, 734].map((x) => <rect key={x} x={x} y={502 - (x - 310) * .09} width="10" height="4" rx="1" fill="#ffc885"/>)}
        <path d="m830 494-6-222q1-51 38-66l86-16q27-3 51 25l66 86q19 24 23 58l12 136-58 48-135-12Z" fill={paint('cab')}/>
        <path d="m948 190 38 14q14 6 24 24l56 74q19 24 22 57l12 136-58 48-15-188-50-106Z" fill={paint('front')}/>
        <path d="M837 270q2-39 33-50l78-15 21 40Z" fill="#f7fcfb"/>
        <path d="m844 283 116-26 37 91-149 29Z" fill={paint('glass')}/>
        <path d="m976 266 67 57 29 38-65-11Z" fill={paint('glass')}/>
        <path d="m852 288 98-23 7 20-101 73Z" fill="#ccdde5" opacity=".17"/>
        <path d="m857 374 140-27M973 271l34 77" stroke="#688596" strokeWidth="3"/>
        <path d="m851 388 102-19 28 89-22 31-104 10Z" stroke="#6d889a" strokeWidth="1.5"/>
        <path d="m858 405 22-3" stroke="#365366" strokeWidth="5" strokeLinecap="round"/>
        <path d="m1007 367 72 10 6 66-69 30Z" fill="#102937"/>
        {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`m1014 ${381 + i * 14} 63 ${5 - i * 4}`} stroke="#496574" strokeWidth="3"/>)}
        <path d="m1018 481 68-28 7 40-52 35-21-3Z" fill="#a3bac7"/>
        <path d="m1026 480 20-7 2 13-20 9ZM1065 466l16-6 1 13-15 7Z" fill="#f0fcff"/>
        <path d="m1030 481 14-5M1068 466l11-4" stroke="#8ed5ff" strokeWidth="2"/>
        <path d="m1053 508 22-14" stroke="#183849" strokeWidth="9"/>
        <path d="m844 492 37-4v11l-37 4Zm1 19 33-3v10l-32 4Z" fill="#4f6c7f"/>
        <path d="M838 299h-14v73h20M1068 339l28-12v42l-17 8" stroke="#132c3b" strokeWidth="9" strokeLinejoin="round"/>
        <path d="M836 297h-17v45h17M1093 328h13v35h-13" fill="#233f50"/>
        <path d="m936 507q-2-61 37-68 38-7 43 55" fill="#142b3a"/>
        {[{ x: 357, y: 531, r: 32 }, { x: 422, y: 525, r: 32 }, { x: 486, y: 519, r: 32 }, { x: 831, y: 518, r: 33 }, { x: 974, y: 508, r: 41 }].map(({ x, y, r }) => <g key={x} transform={`translate(${x} ${y})`}>
          <ellipse rx={r * .86} ry={r} fill="#081720" stroke="#263f50" strokeWidth="4"/>
          <g transform="scale(.86 1)"><circle r={r * .78} fill="#122c3d" stroke="#3c5869"/>
            <g data-part="wheel"><circle r={r * .61} fill={paint('rim')}/>
              {Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="0" cy={-r * .43} rx="2.5" ry="4" fill="#294657" transform={`rotate(${i * 45})`}/>)}
              <circle r={r * .22} fill="#7896a6" stroke="#cddbe1" strokeWidth="2"/>
            </g>
          </g>
        </g>)}
        <path d="m328 496 177-17M940 474q23-42 52-8" stroke="#d0dde3" strokeWidth="5" strokeLinecap="round"/>
        <path data-part="headlight" d="m1081 467 200-26v129l-201-92Z" fill={paint('beam')} opacity="0"/>
      </g>
      <g data-part="cargo-out" opacity="0"><path d="M280 429h44v57h-44Z" fill="#c0976c"/><path d="M302 429v57" stroke="#edcaa3" strokeWidth="4"/><path d="M276 488h53v8h-53Z" fill="#79553a"/></g>
      <path d="M0 0H1200V680H0Z" fill={paint('grain')}/>
    </svg>
    <div className={styles.sceneCaption}><span>0{phase + 1} / 03</span><p>{text.story[phase]}</p></div>
    <div className={styles.console}>
      <div className={styles.chapters} role="group" aria-label={text.hint}>{text.steps.map((label, index) => <button key={index} type="button" aria-pressed={phase === index} onClick={() => controls.current?.seek([.08, .52, .99][index])}><span>0{index + 1}</span>{label}</button>)}</div>
      <button className={styles.play} type="button" onClick={() => controls.current?.toggle()} aria-label={playing ? text.pause : text.play} title={playing ? text.pause : text.play}>{playing ? 'Ⅱ' : '▷'}</button>
      <div className={styles.progress} aria-hidden="true"><span data-progress /></div>
    </div>
  </div>;

  return <div ref={attach} className={styles.root}>
    {children}
    {host && createPortal(artwork, host)}
    <Script id="hap-cinematic-gsap" src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" strategy="afterInteractive" onReady={() => setCoreReady(true)} />
    {coreReady && <Script id="hap-cinematic-scrolltrigger" src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" strategy="afterInteractive" onReady={() => setPluginReady(true)} />}
  </div>;
}
