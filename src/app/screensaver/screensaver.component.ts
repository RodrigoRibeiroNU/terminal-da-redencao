// src/app/screensaver/screensaver.component.ts

import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-screensaver',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './screensaver.component.html',
  styleUrls: ['./screensaver.component.css']
})
export class ScreensaverComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mover') private mover!: ElementRef<HTMLDivElement>;

  showFront = true;
  
  // Variáveis para a animação
  private x = 0;
  private y = 0;
  private dx = 1; // Velocidade horizontal
  private dy = 1; // Velocidade vertical
  private animationFrameId: number | null = null;

  ngOnInit() {
    // Inicia a posição de forma aleatória
    this.x = Math.random() * 50;
    this.y = Math.random() * 50;
  }

  ngAfterViewInit() {
    // Inicia o loop de animação depois da view ser inicializada
    this.animate();
  }

  ngOnDestroy() {
    // Para o loop de animação quando o componente é destruído
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private animate() {
    const moverEl = this.mover.nativeElement;
    const containerEl = moverEl.parentElement;

    if (!containerEl) return;

    // Obtém os limites do contentor e do elemento que se move
    const containerRect = containerEl.getBoundingClientRect();
    const moverRect = moverEl.getBoundingClientRect();

    // Atualiza a posição
    this.x += this.dx;
    this.y += this.dy;

    // Verifica colisão com as bordas horizontais
    if (this.x + moverRect.width >= containerRect.width || this.x <= 0) {
      this.dx *= -1; // Inverte a direção
      this.showFront = !this.showFront; // Troca o lado da medalha
    }

    // Verifica colisão com as bordas verticais
    if (this.y + moverRect.height >= containerRect.height || this.y <= 0) {
      this.dy *= -1; // Inverte a direção
      this.showFront = !this.showFront; // Troca o lado da medalha
    }
    
    // Garante que o elemento não saia dos limites
    this.x = Math.max(0, Math.min(this.x, containerRect.width - moverRect.width));
    this.y = Math.max(0, Math.min(this.y, containerRect.height - moverRect.height));

    // Aplica a nova posição
    moverEl.style.left = `${this.x}px`;
    moverEl.style.top = `${this.y}px`;

    // Continua o loop de animação
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }
}
