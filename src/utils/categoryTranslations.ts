// Mapeo de traducciones para categorías predefinidas del sistema
export const categoryTranslations: Record<string, {
  es: { name: string; description: string };
  en: { name: string; description: string };
}> = {
  // Gastos
  "Arriendo": {
    es: { name: "Arriendo", description: "Pago de arriendo o alquiler" },
    en: { name: "Rent", description: "Rent or lease payment" }
  },
  "Alimentación": {
    es: { name: "Alimentación", description: "Supermercado, restaurantes, comida" },
    en: { name: "Food", description: "Supermarket, restaurants, food" }
  },
  "Servicios públicos": {
    es: { name: "Servicios públicos", description: "Luz, agua, gas, internet, teléfono" },
    en: { name: "Utilities", description: "Electricity, water, gas, internet, phone" }
  },
  "Transporte": {
    es: { name: "Transporte", description: "Público, gasolina, peajes, mantenimiento" },
    en: { name: "Transportation", description: "Public transport, gas, tolls, maintenance" }
  },
  "Educación": {
    es: { name: "Educación", description: "Cursos, matrículas, libros, materiales" },
    en: { name: "Education", description: "Courses, tuition, books, materials" }
  },
  "Salud y cuidado personal": {
    es: { name: "Salud y cuidado personal", description: "Medicinas, citas médicas, productos de cuidado" },
    en: { name: "Health and personal care", description: "Medicines, medical appointments, care products" }
  },
  "Deudas y préstamos": {
    es: { name: "Deudas y préstamos", description: "Pagos de préstamos, tarjetas de crédito" },
    en: { name: "Debts and loans", description: "Loan payments, credit cards" }
  },
  "Ocio y entretenimiento": {
    es: { name: "Ocio y entretenimiento", description: "Cine, streaming, salidas, hobbies" },
    en: { name: "Leisure and entertainment", description: "Movies, streaming, outings, hobbies" }
  },
  "Ropa y calzado": {
    es: { name: "Ropa y calzado", description: "Compra de ropa y zapatos" },
    en: { name: "Clothing and footwear", description: "Clothing and shoes purchases" }
  },
  "Imprevistos y reparaciones": {
    es: { name: "Imprevistos y reparaciones", description: "Gastos inesperados y reparaciones" },
    en: { name: "Unexpected expenses and repairs", description: "Unexpected expenses and repairs" }
  },
  // Ingresos personales
  "Salario": {
    es: { name: "Salario", description: "Ingreso personal: Nómina, sueldo fijo" },
    en: { name: "Salary", description: "Personal income: Payroll, fixed salary" }
  },
  "Propinas": {
    es: { name: "Propinas", description: "Ingreso personal: Propinas recibidas" },
    en: { name: "Tips", description: "Personal income: Tips received" }
  },
  "Bonificaciones": {
    es: { name: "Bonificaciones", description: "Ingreso personal: Bonos y compensaciones" },
    en: { name: "Bonuses", description: "Personal income: Bonuses and compensations" }
  },
  "Freelance": {
    es: { name: "Freelance", description: "Ingreso personal: Trabajos independientes" },
    en: { name: "Freelance", description: "Personal income: Independent work" }
  },
  "Comisiones": {
    es: { name: "Comisiones", description: "Ingreso personal: Comisiones por ventas" },
    en: { name: "Commissions", description: "Personal income: Sales commissions" }
  },
  "Intereses": {
    es: { name: "Intereses", description: "Ingreso personal: Intereses de inversiones" },
    en: { name: "Interest", description: "Personal income: Investment interest" }
  },
  // Ingresos grupales
  "Aportes a la meta": {
    es: { name: "Aportes a la meta", description: "Ingreso grupal: Aportes para metas grupales" },
    en: { name: "Goal contributions", description: "Group income: Contributions for group goals" }
  },
  "Ganancias del negocio familiar o grupal": {
    es: { name: "Ganancias del negocio familiar o grupal", description: "Ingreso grupal: Ganancias de negocios compartidos" },
    en: { name: "Family or group business profits", description: "Group income: Shared business profits" }
  },
  "Remesas recibidas para todo el hogar": {
    es: { name: "Remesas recibidas para todo el hogar", description: "Ingreso grupal: Remesas para el hogar" },
    en: { name: "Remittances received for the household", description: "Group income: Remittances for the household" }
  },
  "Alquiler de una propiedad familiar": {
    es: { name: "Alquiler de una propiedad familiar", description: "Ingreso grupal: Alquiler de propiedad familiar" },
    en: { name: "Rental of a family property", description: "Group income: Family property rental" }
  }
};

/**
 * Traduce el nombre y descripción de una categoría predefinida según el idioma
 */
export function translateCategory(category: { name: string; description?: string; isSystem?: boolean }, language: "es" | "en"): { name: string; description?: string } {
  if (!category.isSystem) {
    // Las categorías del usuario no se traducen
    return { name: category.name, description: category.description };
  }

  const translation = categoryTranslations[category.name];
  if (translation) {
    return {
      name: translation[language].name,
      description: translation[language].description
    };
  }

  // Si no hay traducción, devolver el original
  return { name: category.name, description: category.description };
}

