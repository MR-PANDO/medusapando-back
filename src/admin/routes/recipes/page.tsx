import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Badge, Table, Select, Input, Toaster, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { BookOpen, Plus, RefreshCw, Search } from "lucide-react"

type Recipe = {
  id: string
  title: string
  description: string
  image: string | null
  diets: string[]
  diet_names: string[]
  difficulty: string
  status: "draft" | "published" | "disabled"
  productCount: number
  canPublish: boolean
  generated_at: string
}

const RecipesPage = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      const res = await fetch(`/admin/recipes?${params.toString()}`, {
        credentials: "include",
      })
      const data = await res.json()
      setRecipes(data.recipes || [])
    } catch (error) {
      console.error("Error fetching recipes:", error)
      toast.error("Error loading recipes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecipes()
  }, [statusFilter])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/admin/recipes/generate", {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Generated ${data.count} new recipes`)
        fetchRecipes()
      } else {
        toast.error(data.message || "Error generating recipes")
      }
    } catch (error) {
      console.error("Error generating recipes:", error)
      toast.error("Error generating recipes")
    } finally {
      setGenerating(false)
    }
  }

  const handleStatusChange = async (recipeId: string, newStatus: string) => {
    try {
      const res = await fetch(`/admin/recipes/${recipeId}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Status updated")
        fetchRecipes()
      } else {
        toast.error(data.error || "Cannot update status")
      }
    } catch (error) {
      toast.error("Error updating status")
    }
  }

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge color="green">Publicada</Badge>
      case "disabled":
        return <Badge color="red">Deshabilitada</Badge>
      default:
        return <Badge color="orange">Borrador</Badge>
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          <BookOpen className="text-ui-fg-subtle" />
          <div>
            <Heading level="h1">Recetas</Heading>
            <Text className="text-ui-fg-subtle">
              Administra las recetas y asigna productos de la tienda
            </Text>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <RefreshCw className="animate-spin mr-2" size={16} />
              Generando...
            </>
          ) : (
            <>
              <Plus className="mr-2" size={16} />
              Generar Nuevas Recetas
            </>
          )}
        </Button>
      </div>

      <div className="px-6 py-4 flex gap-x-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar recetas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <Select.Trigger className="w-48">
            <Select.Value placeholder="Filtrar por estado" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">Todos los estados</Select.Item>
            <Select.Item value="draft">Borradores</Select.Item>
            <Select.Item value="published">Publicadas</Select.Item>
            <Select.Item value="disabled">Deshabilitadas</Select.Item>
          </Select.Content>
        </Select>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="text-center py-8">
            <Text className="text-ui-fg-subtle">Cargando recetas...</Text>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-8">
            <Text className="text-ui-fg-subtle">
              No hay recetas. Haz clic en "Generar Nuevas Recetas" para comenzar.
            </Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Receta</Table.HeaderCell>
                <Table.HeaderCell>Dietas</Table.HeaderCell>
                <Table.HeaderCell>Productos</Table.HeaderCell>
                <Table.HeaderCell>Estado</Table.HeaderCell>
                <Table.HeaderCell>Acciones</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredRecipes.map((recipe) => (
                <Table.Row key={recipe.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-x-3">
                      {recipe.image && (
                        <img
                          src={recipe.image}
                          alt={recipe.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <Text className="font-medium">{recipe.title}</Text>
                        <Text className="text-ui-fg-subtle text-sm">
                          {recipe.difficulty}
                        </Text>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-wrap gap-1">
                      {recipe.diet_names?.slice(0, 2).map((diet, i) => (
                        <Badge key={i} color="blue" size="small">
                          {diet}
                        </Badge>
                      ))}
                      {recipe.diet_names?.length > 2 && (
                        <Badge color="grey" size="small">
                          +{recipe.diet_names.length - 2}
                        </Badge>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={recipe.productCount > 0 ? "green" : "orange"}>
                      {recipe.productCount} productos
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{getStatusBadge(recipe.status)}</Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-x-2">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => {
                          window.location.href = `/app/recipes/${recipe.id}`
                        }}
                      >
                        Editar
                      </Button>
                      {recipe.status === "draft" && recipe.canPublish && (
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => handleStatusChange(recipe.id, "published")}
                        >
                          Publicar
                        </Button>
                      )}
                      {recipe.status === "published" && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleStatusChange(recipe.id, "disabled")}
                        >
                          Deshabilitar
                        </Button>
                      )}
                      {recipe.status === "disabled" && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleStatusChange(recipe.id, "published")}
                        >
                          Reactivar
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
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
  label: "Recetas",
  icon: BookOpen,
})

export default RecipesPage
