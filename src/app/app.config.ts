import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { GameStateService } from './core/services/game-state.service';
import { CommandService } from './core/services/command.service';
import { InactivityService } from './core/services/inactivity.service';
import { GameFlowService } from './core/services/game-flow.service';
import { CharacterService } from './core/services/character.service';
import { ItemService } from './core/services/item.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    importProvidersFrom(FormsModule),
    GameStateService,
    CommandService,
    InactivityService,
    GameFlowService,
    CharacterService,
    ItemService
  ]
};