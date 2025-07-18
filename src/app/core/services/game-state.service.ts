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
    heroi_inventory: {},
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

          // Restaura o histórico, se existir
          if (loadedState.recent_log && loadedState.recent_log.length > 0) {
            this.addLogBlock(loadedState.recent_log);
            this.addLog("--------------------------------------------------", "log-sistema");
          }
          
          // Apaga o histórico do objeto para não ficar na memória
          delete loadedState.recent_log;
          
// Guarda uma cópia dos personagens com a fé correta do ficheiro salvo
          const personagensSalvos = { ...loadedState.personagens_atuais };

          // Define o estado base, mas ainda sem os personagens
          this.setGameState({ ...loadedState, personagens_atuais: {} });

          // Prepara a nova lista de personagens que estarão ativos
          const personagensRecarregados: { [key: string]: NpcData } = {};

          // Itera por todas as fases até à fase atual do jogador
          for (let i = 1; i <= loadedState.fase_atual; i++) {
              const phaseKey = `fase_${i}`;
              const phaseData = this.gameData.fases_jogo[phaseKey];

              if (phaseData) {
                  // Função auxiliar para adicionar/atualizar um personagem
                  const adicionarOuAtualizarPersonagem = (npcName: string) => {
                    if (!npcName) return;
                    // Se o personagem já estava no ficheiro salvo, usa esses dados (com a fé correta)
                    if (personagensSalvos[npcName]) {
                        personagensRecarregados[npcName] = personagensSalvos[npcName];
                    } 
                    // Se não, carrega-o do estado base (primeira vez que aparece)
                    else if (loadedState.all_characters_in_game_pool[npcName]) {
                        personagensRecarregados[npcName] = JSON.parse(JSON.stringify(loadedState.all_characters_in_game_pool[npcName]));
                    }
                  };

                  // Adiciona os NPCs iniciais da fase
                  phaseData.initial_active_npcs.forEach(adicionarOuAtualizarPersonagem);

                  // Se o objetivo da fase foi concluído, ativa também o líder
                  if (i < loadedState.fase_atual || (i === loadedState.fase_atual && loadedState.objetivo_fase_concluido)) {
                      adicionarOuAtualizarPersonagem(phaseData.lider);
                  }
              }
          }
          
          // Atualiza o estado final com a lista de personagens completa e com a fé correta
          this.setGameState({ personagens_atuais: personagensRecarregados });
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