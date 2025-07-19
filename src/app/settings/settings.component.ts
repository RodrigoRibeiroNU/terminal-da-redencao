import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameStateService } from '../core/services/game-state.service';
import { GameFlowService } from '../core/services/game-flow.service';
import { SoundService } from '../core/services/sound.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
    // Modelos para os checkboxes
    geralHabilitado: boolean;
    musicaHabilitada: boolean;
    sfxHabilitado: boolean;
    configAnterior: { musica_habilitada: boolean };

    constructor(
        private stateSvc: GameStateService,
        private flowSvc: GameFlowService,
        private soundSvc: SoundService
    ) {
        // Inicializa os checkboxes com os valores da configuração
        const audioConfig = this.soundSvc.getConfig();
        this.geralHabilitado = audioConfig.geral_habilitado;
        this.musicaHabilitada = audioConfig.musica_habilitada;
        this.sfxHabilitado = audioConfig.sfx_habilitado;

        this.configAnterior = { musica_habilitada: this.musicaHabilitada };
    }

    /**
     * Atualiza as configurações de áudio no serviço de som.
     */
    salvarConfiguracoes() {
        const novaConfig = {
            geral_habilitado: this.geralHabilitado,
            musica_habilitada: this.musicaHabilitada,
            sfx_habilitado: this.sfxHabilitado
        };

        this.soundSvc.updateConfig(novaConfig);
        
        // Se a música estava desabilitada e agora está habilitada (e o jogo está a decorrer), reinicia-a.
        if (novaConfig.musica_habilitada && !this.configAnterior.musica_habilitada) {
        if (this.stateSvc.gameState.current_view === 'gameplay' || this.stateSvc.gameState.previous_view === 'gameplay') {
            this.flowSvc.startGameplayMusic();
        }
        }

        this.flowSvc.voltarParaMenu();
    }

    /**
     * Volta para o menu principal sem guardar as alterações.
     */
    voltar() {
        this.flowSvc.voltarParaMenu();
    }
}