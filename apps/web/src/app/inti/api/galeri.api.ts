import {
    AlbumDetailSchema,
    AlbumPageSchema,
    type AlbumDetail,
    type AlbumListQuery,,
    type AlbumPage,
    type ImageVariant,
} from '@kelas/contracts'
import { DASAR_API, parameterDari, type Permintaan } from './dasar'

const ALBUM = `${DASAR_API}/public/album`
const MEDIA = `${DASAR_API}/media`
const LEBAR_VARIAN: Record<ImageVariant, number> = {kecil: 480, sedang: 1024}

export function bacaHalamanAlbum(nilai: unknown): AlbumPage {
    return AlbumPageSchema.parse(nilai)

}

export function bacaDetailAlbum(nilai: unknown): AlbumDetail {
    return AlbumDetailSchema.parse(nilai)
}

export function permintaanDaftarAlbum(query: AlbumListQuery): Permintaan {
    return {
        url: ALBUM,
        params: parameterDari({page: query.page, perPage: query.perPage}),
    }
}

export function permintaanDetailAlbum(slug: string, query: AlbumListQuery): Permintaan {
    return {
        url: `${ALBUM}/${encodeURIComponent(slug)}`,
        params: parameterDari({page: query.page, perPage: query.perPage}),
    }
}

export function sumberFoto(id: string, ukuran: ImageVariant): string {
  return `${MEDIA}/${encodeURIComponent(id)}?ukuran=${ukuran}`;
}

export function srcsetFoto(id: string): string {
    return (Object.keys(LEBAR_VARIAN) as ImageVariant[])
        .map((ukuran) => `${sumberFoto(id, ukuran)} ${LEBAR_VARIAN[ukuran]}w`)
        .join(', ')
}       

export function sumberSampul(id: string): string {
    return sumberFoto(id, 'kecil');
}

export function srcsetSampul(id: string): string {
    return srcsetFoto(id);
}