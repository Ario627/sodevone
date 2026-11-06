import type { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (permintaan, berikutnya) =>
  berikutnya(permintaan.clone({ withCredentials: true }));