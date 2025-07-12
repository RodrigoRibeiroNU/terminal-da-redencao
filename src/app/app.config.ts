// src/app/app.config.ts

import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

// Importe os seus serviços
import { GameStateService } from './core/services/game-state.service';
import { CommandService } from './core/services/command.service';
import { InactivityService } from './core/services/inactivity.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    importProvidersFrom(FormsModule),
    // Registe todos os serviços aqui para que sejam partilhados
    GameStateService,
    CommandService,
    InactivityService
  ]
};