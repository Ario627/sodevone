import { createHash } from "node:crypto";

const ENDPOINT = 'https://api.pwnedpasswords.com/range/';

const PREFIX_LENGTH = 5;

const FIELD_SEPARATOR = ':';

const LINE_SEPARATOR = /\r?\n/;

export type BreachResult = 'breached' | 'clean' | 'unavailable';

function sha1Hex(value: string): string {
    return createHash('sha1').update(value, 'utf8').digest('hex').toUpperCase();
}

function countOf(line: string): number {
    const separator = line.indexOf(FIELD_SEPARATOR);
    if(separator < 0) {
        return 0;
    }
    return Number.parseInt(line.slice(separator + 1).trim(), 10) || 0;
}

function suffixOf(line: string): string {
    const separator = line.indexOf(FIELD_SEPARATOR);
    return (separator < 0 ? line : line.slice(0, separator).trim().toUpperCase());
}

async function fetchRange(prefix: string, timeoutMs: number): Promise<string |  undefined> {
    try {
        const response = await fetch(`${ENDPOINT}${prefix}`, {
            headers: {'Add-Padding': 'true'},
            signal: AbortSignal.timeout(timeoutMs),
        });

        return response.ok ? await response.text() : undefined;
    } catch {
        return undefined;
    }
}


function matches(body: string, suffix: string): boolean {
    return body 
        .split(LINE_SEPARATOR)
        .some((line) => suffixOf(line) === suffix && countOf(line) > 0);
}

export async function checkBreached(password: string, timeoutMs: number): Promise<BreachResult> {
    const hash = sha1Hex(password);
    const body = await fetchRange(hash.slice(0, PREFIX_LENGTH), timeoutMs);

    if(body === undefined) {
        return 'unavailable';
    }

    return matches(body, hash.slice(PREFIX_LENGTH)) ? 'breached' : 'clean'
}