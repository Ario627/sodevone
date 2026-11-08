import type { SocialPlatform } from "@kelas/contracts";

const INSTAGRAM_HOSTS = ['instagram.com', 'www.instagram.com', 'instagr.am'];

const TIKTOK_HOSTS = ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'];

const HTTPS_PROTOCOL = 'https:';

const ALLOWED_HOSTS: Record<SocialPlatform, readonly string[]> = {
    instagram: INSTAGRAM_HOSTS,
    tiktok: TIKTOK_HOSTS,
}

export function hostOf(url: string): string | null {
    try {
        return new URL(url).hostname.toLocaleLowerCase()
    } catch {
        return null;
    }
}


export function isPlatformUrl(platform: SocialPlatform, url: string): boolean {
    try {
        const parsed = new URL(url);
        return(
            parsed.protocol === HTTPS_PROTOCOL &&
            parsed.port === '' &&
            ALLOWED_HOSTS[platform].includes(parsed.hostname)
        );
    } catch {
        return false;
    }
}