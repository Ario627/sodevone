const BATAS_NORMAL = 0.5;

export function normalisasi(posisi: number, ukuran: number): number {
    if(ukuran <= 0) {
        return 0;
    }

    const tengah = posisi / ukuran - BATAS_NORMAL;

    return Math.min(Math.max(tengah * 2, -1), 1);
}

export function geserTerbatas(nilai: number, maksimum: number): number {
    return Math.round(Math.min(Math.max(nilai, -1), 1) * maksimum);
}