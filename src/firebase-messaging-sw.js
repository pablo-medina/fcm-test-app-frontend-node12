importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const USAR_NOTIFICACIONES_PERSONALIZADAS = false; // Deshabilitado para evitar notificaciones duplicadas

self.addEventListener('message', (event) => {
    const message = event.data;
    if (message.action === 'firebase-config') {
        const firebaseConfig = message.value;
        console.log('[SW] Configuración de firebase recibida desde la aplicación: ', firebaseConfig);
        console.log('[SW] Inicializando Firebase...');
        firebase.initializeApp(firebaseConfig);
        const messaging = firebase.messaging();
        if (USAR_NOTIFICACIONES_PERSONALIZADAS) {
            agregarNotificacionesPersonalizadas(messaging);
        }
        console.log('[SW] Firebase inicializado correctamente.');
    }
})

self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activado.');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    const data = event.data.json(); // Convierte los datos de la notificación en formato JSON

    const options = {
        body: data.notification.body,
        icon: data.notification.icon
    };

    event.waitUntil(
        self.registration.showNotification(data.notification.title, options)
    );
})

const agregarNotificacionesPersonalizadas = messaging => {
    if (messaging) {
        messaging.onBackgroundMessage(function (payload) {
            console.log("[SW] Mensaje recibido: ", payload);

            const notificationTitle = payload.notification.title;
            const notificationOptions = {
                body: payload.notification.body
            };

            self.registration.showNotification(notificationTitle, notificationOptions);
        });
        console.debug('[SW] Se agregaron las notificaciones personalizadas.');
    }
}

self.onnotificationclick = (event) => {

    const linkToApp = event.notification.data.FCM_MSG.notification.click_action;
    console.log('on notif click', event.notification.tag, linkToApp)
    event.waitUntil(
        clients.matchAll({
            type: "window",
        })
            .then((clientList) => {
                console.log('clientList', clientList)
                for (const client of clientList) {
                    console.log('clientList', client, clients)
                    if (client.url === linkToApp && "focus" in client) return client.focus();
                }
                if (clients.openWindow) return clients.openWindow(linkToApp);
            })
    )
}