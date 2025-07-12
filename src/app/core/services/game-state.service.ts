// src/app/core/services/game-state.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { GameState, NpcData, LogLine } from '../models/game.interfaces';
import packageInfo from '../../../../package.json';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
private readonly initialGameState: GameState = {
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
    opening_complete: false,
    pending_action: null,
    oracao_usada_na_fase_atual: false,
    crucifixo_ativo: false,
    rosario_ativo: false
  };
  
  private readonly _gameState = new BehaviorSubject<GameState>(this.getInitialGameState());
  // ... (o resto do arquivo permanece igual)
  readonly gameState$ = this._gameState.asObservable();

  private readonly _terminalLog = new BehaviorSubject<LogLine[]>([]);
  readonly terminalLog$ = this._terminalLog.asObservable();

  private fileUploadRequest = new Subject<void>();
  readonly fileUploadRequest$ = this.fileUploadRequest.asObservable();

  gameData: any = {};
  
  constructor() { }

  get gameState(): GameState {
    return this._gameState.getValue();
  }

  setGameState(newState: Partial<GameState>) {
    const currentState = this.gameState;
    const nextState = { ...currentState, ...newState };

    // *** NOVO: RESETA O USO DA ORAÇÃO AO MUDAR DE FASE ***
    if (nextState.fase_atual > currentState.fase_atual) {
      nextState.oracao_usada_na_fase_atual = false;
      this.addLog('[SISTEMA]: Você sente a sua Oração revigorada para esta nova fase.', 'log-positivo');
    }

    // *** NOVO: VERIFICAÇÃO DE DERROTA POR FÉ BAIXA ***
    if (nextState.heroi_fe_percent <= 0 && !currentState.game_over) {
      this.endGame(false); // Chama a função de fim de jogo com derrota
      return; // Interrompe a execução para não salvar o estado de "game over"
    }
    
    this._gameState.next(nextState);
    if (!nextState.game_over) {
      this.autosaveToLocalStorage();
    }
  }

  addLog(text: string, className: string = '') {
    const currentLog = this._terminalLog.getValue();
    this._terminalLog.next([...currentLog, { text, className }]);
  }
  
  clearLog() {
    this._terminalLog.next([]);
  }

  showInitialScreen() {
    this.clearLog();
    this.addLog(`Terminal da Redenção v${packageInfo.version}`, 'log-sistema');
    this.addLog("Digite 'novo' para iniciar, 'carregar' para enviar um ficheiro, ou 'continuar' para usar o último autosave.", 'log-sistema');
  }

  startNewGame() {
    this.setGameState({ 
      ...this.getInitialGameState(), 
      opening_complete: true, 
      nome_jogador_global: 'PENDING' 
    });
    this.clearLog();
    this.addLog("Iniciando novo jogo...", 'log-sistema');
  }
  
  setPlayerName(name: string) {
    const saudacao = this.gameData.personagens_base.gabriel.dialogos.saudacao.replace('{jogador_nome}', name.toUpperCase());
    
    const allChars: { [key: string]: NpcData } = {};
    Object.keys(this.gameData.personagens_base).forEach(nome => {
        allChars[nome] = JSON.parse(JSON.stringify(this.gameData.personagens_base[nome]));
    });

    this.setGameState({ 
        nome_jogador_global: name.toUpperCase(),
        all_characters_in_game_pool: allChars
    });
    this.addLog(`> ${name.toUpperCase()}`, 'log-heroi');
    this.ativarPersonagensPorFase();
    this.gameData.orientacao_inicial_frases.forEach((frase: string) => this.addLog(frase, 'log-sistema'));
    this.addLog(`[GABRIEL]: ${saudacao}`, this.getNpcColor(this.gameData.personagens_base.gabriel));
  }

  ativarPersonagensPorFase() {
    const phaseKey = `fase_${this.gameState.fase_atual}`;
    const phaseData = this.gameData.fases_jogo[phaseKey];
    if (!phaseData) return;
    
    const personagensAtuais = {...this.gameState.personagens_atuais};

    phaseData.initial_active_npcs.forEach((npcName: string) => {
        if (!personagensAtuais[npcName]) {
            const baseNpcData = this.gameState.all_characters_in_game_pool[npcName];
            if (baseNpcData) {
                personagensAtuais[npcName] = JSON.parse(JSON.stringify(baseNpcData));
                this.addLog(`${npcName.toUpperCase()} apareceu online.`, 'log-sistema');
            }
        }
    });
    this.setGameState({ personagens_atuais: personagensAtuais });
  }

  // *** NOVO MÉTODO PARA ATIVAR O LÍDER DA FASE ***
  public ativarLiderDaFase() {
    const gameState = this.gameState;
    if (gameState.game_over) return;

    const phaseKey = `fase_${gameState.fase_atual}`;
    const phaseData = this.gameData.fases_jogo[phaseKey];
    
    if (phaseData && phaseData.lider) {
      const liderName = phaseData.lider;
      const personagensAtuais = {...gameState.personagens_atuais};
      
      // Ativa o líder apenas se ele ainda não estiver online
      if (!personagensAtuais[liderName]) {
        const baseNpcData = gameState.all_characters_in_game_pool[liderName];
        if (baseNpcData) {
          personagensAtuais[liderName] = JSON.parse(JSON.stringify(baseNpcData));
          this.setGameState({ personagens_atuais: personagensAtuais });
          this.addLog(`[SISTEMA]: ${liderName.toUpperCase()} agora está online e acessível.`, 'log-positivo');
        }
      }
    }
  }

  getNpcColor(npcData: NpcData): string {
    if (npcData.tipo === "agente") return 'log-agente';
    if (npcData.tipo === "guia" || npcData.tipo === 'sabio') return 'log-guia'; // Sábio com cor de guia
    if (npcData.tipo === "lider") return 'log-positivo'; // Líderes com cor de destaque
    const fe = npcData.fe || 50;
    if (fe <= 20) return 'npc-low-faith';
    if (fe <= 80) return 'npc-mid-faith';
    return 'npc-high-faith';
  }

  processarInteracaoFe(npcState: NpcData, npcName: string, efeitoDialogo: number = 0, efeitoFeHeroi: number = 0): boolean {
    // LIDERES E GUIAS NÃO MUDAM DE FÉ, MAS PODEM AUMENTAR A DO HERÓI
    if (npcState.tipo === 'guia' || npcState.tipo === 'agente' || npcState.tipo === 'lider' || npcState.tipo === 'sabio') {
        if (efeitoFeHeroi) {
            const novaFeHeroi = Math.min(100, this.gameState.heroi_fe_percent + efeitoFeHeroi);
            this.setGameState({ heroi_fe_percent: novaFeHeroi });
            this.addLog(`[FÉ]: Sua conversa com ${npcName.toUpperCase()} fortaleceu sua fé para ${novaFeHeroi.toFixed(0)}%.`, 'log-positivo');
        }
        return false;
    }

    const feNpcAntes = npcState.fe;
    npcState.fe += efeitoDialogo;
    const diferenca = this.gameState.heroi_fe_percent - npcState.fe;
    const mudanca = diferenca / 2;
    
    const novaFeHeroi = Math.max(0, Math.min(100, this.gameState.heroi_fe_percent - mudanca));
    npcState.fe = Math.max(0, Math.min(100, npcState.fe + mudanca));

    this.setGameState({ heroi_fe_percent: novaFeHeroi });

    this.addLog(`[FÉ]: A sua Fé: ${this.gameState.heroi_fe_percent.toFixed(0)}% | Fé de ${npcName.toUpperCase()}: ${npcState.fe.toFixed(0)}%`, 'log-sistema');
    
    // VERIFICA SE O OBJETIVO DE CONVERSÃO FOI ATINGIDO
    this.checkPhaseCompletion();

    return npcState.fe > feNpcAntes;
}
  
  recompensarJogador() {
    if (Math.random() < 0.25) {
        const itemKey = Object.keys(this.gameData.itens)[Math.floor(Math.random() * Object.keys(this.gameData.itens).length)];
        const heroiInventory = [...this.gameState.heroi_inventory, itemKey];
        this.setGameState({ heroi_inventory: heroiInventory });
        const itemNome = this.gameData.itens[itemKey].nome;
        this.addLog(`[SISTEMA]: A sua interação positiva gerou um '${itemNome}'!`, 'log-positivo');
    }
  }
  
  addPista(pista: string) {
    const novasPistas = [...this.gameState.pistas, pista];
    this.setGameState({ pistas: novasPistas });
    this.addLog(`[SISTEMA]: Nova pista adquirida: '${pista}'`, 'log-positivo');
    this.checkPhaseCompletion();
  }

  checkPhaseCompletion() {
    const gameState = this.gameState;
    if (gameState.game_over || gameState.objetivo_fase_concluido) return;

    const faseAtual = gameState.fase_atual;
    const phaseKey = `fase_${faseAtual}`;
    const phaseData = this.gameData.fases_jogo[phaseKey];
    if (!phaseData) return;

    // Lógica para as fases 1-5 (conversão)
    if (phaseData.conversao_necessaria) {
        const convertidos = Object.values(gameState.personagens_atuais)
            .filter(p => p.tipo === 'neutro' && p.fe >= 80).length;

        if (convertidos >= phaseData.conversao_necessaria) {
            this.setGameState({ objetivo_fase_concluido: true });
            this.addLog(`[SISTEMA] Objetivo de conversão concluído! Fale com Gabriel para o próximo passo.`, 'log-positivo');
        }
    }
  }

  agentAction() {
    if (this.gameState.game_over || this.gameState.fase_final_iniciada) return;
    
    // NOVO: Rosário concede imunidade total
    if (this.gameState.rosario_ativo) {
        return; 
    }

    const agentesAtivos = Object.keys(this.gameState.personagens_atuais).filter(n => this.gameState.personagens_atuais[n].tipo === 'agente');
    const neutrosAtivos = Object.keys(this.gameState.personagens_atuais).filter(n => this.gameState.personagens_atuais[n].tipo === 'neutro');

    const config = this.gameData.config?.agentes;
    if (!config || !config.enabled) return;

    let chanceDeAtaque = config.chance_ataque_por_turno;
    // NOVO: Crucifixo reduz a chance de ataque
    if (this.gameState.crucifixo_ativo) {
        chanceDeAtaque *= 0.90; // Reduz a chance em 10%
    }

    if (agentesAtivos.length > 0 && neutrosAtivos.length > 0 && Math.random() < config.chance_ataque_por_turno) {
      const agente = agentesAtivos[Math.floor(Math.random() * agentesAtivos.length)];
      const alvo = neutrosAtivos[Math.floor(Math.random() * neutrosAtivos.length)];
      const npcState = this.gameState.personagens_atuais[alvo];

      this.addLog(`[${agente.toUpperCase()}]: A dúvida é uma variável... e a sua está a aumentar, ${alvo.toUpperCase()}.`, 'log-agente');
      
      const novaFe = npcState.fe / 2;
      npcState.fe = novaFe;

      this.addLog(`[SISTEMA]: A fé de ${alvo.toUpperCase()} diminuiu para ${novaFe.toFixed(0)}%.`, 'log-negativo');

      this.setGameState({ personagens_atuais: this.gameState.personagens_atuais });
    }
  }
  
  public completeOpening() {
    this.setGameState({ opening_complete: true });
    //this.showInitialScreen(); // A responsabilidade de mostrar a tela do terminal agora é deste método
  }
  
  endGame(isVictory: boolean, customMessage?: string) {
    if (this.gameState.game_over) return; // Evita múltiplas chamadas

    this.addLog("--------------------------------------------------", "log-sistema");
    if (isVictory) {
      this.addLog(this.gameData.finais.vitoria, 'log-positivo');
    } else {
      this.addLog(customMessage || this.gameData.finais.fe_baixa, 'log-negativo');
    }
    this.addLog("Obrigado por jogar. Digite 'novo' para recomeçar.", 'log-sistema');
    
    this.setGameState({ game_over: true });
    localStorage.removeItem('redencao_autosave'); // Limpa o autosave
  }
  
  private autosaveToLocalStorage() {
    localStorage.setItem('redencao_autosave', JSON.stringify(this.gameState));
  }

  loadFromAutosave() {
    const saved = localStorage.getItem('redencao_autosave');
    if (saved) {
      this.setGameState(JSON.parse(saved));
      this.clearLog();
      this.addLog("Jogo continuado a partir do último ponto salvo.", 'log-positivo');
    } else {
      this.addLog("Nenhum jogo salvo encontrado para continuar. Comece um 'novo' jogo.", 'log-negativo');
    }
  }

  exportSaveToFile() {
    const dataStr = JSON.stringify(this.gameState, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = window.URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `redencao_save_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    this.addLog("Ficheiro de salvamento gerado. Verifique os seus downloads.", 'log-positivo');
  }

  requestFileUpload() {
    this.fileUploadRequest.next();
  }

  loadGameFromFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const loadedState = JSON.parse(text);
          if (loadedState.hasOwnProperty('heroi_fe_percent')) {
            this.setGameState(loadedState);
            this.clearLog();
            this.addLog("Jogo carregado com sucesso a partir do ficheiro!", 'log-positivo');
          } else {
            throw new Error("Formato de ficheiro inválido.");
          }
        }
      } catch (error) {
        this.addLog("Erro: O ficheiro de salvamento parece estar corrompido ou tem um formato inválido.", 'log-negativo');
      }
    };
    reader.readAsText(file);
  }

  private getInitialGameState(): GameState {
    return JSON.parse(JSON.stringify(this.initialGameState));
  }

  getAverageFaith(): number {
    const personagens = Object.values(this.gameState.personagens_atuais);
    if (personagens.length === 0) return this.gameState.heroi_fe_percent;
    
    const totalFaith = personagens.reduce((sum, p) => sum + p.fe, this.gameState.heroi_fe_percent);
    return totalFaith / (personagens.length + 1);
  }
}