importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const USAR_NOTIFICACIONES_PERSONALIZADAS = true;

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
    if (self.registration) {
        const data = event.data.json();

        if (data && data.notification) {
            console.log("[SW] Mensaje recibido (PUSH): ", event);
            const notification = data.notification;
            const options = {
                body: notification.body,
                icon: notification.icon
            };

            event.waitUntil(
                self.registration.showNotification(notification.title + ' [PUSH]', options)
            );
        }
    }
});

const agregarNotificacionesPersonalizadas = messaging => {
    if (messaging) {
        messaging.onBackgroundMessage((messaging, payload) => {
            if (payload.data && payload.data.notification) {
                console.log("[SW] Mensaje recibido: ", payload);
                const notification = payload.data.notification;
                const notificationOptions = {
                    body: notification.body,
                    icon: notification.image
                };

                self.registration.showNotification(notification.title, notificationOptions);
            }
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