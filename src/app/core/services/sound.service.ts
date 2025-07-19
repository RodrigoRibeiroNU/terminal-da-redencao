import { Injectable } from '@angular/core';

export type SoundEffect = 'sucesso' | 'corrupcao' | 'luz';
export type MusicTrack = 'abertura' | 'hino' | 'urgente';

interface AudioConfig {
  geral_habilitado: boolean;
  musica_habilitada: boolean;
  sfx_habilitado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private audioCtx: AudioContext | null = null;
  private isMusicPlaying = false;
  private proximoTimeoutNota: any = null;

  private config: AudioConfig = {
    geral_habilitado: true,
    musica_habilitada: true,
    sfx_habilitado: true
  };

  constructor() { }
  
  public getConfig(): AudioConfig {
    return this.config;
  }
  
  public init(initialConfig: AudioConfig): void {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.config = initialConfig;
      console.log("AudioContext iniciado com a configuração:", this.config);
    }
  }

  public updateConfig(newConfig: AudioConfig): void {
    this.config = newConfig;
    if (!this.config.geral_habilitado || !this.config.musica_habilitada) {
      this.stopMusic();
    }
  }

  private tocarSom(frequencia = 440, duracao = 0.2, tipoOnda: OscillatorType = 'square', volume = 1): void {
    if (!this.audioCtx || !this.config.geral_habilitado) return;
    
    const oscilador = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    oscilador.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    oscilador.type = tipoOnda;
    oscilador.frequency.setValueAtTime(frequencia, this.audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + duracao);
    
    oscilador.start(this.audioCtx.currentTime);
    oscilador.stop(this.audioCtx.currentTime + duracao);
  }

  public playSfx(effect: SoundEffect): void {
    if (!this.audioCtx || !this.config.sfx_habilitado || !this.config.geral_habilitado) return;

    switch (effect) {
      case 'sucesso':
        this.tocarEfeitoSucesso();
        break;
      case 'corrupcao':
        this.tocarEfeitoCorrupcao();
        break;
      case 'luz':
        this.tocarEfeitoLuz();
        break;
    }
  }
  
  public playMusic(track: MusicTrack): void {
    if (!this.audioCtx || !this.config.musica_habilitada || !this.config.geral_habilitado) return;
    
    this.stopMusic(); // Para qualquer música que esteja a tocar antes de iniciar a nova

    this.isMusicPlaying = true;
    switch (track) {
      case 'abertura':
        this.tocarMusicaAbertura();
        break;
      case 'hino':
        this.tocarHinoAmanhecer();
        break;
      case 'urgente':
        this.tocarMusicaUrgente();
        break;
    }
  }

  public stopMusic(): void {
    this.isMusicPlaying = false;
    if (this.proximoTimeoutNota) {
      clearTimeout(this.proximoTimeoutNota);
      this.proximoTimeoutNota = null;
    }
  }
  
  private tocarMusicaUrgente(): void {
    const BPM = 150;
    const duracaoOitavo = (60 / BPM) / 2;
    const duracaoNota = duracaoOitavo * 0.9;
    const volumeMusica = 0.4;
    const tipoOnda: OscillatorType = 'triangle';
    const sequencia = [
        { nota: 65.41, duracao: 1 }, { nota: 65.41, duracao: 1 }, { nota: 98.00, duracao: 2 },
        { nota: 65.41, duracao: 1 }, { nota: 65.41, duracao: 1 }, { nota: 103.83, duracao: 2 },
        { nota: 65.41, duracao: 1 }, { nota: 65.41, duracao: 1 }, { nota: 98.00, duracao: 2 },
        { nota: 77.78, duracao: 1 }, { nota: 73.42, duracao: 1 }, { nota: 65.41, duracao: 2 },
    ];
    let indiceAtual = 0;
    const tocarProximaNota = () => {
        if (!this.isMusicPlaying) return;
        if (indiceAtual >= sequencia.length) indiceAtual = 0;
        const notaAtual = sequencia[indiceAtual];
        this.tocarSom(notaAtual.nota, duracaoNota * notaAtual.duracao, tipoOnda, volumeMusica);
        this.proximoTimeoutNota = setTimeout(tocarProximaNota, duracaoOitavo * notaAtual.duracao * 1000);
        indiceAtual++;
    };
    tocarProximaNota();
  }

  private tocarHinoAmanhecer(): void {
    const dn = 0.25, v = 0.5, t = 300;
    setTimeout(() => this.tocarSom(261.63, dn, 'triangle', v), t * 0);
    setTimeout(() => this.tocarSom(329.63, dn, 'triangle', v), t * 1);
    setTimeout(() => this.tocarSom(392.00, dn, 'triangle', v), t * 2);
    setTimeout(() => this.tocarSom(523.25, dn * 2, 'triangle', v), t * 3);
  }

  private tocarEfeitoSucesso(): void {
    this.tocarSom(880, 0.1, 'sine', 0.7);
    setTimeout(() => this.tocarSom(1046.50, 0.15, 'sine', 0.7), 120);
  }

  private tocarEfeitoCorrupcao(): void {
    this.tocarSom(220, 0.3, 'sawtooth', 0.8);
    setTimeout(() => this.tocarSom(207.65, 0.3, 'sawtooth', 0.8), 50);
  }

  private tocarEfeitoLuz(): void {
    const dn = 0.08, v = 0.6, t = 90;
    setTimeout(() => this.tocarSom(523.25, dn, 'triangle', v), t * 0);
    setTimeout(() => this.tocarSom(659.25, dn, 'triangle', v), t * 1);
    setTimeout(() => this.tocarSom(783.99, dn, 'triangle', v), t * 2);
  }
  
  private tocarMusicaAbertura(): void {
    for (let i = 0; i < 25; i++) {
        setTimeout(() => {
            const freq = 50 + (i * 20);
            this.tocarSom(freq, 0.1, 'sawtooth', 0.1 + (i * 0.01));
        }, i * 100);
    }
    setTimeout(() => this.tocarSom(32.70, 17, 'sine', 0.6), 2500);
    setTimeout(() => {
        const baixo = [{ n: 65.41, d: 2 }, { n: 98.00, d: 2 }, { n: 103.83, d: 4 }];
        for (let i = 0; i < 9; i++) {
            const delayBase = i * 1600;
            setTimeout(() => this.tocarSom(baixo[0].n, 0.36, 'triangle', 0.5), delayBase);
            setTimeout(() => this.tocarSom(baixo[1].n, 0.36, 'triangle', 0.5), delayBase + 400);
            setTimeout(() => this.tocarSom(baixo[2].n, 0.72, 'triangle', 0.5), delayBase + 800);
        }
    }, 4500);
    setTimeout(() => this.tocarSom(155.56, 10, 'sine', 0.3), 9500);
    setTimeout(() => {
        for (let i = 0; i < 10; i++) {
             setTimeout(() => this.tocarSom(261.63, 0.1, 'square', 0.2), i * 400);
        }
    }, 14500);
    setTimeout(() => {
        this.tocarSom(130.81, 2.5, 'triangle', 0.7);
        this.tocarSom(155.56, 2.5, 'triangle', 0.7);
        this.tocarSom(196.00, 2.5, 'triangle', 0.7);
    }, 19500);
  }
}