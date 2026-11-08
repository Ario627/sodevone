export interface Titik {
    readonly x: number;
    readonly y: number;
}

const PEMBULAT = 100;

function bulat(nilai: number): number {
    return Math.round(nilai * PEMBULAT) / PEMBULAT;
}


function titikTeks(titik: Titik): string {
    return `${bulat(titik.x)},${bulat(titik.y)}`;
}


export function jalurLembut(titik: readonly Titik[]): string {
    if(titik.length === 0) {
        return '';
    }

    const awal = titik[0] as Titik;

    if(titik.length === 1) {
        return `M ${titikTeks(awal)}`;
    }


    const bagian: string[] = [`M ${titikTeks(awal)}`];

    for(let i = 0; i < titik.length - 1; i+=1) {
        const sebelum = (titik[i - 1] ?? titik[i]) as Titik;
        const kini = titik[i] as Titik;
        const lanjut = titik[i + 1] as Titik;
        const sesudah = (titik[i + 2] ?? titik[i + 1]) as Titik;


        const kendaliA: Titik = {
            x: kini.x + (lanjut.x - sebelum.x) / 6,
            y: kini.y + (lanjut.y - sebelum.y) / 6,
        }

        const kendaliB: Titik = {
            x: lanjut.x - (sesudah.x - kini.x) / 6,
            y: lanjut.y - (sesudah.y - kini.y) / 6,
        }

        bagian.push(`C ${titikTeks(kendaliA)} ${titikTeks(kendaliB)} ${titikTeks(lanjut)}`);
    }

    return bagian.join(' ');
}

export function jepit(nilai: number, bawah: number, atas: number): number {
    return nilai < bawah ? bawah : nilai > atas ? atas : nilai;
}