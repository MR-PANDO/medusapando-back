import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Badge,
  Button,
  Input,
} from "@medusajs/ui"
import { Star, Check, X } from "lucide-react"
import { useEffect, useState } from "react"

type ReviewRecord = {
  id: string
  title: string | null
  content: string
  rating: number
  first_name: string
  last_name: string
  status: string
  product_id: string
  customer_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, "green" | "red" | "orange" | "grey"> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
  })
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={
            i <= rating
              ? "text-yellow-400 fill-yellow-400"
              : "text-ui-fg-muted"
          }
        />
      ))}
      <span className="ml-1 text-xs text-ui-fg-subtle">
        {rating.toFixed(1)}
      </span>
    </span>
  )
}

const ReviewsPage = () => {
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [productFilter, setProductFilter] = useState("")
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [updating, setUpdating] = useState(false)
  const pageSize = 25

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      if (productFilter) params.set("product_id", productFilter)
      params.set("limit", String(pageSize))
      params.set("offset", String(page * pageSize))

      const res = await fetch(`/admin/reviews?${params.toString()}`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews ?? [])
        setCount(data.count ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(0)
  }, [statusFilter, productFilter])

  useEffect(() => {
    fetchReviews()
  }, [statusFilter, productFilter, page])

  const totalPages = Math.ceil(count / pageSize)

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === reviews.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(reviews.map((r) => r.id)))
    }
  }

  const handleBulkAction = async (status: "approved" | "rejected") => {
    if (selectedIds.size === 0) return
    setUpdating(true)
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/admin/reviews/${id}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      )
      await Promise.all(promises)
      setSelectedIds(new Set())
      fetchReviews()
    } finally {
      setUpdating(false)
    }
  }

  const handleSingleAction = async (
    id: string,
    status: "approved" | "rejected"
  ) => {
    setUpdating(true)
    try {
      await fetch(`/admin/reviews/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      fetchReviews()
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-6">
      {/* Header */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-3">
            <Star className="text-ui-fg-subtle" />
            <div>
              <Heading level="h1">Resenas de Productos</Heading>
              <Text className="text-ui-fg-subtle">
                Gestiona las resenas de los clientes
              </Text>
            </div>
          </div>
          <Button size="small" variant="secondary" onClick={fetchReviews}>
            Actualizar
          </Button>
        </div>
      </Container>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <Text className="text-sm text-ui-fg-subtle">Estado:</Text>
          {[
            { key: "", label: "Todos" },
            { key: "pending", label: "Pendientes" },
            { key: "approved", label: "Aprobadas" },
            { key: "rejected", label: "Rechazadas" },
          ].map((f) => (
            <Button
              key={f.key}
              size="small"
              variant={statusFilter === f.key ? "primary" : "secondary"}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
          <Text className="text-xs text-ui-fg-muted ml-auto">
            {count} resena{count !== 1 ? "s" : ""}
          </Text>
        </div>
        <div className="flex gap-2 items-center">
          <Text className="text-sm text-ui-fg-subtle">Producto:</Text>
          <Input
            className="max-w-xs"
            placeholder="ID del producto"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-ui-bg-subtle rounded-lg">
          <Text className="text-sm font-medium">
            {selectedIds.size} seleccionada{selectedIds.size !== 1 ? "s" : ""}
          </Text>
          <Button
            size="small"
            variant="secondary"
            onClick={() => handleBulkAction("approved")}
            disabled={updating}
          >
            <Check size={14} />
            Aprobar
          </Button>
          <Button
            size="small"
            variant="secondary"
            onClick={() => handleBulkAction("rejected")}
            disabled={updating}
          >
            <X size={14} />
            Rechazar
          </Button>
        </div>
      )}

      {/* Table */}
      <Container className="p-0">
        {loading ? (
          <div className="px-6 py-8 text-center">
            <Text className="text-ui-fg-subtle">Cargando...</Text>
          </div>
        ) : reviews.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Text className="text-ui-fg-subtle">
              No se encontraron resenas.
            </Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-ui-fg-subtle">
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === reviews.length &&
                        reviews.length > 0
                      }
                      onChange={handleSelectAll}
                      className="h-4 w-4"
                    />
                  </th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Autor</th>
                  <th className="px-4 py-3">Contenido</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id} className="border-b hover:bg-ui-bg-subtle-hover">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(review.id)}
                        onChange={() => handleSelect(review.id)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StarRating rating={review.rating} />
                    </td>
                    <td className="px-4 py-3 max-w-[120px] truncate text-xs text-ui-fg-subtle">
                      {review.product_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {review.first_name} {review.last_name}
                    </td>
                    <td className="px-4 py-3 max-w-[250px]">
                      {review.title && (
                        <div className="font-medium text-xs mb-0.5">
                          {review.title}
                        </div>
                      )}
                      <div className="truncate text-ui-fg-subtle">
                        {review.content}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLORS[review.status] ?? "grey"}>
                        {STATUS_LABELS[review.status] ?? review.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-ui-fg-subtle whitespace-nowrap">
                      {formatDate(review.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {review.status !== "approved" && (
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() =>
                              handleSingleAction(review.id, "approved")
                            }
                            disabled={updating}
                          >
                            <Check size={12} />
                          </Button>
                        )}
                        {review.status !== "rejected" && (
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() =>
                              handleSingleAction(review.id, "rejected")
                            }
                            disabled={updating}
                          >
                            <X size={12} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t">
            <Button
              size="small"
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Text className="text-sm text-ui-fg-subtle">
              Pagina {page + 1} de {totalPages}
            </Text>
            <Button
              size="small"
              variant="secondary"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Resenas",
  icon: Star,
})

export default ReviewsPage
