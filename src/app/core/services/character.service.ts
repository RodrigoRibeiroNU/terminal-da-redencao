import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { GameFlowService } from './game-flow.service';
import { NpcData, LogLine } from '../models/game.interfaces';

@Injectable({
  providedIn: 'root'
})
export class CharacterService {

  constructor(
    private stateSvc: GameStateService,
    private flowSvc: GameFlowService
  ) { }

  public iniciarDialogo(npcName: string) {
    const gameState = this.stateSvc.gameState;
    const npcKey = npcName.toLowerCase();
    const npcData = gameState.personagens_atuais[npcKey];

    if (!npcData) {
      this.stateSvc.addLog("[SISTEMA]: Personagem não encontrado.", 'log-negativo');
      return;
    }

    if (npcData.tipo === 'neutro') {
      this.iniciarDialogoNeutro(npcKey, npcData);
    } else {
      this.iniciarDialogoFixo(npcKey, npcData);
    }
  }

  private iniciarDialogoNeutro(npcName: string, npcData: NpcData) {
    const dialogo = npcData.dialogos;
    const fraseInicialAleatoria = dialogo.frases_iniciais[Math.floor(Math.random() * dialogo.frases_iniciais.length)];
    this.stateSvc.addLog(`[${npcName.toUpperCase()}]: ${fraseInicialAleatoria}`, this.getNpcColor(npcData));

    const fraseEscolhida = dialogo.frases_heroi[Math.floor(Math.random() * dialogo.frases_heroi.length)];
    this.stateSvc.addLog(`> ${fraseEscolhida.texto}`, 'log-heroi');

    this.processarInteracaoFe(npcData, npcName, fraseEscolhida.efeito_fe_npc);

    const respostaAgradecimento = dialogo.respostas_agradecimento[Math.floor(Math.random() * dialogo.respostas_agradecimento.length)];
    this.stateSvc.addLog(`[${npcName.toUpperCase()}]: ${respostaAgradecimento}`, this.getNpcColor(npcData));
    
    this.agentAction();
  }

  private iniciarDialogoFixo(npcName: string, npcData: NpcData) {
    const gameState = this.stateSvc.gameState;
    let dialogoKey = 'inicial';

    if (npcName === 'gabriel') {
      const faseAtual = gameState.fase_atual;
      const phaseKey = `fase_${faseAtual}`;
      const phaseData = this.stateSvc.gameData.fases_jogo[phaseKey];
      if (!phaseData) return;

      if (faseAtual < 6) {
        dialogoKey = gameState.objetivo_fase_concluido ? `fase_${faseAtual}_fim` : `fase_${faseAtual}_inicio`;
      } else {
        dialogoKey = this.flowSvc.getAverageFaith() > 80 ? 'fase_final_pronto' : 'fase_final_espera';
      }
    }
    
    if (npcData.tipo === 'sabio') {
        if (this.flowSvc.getAverageFaith() <= 80) {
            this.stateSvc.addLog("[SISTEMA]: O Sábio Bento está imerso em meditação...", 'log-negativo');
            return;
        }
        this.stateSvc.setGameState({ fase_final_iniciada: true });
    }

    this.setDialogoAtual(npcName, npcData.dialogos[dialogoKey]);
  }

  private setDialogoAtual(npcName: string, dialogo: any) {
    const npcData = this.stateSvc.gameState.personagens_atuais[npcName];
    if (!dialogo || !dialogo.texto) {
      this.stateSvc.addLog(`[SISTEMA]: ${npcName.toUpperCase()} não tem mais nada a dizer.`, 'log-sistema');
      this.stateSvc.setGameState({ dialogo_atual: null });
      return;
    }

    this.stateSvc.addLog(`[${npcName.toUpperCase()}]: ${dialogo.texto}`, this.getNpcColor(npcData));

    if (dialogo.opcoes && dialogo.opcoes.length === 1) {
      setTimeout(() => {
        this.processarOpcaoUnica(npcName, npcData, dialogo.opcoes[0]);
      }, 750);
    } else if (dialogo.opcoes && dialogo.opcoes.length > 1) {
      this.stateSvc.setGameState({ dialogo_atual: { npc: npcName, opcoes: dialogo.opcoes } });
      dialogo.opcoes.forEach((opt: any, i: number) => {
        if (opt.requer_pista && !this.stateSvc.gameState.pistas.includes(opt.requer_pista)) {
          this.stateSvc.addLog(`  ${i + 1}. [Pista Necessária]`, 'log-sistema');
        } else {
          this.stateSvc.addLog(`  ${i + 1}. ${opt.texto}`, 'log-heroi');
        }
      });
    } else {
      this.stateSvc.setGameState({ dialogo_atual: null });
    }
  }

  private processarOpcaoUnica(npcName: string, npcData: NpcData, opcao: any) {
    this.stateSvc.addLog(`> ${opcao.texto}`, 'log-heroi');
    
    this.processarInteracaoFe(npcData, npcName, 0, opcao.efeito_fe_heroi);

    if (opcao.adicionar_item && !this.stateSvc.gameState.heroi_inventory.includes(opcao.adicionar_item)) {
      const novoInventario = [...this.stateSvc.gameState.heroi_inventory, opcao.adicionar_item];
      this.stateSvc.setGameState({ heroi_inventory: novoInventario });
      const nomeItem = this.stateSvc.gameData.itens[opcao.adicionar_item].nome;
      this.stateSvc.addLog(`[SISTEMA]: Você recebeu '${nomeItem}'!`, 'log-positivo');
    }

    if (opcao.adicionar_pista && !this.stateSvc.gameState.pistas.includes(opcao.adicionar_pista)) {
        this.addPista(opcao.adicionar_pista);
    }
    
    if (npcName === 'gabriel' && this.stateSvc.gameState.objetivo_fase_concluido) {
      this.flowSvc.ativarLiderDaFase();
    }
    
    if (npcData.tipo === 'lider' && opcao.adicionar_pista) {
        this.stateSvc.setGameState({ 
            fase_atual: this.stateSvc.gameState.fase_atual + 1,
            objetivo_fase_concluido: false 
        });
        this.flowSvc.ativarPersonagensPorFase();
    }
    
    if (opcao.proximo_dialogo && npcData.dialogos[opcao.proximo_dialogo]) {
        const proximoDialogo = npcData.dialogos[opcao.proximo_dialogo];
        this.setDialogoAtual(npcName, proximoDialogo);
        if (proximoDialogo.vitoria) {
            this.flowSvc.endGame(true);
        }
    } else {
        this.stateSvc.setGameState({ dialogo_atual: null });
        this.agentAction();
    }
  }

  public processarRespostaDialogo(command: string) {
    const gameState = this.stateSvc.gameState;
    if (!gameState.dialogo_atual) return;

    const { npc: npcName, opcoes } = gameState.dialogo_atual;
    const numResposta = parseInt(command.split(' ')[1], 10) - 1;

    if (isNaN(numResposta) || numResposta < 0 || numResposta >= opcoes.length) {
      this.stateSvc.addLog("[SISTEMA]: Resposta inválida.", 'log-negativo');
      return;
    }
    
    const opcao = opcoes[numResposta];
    this.processarOpcaoUnica(npcName, gameState.personagens_atuais[npcName], opcao);
  }

  public setPlayerName(name: string) {
    const gameData = this.stateSvc.gameData;
    if (!gameData || !gameData.personagens_base) return;

    const saudacao = gameData.personagens_base.gabriel.dialogos.saudacao.replace('{jogador_nome}', name.toUpperCase());
    
    const allChars: { [key: string]: NpcData } = {};
    Object.keys(gameData.personagens_base).forEach(nome => {
        allChars[nome] = JSON.parse(JSON.stringify(gameData.personagens_base[nome]));
    });

    this.stateSvc.setGameState({
      nome_jogador_global: name.toUpperCase(),
      all_characters_in_game_pool: allChars,
    });
    
    this.stateSvc.addLog(`> ${name.toUpperCase()}`, 'log-heroi');
    
    setTimeout(() => {
      this.flowSvc.ativarPersonagensPorFase();
      if (gameData.orientacao_inicial_frases) {
        gameData.orientacao_inicial_frases.forEach((frase: string) => this.stateSvc.addLog(frase, 'log-sistema'));
      }
      this.stateSvc.addLog(`[GABRIEL]: ${saudacao}`, this.getNpcColor(gameData.personagens_base.gabriel));
    }, 0);
  }
  
  public processarInteracaoFe(npcState: NpcData, npcName: string, efeitoDialogo: number = 0, efeitoFeHeroi: number = 0): boolean {
    if (npcState.tipo === 'guia' || npcState.tipo === 'agente' || npcState.tipo === 'lider' || npcState.tipo === 'sabio') {
        if (efeitoFeHeroi) {
            const novaFeHeroi = Math.min(100, this.stateSvc.gameState.heroi_fe_percent + efeitoFeHeroi);
            this.stateSvc.setGameState({ heroi_fe_percent: novaFeHeroi });
            this.stateSvc.addLog(`[FÉ]: Sua conversa com ${npcName.toUpperCase()} fortaleceu sua fé para ${novaFeHeroi.toFixed(0)}%.`, 'log-positivo');
        }
        return false;
    }

    const feNpcAntes = npcState.fe;
    npcState.fe += efeitoDialogo;
    const diferenca = this.stateSvc.gameState.heroi_fe_percent - npcState.fe;
    const mudanca = diferenca / 2;
    
    const novaFeHeroi = Math.max(0, Math.min(100, this.stateSvc.gameState.heroi_fe_percent - mudanca));
    npcState.fe = Math.max(0, Math.min(100, npcState.fe + mudanca));

    this.stateSvc.setGameState({ heroi_fe_percent: novaFeHeroi, personagens_atuais: this.stateSvc.gameState.personagens_atuais });
    
    this.stateSvc.addLog(`[FÉ]: A sua Fé: ${this.stateSvc.gameState.heroi_fe_percent.toFixed(0)}% | Fé de ${npcName.toUpperCase()}: ${npcState.fe.toFixed(0)}%`, 'log-sistema');
    
    this.flowSvc.checkPhaseCompletion();
    return npcState.fe > feNpcAntes;
  }

  public agentAction() {
    const gameState = this.stateSvc.gameState;
    if (gameState.game_over || gameState.fase_final_iniciada || gameState.rosario_ativo) return;

    const agentesAtivos = Object.keys(gameState.personagens_atuais).filter(n => gameState.personagens_atuais[n].tipo === 'agente');
    const neutrosAtivos = Object.keys(gameState.personagens_atuais).filter(n => gameState.personagens_atuais[n].tipo === 'neutro');
    const config = this.stateSvc.gameData.config?.agentes;
    if (!config || !config.enabled) return;

    let chanceDeAtaque = config.chance_ataque_por_turno;
    if (gameState.crucifixo_ativo) {
        chanceDeAtaque *= 0.90;
    }

    if (agentesAtivos.length > 0 && neutrosAtivos.length > 0 && Math.random() < chanceDeAtaque) {
      const agente = agentesAtivos[Math.floor(Math.random() * agentesAtivos.length)];
      const alvo = neutrosAtivos[Math.floor(Math.random() * neutrosAtivos.length)];
      const npcState = gameState.personagens_atuais[alvo];
      this.stateSvc.addLog(`[${agente.toUpperCase()}]: A dúvida é uma variável... e a sua está a aumentar, ${alvo.toUpperCase()}.`, 'log-agente');
      const novaFe = npcState.fe / 2;
      npcState.fe = novaFe;
      this.stateSvc.addLog(`[SISTEMA]: A fé de ${alvo.toUpperCase()} diminuiu para ${novaFe.toFixed(0)}%.`, 'log-negativo');
      this.stateSvc.setGameState({ personagens_atuais: gameState.personagens_atuais });
    }
  }

  public getNpcColor(npcData: NpcData): string {
    if (npcData.tipo === "agente") return 'log-agente';
    if (npcData.tipo === "guia" || npcData.tipo === 'sabio') return 'log-guia';
    if (npcData.tipo === "lider") return 'log-positivo';
    const fe = npcData.fe || 50;
    if (fe <= 20) return 'npc-low-faith';
    if (fe <= 80) return 'npc-mid-faith';
    return 'npc-high-faith';
  }

  public addPista(pista: string) {
    const gameState = this.stateSvc.gameState;
    const novasPistas = [...gameState.pistas, pista];
    this.stateSvc.setGameState({ pistas: novasPistas });
    this.stateSvc.addLog(`[SISTEMA]: Nova pista adquirida: '${pista}'`, 'log-positivo');
    this.flowSvc.checkPhaseCompletion();
  }
}