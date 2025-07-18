import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { GameState, NpcData, LogLine, GameView } from '../models/game.interfaces';
import packageInfo from '../../../../package.json';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  private readonly initialGameState: GameState = {
    current_view: 'loading',
    fase_atual: 1,
    heroi_fe_percent: 70,
    pistas: [],
    personagens_atuais: {},
    all_characters_in_game_pool: {},
    game_over: false,
    dialogo_atual: null,
    nome_jogador_global: "",
    heroi_inventory: [],
    objetivo_fase_concluido: false,
    fase_final_iniciada: false,
    pending_action: null,
    oracao_usada_na_fase_atual: false,
    crucifixo_ativo: false,
    rosario_ativo: false,
    recent_log: [],
  };

  private readonly _gameState = new BehaviorSubject<GameState>(this.getInitialGameState());
  readonly gameState$ = this._gameState.asObservable();

  private readonly _terminalLog = new BehaviorSubject<LogLine[]>([]);
  readonly terminalLog$ = this._terminalLog.asObservable();

  private readonly _fileUploadTrigger = new Subject<void>();
  readonly fileUploadTrigger$ = this._fileUploadTrigger.asObservable();

  public gameData: any = {};

  constructor() { }

  public getInitialGameState(): GameState {
    return JSON.parse(JSON.stringify(this.initialGameState));
  }

  get gameState(): GameState {
    return this._gameState.getValue();
  }

  setGameState(newState: Partial<GameState>) {
    const currentState = this.gameState;
    const nextState = { ...currentState, ...newState };

    if (nextState.fase_atual > currentState.fase_atual) {
      nextState.oracao_usada_na_fase_atual = false;
      this.addLog('[SISTEMA]: Você sente a sua Oração revigorada para esta nova fase.', 'log-positivo');
    }

    this._gameState.next(nextState);
  }

  public addLog(text: string, className: string = '') {
    const currentLog = this._terminalLog.getValue();
    this._terminalLog.next([...currentLog, { text, className }]);
  }

  public clearLog() {
    this._terminalLog.next([]);
  }

  public triggerFileUpload() {
    this._fileUploadTrigger.next();
  }
  
  public addLogBlock(lines: LogLine[]) {
    const currentLog = this._terminalLog.getValue();
    this._terminalLog.next([...currentLog, ...lines]);
  }

  public loadGameFromFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const loadedState: GameState = JSON.parse(text);
          loadedState.current_view = 'gameplay'; 
          
          this.clearLog();

          if (loadedState.recent_log && loadedState.recent_log.length > 0) {
            this.addLogBlock(loadedState.recent_log);
            this.addLog("--------------------------------------------------", "log-sistema");
          }
          
          delete loadedState.recent_log;
          this.setGameState(loadedState);

          this.addLog("Jogo carregado com sucesso a partir do ficheiro!", 'log-positivo');
        }
      } catch (error) {
        this.addLog("Erro: O ficheiro de salvamento parece estar corrompido ou tem um formato inválido.", 'log-negativo');
      }
    };
    reader.readAsText(file);
  }

  public exportSaveToFile() {
    const HISTORICO_A_SALVAR = 10;
    const logCompleto = this._terminalLog.getValue();
    const logRecente = logCompleto.slice(-HISTORICO_A_SALVAR);

    const estadoParaSalvar = { ...this.gameState, recent_log: logRecente };

    const dataStr = JSON.stringify(estadoParaSalvar, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = window.URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `redencao_save_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    this.addLog("Ficheiro de salvamento gerado. Verifique os seus downloads.", 'log-positivo');
  }

  private autosaveToLocalStorage() {
    localStorage.setItem('redencao_autosave', JSON.stringify(this.gameState));
  }
}