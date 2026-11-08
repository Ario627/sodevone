interface Ticker {
    add(fn: (waktu: number) => void): void;
    remove(fn: (waktu: number) => void): void;
}

interface GarisWaktu {
    to(target: unknown, vars: Record<string, unknown>, posisi?: number): GarisWaktu;
}

interface GsapRingkas {
    registerPlugin(...plugins: unknown[]): void;
    ticker: Ticker;
    to(target: unknown, vars: Record<string, unknown>): unknown;
    timeline(vars?: Record<string, unknown>): GarisWaktu;
}

interface Pemicu {
    progress: number;
    kill(revert?: boolean): void;
}

interface ScrollTriggerRingkas {
    create(vars: Record<string, unknown>): Pemicu;
}


export interface AlatGulir {
  readonly gsap: GsapRingkas;
  readonly pemicu: ScrollTriggerRingkas;
}

let janji: Promise<AlatGulir | null> | undefined;

export function muatAlatGulir(): Promise<AlatGulir | null> {
    janji ??= (async (): Promise<AlatGulir | null> => {
        try {
            const [inti, gulir] = await Promise.all([
                import('gsap'),
                import('gsap/ScrollTrigger'),
            ]);


            const  gsap = inti.gsap as unknown as GsapRingkas;
            const pemicu = gulir.ScrollTrigger as unknown as ScrollTriggerRingkas;

            gsap.registerPlugin(pemicu);

            return { gsap, pemicu };
        } catch {
            return null;
        }
    })();
    
    return janji;
}