// src/app/app.component.ts

import { Component, OnInit, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';

import { GameStateService } from './core/services/game-state.service';
import { CommandService } from './core/services/command.service';
import { InactivityService } from './core/services/inactivity.service';
import { LogLine, GameState } from './core/models/game.interfaces';
import { ScreensaverComponent } from './screensaver/screensaver.component';
import { OpeningComponent } from './opening/opening.component';
import { EndingComponent } from './ending/ending.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    OpeningComponent, 
    EndingComponent,
    ScreensaverComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('terminalOutput') private terminalOutput!: ElementRef;
  @ViewChild('commandInputElement') private commandInput!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef;

  command: string = '';
  commandHistory: string[] = [];
  historyIndex: number = 0;

  terminalLog$: Observable<LogLine[]>;
  gameState$: Observable<GameState>;
  isScreensaverActive$: Observable<boolean>;
  
  private fileUploadSub!: Subscription;
  private logSub!: Subscription;
  
  constructor(
    private http: HttpClient,
    public gameStateSvc: GameStateService,
    private commandSvc: CommandService,
    private inactivitySvc: InactivityService
  ) {
    this.terminalLog$ = this.gameStateSvc.terminalLog$;
    this.gameState$ = this.gameStateSvc.gameState$;
    this.isScreensaverActive$ = this.inactivitySvc.isScreensaverActive$;
  }

  get promptText(): string {
    const state = this.gameStateSvc.gameState;
    if (state.pending_action?.item === 'escritura') {
      return 'Alvo:';
    }
    if (state.nome_jogador_global === 'PENDING') {
      return 'Nome:';
    }
    return '>';
  }

  ngOnInit() {
    this.http.get<any>('assets/data.json').subscribe(data => {
      this.gameStateSvc.gameData = data;
      this.gameStateSvc.setGameState({ opening_complete: false });
    });

    this.fileUploadSub = this.gameStateSvc.fileUploadRequest$.subscribe(() => {
      this.fileInput.nativeElement.click();
    });

    this.logSub = this.terminalLog$.subscribe(() => {
      setTimeout(() => this.scrollToBottom(), 0);
    });
  }

  onOpeningComplete() {
    this.gameStateSvc.completeOpening(); 
    
    this.gameStateSvc.showInitialScreen();
    
    this.focusInput();
    this.onUserActivity();
  }

  ngOnDestroy() {
    if (this.fileUploadSub) this.fileUploadSub.unsubscribe();
    if (this.logSub) this.logSub.unsubscribe();
    this.inactivitySvc.stopTimer();
  }
  
  @HostListener('window:mousemove')
  onUserActivity() {
    const config = this.gameStateSvc.gameData.config?.screensaver;
    this.inactivitySvc.resetInactivityTimer(config);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') {
      this.onUserActivity();
    }
  }
  
  private scrollToBottom(): void {
    try {
      if (this.terminalOutput && this.terminalOutput.nativeElement) {
        this.terminalOutput.nativeElement.scrollTop = this.terminalOutput.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  focusInput() {
    if (this.commandInput && this.commandInput.nativeElement) {
      this.commandInput.nativeElement.focus();
    }
  }

  // *** CORREÇÃO PRINCIPAL APLICADA AQUI ***
  handleCommand() {
    const command = this.command.trim();
    if (!command) return;

    this.commandHistory.push(this.command);
    this.historyIndex = this.commandHistory.length;

    const currentGameState = this.gameStateSvc.gameState;

    // Se o jogo está esperando pelo nome do jogador, trate-o aqui.
    if (currentGameState.nome_jogador_global === 'PENDING') {
      this.gameStateSvc.setPlayerName(command);
    } else {
      // Caso contrário, processe-o como um comando normal.
      this.commandSvc.processCommand(command);
    }
    
    this.command = '';
  }

  navigateHistory(direction: 'up' | 'down') {
    if (direction === 'up' && this.historyIndex > 0) {
      this.historyIndex--;
    } else if (direction === 'down' && this.historyIndex < this.commandHistory.length) {
      this.historyIndex++;
    } else if (direction === 'down') {
      this.historyIndex = this.commandHistory.length;
    }
    this.command = this.commandHistory[this.historyIndex] || '';
  }

  getPlayerDisplayName(): string {
    const state = this.gameStateSvc.gameState;
    const prefix = state.crucifixo_ativo ? '[+] ' : '';
    return `${prefix}${state.nome_jogador_global}`;
  }
  
  getObjetivoAtual(): string {
    const gameState = this.gameStateSvc.gameState;
    const gameData = this.gameStateSvc.gameData;
    if (!gameData.fases_jogo || gameState.game_over) return "Redenção alcançada.";

    const phaseKey = `fase_${gameState.fase_atual}`;
    const phaseData = gameData.fases_jogo[phaseKey];
    if (!phaseData) return "Redenção alcançada.";

    let objetivoIndex;
    if (gameState.fase_atual < 6) { 
        objetivoIndex = gameState.objetivo_fase_concluido 
            ? phaseData.objetivo_lider_indice 
            : phaseData.objetivo_conversao_indice;
    } else {
        const avgFaith = this.gameStateSvc.getAverageFaith();
        objetivoIndex = avgFaith > 80
            ? phaseData.objetivo_final_indice
            : phaseData.objetivo_espera_indice;
    }
    
    return gameData.objetivos[objetivoIndex] || "Redenção alcançada.";
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.gameStateSvc.loadGameFromFile(input.files[0]);
    }
    input.value = '';
  }
}