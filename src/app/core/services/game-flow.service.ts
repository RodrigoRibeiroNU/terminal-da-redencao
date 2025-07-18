import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { LogLine, NpcData } from '../models/game.interfaces'; // Importe LogLine
import packageInfo from '../../../../package.json';
import { CharacterService } from './character.service';

@Injectable({
    providedIn: 'root'
})
export class GameFlowService {
    constructor(private stateSvc: GameStateService) { }

    public initialize() {
        this.stateSvc.setGameState({ current_view: 'title' });
    }

    public advanceFromTitle() {
        this.stateSvc.setGameState({ current_view: 'menu' });
        this.showMainMenuText();
    }

    public startOpeningSequence() {
        this.stateSvc.setGameState({ ...this.stateSvc.getInitialGameState(), current_view: 'opening' });
    }

    public beginGameplay() {
        this.stateSvc.setGameState({
            current_view: 'gameplay',
            nome_jogador_global: 'PENDING'
        });
        this.stateSvc.clearLog();
        this.stateSvc.addLog("Iniciando novo jogo...", 'log-sistema');
    }

    public resetGame() {
        const initialState = this.stateSvc.getInitialGameState();
        
        this.stateSvc.setGameState({ ...initialState, current_view: 'menu' });
        
        this.showMainMenuText();
    }

    private showMainMenuText() {
        this.stateSvc.clearLog();
        this.stateSvc.addLog(`Terminal da Redenção v${packageInfo.version}`, 'log-sistema');
        this.stateSvc.addLog("\nDigite 'novo' para iniciar, 'carregar' para enviar um arquivo.", 'log-sistema');
    }
    public getCurrentObjectiveText(): string {
        const gameState = this.stateSvc.gameState;
        const gameData = this.stateSvc.gameData;
        if (!gameData?.fases_jogo || !gameState || gameState.game_over) return "";

        const phaseKey = `fase_${gameState.fase_atual}`;
        const phaseData = gameData.fases_jogo[phaseKey];
        if (!phaseData) return "Redenção alcançada.";

        let objetivoIndex;
        if (gameState.fase_atual < 6) {
            objetivoIndex = gameState.objetivo_fase_concluido
                ? phaseData.objetivo_lider_indice
                : phaseData.objetivo_conversao_indice;
        } else {
            const avgFaith = this.getAverageFaith(); // Agora chama o método local
            objetivoIndex = avgFaith > 80
                ? phaseData.objetivo_final_indice
                : phaseData.objetivo_espera_indice;
        }

        return gameData.objetivos[objetivoIndex] || "Redenção alcançada.";
    }

    public getCurrentPromptText(): string {
        const state = this.stateSvc.gameState;
        if (!state) return '>';
        if (state.pending_action?.item === 'escritura') {
            return 'Alvo:';
        }
        if (state.nome_jogador_global === 'PENDING') {
            return 'Nome:';
        }
        return '>';
    }

    public endGame(isVictory: boolean, customMessage?: string) {
        if (this.stateSvc.gameState.game_over) return;
        this.stateSvc.addLog("--------------------------------------------------", "log-sistema");
        if (isVictory) {
        this.stateSvc.addLog(this.stateSvc.gameData.finais.vitoria, 'log-positivo');
        } else {
        this.stateSvc.addLog(customMessage || this.stateSvc.gameData.finais.fe_baixa, 'log-negativo');
        }
        this.stateSvc.setGameState({ game_over: true, dialogo_atual: null, current_view: 'ending' });
        localStorage.removeItem('redencao_autosave');
    }

    public getAverageFaith(): number {
        const gameState = this.stateSvc.gameState;
        const personagens = Object.values(gameState.personagens_atuais);
        if (personagens.length === 0) return gameState.heroi_fe_percent;

        const totalFaith = personagens.reduce((sum, p) => sum + p.fe, gameState.heroi_fe_percent);
        return totalFaith / (personagens.length + 1);
    }

    public checkPhaseCompletion() {
        const gameState = this.stateSvc.gameState;
        if (gameState.game_over || gameState.objetivo_fase_concluido) return;

        const faseAtual = gameState.fase_atual;
        const phaseKey = `fase_${faseAtual}`;
        const phaseData = this.stateSvc.gameData.fases_jogo[phaseKey];
        if (!phaseData || !phaseData.conversao_necessaria) return;

        const convertidos = Object.values(gameState.personagens_atuais)
            .filter(p => p.tipo === 'neutro' && p.fe >= 80).length;

        if (convertidos >= phaseData.conversao_necessaria) {
            this.stateSvc.setGameState({ objetivo_fase_concluido: true });
            this.stateSvc.addLog(`[SISTEMA] Objetivo de conversão concluído! Fale com Gabriel para o próximo passo.`, 'log-positivo');
        }
    }

    public ativarPersonagensPorFase() {
        const gameState = this.stateSvc.gameState;
        const phaseKey = `fase_${gameState.fase_atual}`;
        const phaseData = this.stateSvc.gameData.fases_jogo[phaseKey];
        if (!phaseData) return;

        const personagensAtuais = { ...gameState.personagens_atuais };
        phaseData.initial_active_npcs.forEach((npcName: string) => {
            if (!personagensAtuais[npcName]) {
                const baseNpcData = gameState.all_characters_in_game_pool[npcName];
                if (baseNpcData) {
                    personagensAtuais[npcName] = JSON.parse(JSON.stringify(baseNpcData));
                    this.stateSvc.addLog(`${npcName.toUpperCase()} apareceu online.`, 'log-sistema');
                }
            }
        });
        this.stateSvc.setGameState({ personagens_atuais: personagensAtuais });
    }

    public ativarLiderDaFase() {
        const gameState = this.stateSvc.gameState;
        if (gameState.game_over) return;
        const phaseKey = `fase_${gameState.fase_atual}`;
        const phaseData = this.stateSvc.gameData.fases_jogo[phaseKey];
        if (phaseData && phaseData.lider) {
            const liderName = phaseData.lider;
            const personagensAtuais = { ...gameState.personagens_atuais };
            if (!personagensAtuais[liderName]) {
                const baseNpcData = gameState.all_characters_in_game_pool[liderName];
                if (baseNpcData) {
                    personagensAtuais[liderName] = JSON.parse(JSON.stringify(baseNpcData));
                    this.stateSvc.setGameState({ personagens_atuais: personagensAtuais });
                    this.stateSvc.addLog(`[SISTEMA]: ${liderName.toUpperCase()} agora está online e acessível.`, 'log-positivo');
                }
            }
        }
    }
}