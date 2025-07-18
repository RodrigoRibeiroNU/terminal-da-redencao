import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';

// --- SERVIÇOS ---
import { GameStateService } from './core/services/game-state.service';
import { CommandService } from './core/services/command.service';
import { InactivityService } from './core/services/inactivity.service';
import { GameFlowService } from './core/services/game-flow.service';
import { CharacterService } from './core/services/character.service';

// --- INTERFACES ---
import { LogLine, GameState } from './core/models/game.interfaces';
import { DataLoaderService } from './core/services/data-loader.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('commandInputElement') private commandInput!: ElementRef;
  @ViewChild('terminalOutput') private terminalOutput!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef;

  command: string = '';
  commandHistory: string[] = [];
  historyIndex: number = 0;

  terminalLog$: Observable<LogLine[]>;
  gameState$: Observable<GameState>;
  isScreensaverActive$: Observable<boolean>;

  private fileUploadSub!: Subscription;
  private logSub!: Subscription;
  private needsFocus: boolean = false;

  constructor(    
    private dataLoader: DataLoaderService,
    public gameStateSvc: GameStateService,
    private commandSvc: CommandService,
    private inactivitySvc: InactivityService,
    public flowSvc: GameFlowService, // Público para ser usado no template
    public characterSvc: CharacterService, // Público para ser usado no template
    private cdr: ChangeDetectorRef
  ) {
    this.terminalLog$ = this.gameStateSvc.terminalLog$;
    this.gameState$ = this.gameStateSvc.gameState$;
    this.isScreensaverActive$ = this.inactivitySvc.isScreensaverActive$;
  }

  ngOnInit() {
    this.dataLoader.loadGameData().subscribe(gameData => {
      this.gameStateSvc.gameData = gameData;
      this.flowSvc.initialize();
    });

    this.fileUploadSub = this.gameStateSvc.fileUploadTrigger$.subscribe(() => {
      this.fileInput?.nativeElement.click();
    });

    this.logSub = this.terminalLog$.subscribe(() => {
      setTimeout(() => this.scrollToBottom(), 0);
    });
  }

  ngOnDestroy() {
    this.fileUploadSub?.unsubscribe();
    this.logSub?.unsubscribe();
    this.inactivitySvc.stopTimer();
  }
  
  ngAfterViewChecked() {
    if (this.needsFocus) {
      this.focusInput();
      this.needsFocus = false;
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (this.gameStateSvc.gameState.current_view === 'title') {
      this.flowSvc.advanceFromTitle();
      this.needsFocus = true;
      this.cdr.detectChanges();
      return;
    }
    if (event.key !== 'Enter') {
      this.onUserActivity();
    }
  }

  onOpeningComplete() {
    this.flowSvc.beginGameplay();
    this.needsFocus = true;
  }

  onUserActivity() {
    const config = this.gameStateSvc.gameData?.config?.screensaver;
    if (config) {
      this.inactivitySvc.resetInactivityTimer(config);
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.terminalOutput?.nativeElement) {
        this.terminalOutput.nativeElement.scrollTop = this.terminalOutput.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  focusInput() {
    setTimeout(() => this.commandInput?.nativeElement?.focus(), 0);
  }

  handleCommand() {
    const commandToProcess = this.command.trim();
    if (!commandToProcess) return;

    this.command = '';
    this.commandHistory.push(commandToProcess);
    this.historyIndex = this.commandHistory.length;

    const currentGameState = this.gameStateSvc.gameState;
    if (currentGameState.nome_jogador_global === 'PENDING') {
      this.characterSvc.setPlayerName(commandToProcess);
    } else {
      this.commandSvc.processCommand(commandToProcess);
    }
  }

  navigateHistory(direction: 'up' | 'down') {
    if (direction === 'up' && this.historyIndex > 0) {
      this.historyIndex--;
    } else if (direction === 'down' && this.historyIndex <= this.commandHistory.length) {
      this.historyIndex++;
    }
    this.command = this.commandHistory[this.historyIndex] || '';
  }

  getPlayerDisplayName(): string {
    const state = this.gameStateSvc.gameState;
    if (!state) return '';
    const prefix = state.crucifixo_ativo ? '[+] ' : '';
    return `${prefix}${state.nome_jogador_global}`;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.gameStateSvc.loadGameFromFile(input.files[0]);
    }
    input.value = '';
  }
}