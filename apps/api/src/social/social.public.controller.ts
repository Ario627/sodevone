import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SocialListQuerySchema, type SocialCollection, type SocialListQuery } from "@kelas/contracts";
import type { Response } from "express";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { SocialService } from "./social.service.js";


const SOCIAL_CACHE = 'public, max-age=60, stale-while-revalidate=300';

@ApiTags('sosial')
@Controller('api/public/social')
export class SocialPublicController {
    constructor(private readonly service: SocialService) {}

    @Get()
    @ApiOperation({ summary: 'Tautan media sosial kelas yang di kurasi pengurus'})
    @ApiOkResponse({description: 'Daftar tautan beserta gambar yang sudah dipilih'})
    async list(
        @Query(new ZodValidationPipe(SocialListQuerySchema)) query: SocialListQuery,
        @Res({passthrough: true}) response: Response,
    ): Promise<SocialCollection> {
        const {items, etag} = await this.service.collection(query);

        response.setHeader('Cache-Control', SOCIAL_CACHE);
        response.setHeader('ETag', etag);
        response.setHeader('Vary', 'Accept-Encoding');

        const ifNoneMatch = response.req.headers['if-none-match'];
        if(typeof  ifNoneMatch === 'string' && ifNoneMatch === etag) {
            response.status(304);
        }

        return {items};
    }
}