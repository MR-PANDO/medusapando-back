import { MedusaService } from "@medusajs/framework/utils"
import { Departamento } from "./models/departamento"
import { Municipio } from "./models/municipio"
import { ShippingZone } from "./models/shipping-zone"

class ColombiaGeoModuleService extends MedusaService({
  Departamento,
  Municipio,
  ShippingZone,
}) {
  // Get all departamentos ordered by name
  async listDepartamentosOrdered() {
    return this.listDepartamentoes({}, {
      order: { name: "ASC" },
    })
  }

  // Get municipios by departamento code
  async listMunicipiosByDepartamento(departamentoCode: string) {
    return this.listMunicipioes(
      { departamento_code: departamentoCode },
      { order: { name: "ASC" } }
    )
  }

  // Get shipping zone for a municipio
  async getShippingZoneForMunicipio(municipioCode: string) {
    const municipios = await this.listMunicipioes({ code: municipioCode })
    const municipio = municipios[0]
    if (!municipio?.shipping_zone) {
      // Return default zone if no specific zone assigned
      const zones = await this.listShippingZones({ code: "rural" })
      return zones[0] || null
    }
    const zones = await this.listShippingZones({ code: municipio.shipping_zone })
    return zones[0] || null
  }

  // Get active shipping zones
  async listActiveShippingZones() {
    return this.listShippingZones(
      { is_active: true },
      { order: { name: "ASC" } }
    )
  }
}

export default ColombiaGeoModuleService
