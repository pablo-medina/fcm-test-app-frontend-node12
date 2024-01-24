export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export interface Notificacion {
  titulo?: string
  mensaje?: string
  imagen?: string
}

export enum TokenStatus {
  Off,
  Loading,
  Available,
  Unavailable
}
