export const environment = {
  production: true,
  /** Racine du microservice Planification. Aucun chemin d'API n'est ecrit ici : voir src/app/urls. */
  apiBaseUrl: 'http://localhost:8080',
  /** true = le backend est simule en memoire par mock-backend.interceptor.ts */
  useMock: false
};
