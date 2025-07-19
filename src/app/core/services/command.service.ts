import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { GameFlowService } from './game-flow.service';
import { CharacterService } from './character.service';
import { ItemService } from './item.service';
import { InactivityService } from './inactivity.service';
import { SoundService } from './sound.service';

@Injectable({
  providedIn: 'root'
})
export class CommandService {
  private audioInitialized = false; 

  constructor(
    private stateSvc: GameStateService,
    private flowSvc: GameFlowService,
    private characterSvc: CharacterService,
    private itemSvc: ItemService,
    private inactivitySvc: InactivityService,
    private soundSvc: SoundService
  ) { }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  private initializeAudio() {
    if (!this.audioInitialized) {
      // Passa a configuração inicial para o serviço de som
      this.soundSvc.init(this.stateSvc.gameData.config.audio);
      this.audioInitialized = true;
    }
  }

  public processCommand(command: string) {
    this.initializeAudio();

    const gameState = this.stateSvc.gameState;
    if (gameState.game_over) return;

    // Ação pendente tem prioridade (ex: usar item em um alvo)
    if (gameState.pending_action) {
      if (gameState.pending_action.item === 'escritura') {
        // Para o alvo, mantemos o nome original digitado
        this.itemSvc.usarEscrituraNoAlvo(command);
      }
      return;
    }

    // Comando oculto para teste do protetor de tela
    if (command.trim().toLowerCase() === 'screensaver.exe') {
      this.inactivitySvc.forceScreensaver();
      return;
    }
    
    this.stateSvc.addLog(`> ${command}`, 'log-heroi');

    // Normaliza o comando completo antes de dividir
    const normalizedCommand = this.normalizeString(command);
    const parts = normalizedCommand.split(' ');
    const acao = parts[0];
    const argumento = parts.slice(1).join(' ');

    // Impede outros comandos durante um diálogo
    if (gameState.dialogo_atual && acao !== 'responder') {
      this.stateSvc.addLog("Use 'responder [num]' para continuar a conversa.", 'log-sistema');
      return;
    }

    const comandos: { [key: string]: Function } = {
      "novo": () => this.flowSvc.startOpeningSequence(),
      "ajuda": () => this.stateSvc.addLog("Comandos: falar, usar, online, pistas, inventario, salvar, carregar, config, sair", 'log-positivo'),
      "online": () => this.listarPersonagensOnline(),
      "pistas": () => this.listarPistas(),
      "inventario": () => this.listarInventario(),
      "falar": () => this.characterSvc.iniciarDialogo(argumento),
      "responder": () => this.characterSvc.processarRespostaDialogo(command),
      "salvar": () => this.stateSvc.exportSaveToFile(),
      "carregar": () => this.stateSvc.triggerFileUpload(),
      "config": () => this.flowSvc.abrirConfiguracoes(),
      "usar": () => this.itemSvc.usarItem(argumento),
      "sair": () => this.flowSvc.resetGame()
    };

    if (comandos[acao]) {
      comandos[acao]();
    } else {
      this.stateSvc.addLog(`Comando não reconhecido: ${acao}`, 'log-negativo');
      this.soundSvc.playSfx('corrupcao');
    }

    // A ação do agente só ocorre fora de diálogos e ações pendentes
    if (!this.stateSvc.gameState.dialogo_atual && !this.stateSvc.gameState.pending_action) {
        this.characterSvc.agentAction();
    }
  }

  private listarPersonagensOnline(): void {
    const gameState = this.stateSvc.gameState;
    this.stateSvc.addLog("Personagens online:", 'log-sistema');
    Object.entries(gameState.personagens_atuais).forEach(([name, data]) => {
      const feStr = `(Fé: ${data.fe.toFixed(0)}%)`;
      this.stateSvc.addLog(`- ${name.toUpperCase()} ${feStr}`, this.characterSvc.getNpcColor(data));
    });
  }

  private listarPistas(): void {
    const gameState = this.stateSvc.gameState;
    this.stateSvc.addLog("Pistas coletadas:", 'log-sistema');
    if (gameState.pistas.length === 0) {
        this.stateSvc.addLog("Nenhuma.", 'log-sistema');
        return;
    }
    gameState.pistas.forEach(pista => this.stateSvc.addLog(`- ${pista}`, 'log-positivo'));
  }

  private listarInventario(): void {
    const gameState = this.stateSvc.gameState;
    const gameData = this.stateSvc.gameData;
    this.stateSvc.addLog("Inventário:", 'log-sistema');
    
    const itensDoInventario = Object.keys(gameState.heroi_inventory);

    if (itensDoInventario.every(key => gameState.heroi_inventory[key] === 0)) {
        this.stateSvc.addLog("Vazio.", 'log-sistema');
        return;
    }

    itensDoInventario.forEach(itemKey => {
        const item = gameData.itens[itemKey];
        const quantidade = gameState.heroi_inventory[itemKey];
        if (item && quantidade > 0) {
            this.stateSvc.addLog(`- ${item.nome} (x${quantidade}): ${item.descricao}`, 'log-positivo');
        }
    });
  }
}