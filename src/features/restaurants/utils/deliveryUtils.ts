/**
 * Récupère l'heure de livraison la plus proche
 * @param deliveryHours - Array d'heures disponibles (format "HH:MM")
 * @param orderLeadTime - Délai avant de pouvoir commander (en minutes)
 * @returns L'heure la plus proche au format "HHh" (ex: "12h", "13h")
 */
export const getNextDeliveryTime = (
  deliveryHours?: string[],
  orderLeadTime: number = 0
): string => {
  // Heures par défaut si aucune heure n'est fournie
  const defaultHours = ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00'];
  const hours = (deliveryHours && deliveryHours.length > 0) ? deliveryHours : defaultHours;

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  // Trouver la première heure valide (après orderLeadTime)
  let closestHour: string | null = null;

  for (const hour of hours) {
    const [hoursStr, minutesStr] = hour.split(':');
    const hourValue = parseInt(hoursStr, 10);
    const minuteValue = parseInt(minutesStr, 10);
    const hourTotalMinutes = hourValue * 60 + minuteValue;

    // L'heure est valide si : hourTime - orderLeadTime > currentTime
    const cutoffTime = hourTotalMinutes - orderLeadTime;

    if (currentTotalMinutes < cutoffTime) {
      closestHour = hour;
      break;
    }
  }

  // Si aucune heure n'est trouvée, utiliser la dernière heure disponible
  if (!closestHour) {
    closestHour = hours[hours.length - 1];
  }

  // Convertir format "HH:MM" à "HHh" (ex: "12:00" → "12h")
  const [hoursStr] = closestHour.split(':');
  return `${hoursStr}h`;
};
