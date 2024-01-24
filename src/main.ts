import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';


// Registrar un nuevo Service Worker en cada carga de la aplicación
if ('serviceWorker' in navigator ) {
  
  navigator.serviceWorker.register('ngsw-worker.js').then(registration => {
    console.log('Service Worker registrado correctamente');
  }).catch(error => {
    console.log('No se pudo registrar el Service Worker', error);
  })
}
platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
