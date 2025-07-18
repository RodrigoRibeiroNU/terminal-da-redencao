// *** ALTERAÇÃO AQUI ***
export type GameView = 'loading' | 'title' | 'opening' | 'menu' | 'gameplay' | 'ending';

export interface NpcData {
  tipo: 'guia' | 'agente' | 'neutro' | 'lider' | 'sabio';
  fe: number;
  dialogos: any;
}

export interface PendingAction {
  item: string;
  step: 'awaiting_target';
}

export interface GameState {
  current_view: GameView;
  fase_atual: number;
  heroi_fe_percent: number;
  pistas: string[];
  personagens_atuais: { [key: string]: NpcData };
  all_characters_in_game_pool: { [key: string]: NpcData };
  game_over: boolean;
  dialogo_atual: { npc: string, opcoes: any[] } | null;
  nome_jogador_global: string;
  heroi_inventory: { [key: string]: number };
  objetivo_fase_concluido: boolean;
  fase_final_iniciada: boolean;
  pending_action: PendingAction | null;
  oracao_usada_na_fase_atual: boolean;
  crucifixo_ativo: boolean;
  rosario_ativo: boolean;
  recent_log?: LogLine[]; 
}

export interface LogLine {
  text: string;
  className: string;
}