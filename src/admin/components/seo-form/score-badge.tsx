import { Badge } from "@medusajs/ui"

type ScoreBadgeProps = {
  label: string
  score: number
}

const ScoreBadge = ({ label, score }: ScoreBadgeProps) => {
  let color: "green" | "orange" | "red" | "grey"

  if (score >= 80) {
    color = "green"
  } else if (score >= 50) {
    color = "orange"
  } else if (score > 0) {
    color = "red"
  } else {
    color = "grey"
  }

  return (
    <Badge color={color} className="text-xs">
      {label}: {score}/100
    </Badge>
  )
}

export default ScoreBadge
