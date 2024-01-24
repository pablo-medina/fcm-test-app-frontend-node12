import { Component, OnDestroy, OnInit } from '@angular/core';

import { MessagingService } from './services/messaging.service';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Clipboard } from '@angular/cdk/clipboard';
import { Notificacion, TokenStatus } from './models/messaging.model';

const STORAGE_USAR_NOTIFICACIONES_PERSONALIZADAS = 'notificacionesPersonalizadas';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0, zIndex: 1 })),
      transition('void => fadeIn', [
        animate('0.35s', style({ opacity: 1, zIndex: 3 })),
      ]),
      state('fadeIn', style({ opacity: 1, zIndex: 3 })),
      transition('fadeIn => fadeOut', [
        animate('1s', style({ opacity: 1, zIndex: 3 }))
      ]),
      state('fadeOut', style({ opacity: 1, zIndex: 3 })),
      transition('fadeOut => void', [
        animate('0.35s', style({ opacity: 0, zIndex: 0 }))
      ])
    ])
  ],
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnDestroy {
  title = 'fcm-frontend';
  serviceWorkerReady$ = new BehaviorSubject<boolean>(false);
  private ngDestroy$ = new Subject<void>();
  loading = false;
  notSupported = false;

  permitirNotificaciones = false;
  mostrarNotificacion = false;
  estadoAnimacion = 'void';
  tituloNotificacion? = '';
  mensajeNotificacion? = '';
  imagenNotificacion? = '';
  messageToken = '';
  usarNotificacionesPersonalizadas = false;
  estadoToken = TokenStatus.Off;
  TokenStatus = TokenStatus

  frmEnviarMensaje = new FormGroup(
    {
      titulo: new FormControl('Título'),
      texto: new FormControl('Mensaje de prueba', { validators: Validators.required }),
      imagen: new FormControl('https://picsum.photos/48'),
      delay: new FormControl(2500)
    }
  );

  constructor(private messagingService: MessagingService, private clipboard: Clipboard) { //, private toastr: ToastrService
    this.loading = true;
    this.usarNotificacionesPersonalizadas = (localStorage.getItem(STORAGE_USAR_NOTIFICACIONES_PERSONALIZADAS) || 'true') === 'true';
    messagingService.ready$
      .pipe(
        takeUntil(this.ngDestroy$)
      ).subscribe(ready => {
        if (ready) {
          this.loading = false;
          this.messageToken = this.messagingService.messageToken || '';
          console.debug('MessagingService: Service Worker listo.');
        }
      });

    messagingService.notificacion$
      .pipe(
        takeUntil(this.ngDestroy$)
      ).subscribe(notificacion => {
        if (this.usarNotificacionesPersonalizadas) {
          this.mostrarNotificacionPersonalizada(notificacion);
        } else {
          this.messagingService.mostrarNotificacion(notificacion);
        }
      });

    messagingService.tokenStatus$
      .pipe(
        takeUntil(this.ngDestroy$)
      ).subscribe(tokenStatus => {
        this.estadoToken = tokenStatus;
      })
    this.PermitirNotificaciones();
  }

  PermitirNotificaciones(){
      Notification.requestPermission()
      .then(permission => {
        this.permitirNotificaciones = !!(permission === 'granted');
        if (this.permitirNotificaciones) {
          this.messagingService.inicializar();
        } else {
          this.loading = false;
        }
      });
  }


  enviarMensaje(): void {
    // Enviar mensaje
    const formValue = this.frmEnviarMensaje.value;

    this.messagingService.enviarMensaje(
      {
        titulo: formValue.titulo || 'Título',
        texto: formValue.texto || 'Mensaje de prueba',
        imagen: formValue.imagen || '',
        delay: formValue.delay || 2500
      }
    ).subscribe(
      {
        next: response => {
          console.log('Respuesta:', response);
        },
        error: err => {
          console.error(err);
        }
      }
    );
  }

  cerrarNotificacion(): void {
    this.mostrarNotificacion = false;
  }

  copiarToken(): void {
    this.clipboard.copy(this.messageToken);
  }

  mostrarNotificacionPersonalizada(notificacion: Notificacion) {
    this.tituloNotificacion = notificacion.titulo;
    this.mensajeNotificacion = notificacion.mensaje;
    this.imagenNotificacion = notificacion.imagen;
    this.estadoAnimacion = 'fadeIn';
    this.mostrarNotificacion = true;
    setTimeout(() => {
      this.estadoAnimacion = 'fadeOut';
      setTimeout(() => {
        this.estadoAnimacion = 'void';
        this.mostrarNotificacion = false;
      }, 2000);
    }, 3000);
  }

  updateConfigNotificaciones(): void {
    localStorage.setItem(STORAGE_USAR_NOTIFICACIONES_PERSONALIZADAS, `${this.usarNotificacionesPersonalizadas}`);
  }

  reiniciarServiceWorkers(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(registrations => {
          return Promise.all(registrations.map(registration => {
            console.log(`[APP] Quitando service Worker ${registration.scope}...`);
            registration.unregister();
          })).then(() => {
            console.log(`[APP] Service workers eliminados.`);
            location.reload();
          })
        }).catch(error => {
          console.error(error);
        })
    }
  }

  ngOnDestroy(): void {
    this.ngDestroy$.next();
    this.ngDestroy$.complete();
  }

}
