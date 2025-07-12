// src/app/core/services/command.service.ts

import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { InactivityService } from './inactivity.service';

@Injectable({
  providedIn: 'root'
})
export class CommandService {

  constructor(
    private gameStateSvc: GameStateService,
    private inactivitySvc: InactivityService
  ) { }

  processCommand(command: string) {
    const gameState = this.gameStateSvc.gameState;
    if (gameState.game_over) return;

    // *** NOVO: LÓGICA PARA AÇÕES PENDENTES (USAR ESCRITURA) ***
    if (gameState.pending_action) {
      if (gameState.pending_action.item === 'escritura') {
        this.usarEscrituraNoAlvo(command);
      }
      return;
    }

    if (command === 'screensaver.exe') {
      this.inactivitySvc.forceScreensaver();
      return;
    }

    this.gameStateSvc.addLog(`> ${command}`, 'log-heroi');

    const parts = command.split(' ');
    const acao = parts[0].toLowerCase(); 
    const argumento = parts.slice(1).join(' ');

    if (gameState.dialogo_atual && acao !== 'responder') {
      this.gameStateSvc.addLog("Use 'responder [num]' para continuar a conversa.", 'log-sistema');
      return;
    }

    const comandos: { [key: string]: Function } = {
      "novo": () => this.gameStateSvc.startNewGame(),
      "ajuda": () => this.gameStateSvc.addLog("Comandos: falar, usar, online, pistas, inventario, salvar, carregar, continuar, novo, sair", 'log-positivo'),
      "online": () => this.listarPersonagensOnline(),
      "pistas": () => this.listarPistas(),
      "inventario": () => this.listarInventario(),
      "falar": () => this.iniciarDialogo(argumento),
      "responder": () => this.processarRespostaDialogo(command),
      "salvar": () => this.gameStateSvc.exportSaveToFile(),
      "carregar": () => this.gameStateSvc.requestFileUpload(),
      "continuar": () => this.gameStateSvc.loadFromAutosave(),
      "usar": () => this.usarItem(argumento),
      "sair": () => this.gameStateSvc.showInitialScreen()
    };

    if (comandos[acao]) {
      comandos[acao]();
    } else {
      this.gameStateSvc.addLog(`Comando não reconhecido: ${acao}`, 'log-negativo');
    }

    // *** ALTERADO: Garante que a ação do agente e buffs aconteçam no momento certo ***
    if (!this.gameStateSvc.gameState.dialogo_atual) {
      this.gameStateSvc.agentAction();
    }
  }

  // *** ALTERADO: LÓGICA DE 'USAR' TOTALMENTE REFEITA ***
  private usarItem(itemName: string) {
    if (!itemName) {
      this.gameStateSvc.addLog("Especifique um item para usar. Ex: usar oracao", 'log-negativo');
      return;
    }

    const gameState = this.gameStateSvc.gameState;
    const itemKey = Object.keys(this.gameStateSvc.gameData.itens).find(key => 
      this.gameStateSvc.gameData.itens[key].nome.toLowerCase() === itemName.toLowerCase()
    );

    if (!itemKey || !gameState.heroi_inventory.includes(itemKey)) {
      this.gameStateSvc.addLog(`Você não possui o item '${itemName}'.`, 'log-negativo');
      return;
    }

    // Lógica específica para cada item
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
    if (this.gameStateSvc.gameState.oracao_usada_na_fase_atual) {
      this.gameStateSvc.addLog('A sua Oração já foi usada nesta fase. Ela se revigorará na próxima.', 'log-negativo');
      return;
    }
    const novaFe = Math.min(100, this.gameStateSvc.gameState.heroi_fe_percent + 5);
    this.gameStateSvc.setGameState({ heroi_fe_percent: novaFe, oracao_usada_na_fase_atual: true });
    this.gameStateSvc.addLog(`Você profere a Oração e sente sua fé aumentar para ${novaFe.toFixed(0)}%.`, 'log-positivo');
  }

  private prepararUsoEscritura() {
    this.gameStateSvc.setGameState({ pending_action: { item: 'escritura', step: 'awaiting_target' } });
    this.gameStateSvc.addLog('Em quem você deseja usar a Escritura Sagrada? (digite o nome)', 'log-sistema');
  }

  private usarEscrituraNoAlvo(targetName: string) {
    const alvo = targetName.toLowerCase();
    const personagens = this.gameStateSvc.gameState.personagens_atuais;
    
    if (personagens[alvo] && personagens[alvo].tipo === 'neutro') {
      personagens[alvo].fe = 100;
      this.gameStateSvc.setGameState({ personagens_atuais: personagens, pending_action: null });
      
      const inventory = [...this.gameStateSvc.gameState.heroi_inventory];
      const itemIndex = inventory.indexOf('escritura');
      if (itemIndex > -1) inventory.splice(itemIndex, 1);
      this.gameStateSvc.setGameState({ heroi_inventory: inventory });

      this.gameStateSvc.addLog(`Você lê a Escritura para ${alvo.toUpperCase()}. A fé dele(a) é restaurada para 100%!`, 'log-positivo');
      this.gameStateSvc.checkPhaseCompletion(); // Verifica se o objetivo foi cumprido
    } else {
      this.gameStateSvc.addLog(`Alvo inválido. Você só pode usar a Escritura em personagens neutros. A ação foi cancelada.`, 'log-negativo');
      this.gameStateSvc.setGameState({ pending_action: null });
    }
  }

  private usarCrucifixo() {
    const novoEstado = !this.gameStateSvc.gameState.crucifixo_ativo;
    this.gameStateSvc.setGameState({ crucifixo_ativo: novoEstado });
    const msg = novoEstado ? 'Você agora segura o Crucifixo. Sua presença intimida as sombras.' : 'Você guardou o Crucifixo.';
    this.gameStateSvc.addLog(`[ITEM]: ${msg}`, 'log-positivo');
  }

  private usarRosario() {
    const novoEstado = !this.gameStateSvc.gameState.rosario_ativo;
    this.gameStateSvc.setGameState({ rosario_ativo: novoEstado });
    const msg = novoEstado ? 'Você segura o Rosário. Uma aura de proteção divina o envolve, repelindo todos os ataques dos Agentes.' : 'Você guardou o Rosário.';
    this.gameStateSvc.addLog(`[ITEM]: ${msg}`, 'log-positivo');
  }

  private listarPersonagensOnline() {
    const gameState = this.gameStateSvc.gameState;
    this.gameStateSvc.addLog("Personagens online:", 'log-sistema');
    Object.entries(gameState.personagens_atuais).forEach(([name, data]) => {
      const feStr = `(Fé: ${data.fe.toFixed(0)}%)`;
      this.gameStateSvc.addLog(`- ${name.toUpperCase()} ${feStr}`, this.gameStateSvc.getNpcColor(data));
    });
  }

  private listarPistas() {
    const gameState = this.gameStateSvc.gameState;
    this.gameStateSvc.addLog("Pistas coletadas:", 'log-sistema');
    if (gameState.pistas.length === 0) {
      this.gameStateSvc.addLog("Nenhuma.", 'log-sistema');
      return;
    }
    gameState.pistas.forEach(pista => this.gameStateSvc.addLog(`- ${pista}`, 'log-positivo'));
  }

  private listarInventario() {
    const gameState = this.gameStateSvc.gameState;
    const gameData = this.gameStateSvc.gameData;
    this.gameStateSvc.addLog("Inventário:", 'log-sistema');
    if (gameState.heroi_inventory.length === 0) {
      this.gameStateSvc.addLog("Vazio.", 'log-sistema');
      return;
    }
    gameState.heroi_inventory.forEach(itemKey => {
      const item = gameData.itens[itemKey];
      if (item) {
        this.gameStateSvc.addLog(`- ${item.nome}: ${item.descricao}`, 'log-positivo');
      }
    });
  }

  private iniciarDialogo(npcName: string) {
    const gameState = this.gameStateSvc.gameState;
    const npcData = gameState.personagens_atuais[npcName];

    if (!npcData) {
      this.gameStateSvc.addLog("[SISTEMA]: Personagem não encontrado.", 'log-negativo');
      return;
    }

    let dialogoKey = 'inicial';

    // LÓGICA DE DIÁLOGO PARA GABRIEL
    if (npcName === 'gabriel') {
      const faseAtual = gameState.fase_atual;
      const phaseKey = `fase_${faseAtual}`;
      const phaseData = this.gameStateSvc.gameData.fases_jogo[phaseKey];

      if (faseAtual < 6) { // Fases 1 a 5
        dialogoKey = gameState.objetivo_fase_concluido ? `fase_${faseAtual}_fim` : `fase_${faseAtual}_inicio`;
      } else { // Fase Final
        const avgFaith = this.gameStateSvc.getAverageFaith();
        dialogoKey = avgFaith > 80 ? 'fase_final_pronto' : 'fase_final_espera';
      }
    }

    // *** CORREÇÃO APLICADA AQUI ***
    if (npcData.tipo === 'sabio') {
        const avgFaith = this.gameStateSvc.getAverageFaith();
        if (avgFaith <= 80) {
            this.gameStateSvc.addLog("[SISTEMA]: O Sábio Bento está imerso em meditação. A fé do sistema precisa estar em harmonia para que ele o receba.", 'log-negativo');
            return;
        }
        // Aciona a flag para parar os agentes
        this.gameStateSvc.setGameState({ fase_final_iniciada: true });
    }

    this.setDialogoAtual(npcName, dialogoKey);
  }

  private setDialogoAtual(npcName: string, dialogoKey: string) {
    const gameState = this.gameStateSvc.gameState;
    const npcData = gameState.personagens_atuais[npcName];
    const dialogo = npcData.dialogos[dialogoKey];
    this.gameStateSvc.addLog(`[${npcName.toUpperCase()}]: ${dialogo.texto}`, this.gameStateSvc.getNpcColor(npcData));

    if (dialogo.opcoes && dialogo.opcoes.length > 0) {
      this.gameStateSvc.setGameState({ dialogo_atual: { npc: npcName, opcoes: dialogo.opcoes } });
      dialogo.opcoes.forEach((opt: any, i: number) => {
        if (opt.requer_pista && !gameState.pistas.includes(opt.requer_pista)) {
          this.gameStateSvc.addLog(`  ${i + 1}. [Pista Necessária]`, 'log-sistema');
        } else {
          this.gameStateSvc.addLog(`  ${i + 1}. ${opt.texto}`, 'log-heroi');
        }
      });
    } else {
      this.gameStateSvc.setGameState({ dialogo_atual: null });
    }
  }

  private processarRespostaDialogo(command: string) {
    const gameState = this.gameStateSvc.gameState;
    if (!gameState.dialogo_atual) return;

    const { npc: npcName, opcoes } = gameState.dialogo_atual;
    const numResposta = parseInt(command.split(' ')[1], 10) - 1;

    if (isNaN(numResposta) || numResposta < 0 || numResposta >= opcoes.length) {
      this.gameStateSvc.addLog("[SISTEMA]: Resposta inválida.", 'log-negativo');
      return;
    }
    const opcao = opcoes[numResposta];
    
    if (opcao.requer_pista && !gameState.pistas.includes(opcao.requer_pista)) {
        this.gameStateSvc.addLog("[SISTEMA]: Você não tem a pista necessária.", 'log-negativo');
        return;
    }

    this.gameStateSvc.addLog(`> ${opcao.texto}`, 'log-heroi');

    const npcState = gameState.personagens_atuais[npcName];

    if (opcao.efeito_fe_heroi) {
        this.gameStateSvc.processarInteracaoFe(npcState, npcName, 0, opcao.efeito_fe_heroi);
    } else {
        this.gameStateSvc.processarInteracaoFe(npcState, npcName, opcao.efeito_fe_npc);
    }

    if (opcao.adicionar_item && !gameState.heroi_inventory.includes(opcao.adicionar_item)) {
      const novoInventario = [...gameState.heroi_inventory, opcao.adicionar_item];
      this.gameStateSvc.setGameState({ heroi_inventory: novoInventario });
      const nomeItem = this.gameStateSvc.gameData.itens[opcao.adicionar_item].nome;
      this.gameStateSvc.addLog(`[SISTEMA]: Você recebeu '${nomeItem}'!`, 'log-positivo');
    }

    if (opcao.adicionar_pista && !gameState.pistas.includes(opcao.adicionar_pista)) {
        this.gameStateSvc.addPista(opcao.adicionar_pista);
    }
    
    // *** CORREÇÃO PRINCIPAL APLICADA AQUI ***
    // Se acabámos de falar com Gabriel e o objetivo de conversão está concluído,
    // então ativamos o líder da fase.
    if (npcName === 'gabriel' && gameState.objetivo_fase_concluido) {
      this.gameStateSvc.ativarLiderDaFase();
    }
    
    if (npcState.tipo === 'lider' && opcao.adicionar_pista) {
        this.gameStateSvc.setGameState({ 
            fase_atual: gameState.fase_atual + 1,
            objetivo_fase_concluido: false 
        });
        this.gameStateSvc.ativarPersonagensPorFase();
    }
    
    if (opcao.proximo_dialogo && npcState.dialogos[opcao.proximo_dialogo]) {
        const proximoDialogoKey = opcao.proximo_dialogo;
        const proximoDialogo = npcState.dialogos[proximoDialogoKey];

        this.setDialogoAtual(npcName, proximoDialogoKey);

        if (proximoDialogo.vitoria) {
            this.gameStateSvc.endGame(true);
            return;
        }
    } else {
        this.gameStateSvc.setGameState({ dialogo_atual: null });
        if (npcState.tipo !== 'lider' && npcName !== 'gabriel') {
            // A antiga lógica de buffs foi removida, se precisar, podemos readicionar.
            this.gameStateSvc.agentAction();
        }
    }
  }
}