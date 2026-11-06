export class Semaphore {
    private active = 0;

    private readonly waiting: Array<() => void> = [];

    constructor(private readonly max: number) {}

    private async acquire(): Promise<void> {
        if(this.active < this.max) {
            this.active += 1;
            return;
        }

        await new Promise<void>((resolve) => {
            this.waiting.push(resolve);
        })
    }

    private release(): void {
        const next = this.waiting.shift();
        if(next !== undefined) {
            next();
            return;
        }

        this.active -= 1;
    }

     async run<T>(task: () => Promise<T>): Promise<T> {
        await this.acquire();

        try {
            return await task();
        } finally {
            this.release();
        }
     }
}