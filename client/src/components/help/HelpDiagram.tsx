import {
  ArrowRight, Bell, BookOpen, Box, CalendarDays, CheckCircle2, Cloud, CreditCard,
  FileText, Keyboard, LayoutDashboard, MapPin, Monitor, Moon, Search, Settings,
  Truck, Wallet, Wifi,
} from 'lucide-react';
import type { DiagramVariant } from '../../lib/help/types';

type Point = [number, number];

const MARKERS: Record<DiagramVariant, Point[]> = {
  layout: [
    [11, 55],
    [36, 17],
    [55, 12],
    [63, 12],
    [71, 12],
    [79, 12],
    [87, 12],
    [95, 12],
  ],
  flow: [
    [8, 55],
    [25, 55],
    [42, 55],
    [59, 55],
    [76, 55],
    [92, 55],
  ],
  wizard: [
    [11, 30],
    [42, 22],
    [42, 45],
    [42, 68],
    [76, 88],
  ],
  planning: [
    [10, 52],
    [38, 34],
    [54, 34],
    [76, 66],
    [58, 14],
    [86, 14],
  ],
  finance: [
    [14, 42],
    [38, 28],
    [56, 62],
    [80, 42],
    [46, 84],
  ],
  telematics: [
    [10, 52],
    [30, 52],
    [50, 42],
    [76, 42],
    [88, 72],
  ],
  portal: [
    [42, 26],
    [11, 52],
    [42, 56],
    [66, 78],
    [86, 52],
  ],
};

function Marker({ index, x, y }: { index: number; x: number; y: number }) {
  return (
    <span
      className="absolute z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-[11px] font-black text-white shadow-lg ring-2 ring-card"
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-hidden="true"
    >
      {index}
    </span>
  );
}

function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-[640px] rounded-2xl border border-border bg-card p-2 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <span className="h-2 w-2 rounded-full bg-red-400/80" />
        <span className="h-2 w-2 rounded-full bg-amber-400/80" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
        <div className="ml-2 h-4 flex-1 rounded-md bg-surface" />
      </div>
      {children}
    </div>
  );
}

function Bar({ w = 'w-full', tone = 'bg-border/70' }: { w?: string; tone?: string }) {
  return <div className={`h-1.5 rounded-full ${tone} ${w}`} />;
}

export default function HelpDiagram({
  variant,
  title,
  callouts,
}: {
  variant: DiagramVariant;
  title: string;
  callouts: string[];
}) {
  const points = MARKERS[variant] || [];

  return (
    <figure className="my-5 overflow-hidden rounded-2xl border border-border bg-surface/60 p-3 sm:p-4">
      <figcaption className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-text-secondary">
        <Monitor className="h-3.5 w-3.5 text-primary" />
        {title}
      </figcaption>

      <div className="overflow-x-auto pb-1">
        <div className="relative">
          {variant === 'layout' && (
            <Chrome>
              <div className="flex gap-2">
                <div className="w-32 rounded-lg bg-surface p-2">
                  <div className="mb-2 flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded bg-primary/70" />
                    <Bar w="w-12" tone="bg-text-secondary/40" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 rounded bg-primary/15 px-1.5 py-1">
                      <span className="h-2 w-2 rounded bg-primary" />
                      <Bar w="w-16" tone="bg-primary/50" />
                    </div>
                    {[18, 14, 16, 12, 15, 13, 17].map((w, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-1.5 py-0.5">
                        <span className="h-2 w-2 rounded bg-border" />
                        <Bar w={w > 15 ? 'w-16' : 'w-12'} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <Bar w="w-14" tone="bg-text/50" />
                      <div className="hidden h-4 w-16 rounded-full bg-primary/15 sm:block" />
                    </div>
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Search className="h-3.5 w-3.5" />
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      <Keyboard className="h-3.5 w-3.5" />
                      <Moon className="h-3.5 w-3.5" />
                      <Bell className="h-3.5 w-3.5" />
                      <span className="h-3.5 w-3.5 rounded-full bg-primary/30" />
                    </div>
                  </div>
                  <div className="mb-2 grid grid-cols-3 gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="rounded-lg border border-border bg-surface/70 p-2">
                        <Bar w="w-10" />
                        <div className="mt-1.5 h-3 w-12 rounded bg-primary/25" />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border">
                    <div className="flex gap-2 border-b border-border bg-surface px-2 py-1.5">
                      {[10, 14, 8, 12].map((w, i) => (
                        <Bar key={i} w={w > 10 ? 'w-14' : 'w-9'} />
                      ))}
                    </div>
                    {[0, 1, 2, 3].map((row) => (
                      <div key={row} className="flex items-center gap-2 border-b border-border/60 px-2 py-1.5 last:border-0">
                        <span className="h-2 w-2 rounded-full bg-primary/40" />
                        <Bar w="w-16" />
                        <Bar w="w-10" />
                        <span className="ml-auto h-2.5 w-10 rounded-full bg-emerald-400/30" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Chrome>
          )}

          {variant === 'flow' && (
            <Chrome>
              <div className="flex items-center gap-1 px-1 py-4">
                {[Box, CalendarDays, Truck, FileText, FileText, Wallet].map((Icon, i) => (
                  <div key={i} className="flex flex-1 items-center">
                    <div className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-border bg-surface/80 px-2 py-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${i === 1 ? 'bg-primary/15 text-primary' : 'bg-card text-text-secondary'}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <Bar w="w-10" />
                    </div>
                    {i < 5 && <ArrowRight className="mx-0.5 h-3 w-3 shrink-0 text-primary/60" />}
                  </div>
                ))}
              </div>
            </Chrome>
          )}

          {variant === 'wizard' && (
            <Chrome>
              <div className="flex gap-2 p-1">
                <div className="w-40 space-y-2 rounded-lg bg-surface p-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg px-2 py-2 ${i === 0 ? 'bg-primary/15' : ''}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${i === 0 ? 'bg-primary text-white' : 'bg-border text-text-secondary'}`}>{i + 1}</span>
                      <Bar w="w-16" tone={i === 0 ? 'bg-primary/50' : 'bg-border/70'} />
                    </div>
                  ))}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="rounded-lg border border-border p-2">
                        <Bar w="w-10" />
                        <div className="mt-1.5 h-5 rounded bg-surface" />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <Bar w="w-12" />
                    <div className="mt-1.5 h-6 rounded bg-surface" />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <span className="h-6 w-14 rounded-md border border-border" />
                    <span className="h-6 w-16 rounded-md bg-primary/80" />
                  </div>
                </div>
              </div>
            </Chrome>
          )}

          {variant === 'planning' && (
            <Chrome>
              <div className="flex gap-2 p-1">
                <div className="w-44 rounded-lg border border-border bg-surface/60 p-2">
                  <Bar w="w-16" />
                  <div className="mt-2 space-y-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="rounded-md border border-border bg-card p-1.5">
                        <Bar w="w-20" />
                        <div className="mt-1 flex gap-1">
                          <span className="h-1.5 w-6 rounded-full bg-primary/30" />
                          <span className="h-1.5 w-4 rounded-full bg-border" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-1">
                    <span className="h-4 w-20 rounded bg-primary/20" />
                    <span className="h-4 w-10 rounded bg-surface" />
                    <span className="h-4 w-10 rounded bg-surface" />
                    <span className="ml-auto h-4 w-16 rounded bg-primary/15" />
                  </div>
                  <div className="space-y-1">
                    {[0, 1, 2].map((row) => (
                      <div key={row} className="grid grid-cols-7 gap-1 rounded-md border border-border bg-surface/40 p-1">
                        <div className="col-span-1 flex items-center gap-1 rounded bg-card px-1">
                          <Truck className="h-3 w-3 text-text-secondary" />
                          <Bar w="w-6" />
                        </div>
                        {[0, 1, 2, 3, 4, 5].map((col) => (
                          <div key={col} className="h-6 rounded bg-card/70">
                            {row === 0 && col === 1 && <div className="h-full rounded bg-primary/25" />}
                            {row === 1 && col === 3 && <div className="h-full rounded bg-amber-400/30" />}
                            {row === 2 && col === 0 && <div className="h-full rounded bg-emerald-400/25" />}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 rounded-md border border-border bg-surface/60 p-1.5">
                    <Bar w="w-8" />
                    <span className="h-2 flex-1 rounded-full bg-primary/20" />
                    <Bar w="w-6" />
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                  </div>
                </div>
              </div>
            </Chrome>
          )}

          {variant === 'finance' && (
            <Chrome>
              <div className="flex items-center gap-2 p-2">
                <div className="w-28 rounded-lg border border-border bg-surface/60 p-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <Bar w="w-8" />
                    <FileText className="h-3 w-3 text-primary" />
                  </div>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="mb-1 flex items-center justify-between gap-1">
                      <Bar w="w-10" />
                      <Bar w="w-4" />
                    </div>
                  ))}
                  <div className="mt-2 border-t border-border pt-1">
                    <Bar w="w-8" tone="bg-primary/50" />
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-primary/60" />
                <div className="flex-1 space-y-1.5">
                  <div className="rounded-lg border border-border bg-primary/10 p-2">
                    <div className="flex items-center justify-between">
                      <Bar w="w-10" tone="bg-primary/50" />
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded-lg border border-border p-2">
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3 text-text-secondary" />
                        <Bar w="w-8" />
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-2">
                      <div className="flex items-center gap-1">
                        <Wallet className="h-3 w-3 text-emerald-500" />
                        <Bar w="w-10" />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <Bar w="w-12" />
                    <div className="mt-1.5 flex h-8 items-end gap-1">
                      {[40, 65, 30, 80, 55].map((h, i) => (
                        <span key={i} className="flex-1 rounded-sm bg-primary/30" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Chrome>
          )}

          {variant === 'telematics' && (
            <Chrome>
              <div className="flex items-center gap-1 p-3">
                {[Truck, Wifi, Cloud, LayoutDashboard, Settings].map((Icon, i) => (
                  <div key={i} className="flex flex-1 items-center">
                    <div className={`flex flex-1 flex-col items-center gap-2 rounded-xl border border-border ${i === 2 ? 'bg-primary/10' : 'bg-surface/60'} px-2 py-4`}>
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${i === 2 ? 'bg-primary/20 text-primary' : 'bg-card text-text-secondary'}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <Bar w="w-12" />
                      <Bar w="w-8" tone="bg-border/50" />
                    </div>
                    {i < 4 && <ArrowRight className="mx-0.5 h-3 w-3 shrink-0 text-primary/60" />}
                  </div>
                ))}
              </div>
            </Chrome>
          )}

          {variant === 'portal' && (
            <Chrome>
              <div className="flex gap-2 p-1">
                <div className="w-28 space-y-1 rounded-lg bg-surface p-2">
                  <div className="mb-2 flex items-center gap-1">
                    <span className="h-4 w-4 rounded bg-primary/60" />
                    <Bar w="w-10" />
                  </div>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className={`flex items-center gap-1.5 rounded px-1 py-0.5 ${i === 1 ? 'bg-primary/15' : ''}`}>
                      <span className={`h-2 w-2 rounded ${i === 1 ? 'bg-primary' : 'bg-border'}`} />
                      <Bar w="w-12" />
                    </div>
                  ))}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Bar w="w-16" tone="bg-text/40" />
                    <span className="h-4 w-12 rounded-full bg-primary/20" />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="rounded-lg border border-border bg-surface/60 p-2">
                        <span className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-primary/15">
                          <Box className="h-3 w-3 text-primary" />
                        </span>
                        <Bar w="w-12" />
                        <div className="mt-1 h-3 w-8 rounded bg-text-secondary/20" />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-2 border-b border-border/50 py-1 last:border-0">
                        <MapPin className="h-3 w-3 text-primary" />
                        <Bar w="w-16" />
                        <span className="ml-auto h-2.5 w-10 rounded-full bg-emerald-400/25" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Chrome>
          )}

          {points.slice(0, callouts.length).map(([x, y], index) => (
            <Marker key={index} index={index + 1} x={x} y={y} />
          ))}
        </div>
      </div>

      <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {callouts.map((text, index) => (
          <li key={index} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-black text-primary">
              {index + 1}
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
