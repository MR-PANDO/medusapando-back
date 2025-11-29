// Shipping zones with pricing in COP (Colombian Pesos)
export const SHIPPING_ZONES = [
  {
    code: "medellin_metro",
    name: "Medellín Área Metropolitana",
    base_price: 8000,          // $8,000 COP standard
    express_price: 15000,      // $15,000 COP express
    same_day_price: 25000,     // $25,000 COP same day
    estimated_days_min: 1,
    estimated_days_max: 2,
    is_active: true,
  },
  {
    code: "antioquia_rural",
    name: "Antioquia (Resto del Departamento)",
    base_price: 15000,         // $15,000 COP standard
    express_price: 25000,      // $25,000 COP express
    same_day_price: null,      // Not available
    estimated_days_min: 2,
    estimated_days_max: 4,
    is_active: true,
  },
  {
    code: "bogota",
    name: "Bogotá y Alrededores",
    base_price: 12000,         // $12,000 COP standard
    express_price: 20000,      // $20,000 COP express
    same_day_price: 35000,     // $35,000 COP same day
    estimated_days_min: 1,
    estimated_days_max: 2,
    is_active: true,
  },
  {
    code: "principales",
    name: "Ciudades Principales",
    base_price: 15000,         // $15,000 COP standard
    express_price: 25000,      // $25,000 COP express
    same_day_price: null,      // Not available
    estimated_days_min: 2,
    estimated_days_max: 3,
    is_active: true,
  },
  {
    code: "secundarias",
    name: "Ciudades Secundarias",
    base_price: 18000,         // $18,000 COP standard
    express_price: 30000,      // $30,000 COP express
    same_day_price: null,      // Not available
    estimated_days_min: 3,
    estimated_days_max: 5,
    is_active: true,
  },
  {
    code: "rural",
    name: "Zonas Rurales y Remotas",
    base_price: 25000,         // $25,000 COP standard
    express_price: 40000,      // $40,000 COP express
    same_day_price: null,      // Not available
    estimated_days_min: 5,
    estimated_days_max: 10,
    is_active: true,
  },
  {
    code: "default",
    name: "Tarifa por Defecto",
    base_price: 20000,         // $20,000 COP standard
    express_price: 35000,      // $35,000 COP express
    same_day_price: null,      // Not available
    estimated_days_min: 3,
    estimated_days_max: 7,
    is_active: true,
  },
]
