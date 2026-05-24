/**
 * Automatic expense categorization based on description
 */

const categoryKeywords: Record<string, string[]> = {
  "Alimentación": ["comida", "restaurante", "café", "pizza", "hamburguesa", "almuerzo", "desayuno", "cena", "supermercado", "mercado", "pan", "leche", "verdura", "fruta", "carnicería", "panadería", "delivery", "uber eats", "rappi"],
  "Transporte": ["taxi", "uber", "metro", "bus", "gasolina", "combustible", "estacionamiento", "parking", "transporte", "viaje", "tren", "avión", "boleto", "pasaje", "autobús", "colectivo"],
  "Entretenimiento": ["cine", "película", "teatro", "concierto", "música", "juego", "videojuego", "netflix", "spotify", "disney", "hbo", "streaming", "entrada", "evento", "fiesta", "discoteca", "bar", "pub"],
  "Salud": ["farmacia", "medicina", "doctor", "médico", "hospital", "clínica", "dentista", "psicólogo", "terapia", "vitaminas", "suplementos", "ejercicio", "gym", "gimnasio", "yoga", "pilates"],
  "Educación": ["escuela", "universidad", "colegio", "curso", "clase", "libro", "libros", "educación", "capacitación", "taller", "seminario", "formación", "estudio", "matrícula", "inscripción"],
  "Servicios": ["internet", "telefonía", "teléfono", "celular", "móvil", "electricidad", "agua", "gas", "servicios", "pago", "factura", "recibo", "suscripción", "membresía"],
  "Compras": ["ropa", "zapatos", "vestido", "camiseta", "pantalón", "abrigo", "bolsa", "cartera", "accesorios", "joyas", "reloj", "gafas", "lentes", "electrónica", "computadora", "laptop", "teléfono", "tablet", "muebles", "decoración"],
  "Vivienda": ["alquiler", "hipoteca", "casa", "apartamento", "vivienda", "renta", "mantenimiento", "reparación", "pintura", "construcción", "reforma"],
};

export function categorizeExpense(description: string, categoryName?: string): string {
  // If a category name is provided, try to match it
  if (categoryName) {
    const normalized = categoryName.toLowerCase().trim();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (category.toLowerCase() === normalized) {
        return category;
      }
    }
  }

  // Analyze description for keywords
  if (!description) return "Otros";

  const normalizedDescription = description.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (normalizedDescription.includes(keyword)) {
        score += keyword.length; // Longer matches get higher weight
      }
    }
    if (score > 0) {
      scores[category] = score;
    }
  }

  // Return the category with the highest score
  if (Object.keys(scores).length > 0) {
    return Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0];
  }

  return "Otros";
}

/**
 * Get category suggestions based on partial description
 */
export function getCategorySuggestions(description: string): string[] {
  if (!description || description.length < 2) return [];

  const suggestions = new Set<string>();
  const normalizedDescription = description.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (keyword.includes(normalizedDescription) || normalizedDescription.includes(keyword)) {
        suggestions.add(category);
      }
    }
  }

  return Array.from(suggestions).slice(0, 5);
}
