// src/app/core/models/game.interfaces.ts

export interface NpcData {
  tipo: 'guia' | 'agente' | 'neutro' | 'lider' | 'sabio';
  fe: number;
  dialogos: any;
}

// REMOVIDA: A interface Buff não será mais usada para estes itens.
// export interface Buff { ... }

export interface PendingAction {
  item: string;
  step: 'awaiting_target';
}

export interface GameState {
  fase_atual: number;
  heroi_fe_percent: number;
  pistas: string[];
  personagens_atuais: { [key: string]: NpcData };
  all_characters_in_game_pool: { [key: string]: NpcData };
  game_over: boolean;
  dialogo_atual: { npc: string, opcoes: any[] } | null;
  nome_jogador_global: string;
  heroi_inventory: string[];
  objetivo_fase_concluido: boolean;
  fase_final_iniciada: boolean;
  opening_complete: boolean;
  pending_action: PendingAction | null;
  oracao_usada_na_fase_atual: boolean;
  crucifixo_ativo: boolean;
  rosario_ativo: boolean;
}

export interface LogLine {
  text: string;
  className: string;
}