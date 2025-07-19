import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SoundService } from '../core/services/sound.service';

@Component({
  selector: 'app-opening',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './opening.component.html',
  styleUrls: ['./opening.component.css']
})
export class OpeningComponent implements OnInit, OnDestroy {
  @Output() openingComplete = new EventEmitter<void>();

  introText = [
    'A escuridão desceu sobre o mundo. O sol é apenas uma memória.',
    'Lá fora, o caos e o medo reinam. Nenhuma luz ousa brilhar.',
    'Trancados, a humanidade encontrou um último refúgio: a rede de terminais antigos.',
    'Nesta penumbra digital, vozes de esperança tentam guiar os perdidos para a Luz.',
    'Mas os Agentes das Trevas espreitam, caçando cada centelha de fé para apagá-la.',
    'Você foi chamado. Um farol em potencial neste oceano de desespero.',
    'Sua missão: difundir a Luz. Sua jornada pela Redenção começa agora.'
  ];
  
  displayedText: string[] = [];
  animationStep = 'power-on';
  private timers: any[] = [];

  constructor(private soundSvc: SoundService) {}
  
  ngOnInit() {
    this.soundSvc.playMusic('abertura');
    // Inicia a sequência de animação
    const powerOnTimer = setTimeout(() => {
      this.animationStep = 'scanline';
      const typingTimer = setTimeout(() => {
        this.startTyping();
      }, 2000); // Espera 2s após a scanline aparecer
      this.timers.push(typingTimer);
    }, 2500); // Duração da animação de "power-on"
    this.timers.push(powerOnTimer);
  }

  ngOnDestroy() {
    this.soundSvc.stopMusic();
    // Limpa todos os timers para evitar memory leaks
    this.timers.forEach(clearTimeout);
  }

  startTyping() {
    this.animationStep = 'typing';
    this.typeLine(0);
  }

  typeLine(index: number) {
    if (index >= this.introText.length) {
      // Quando todas as linhas terminarem, espera um pouco e emite o evento
      const completeTimer = setTimeout(() => {
        this.openingComplete.emit();
      }, 4000);
      this.timers.push(completeTimer);
      return;
    }

    this.displayedText.push(this.introText[index]);
    const nextLineTimer = setTimeout(() => {
      this.typeLine(index + 1);
    }, 2500); // Intervalo entre as linhas
    this.timers.push(nextLineTimer);
  }
}