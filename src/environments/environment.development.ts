export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  /**
   * En developpement, le backend est simule en memoire : l'application tourne seule.
   * Passer a false des que ms_plannification_enseignement est demarre sur le port 8080.
   */
  useMock: true
};
