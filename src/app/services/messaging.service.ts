import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { BehaviorSubject, interval, Observable, Subscription, of, tap, fromEvent, Subject, map, concatMap, from, catchError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FirebaseConfig, Notificacion, TokenStatus } from '../models/messaging.model';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { IMensaje } from '../models/mensaje.model';

const basePath = environment.basePath;

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private channel = new BroadcastChannel('app-channel');
  private config: any;
  private messagingServiceWorker: ServiceWorker | undefined;
  private firebaseConfig!: FirebaseConfig;
  private _messageToken!: string;
  private _serviceWorkerReady$ = new BehaviorSubject<boolean>(false);
  private _notificacion$ = new Subject<Notificacion>();
  private _registration: ServiceWorkerRegistration | undefined;
  private _tokenStatus = new BehaviorSubject<TokenStatus>(TokenStatus.Off);  

  constructor(private http: HttpClient) {
  }

  public inicializar() {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register(`${basePath}firebase-messaging-sw.js`, { scope: basePath })
        .then(registration => {
          this._registration = registration;
          console.log('[APP] ServiceWorkerRegistration:', registration, 'Scope:', registration.scope);
          if (registration.installing) {
            console.log('[APP] El service worker FCM está instalándose.');
          }
          if (registration.active) {
            console.log('[APP] El service worker FCM está activo.');
          }

          const worker = registration.installing || registration.active;

          if (worker) {
            console.log('[APP] Service Worker:', worker);

            //worker.addEventListener('message', (event: any) => {
            //if (event.data && event.data.action === 'sw-active') {

            this.inicializarFCM(registration).subscribe({
              next: config => {
                worker.postMessage({ action: 'firebase-config', value: config });
                this._serviceWorkerReady$.next(true);
              }, error: err => { console.error(err); }
            });
            //}
            //});
          }
        });
    } else {
      console.error('Service worker no encontrado. Los mensajes en segundo plano no van a funcionar.');
    }
  }

  private inicializarFCM(registration: ServiceWorkerRegistration): Observable<FirebaseConfig> {
    console.log('[APP] Solicitando configuración al backend...');
    let tokenLoaded = false;
    return this.getFirebaseConfig()
      .pipe(
        map(firebaseConfig => {
          console.debug('[APP] Configuración obtenida:', firebaseConfig);
          console.debug('[APP] Inicializando Firebase...');
          const fapp = initializeApp(firebaseConfig);
          const messaging = getMessaging(fapp);
          return ({ firebaseConfig, messaging });
        }),
        concatMap(({ firebaseConfig, messaging }) => {
          console.debug('[APP] Firebase inicializado correctamente. Obteniendo token...');
          this._tokenStatus.next(TokenStatus.Loading);
          return from(getToken(messaging, {
            //vapidKey: firebaseConfig.vapidKey,
            serviceWorkerRegistration: registration
          })).pipe(map((token: string) => ({ firebaseConfig, messaging, token })))
        }),
        map(({ firebaseConfig, messaging, token }) => {
          this._messageToken = token;
          tokenLoaded = true;
          console.log('[APP] Token:', token);

          onMessage(messaging, payload => {
            console.log('[APP] Mensaje recibido:', payload);
            this._notificacion$.next({
              titulo: payload.notification?.title,
              mensaje: payload.notification?.body,
              imagen: payload.notification?.image
            })
          });

          this._tokenStatus.next(TokenStatus.Available);
          console.debug('[APP] Service worker de mensajería FCM registrado.');
          return firebaseConfig;
        }),
        catchError(err => {
          if (!tokenLoaded) {
            this._tokenStatus.next(TokenStatus.Unavailable);
          }
          throw err;
        })
      )
  }

  getFirebaseConfig(): Observable<FirebaseConfig> {
    if (this.config) {
      return of(this.config);
    } else {
      const configApiUrl = `${environment.apiUrl}/firebase-config`;
      const headers = new HttpHeaders(
        {
          'Content-Type': 'application/json',
          'application': environment.appId
        }
      );

      return this.http.get<FirebaseConfig>(configApiUrl, { headers })
      // .pipe(
      //   tap(firebaseConfig => {
      //     this.channel.addEventListener('message', (event) => {
      //       const message = event.data;

      //       if (message.action === 'get-firebase-config') {
      //         this.channel.postMessage({ action: 'firebase-config', value: firebaseConfig });
      //       }
      //     })
      //   })
      // );
    }
  }

  enviarMensaje(mensaje: IMensaje): Observable<any> {
    const sendMessageUrl = `${environment.apiUrl}/send-message`;
    const headers = new HttpHeaders(
      {
        'Content-Type': 'application/json',
        'application': environment.appId
      }
    );

    const mensajeCompleto = Object.assign(mensaje, { token: this._messageToken });

    console.debug('enviarMensaje: URL', sendMessageUrl, 'body:', mensajeCompleto, 'headers:', headers);

    return this.http.post(sendMessageUrl, mensajeCompleto, { headers });
  }

  public isServiceWorkerEnabled(): boolean {
    return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
  }

  public mostrarNotificacion(notificacion: Notificacion) {
    if (this._registration) {
      this._registration.showNotification(notificacion.titulo || '', {
        body: notificacion.mensaje,
        badge: notificacion.imagen,
        timestamp: Date.now(),
        requireInteraction: false
      });
    }
  }

  get notificacion$() {
    return this._notificacion$.asObservable();
  }

  get ready$() {
    return this._serviceWorkerReady$.asObservable();
  }

  get tokenStatus$(): Observable<TokenStatus> {
    return this._tokenStatus.asObservable();
  }

  get messageToken(): string | undefined {
    return this._messageToken;
  }

}
