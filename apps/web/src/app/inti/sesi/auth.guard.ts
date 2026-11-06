import { inject } from "@angular/core";
import type { CanActivateFn } from "@angular/router";
import { Router } from "@angular/router";
import { Sesi } from "./sesi";

export const authGuard: CanActivateFn = async (_route, state) => {
    const sesi = inject(Sesi);
    const router = inject(Router);

    if(await sesi.muat()) {
        return true;
    }

    return router.createUrlTree(['/masuk'], { queryParams: { tujuan: state.url } });
}