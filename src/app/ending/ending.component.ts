import { Component, ApplicationRef } from '@angular/core'; // 1. IMPORTE O ApplicationRef
import { CommonModule } from '@angular/common';
import { GameStateService } from '../core/services/game-state.service';
import { GameFlowService } from '../core/services/game-flow.service';

@Component({
  selector: 'app-ending',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ending.component.html',
  styleUrls: ['./ending.component.css']
})
export class EndingComponent {
  
  constructor(
    public gameStateSvc: GameStateService,
    private flowSvc: GameFlowService,
    private appRef: ApplicationRef // 2. INJETE O ApplicationRef
  ) {}

  restartGame() {
    // 3. CHAME A FUNÇÃO PARA REINICIAR O JOGO
    this.flowSvc.resetGame();
    
    // 4. FORCE A ATUALIZAÇÃO DE TODA A APLICAÇÃO
    // Isto garante que o AppComponent perceba a mudança e mostre a tela de título.
    this.appRef.tick();
  }
}