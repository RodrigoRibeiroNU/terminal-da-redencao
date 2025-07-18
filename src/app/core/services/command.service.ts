import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { GameFlowService } from './game-flow.service';
import { CharacterService } from './character.service';
import { ItemService } from './item.service';
import { InactivityService } from './inactivity.service';

@Injectable({
  providedIn: 'root'
})
export class CommandService {
  constructor(
    private stateSvc: GameStateService,
    private flowSvc: GameFlowService,
    private characterSvc: CharacterService,
    private itemSvc: ItemService,
    private inactivitySvc: InactivityService // A inatividade ainda pode ser relevante aqui
  ) { }

  public processCommand(command: string) {
    const gameState = this.stateSvc.gameState;
    if (gameState.game_over) return;

    // Ação pendente tem prioridade (ex: usar item em um alvo)
    if (gameState.pending_action) {
      if (gameState.pending_action.item === 'escritura') {
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

    const parts = command.split(' ');
    const acao = parts[0].toLowerCase();
    const argumento = parts.slice(1).join(' ');

    // Impede outros comandos durante um diálogo
    if (gameState.dialogo_atual && acao !== 'responder') {
      this.stateSvc.addLog("Use 'responder [num]' para continuar a conversa.", 'log-sistema');
      return;
    }

    const comandos: { [key: string]: Function } = {
      "novo": () => this.flowSvc.startOpeningSequence(),
      "ajuda": () => this.stateSvc.addLog("Comandos: falar, usar, online, pistas, inventario, salvar, carregar, continuar, sair", 'log-positivo'),
      "online": () => this.listarPersonagensOnline(),
      "pistas": () => this.listarPistas(),
      "inventario": () => this.listarInventario(),
      "falar": () => this.characterSvc.iniciarDialogo(argumento),
      "responder": () => this.characterSvc.processarRespostaDialogo(command),
      "salvar": () => this.stateSvc.exportSaveToFile(),
      "carregar": () => this.stateSvc.triggerFileUpload(),
      "continuar": () => this.flowSvc.loadFromAutosave(),
      "usar": () => this.itemSvc.usarItem(argumento),
      "sair": () => this.flowSvc.resetGame()
    };

    if (comandos[acao]) {
      comandos[acao]();
    } else {
      this.stateSvc.addLog(`Comando não reconhecido: ${acao}`, 'log-negativo');
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
    if (gameState.heroi_inventory.length === 0) {
        this.stateSvc.addLog("Vazio.", 'log-sistema');
        return;
    }
    gameState.heroi_inventory.forEach(itemKey => {
        const item = gameData.itens[itemKey];
        if(item) {
            this.stateSvc.addLog(`- ${item.nome}: ${item.descricao}`, 'log-positivo');
        }
    });
  }
}