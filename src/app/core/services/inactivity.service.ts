// src/app/core/services/inactivity.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private _isScreensaverActive = new BehaviorSubject<boolean>(false);
  public isScreensaverActive$ = this._isScreensaverActive.asObservable();

  private inactivityTimer: any;

  constructor() { }

  public resetInactivityTimer(config?: { enabled: boolean, timeout_seconds: number }) {
    if (!config || !config.enabled) {
      return;
    }

    clearTimeout(this.inactivityTimer);
    if (this._isScreensaverActive.getValue()) {
      this._isScreensaverActive.next(false);
    }

    this.inactivityTimer = setTimeout(() => {
      this.forceScreensaver();
    }, config.timeout_seconds * 1000);
  }

  public forceScreensaver() {
    this._isScreensaverActive.next(true);
    this.stopTimer();
  }

  public stopTimer() {
    clearTimeout(this.inactivityTimer);
  }
}
