import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { AppComponent } from './app/app.component';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()]
};

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
