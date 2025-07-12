import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../core/services/game-state.service';

@Component({
  selector: 'app-ending',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ending.component.html',
  styleUrls: ['./ending.component.css']
})
export class EndingComponent {
  
  constructor(public gameStateSvc: GameStateService) {}

  restartGame() {
    this.gameStateSvc.startNewGame();
    // Recarrega a página para garantir que tudo seja reiniciado.
    window.location.reload();
  }
}