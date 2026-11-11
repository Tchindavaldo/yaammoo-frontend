/**
 * Trace des events socket reçus. Coupée par défaut : ces logs sont très verbeux
 * (un par event, payload complet) et noient les logs qu'on cherche réellement.
 * Passer à `true` le temps d'un debug socket.
 */
const LOG_SOCKET_EVENTS = false;

export const logEvent = (...args: any[]) => {
  if (LOG_SOCKET_EVENTS) console.log(...args);
};
