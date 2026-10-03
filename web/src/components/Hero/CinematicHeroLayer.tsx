'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Script from 'next/script';
import { useLanguage, type Language } from '@/context/LanguageContext';
import original from './Hero.module.css';
import styles from './CinematicHeroLayer.module.css';

// The calculator remains in the original Hero component. Only its decorative
// section is enhanced/pinned; the modal is never moved into a transformed parent.
const copy: Record<Language, { steps: readonly string[]; hint: string; story: readonly string[] }> = {
  RO: { steps: ['Încărcare', 'Transport', 'Livrare'], hint: 'Urmărește călătoria', story: ['Totul începe cu grijă.', 'Mai aproape. Kilometru cu kilometru.', 'La destinație. Cu aceeași grijă.'] },
  EN: { steps: ['Loading', 'Transport', 'Delivery'], hint: 'Follow the journey', story: ['Every journey begins with care.', 'Closer. Mile after mile.', 'Delivered with the same care.'] },
  NL: { steps: ['Laden', 'Transport', 'Levering'], hint: 'Volg de reis', story: ['Elke reis begint met zorg.', 'Dichterbij. Kilometer na kilometer.', 'Met dezelfde zorg afgeleverd.'] },
  DE: { steps: ['Beladung', 'Transport', 'Lieferung'], hint: 'Verfolgen Sie die Reise', story: ['Jede Reise beginnt mit Sorgfalt.', 'Näher. Kilometer für Kilometer.', 'Mit derselben Sorgfalt geliefert.'] },
  FR: { steps: ['Chargement', 'Transport', 'Livraison'], hint: 'Suivez le voyage', story: ['Chaque trajet commence avec soin.', 'Plus près. Kilomètre après kilomètre.', 'Livré avec le même soin.'] },
  ES: { steps: ['Carga', 'Transporte', 'Entrega'], hint: 'Sigue el viaje', story: ['Cada viaje comienza con cuidado.', 'Más cerca. Kilómetro a kilómetro.', 'Entregado con el mismo cuidado.'] },
};

type Vars = Record<string, unknown>;
type ScrollHandle = { start: number; end: number };
type Timeline = {
  to: (target: string, vars: Vars, position: number) => Timeline;
  fromTo: (target: string, from: Vars, to: Vars, position: number) => Timeline;
  scrollTrigger?: ScrollHandle;
};
type GsapApi = {
  registerPlugin: (plugin: object) => void;
  context: (callback: () => void, scope: Element) => { revert: () => void };
  timeline: (vars: Vars) => Timeline;
};
type AnimationWindow = Window & { gsap?: GsapApi; ScrollTrigger?: object };

export default function CinematicHeroLayer({ children }: { children: ReactNode }) {
  const { lang } = useLanguage();
  const text = copy[lang] || copy.EN;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [coreReady, setCoreReady] = useState(false);
  const [pluginReady, setPluginReady] = useState(false);
  const [scriptsAllowed, setScriptsAllowed] = useState(false);
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  const range = useRef<ScrollHandle | null>(null);
  const cleanupRef = useRef<() => void>(() => {});

  const attach = useCallback((root: HTMLDivElement | null) => {
    cleanupRef.current();
    cleanupRef.current = () => {};
    if (!root) return;
    const hero = root.getElementsByClassName(original.hero)[0];
    if (!(hero instanceof HTMLElement)) return;
    const touched: HTMLElement[] = [];
    for (const key of ['hero', 'container', 'content', 'fleetColumn', 'title', 'subtitle', 'badge', 'ctaGroup', 'dynamicBadges'] as const) {
      const element = key === 'hero' ? hero : hero.getElementsByClassName(original[key])[0];
      if (element instanceof HTMLElement) {
        element.dataset.cinematic = key;
        touched.push(element);
      }
    }
    // The portal only adds artwork; existing React event handlers are untouched.
    setHost(hero);
    cleanupRef.current = () => touched.forEach((element) => delete element.dataset.cinematic);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 900px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)');
    const update = () => setScriptsAllowed(query.matches);
    const frame = window.requestAnimationFrame(update);
    query.addEventListener('change', update);
    return () => {
      window.cancelAnimationFrame(frame);
      query.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    if (!host || !coreReady || !pluginReady || !scriptsAllowed) return;
    const engine = window as AnimationWindow;
    if (!engine.gsap || !engine.ScrollTrigger) return;
    const gsap = engine.gsap;
    gsap.registerPlugin(engine.ScrollTrigger);
    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: host, pin: host, pinType: 'fixed', start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * 1.8)}`,
          scrub: 0.65, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self: { progress: number }) => {
            const next = self.progress < 0.28 ? 0 : self.progress < 0.78 ? 1 : 2;
            if (phaseRef.current !== next) {
              phaseRef.current = next;
              setPhase(next);
            }
          },
        },
      });
      // Cargo enters at the LEFT rear. The trailer is opaque; it vanishes
      // inside the aperture before the doors close and the vehicle moves.
      timeline
        .to('[data-part="cargo-in"]', { x: 145, duration: 0.17 }, 0)
        .to('[data-part="cargo-in"]', { opacity: 0, duration: 0.03 }, 0.17)
        .fromTo('[data-part="rear-door"]', { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.21)
        .to('[data-part="truck"]', { x: 130, duration: 0.47, ease: 'power1.inOut' }, 0.29)
        .to('[data-part="wheel"]', { rotation: 1080, svgOrigin: undefined, transformOrigin: '50% 50%', duration: 0.47, ease: 'power1.inOut' }, 0.29)
        .to('[data-part="road"]', { x: -520, duration: 0.47, ease: 'power1.inOut' }, 0.29)
        .to('[data-part="hills"]', { x: -85, duration: 0.47 }, 0.29)
        .to('[data-part="origin"]', { x: -800, opacity: 0, duration: 0.28 }, 0.29)
        .fromTo('[data-part="destination"]', { x: 650, opacity: 0 }, { x: 0, opacity: 1, duration: 0.22 }, 0.54)
        .to('[data-part="rear-door"]', { opacity: 0, duration: 0.05 }, 0.8)
        .fromTo('[data-part="cargo-out"]', { x: 0, opacity: 0 }, { x: 0, opacity: 1, duration: 0.03 }, 0.85)
        .to('[data-part="cargo-out"]', { x: -145, duration: 0.12 }, 0.88)
        .fromTo('[data-part="progress"]', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 1 }, 0);
      range.current = timeline.scrollTrigger || null;
    }, host);
    return () => {
      range.current = null;
      context.revert();
    };
  }, [host, coreReady, pluginReady, scriptsAllowed]);

  function selectChapter(index: number) {
    if (range.current && scriptsAllowed) {
      const positions = [0.02, 0.52, 0.98];
      const { start, end } = range.current;
      window.scrollTo({ top: start + (end - start) * positions[index], behavior: 'smooth' });
    } else {
      phaseRef.current = index;
      setPhase(index);
    }
  }

  const gradient = (name: string) => `url(#${uid}-${name})`;
  const scene = (
    <div className={styles.scene} data-phase={phase} data-running={scriptsAllowed && coreReady && pluginReady ? 'true' : 'false'}>
      <svg className={styles.art} viewBox="0 0 1600 660" fill="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="660" gradientUnits="userSpaceOnUse"><stop stopColor="#10232e" stopOpacity="0"/><stop offset="0.55" stopColor="#435154"/><stop offset="1" stopColor="#152a35"/></linearGradient>
          <linearGradient id={`${uid}-white`} x1="600" y1="250" x2="630" y2="520" gradientUnits="userSpaceOnUse"><stop stopColor="#fffdf8"/><stop offset="0.55" stopColor="#e6e9e7"/><stop offset="1" stopColor="#a9b7ba"/></linearGradient>
          <linearGradient id={`${uid}-front`} x1="1170" y1="280" x2="1310" y2="540" gradientUnits="userSpaceOnUse"><stop stopColor="#fffef7"/><stop offset="0.5" stopColor="#dce4e4"/><stop offset="1" stopColor="#7c909b"/></linearGradient>
          <linearGradient id={`${uid}-glass`} x1="1040" y1="320" x2="1260" y2="410" gradientUnits="userSpaceOnUse"><stop stopColor="#5c7d8d"/><stop offset="0.45" stopColor="#102b3c"/><stop offset="1" stopColor="#06121c"/></linearGradient>
          <radialGradient id={`${uid}-sun`}><stop stopColor="#ffd4a0" stopOpacity="0.38"/><stop offset="1" stopColor="#ffad72" stopOpacity="0"/></radialGradient>
          <radialGradient id={`${uid}-rim`}><stop stopColor="#cbd4d7"/><stop offset="0.55" stopColor="#788891"/><stop offset="0.8" stopColor="#e3e6e6"/><stop offset="1" stopColor="#536875"/></radialGradient>
          <linearGradient id={`${uid}-road`} x1="0" y1="510" x2="0" y2="660" gradientUnits="userSpaceOnUse"><stop stopColor="#35454b"/><stop offset="1" stopColor="#0b1923"/></linearGradient>
        </defs>
        <path fill={gradient('sky')} d="M0 0h1600v660H0z"/>
        <ellipse cx="1320" cy="240" rx="480" ry="310" fill={gradient('sun')}/>
        <g data-part="hills">
          <path d="M-160 400 80 250 235 340 410 190 650 330 880 210 1080 330 1330 225 1800 390V550H-160Z" fill="#708087" opacity=".28"/>
          <path d="M-100 440 170 360 355 415 560 325 750 430 1010 330 1270 390 1570 325 1800 430V555H-100Z" fill="#253e48"/>
          <path d="M-100 480Q230 400 550 465T1170 435T1850 470V560H-100Z" fill="#19313c"/>
        </g>
        <g data-part="origin">
          <path d="M-90 288 155 232 355 305V503H-90Z" fill="#2a3d46"/>
          <path d="m155 232 200 73-445-17Z" fill="#607078"/>
          <path d="M-70 315H330V483H-70Z" fill="#334a55"/>
          {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M-70 ${326 + i * 26}H330`} stroke="#59707a" strokeOpacity=".4"/>)}
          <path d="M180 344H309V492H180Z" fill="#101f28"/>
          <path d="M180 337H310" stroke="#ffb778" strokeWidth="5"/>
          <path d="M145 490H403V517H145Z" fill="#52636a"/>
          <path d="M165 517V543M350 517V543" stroke="#233640" strokeWidth="10"/>
        </g>
        <g data-part="destination" opacity="0">
          <path d="M-80 307 173 245 485 307V499H-80Z" fill="#3d525a"/>
          <path d="M-80 308H485" stroke="#91a2a5" strokeWidth="6"/>
          {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M-80 ${331 + i * 31}H485`} stroke="#6a7f86" strokeOpacity=".5"/>)}
          <path d="M280 348H414V491H280Z" fill="#142730"/>
          <path d="M279 342H415" stroke="#ffba83" strokeWidth="5"/>
          <path d="M240 490H535V517H240Z" fill="#667880"/>
        </g>
        <path d="M0 525H1600V660H0Z" fill={gradient('road')}/>
        <path d="M0 533H1600" stroke="#92a1a6" strokeOpacity=".4"/>
        <g data-part="road">
          {Array.from({ length: 18 }, (_, i) => <path key={i} d={`M${i * 160 - 250} 607h90`} stroke="#dce0d7" strokeWidth="3" strokeOpacity=".28"/>)}
        </g>
        <g data-part="truck">
          <ellipse cx="843" cy="568" rx="472" ry="20" fill="#020c12" opacity=".55"/>
          <path d="M412 497H1244V525H412Z" fill="#172731"/>
          <path d="M451 515H692V537H451ZM960 520H1133V541H960Z" fill="#0a1720"/>
          <path d="M732 509H884V536H732Z" fill="#71838a"/>
          <path d="M740 514H876M740 527H876" stroke="#aec0c4" strokeWidth="3"/>
          <path d="m414 274 583-27 17 238-600 19Z" fill={gradient('white')}/>
          <path d="m414 274 20-17 555-25 8 15Z" fill="#fffdf7"/>
          <path d="M414 274V504L395 493V287Z" fill="#879ba4"/>
          <path d="M398 291 410 281V491L398 484Z" fill="#091b26"/>
          <path data-part="rear-door" d="M398 291 410 281V491L398 484Z" fill="#c2cdcf" opacity="0"/>
          <path d="m417 282 579-26M420 493l589-18" stroke="#fff" strokeOpacity=".55" strokeWidth="2"/>
          {Array.from({ length: 15 }, (_, i) => <path key={i} d={`M${448 + i * 37} ${278 - i * 1.7}l7 202`} stroke="#78909b" strokeOpacity=".13"/>)}
          <path d="M424 502 1010 484" stroke="#637981" strokeWidth="5"/>
          {[460, 670, 880, 996].map((x) => <rect key={x} x={x} y={500 - (x - 460) * .03} width="9" height="4" rx="1" fill="#ffbd69"/>)}
          <path d="M1037 499V316Q1038 275 1072 271L1175 267Q1200 270 1218 297L1286 382Q1300 405 1300 439V516L1249 537H1096Z" fill={gradient('white')}/>
          <path d="m1175 267 38 17 72 98q15 23 15 57v77l-51 21V396l-53-92Z" fill={gradient('front')}/>
          <path d="M1044 314Q1049 287 1073 284L1171 280 1190 309Z" fill="#fffef8"/>
          <path d="m1051 326 1194-10 47 75-188 8Z" fill="none"/>
          <path d="m1051 326 120-7 26 72-146 8Z" fill={gradient('glass')}/>
          <path d="m1200 322 65 66-15 4-35-2Z" fill={gradient('glass')}/>
          <path d="m1061 333 94-5 5 10-95 44Z" fill="#c3d9df" opacity=".18"/>
          <path d="M1166 326 1187 389M1055 401l139-8" stroke="#82979f" strokeWidth="3"/>
          <path d="m1054 410 104-6 25 66-25 22h-105Z" stroke="#96a8af" strokeWidth="1.5"/>
          <path d="M1061 420h22" stroke="#485f6a" strokeWidth="4" strokeLinecap="round"/>
          <path d="m1207 405 62 0 12 64-48 21-22-26Z" fill="#142936"/>
          {[0, 1, 2, 3].map((i) => <path key={i} d={`m1215 ${416 + i * 13} 55-2`} stroke="#526972" strokeWidth="3"/>)}
          <path d="m1202 485 84-6 6 32-43 18-49-7Z" fill="#d1dcde"/>
          <path d="m1207 489 29 0 1 10-28 4ZM1260 486l22-3 1 10-21 5Z" fill="#effbff"/>
          <path d="m1246 510 28-7" stroke="#516b77" strokeWidth="7"/>
          <path d="M1052 496h38v10h-38Zm0 18h34v9h-34Z" fill="#657b87"/>
          <path d="M1046 353h-14v53h16M1254 381l25-11v28l-13 5" stroke="#162c38" strokeWidth="7" strokeLinejoin="round"/>
          <path d="M1100 521q3-51 47-51t48 51" fill="#192d39"/>
          {[480, 537, 594, 1040, 1147].map((x, i) => <g key={x} transform={`translate(${x} ${i < 3 ? 533 : 535})`}>
            <circle r={i < 3 ? 30 : 34} fill="#08151f" stroke="#30424d" strokeWidth="3"/>
            <circle r={i < 3 ? 22 : 25} fill="#142731" stroke="#4e636f"/>
            <g data-part="wheel">
              <circle r="19" fill={gradient('rim')}/>
              {[0, 60, 120, 180, 240, 300].map((angle) => <ellipse key={angle} cx="0" cy="-12" rx="2.5" ry="4" fill="#354d5b" transform={`rotate(${angle})`}/>)}
              <circle r="7" fill="#71858f" stroke="#dbe3e6" strokeWidth="2"/>
            </g>
          </g>)}
          <path d="M457 497h163M1114 497q33-37 64 0" stroke="#dce2e2" strokeWidth="6" strokeLinecap="round"/>
        </g>
        <g data-part="cargo-in">
          <path d="M252 443h46v42h-46Z" fill="#b99264"/><path d="M274 443v42" stroke="#e2c098" strokeWidth="3"/>
          <path d="M247 486h57v8h-57Z" fill="#815e40"/><path d="M252 493v6m24-6v6m22-6v6" stroke="#59412e" strokeWidth="6"/>
        </g>
        <g data-part="cargo-out" opacity="0">
          <path d="M397 443h46v42h-46Z" fill="#b99264"/><path d="M419 443v42" stroke="#e2c098" strokeWidth="3"/>
          <path d="M392 486h57v8h-57Z" fill="#815e40"/>
        </g>
        <path d="M0 644Q430 574 910 630T1600 620V660H0Z" fill="#FF6A2B"/>
        <path d="M0 654Q430 584 910 640T1600 630V660H0Z" fill="#f7f6f2"/>
      </svg>
      <div className={styles.chapterBar}>
        <div className={styles.caption}><span>{text.hint}</span><p>{text.story[phase]}</p></div>
        <div className={styles.chapters} role="group" aria-label={text.hint}>
          {text.steps.map((label, index) => <button key={index} type="button" aria-pressed={phase === index} onClick={() => selectChapter(index)}><span>0{index + 1}</span>{label}</button>)}
        </div>
        <div className={styles.rail} aria-hidden="true"><span data-part="progress" /></div>
      </div>
    </div>
  );

  return <div ref={attach} className={styles.root}>
    {children}
    {host && createPortal(scene, host)}
    {scriptsAllowed && <Script id="hap-cinematic-gsap" src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" strategy="afterInteractive" onReady={() => setCoreReady(true)} />}
    {scriptsAllowed && coreReady && <Script id="hap-cinematic-scrolltrigger" src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" strategy="afterInteractive" onReady={() => setPluginReady(true)} />}
  </div>;
}
