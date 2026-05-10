import { ds } from '../utils/storage';

export interface HalalAuditResult {
  status: 'halal' | 'haram' | 'douteux';
  message: string;
  safe: boolean;
}

/**
 * Service Simulant un SLM (Small Language Model) Local
 * pour l'analyse tactique et le bilan Zen.
 */
export const LocalAIService = {
  /**
   * Génère un résumé stratégique basé sur la base de données actuelle.
   */
  generateZenSummary: async (db: any): Promise<string> => {
    // Simulation d'une latence d'inférence locale
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!db) return "Initialisation de la conscience tactique...";

    const today = ds(new Date());
    const tasks = (db.tasks || []).filter((t: any) => !t.done);
    const workouts = (db.workoutLogs || []).filter((w: any) => w.date === today);
    const measures = db.mesures || [];
    
    let report = "";

    if (workouts.length > 0) {
      report += "Inflow physique détecté. Votre corps s'ajuste à la contrainte imposée. ";
    } else {
      report += "Aujourd'hui est une phase de consolidation. La récupération est une arme, ne l'oubliez pas. ";
    }

    if (tasks.length > 3) {
      report += `Charge cognitive élevée (${tasks.length} tâches en attente). Priorisez les vecteurs critiques. `;
    }

    if (measures.length > 0) {
      const last = measures[measures.length - 1];
      report += `Dernière mesure : ${last.value}${last.unit}. La régularité est le seul chemin vers la maîtrise. `;
    }

    if (!report) {
      return "Le silence est parfois la meilleure stratégie. Aucune donnée critique aujourd'hui.";
    }

    return report + "Restez froid, restez précis.";
  },

  /**
   * Analyse de phase (Dashboard)
   */
  auditPhase: (entries: any[], kcal: number, target: number): string => {
    const isOver = kcal > target;
    const entriesCount = entries.length;
    
    let advice = "ANALYSE DE PHASE : ";
    if (isOver) advice += "Surplus énergétique détecté. Augmentez la dépense cinétique ou réduisez l'apport au prochain cycle. ";
    else advice += "Apport calorique sous contrôle. L'énergie est disponible pour l'effort. ";

    if (entriesCount > 5) advice += "Activité réseau intense. Gardez le focus sur les priorités. ";
    
    return advice + "Système stabilisé.";
  },

  /**
   * Audit des ingrédients (Simulation de Vision/OCR AI)
   */
  auditHalalIngredients: (text: string): HalalAuditResult => {
    const lowerText = text.toLowerCase();
    
    const haramKeywords = ['porc', 'gelatine de porc', 'gélatine de porc', 'alcool', 'vin', 'carmins', 'e120', 'e471', 'e441'];
    const douteuxKeywords = ['gelatine', 'gélatine', 'e472', 'arôme naturel', 'presure', 'présure'];

    const foundHaram = haramKeywords.filter(k => lowerText.includes(k));
    const foundDouteux = douteuxKeywords.filter(k => lowerText.includes(k) && !foundHaram.includes('gelatine de porc'));

    if (foundHaram.length > 0) {
      return {
        status: 'haram',
        message: `Vecteurs interdits détectés : ${foundHaram.join(', ')}. Risque d'impureté systémique.`,
        safe: false
      };
    }

    if (foundDouteux.length > 0) {
      return {
        status: 'douteux',
        message: `Anomalie de traçabilité. Composants ambigus : ${foundDouteux.join(', ')}. Vérifiez l'origine bio-systémique.`,
        safe: false
      };
    }

    return {
      status: 'halal',
      message: 'Intégrité confirmée. Aucun agent haram identifié dans les signaux texte.',
      safe: true
    };
  },

  /**
   * Analyse logistique de trajet
   */
  predictCollation: (trajetHours: number): string => {
    if (trajetHours <= 1) return "Trajet court. Hydratation nominale suffisante.";
    if (trajetHours <= 3) return "Projection moyenne. Prévoyez un pack protéiné (shaker) pour maintenir l'homéostasie.";
    return "Projection longue. Planification de repas solide impérative. Alerte d'hydratation toutes les 90 minutes.";
  }
};
