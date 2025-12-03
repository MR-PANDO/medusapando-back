import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Button, Badge, Toaster, toast } from "@medusajs/ui"
import { useEffect, useState, useRef, useCallback } from "react"
import { Camera, Upload, Trash2, RefreshCw, Check } from "lucide-react"

type NutritionData = {
  id: string
  product_id: string
  serving_size: string | null
  servings_per_container: string | null
  nutrition_data: Record<string, string>
  raw_text: string | null
  label_image_url: string | null
  scanned_at: string
}

const NutritionScannerWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const productId = data.id
  const [nutrition, setNutrition] = useState<NutritionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch existing nutrition data
  const fetchNutrition = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/nutrition/${productId}`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setNutrition(data.nutrition)
      } else if (res.status === 404) {
        setNutrition(null)
      }
    } catch (error) {
      console.error("Error fetching nutrition:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNutrition()
    return () => {
      // Cleanup camera stream on unmount
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [productId])

  // Start camera
  const startCamera = async () => {
    try {
      setVideoReady(false)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      })
      setStream(mediaStream)
      setShowCamera(true)

      // Set video source after state is updated
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      }, 100)
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast.error("No se pudo acceder a la cámara. Verifica los permisos.")
    }
  }

  // Handle video ready
  const handleVideoLoaded = useCallback(() => {
    setVideoReady(true)
  }, [])

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setShowCamera(false)
    setVideoReady(false)
  }

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error("Error: Video no disponible")
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) {
      toast.error("Error: No se pudo crear el contexto del canvas")
      return
    }

    // Verify video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Error: El video no tiene dimensiones válidas. Espera a que la cámara cargue.")
      return
    }

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get base64 image
    const imageBase64 = canvas.toDataURL("image/jpeg", 0.85)

    // Verify image was captured correctly (not empty)
    if (imageBase64 === "data:," || imageBase64.length < 1000) {
      toast.error("Error: La imagen capturada está vacía. Intenta de nuevo.")
      return
    }

    // Stop camera
    stopCamera()

    // Send for scanning
    scanImage(imageBase64)
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona una imagen válida")
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen es demasiado grande. Máximo 10MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageBase64 = e.target?.result as string
      if (imageBase64 && imageBase64.length > 100) {
        scanImage(imageBase64)
      } else {
        toast.error("Error al leer la imagen")
      }
    }
    reader.onerror = () => {
      toast.error("Error al leer el archivo")
    }
    reader.readAsDataURL(file)

    // Reset input so same file can be selected again
    event.target.value = ""
  }

  // Send image to API for scanning
  const scanImage = async (imageBase64: string) => {
    setScanning(true)
    try {
      const res = await fetch(`/admin/nutrition/${productId}/scan`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success("Etiqueta escaneada exitosamente")
        setNutrition(data.nutrition)
      } else {
        toast.error(data.error || "Error al escanear la etiqueta")
      }
    } catch (error) {
      console.error("Error scanning:", error)
      toast.error("Error al procesar la imagen")
    } finally {
      setScanning(false)
    }
  }

  // Delete nutrition data
  const handleDelete = async () => {
    if (!confirm("¿Eliminar la información nutricional de este producto?")) return

    try {
      const res = await fetch(`/admin/nutrition/${productId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (res.ok) {
        toast.success("Información eliminada")
        setNutrition(null)
      } else {
        toast.error("Error al eliminar")
      }
    } catch (error) {
      toast.error("Error al eliminar")
    }
  }

  // Format nutrition key for display
  const formatKey = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Información Nutricional</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle">Cargando...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <Heading level="h2">Información Nutricional</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            Escanea la etiqueta nutricional del producto
          </Text>
        </div>
        {nutrition && (
          <Badge color="green">
            <Check size={12} className="mr-1" />
            Escaneado
          </Badge>
        )}
      </div>

      {/* Camera View */}
      {showCamera && (
        <div className="px-6 py-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-square" style={{ maxHeight: "500px" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={handleVideoLoaded}
              onCanPlay={handleVideoLoaded}
              className="w-full h-full object-cover"
              style={{ display: videoReady ? "block" : "none" }}
            />
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                  <Text>Iniciando cámara...</Text>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <Button variant="secondary" onClick={stopCamera}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={capturePhoto}
                disabled={!videoReady}
              >
                <Camera size={16} className="mr-2" />
                {videoReady ? "Capturar" : "Esperando..."}
              </Button>
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      )}

      {/* Scan Buttons */}
      {!showCamera && (
        <div className="px-6 py-4">
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="secondary"
              onClick={startCamera}
              disabled={scanning}
            >
              <Camera size={16} className="mr-2" />
              Abrir Cámara
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
            >
              <Upload size={16} className="mr-2" />
              Subir Imagen
            </Button>
            {nutrition && (
              <>
                <Button
                  variant="secondary"
                  onClick={fetchNutrition}
                  disabled={scanning}
                >
                  <RefreshCw size={16} className="mr-2" />
                  Actualizar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  disabled={scanning}
                >
                  <Trash2 size={16} className="mr-2" />
                  Eliminar
                </Button>
              </>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          {scanning && (
            <div className="mt-4 flex items-center gap-2 text-ui-fg-subtle">
              <RefreshCw size={16} className="animate-spin" />
              <Text>Analizando etiqueta con IA...</Text>
            </div>
          )}
        </div>
      )}

      {/* Nutrition Data Display */}
      {nutrition && nutrition.nutrition_data && (
        <div className="px-6 py-4">
          {/* Serving Info */}
          {(nutrition.serving_size || nutrition.servings_per_container) && (
            <div className="mb-4 p-3 bg-ui-bg-subtle rounded-lg">
              {nutrition.serving_size && (
                <div className="flex justify-between text-sm">
                  <Text className="font-medium">Tamaño de porción:</Text>
                  <Text>{nutrition.serving_size}</Text>
                </div>
              )}
              {nutrition.servings_per_container && (
                <div className="flex justify-between text-sm mt-1">
                  <Text className="font-medium">Porciones por envase:</Text>
                  <Text>{nutrition.servings_per_container}</Text>
                </div>
              )}
            </div>
          )}

          {/* Nutrition Facts Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-ui-bg-base px-3 py-2 border-b">
              <Text className="font-bold text-lg">Datos Nutricionales</Text>
            </div>
            <div className="divide-y">
              {Object.entries(nutrition.nutrition_data).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between px-3 py-2 hover:bg-ui-bg-subtle-hover"
                >
                  <Text className="text-sm">{formatKey(key)}</Text>
                  <Text className="text-sm font-medium">{value}</Text>
                </div>
              ))}
            </div>
          </div>

          {/* Scan date */}
          {nutrition.scanned_at && (
            <Text className="text-ui-fg-muted text-xs mt-3">
              Escaneado: {new Date(nutrition.scanned_at).toLocaleString()}
            </Text>
          )}
        </div>
      )}

      {/* Empty State */}
      {!nutrition && !showCamera && (
        <div className="px-6 py-8 text-center">
          <div className="text-ui-fg-subtle mb-2">
            <Camera size={40} className="mx-auto opacity-50" />
          </div>
          <Text className="text-ui-fg-subtle">
            No hay información nutricional registrada
          </Text>
          <Text className="text-ui-fg-muted text-sm mt-1">
            Usa la cámara o sube una imagen de la etiqueta nutricional
          </Text>
        </div>
      )}

      <Toaster />
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default NutritionScannerWidget
