import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Badge, Input, Select, Toaster, toast, Textarea } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Trash2, Search, Save, BookOpen } from "lucide-react"

type RecipeProduct = {
  id: string
  product_id: string
  variant_id: string
  product_title: string
  product_handle: string
  product_thumbnail: string | null
  quantity: string
  notes: string | null
}

type Recipe = {
  id: string
  title: string
  description: string
  image: string | null
  diets: string[]
  diet_names: string[]
  prep_time: string
  cook_time: string
  servings: number
  difficulty: string
  ingredients: string[]
  instructions: string[]
  nutrition: {
    calories: number
    carbs: number
    protein: number
    fat: number
    fiber?: number
  }
  tips: string | null
  status: "draft" | "published" | "disabled"
  products: RecipeProduct[]
  productCount: number
  canPublish: boolean
}

type MedusaProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  variants: Array<{
    id: string
    title: string
  }>
}

const RecipeDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Product search
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<MedusaProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<MedusaProduct | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string>("")
  const [productQuantity, setProductQuantity] = useState("1 unidad")
  const [productNotes, setProductNotes] = useState("")

  const fetchRecipe = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/recipes/${id}`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setRecipe(data.recipe)
      } else {
        toast.error("Recipe not found")
        navigate("/app/recipes")
      }
    } catch (error) {
      console.error("Error fetching recipe:", error)
      toast.error("Error loading recipe")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchRecipe()
    }
  }, [id])

  const searchProducts = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/admin/products?q=${encodeURIComponent(searchQuery)}&limit=10`, {
        credentials: "include",
      })
      const data = await res.json()
      setSearchResults(data.products || [])
    } catch (error) {
      console.error("Error searching products:", error)
      toast.error("Error searching products")
    } finally {
      setSearching(false)
    }
  }

  const handleAddProduct = async () => {
    if (!selectedProduct || !selectedVariantId) {
      toast.error("Select a product and variant")
      return
    }

    try {
      const res = await fetch(`/admin/recipes/${id}/products`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          variant_id: selectedVariantId,
          product_title: selectedProduct.title,
          product_handle: selectedProduct.handle,
          product_thumbnail: selectedProduct.thumbnail,
          quantity: productQuantity,
          notes: productNotes || null,
        }),
      })

      if (res.ok) {
        toast.success("Product added")
        setSelectedProduct(null)
        setSelectedVariantId("")
        setProductQuantity("1 unidad")
        setProductNotes("")
        setSearchResults([])
        setSearchQuery("")
        fetchRecipe()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error adding product")
      }
    } catch (error) {
      toast.error("Error adding product")
    }
  }

  const handleRemoveProduct = async (productId: string) => {
    try {
      const res = await fetch(`/admin/recipes/${id}/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) {
        toast.success("Product removed")
        fetchRecipe()
      } else {
        toast.error("Error removing product")
      }
    } catch (error) {
      toast.error("Error removing product")
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/admin/recipes/${id}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Status updated")
        fetchRecipe()
      } else {
        toast.error(data.error || "Cannot update status")
      }
    } catch (error) {
      toast.error("Error updating status")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRecipe = async () => {
    if (!confirm("Are you sure you want to delete this recipe?")) return

    try {
      const res = await fetch(`/admin/recipes/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) {
        toast.success("Recipe deleted")
        navigate("/app/recipes")
      } else {
        toast.error("Error deleting recipe")
      }
    } catch (error) {
      toast.error("Error deleting recipe")
    }
  }

  if (loading) {
    return (
      <Container className="p-6">
        <Text>Loading...</Text>
      </Container>
    )
  }

  if (!recipe) {
    return (
      <Container className="p-6">
        <Text>Recipe not found</Text>
      </Container>
    )
  }

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
    <div className="flex flex-col gap-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-4">
          <Button variant="secondary" onClick={() => navigate("/app/recipes")}>
            <ArrowLeft size={16} className="mr-2" />
            Volver
          </Button>
          <div>
            <Heading level="h1">{recipe.title}</Heading>
            <div className="flex items-center gap-x-2 mt-1">
              {getStatusBadge(recipe.status)}
              <Text className="text-ui-fg-subtle">
                {recipe.productCount} productos asociados
              </Text>
            </div>
          </div>
        </div>
        <div className="flex gap-x-2">
          {recipe.status === "draft" && recipe.canPublish && (
            <Button variant="primary" onClick={() => handleStatusChange("published")} disabled={saving}>
              Publicar
            </Button>
          )}
          {recipe.status === "published" && (
            <Button variant="secondary" onClick={() => handleStatusChange("disabled")} disabled={saving}>
              Deshabilitar
            </Button>
          )}
          {recipe.status === "disabled" && (
            <Button variant="secondary" onClick={() => handleStatusChange("published")} disabled={saving}>
              Reactivar
            </Button>
          )}
          <Button variant="danger" onClick={handleDeleteRecipe}>
            <Trash2 size={16} className="mr-2" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recipe Info */}
        <Container className="divide-y p-0">
          <div className="px-6 py-4">
            <Heading level="h2">Información de la Receta</Heading>
          </div>
          <div className="px-6 py-4">
            {recipe.image && (
              <img
                src={recipe.image}
                alt={recipe.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            <Text className="text-ui-fg-subtle mb-4">{recipe.description}</Text>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <Text className="text-ui-fg-subtle text-sm">Prep</Text>
                <Text className="font-medium">{recipe.prep_time}</Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle text-sm">Cook</Text>
                <Text className="font-medium">{recipe.cook_time}</Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle text-sm">Servings</Text>
                <Text className="font-medium">{recipe.servings}</Text>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-4">
              {recipe.diet_names?.map((diet, i) => (
                <Badge key={i} color="blue">
                  {diet}
                </Badge>
              ))}
            </div>

            <div className="mb-4">
              <Text className="font-medium mb-2">Ingredientes:</Text>
              <ul className="list-disc list-inside text-ui-fg-subtle text-sm">
                {recipe.ingredients?.slice(0, 5).map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
                {recipe.ingredients?.length > 5 && (
                  <li>... y {recipe.ingredients.length - 5} más</li>
                )}
              </ul>
            </div>

            {recipe.nutrition && (
              <div className="grid grid-cols-4 gap-2 text-center bg-ui-bg-subtle rounded p-3">
                <div>
                  <Text className="text-xs text-ui-fg-subtle">Cal</Text>
                  <Text className="font-medium">{recipe.nutrition.calories}</Text>
                </div>
                <div>
                  <Text className="text-xs text-ui-fg-subtle">Carbs</Text>
                  <Text className="font-medium">{recipe.nutrition.carbs}g</Text>
                </div>
                <div>
                  <Text className="text-xs text-ui-fg-subtle">Prot</Text>
                  <Text className="font-medium">{recipe.nutrition.protein}g</Text>
                </div>
                <div>
                  <Text className="text-xs text-ui-fg-subtle">Fat</Text>
                  <Text className="font-medium">{recipe.nutrition.fat}g</Text>
                </div>
              </div>
            )}
          </div>
        </Container>

        {/* Products Section */}
        <Container className="divide-y p-0">
          <div className="px-6 py-4">
            <Heading level="h2">Productos Asociados</Heading>
            <Text className="text-ui-fg-subtle text-sm mt-1">
              Agrega productos de la tienda que se mostrarán con esta receta
            </Text>
          </div>

          {/* Search Products */}
          <div className="px-6 py-4">
            <div className="flex gap-x-2 mb-4">
              <Input
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchProducts()}
                className="flex-1"
              />
              <Button variant="secondary" onClick={searchProducts} disabled={searching}>
                <Search size={16} />
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y mb-4 max-h-48 overflow-y-auto">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className={`p-3 cursor-pointer hover:bg-ui-bg-subtle ${
                      selectedProduct?.id === product.id ? "bg-ui-bg-base-pressed" : ""
                    }`}
                    onClick={() => {
                      setSelectedProduct(product)
                      setSelectedVariantId(product.variants?.[0]?.id || "")
                    }}
                  >
                    <div className="flex items-center gap-x-3">
                      {product.thumbnail && (
                        <img
                          src={product.thumbnail}
                          alt={product.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <Text className="font-medium">{product.title}</Text>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Product Form */}
            {selectedProduct && (
              <div className="border rounded-lg p-4 bg-ui-bg-subtle mb-4">
                <Text className="font-medium mb-2">Agregar: {selectedProduct.title}</Text>
                <div className="flex flex-col gap-y-3">
                  <div>
                    <Text className="text-sm text-ui-fg-subtle mb-1">Variante</Text>
                    <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                      <Select.Trigger className="w-full">
                        <Select.Value placeholder="Seleccionar variante" />
                      </Select.Trigger>
                      <Select.Content>
                        {selectedProduct.variants?.map((variant) => (
                          <Select.Item key={variant.id} value={variant.id}>
                            {variant.title || "Default"}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                  <div>
                    <Text className="text-sm text-ui-fg-subtle mb-1">Cantidad</Text>
                    <Input
                      value={productQuantity}
                      onChange={(e) => setProductQuantity(e.target.value)}
                      placeholder="1 unidad"
                    />
                  </div>
                  <div>
                    <Text className="text-sm text-ui-fg-subtle mb-1">Notas (opcional)</Text>
                    <Input
                      value={productNotes}
                      onChange={(e) => setProductNotes(e.target.value)}
                      placeholder="Ej: puede sustituir por..."
                    />
                  </div>
                  <div className="flex gap-x-2">
                    <Button variant="primary" onClick={handleAddProduct} className="flex-1">
                      <Plus size={16} className="mr-2" />
                      Agregar Producto
                    </Button>
                    <Button variant="secondary" onClick={() => setSelectedProduct(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Products */}
          <div className="px-6 py-4">
            {recipe.products?.length === 0 ? (
              <div className="text-center py-8 bg-ui-bg-subtle rounded-lg">
                <Text className="text-ui-fg-subtle">
                  No hay productos asociados. Busca y agrega productos arriba.
                </Text>
                <Text className="text-ui-fg-muted text-sm mt-1">
                  Se requiere al menos 1 producto para publicar la receta.
                </Text>
              </div>
            ) : (
              <div className="space-y-3">
                {recipe.products?.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-x-3">
                      {product.product_thumbnail && (
                        <img
                          src={product.product_thumbnail}
                          alt={product.product_title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <Text className="font-medium">{product.product_title}</Text>
                        <Text className="text-sm text-ui-fg-subtle">
                          {product.quantity}
                          {product.notes && ` - ${product.notes}`}
                        </Text>
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleRemoveProduct(product.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Container>
      </div>

      <Toaster />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Recipe Detail",
})

export default RecipeDetailPage
