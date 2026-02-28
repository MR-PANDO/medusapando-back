import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Button,
  Badge,
  Table,
  Input,
  Toaster,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Globe, ChevronDown, ChevronUp, Plus, X } from "lucide-react"
import SeoForm from "../../components/seo-form"
import ScoreBadge from "../../components/seo-form/score-badge"

type PageEntry = {
  slug: string
  label: string
  description: string
  custom?: boolean
}

type SeoScores = {
  seo_score: number
  aeo_score: number
  geo_score: number
  sxo_score: number
}

const PREDEFINED_PAGES: PageEntry[] = [
  {
    slug: "home",
    label: "Inicio",
    description: "Pagina principal de la tienda",
  },
  {
    slug: "store",
    label: "Tienda",
    description: "Listado general de productos",
  },
  {
    slug: "quienes-somos",
    label: "Quienes Somos",
    description: "Informacion sobre la empresa",
  },
  {
    slug: "mision-vision",
    label: "Mision y Vision",
    description: "Mision, vision y valores",
  },
  {
    slug: "sedes",
    label: "Sedes",
    description: "Ubicacion de nuestras sedes",
  },
  {
    slug: "terminos-condiciones",
    label: "Terminos y Condiciones",
    description: "Terminos legales del servicio",
  },
  {
    slug: "tratamiento-datos",
    label: "Tratamiento de Datos",
    description: "Politica de tratamiento de datos personales",
  },
  {
    slug: "habeas-data",
    label: "Habeas Data",
    description: "Derechos de proteccion de datos",
  },
  {
    slug: "servicio-cliente",
    label: "Servicio al Cliente",
    description: "Atencion y soporte al cliente",
  },
  {
    slug: "horarios-pedidos",
    label: "Horarios de Pedidos",
    description: "Horarios de atencion y entregas",
  },
  {
    slug: "recetas",
    label: "Recetas",
    description: "Recetas saludables con nuestros productos",
  },
  {
    slug: "dietas",
    label: "Dietas",
    description: "Categorias de dietas y estilos de vida",
  },
  {
    slug: "brands",
    label: "Marcas",
    description: "Listado de marcas disponibles",
  },
]

const SeoManagerPage = () => {
  const [pages, setPages] = useState<PageEntry[]>(PREDEFINED_PAGES)
  const [scoresMap, setScoresMap] = useState<Record<string, SeoScores>>({})
  const [existsMap, setExistsMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const [addingCustom, setAddingCustom] = useState(false)
  const [newSlug, setNewSlug] = useState("")
  const [newLabel, setNewLabel] = useState("")

  const fetchAllScores = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/seo?resource_type=page&limit=200", {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      const records = data.seo_metadata || []

      const scores: Record<string, SeoScores> = {}
      const exists: Record<string, boolean> = {}
      const customPages: PageEntry[] = []

      for (const record of records) {
        const slug = record.resource_id
        scores[slug] = {
          seo_score: record.seo_score || 0,
          aeo_score: record.aeo_score || 0,
          geo_score: record.geo_score || 0,
          sxo_score: record.sxo_score || 0,
        }
        exists[slug] = true

        // If this slug is not in predefined pages, add it as custom
        if (!PREDEFINED_PAGES.find((p) => p.slug === slug)) {
          customPages.push({
            slug,
            label: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "),
            description: "Pagina personalizada",
            custom: true,
          })
        }
      }

      setScoresMap(scores)
      setExistsMap(exists)
      setPages([...PREDEFINED_PAGES, ...customPages])
    } catch {
      // No SEO records yet — that's fine
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllScores()
  }, [])

  const handleToggle = (slug: string) => {
    setExpandedSlug(expandedSlug === slug ? null : slug)
  }

  const handleAddCustom = () => {
    const slug = newSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")

    if (!slug) {
      toast.error("El slug no puede estar vacio")
      return
    }

    if (pages.find((p) => p.slug === slug)) {
      toast.error("Ya existe una pagina con ese slug")
      return
    }

    setPages((prev) => [
      ...prev,
      {
        slug,
        label: newLabel.trim() || slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "),
        description: "Pagina personalizada",
        custom: true,
      },
    ])

    setNewSlug("")
    setNewLabel("")
    setAddingCustom(false)
    setExpandedSlug(slug)
  }

  const handleRemoveCustom = async (slug: string) => {
    if (existsMap[slug]) {
      try {
        const res = await fetch(`/admin/seo/page/${slug}`, {
          method: "DELETE",
          credentials: "include",
        })
        if (!res.ok) {
          toast.error("Error al eliminar los datos SEO")
          return
        }
      } catch {
        toast.error("Error al eliminar los datos SEO")
        return
      }
    }

    setPages((prev) => prev.filter((p) => p.slug !== slug))
    setScoresMap((prev) => {
      const updated = { ...prev }
      delete updated[slug]
      return updated
    })
    setExistsMap((prev) => {
      const updated = { ...prev }
      delete updated[slug]
      return updated
    })

    if (expandedSlug === slug) {
      setExpandedSlug(null)
    }

    toast.success("Pagina eliminada")
  }

  const getOverallStatus = (slug: string) => {
    if (!existsMap[slug]) {
      return <Badge color="grey">Sin configurar</Badge>
    }
    const scores = scoresMap[slug]
    if (!scores) return <Badge color="grey">Sin configurar</Badge>

    const avg =
      (scores.seo_score + scores.aeo_score + scores.geo_score + scores.sxo_score) / 4

    if (avg >= 80) return <Badge color="green">Excelente</Badge>
    if (avg >= 50) return <Badge color="orange">Regular</Badge>
    if (avg > 0) return <Badge color="red">Necesita mejoras</Badge>
    return <Badge color="grey">Iniciado</Badge>
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          <Globe className="text-ui-fg-subtle" />
          <div>
            <Heading level="h1">SEO Manager</Heading>
            <Text className="text-ui-fg-subtle">
              Administra el SEO de las paginas estaticas de tu tienda
            </Text>
          </div>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setAddingCustom(!addingCustom)}
        >
          <Plus className="mr-1" size={16} />
          Agregar Pagina
        </Button>
      </div>

      {/* Add Custom Page Form */}
      {addingCustom && (
        <div className="px-6 py-4 bg-ui-bg-subtle flex items-end gap-x-3">
          <div className="flex-1">
            <Text className="text-sm font-medium mb-1">Slug de la pagina</Text>
            <Input
              placeholder="ej: blog, ofertas, quienes-somos"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Text className="text-sm font-medium mb-1">
              Nombre (opcional)
            </Text>
            <Input
              placeholder="ej: Blog, Ofertas Especiales"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>
          <Button variant="primary" size="small" onClick={handleAddCustom}>
            Agregar
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              setAddingCustom(false)
              setNewSlug("")
              setNewLabel("")
            }}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Pages Table */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="text-center py-8">
            <Text className="text-ui-fg-subtle">
              Cargando datos SEO...
            </Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Pagina</Table.HeaderCell>
                <Table.HeaderCell>Slug</Table.HeaderCell>
                <Table.HeaderCell>Estado</Table.HeaderCell>
                <Table.HeaderCell>Puntajes</Table.HeaderCell>
                <Table.HeaderCell>Acciones</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {pages.map((page) => (
                <>
                  <Table.Row
                    key={page.slug}
                    className={
                      expandedSlug === page.slug ? "bg-ui-bg-subtle" : ""
                    }
                  >
                    <Table.Cell>
                      <div>
                        <Text className="font-medium">{page.label}</Text>
                        <Text className="text-ui-fg-subtle text-sm">
                          {page.description}
                        </Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <code className="text-sm bg-ui-bg-subtle px-2 py-1 rounded">
                        {page.slug}
                      </code>
                    </Table.Cell>
                    <Table.Cell>{getOverallStatus(page.slug)}</Table.Cell>
                    <Table.Cell>
                      {existsMap[page.slug] && scoresMap[page.slug] ? (
                        <div className="flex gap-x-1 flex-wrap">
                          <ScoreBadge
                            label="SEO"
                            score={scoresMap[page.slug].seo_score}
                          />
                          <ScoreBadge
                            label="AEO"
                            score={scoresMap[page.slug].aeo_score}
                          />
                          <ScoreBadge
                            label="GEO"
                            score={scoresMap[page.slug].geo_score}
                          />
                          <ScoreBadge
                            label="SXO"
                            score={scoresMap[page.slug].sxo_score}
                          />
                        </div>
                      ) : (
                        <Text className="text-ui-fg-subtle text-sm">—</Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-x-2">
                        <Button
                          variant={
                            expandedSlug === page.slug
                              ? "primary"
                              : "secondary"
                          }
                          size="small"
                          onClick={() => handleToggle(page.slug)}
                        >
                          {expandedSlug === page.slug ? (
                            <>
                              <ChevronUp size={14} className="mr-1" />
                              Cerrar
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} className="mr-1" />
                              {existsMap[page.slug]
                                ? "Editar SEO"
                                : "Configurar SEO"}
                            </>
                          )}
                        </Button>
                        {page.custom && (
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleRemoveCustom(page.slug)}
                          >
                            <X size={14} />
                          </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                  {expandedSlug === page.slug && (
                    <Table.Row key={`${page.slug}-form`}>
                      <Table.Cell colSpan={5} className="p-0">
                        <div className="border-t">
                          <SeoForm
                            resourceType="page"
                            resourceId={page.slug}
                            onSave={fetchAllScores}
                          />
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      <Toaster />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "SEO Manager",
  icon: Globe,
})

export default SeoManagerPage
