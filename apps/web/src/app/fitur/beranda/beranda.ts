import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'kelas-beranda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './beranda.css',
  templateUrl: './beranda.html',
})
export class Beranda {}
