import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

// Importe todos os seus componentes aqui
import { AppComponent } from './app.component';
import { TitleScreenComponent } from './title-screen/title-screen.component';
import { OpeningComponent } from './opening/opening.component';
import { EndingComponent } from './ending/ending.component';
import { ScreensaverComponent } from './screensaver/screensaver.component';

// Importe todos os seus serviços aqui
import { GameStateService } from './core/services/game-state.service';
import { CommandService } from './core/services/command.service';
import { InactivityService } from './core/services/inactivity.service';
import { GameFlowService } from './core/services/game-flow.service';
import { CharacterService } from './core/services/character.service';
import { ItemService } from './core/services/item.service';
import { SoundService } from './core/services/sound.service';
import { SettingsComponent } from './settings/settings.component';

@NgModule({
  declarations: [
    // O AppModule "declara" os componentes que lhe pertencem
    AppComponent
  ],
  imports: [
    // O AppModule "importa" outros módulos e componentes standalone
    BrowserModule,
    HttpClientModule,
    FormsModule,
    TitleScreenComponent,
    OpeningComponent,
    EndingComponent,
    ScreensaverComponent,
    SettingsComponent 
  ],
  providers: [
    // Fornece todos os serviços para a aplicação
    GameStateService,
    CommandService,
    InactivityService,
    GameFlowService,
    CharacterService,
    ItemService,
    SoundService
  ],
  bootstrap: [AppComponent] // O componente inicial a ser carregado
})
export class AppModule { }