import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import packageInfo from '../../../package.json';

@Component({
  selector: 'app-title-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './title-screen.component.html',
  styleUrls: ['./title-screen.component.css']
})
export class TitleScreenComponent {
  // Acessa a versão diretamente do package.json
  version = packageInfo.version;
}