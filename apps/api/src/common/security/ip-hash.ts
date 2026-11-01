import { createHmac } from "node:crypto";

const MESSAGE_PREFIX = "kelas-ip:";
const DIGEST_ENCODING = "hex";

export function hashIp(ip: string | undefined, secret: string): string | null {
    if(ip === undefined ||  ip.length === 0) {
        return null;
    }

    return createHmac("sha256", secret).update((`${MESSAGE_PREFIX}${ip}`)).digest(DIGEST_ENCODING);
}