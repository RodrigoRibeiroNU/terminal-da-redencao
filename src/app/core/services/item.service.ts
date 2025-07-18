import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { CharacterService } from './character.service';
import { GameFlowService } from './game-flow.service';

@Injectable({
  providedIn: 'root'
})
export class ItemService {

  constructor(
    private stateSvc: GameStateService,
    private flowSvc: GameFlowService
    ) { }

  public usarItem(itemName: string) {
    if (!itemName) {
      this.stateSvc.addLog("Especifique um item para usar. Ex: usar oracao", 'log-negativo');
      return;
    }

    const gameState = this.stateSvc.gameState;
    const itemKey = Object.keys(this.stateSvc.gameData.itens).find(key => 
      this.stateSvc.gameData.itens[key].nome.toLowerCase() === itemName.toLowerCase()
    );

    if (!itemKey || !gameState.heroi_inventory.includes(itemKey)) {
      this.stateSvc.addLog(`Você não possui o item '${itemName}'.`, 'log-negativo');
      return;
    }

    switch (itemKey) {
      case 'oracao':
        this.usarOracao();
        break;
      case 'escritura':
        this.prepararUsoEscritura();
        break;
      case 'crucifixo':
        this.usarCrucifixo();
        break;
      case 'rosario':
        this.usarRosario();
        break;
    }
  }

  private usarOracao() {
    if (this.stateSvc.gameState.oracao_usada_na_fase_atual) {
      this.stateSvc.addLog('A sua Oração já foi usada nesta fase. Ela se revigorará na próxima.', 'log-negativo');
      return;
    }
    const novaFe = Math.min(100, this.stateSvc.gameState.heroi_fe_percent + 5);
    this.stateSvc.setGameState({ heroi_fe_percent: novaFe, oracao_usada_na_fase_atual: true });
    this.stateSvc.addLog(`Você profere a Oração e sente sua fé aumentar para ${novaFe.toFixed(0)}%.`, 'log-positivo');
  }

  private prepararUsoEscritura() {
    this.stateSvc.setGameState({ pending_action: { item: 'escritura', step: 'awaiting_target' } });
    this.stateSvc.addLog('Em quem você deseja usar a Escritura Sagrada? (digite o nome)', 'log-sistema');
  }

  public usarEscrituraNoAlvo(targetName: string) {
    const alvo = targetName.toLowerCase();
    const personagens = this.stateSvc.gameState.personagens_atuais;
    
    if (personagens[alvo] && personagens[alvo].tipo === 'neutro') {
      personagens[alvo].fe = 100;
      this.stateSvc.setGameState({ personagens_atuais: personagens, pending_action: null });
      
      const inventory = [...this.stateSvc.gameState.heroi_inventory];
      const itemIndex = inventory.indexOf('escritura');
      if (itemIndex > -1) inventory.splice(itemIndex, 1);
      this.stateSvc.setGameState({ heroi_inventory: inventory });

      this.stateSvc.addLog(`Você lê a Escritura para ${alvo.toUpperCase()}. A fé dele(a) é restaurada para 100%!`, 'log-positivo');
      this.flowSvc.checkPhaseCompletion();
    } else {
      this.stateSvc.addLog(`Alvo inválido. Você só pode usar a Escritura em personagens neutros. A ação foi cancelada.`, 'log-negativo');
      this.stateSvc.setGameState({ pending_action: null });
    }
  }

  private usarCrucifixo() {
    const novoEstado = !this.stateSvc.gameState.crucifixo_ativo;
    this.stateSvc.setGameState({ crucifixo_ativo: novoEstado });
    const msg = novoEstado ? 'Você agora segura o Crucifixo. Sua presença intimida as sombras.' : 'Você guardou o Crucifixo.';
    this.stateSvc.addLog(`[ITEM]: ${msg}`, 'log-positivo');
  }

  private usarRosario() {
    const novoEstado = !this.stateSvc.gameState.rosario_ativo;
    this.stateSvc.setGameState({ rosario_ativo: novoEstado });
    const msg = novoEstado ? 'Você segura o Rosário. Uma aura de proteção divina o envolve, repelindo todos os ataques dos Agentes.' : 'Você guardou o Rosário.';
    this.stateSvc.addLog(`[ITEM]: ${msg}`, 'log-positivo');
  }
}