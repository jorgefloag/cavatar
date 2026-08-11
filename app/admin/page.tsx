import { fetchDashboardMetrics } from "./actions"

export default async function AdminDashboardPage() {
  const metrics = await fetchDashboardMetrics()

  const cards = [
    { label: "Placas reclamadas", value: metrics.claimsApproved },
    { label: "Reclamos pendientes", value: metrics.claimsPending },
    { label: "Perfiles verificados", value: metrics.verifiedApproved },
    { label: "Solicitudes de verificación pendientes", value: metrics.verifiedPending },
    { label: "Mensajes totales", value: metrics.messagesTotal },
    { label: "Mensajes enviados hoy", value: metrics.messagesToday },
    { label: "Reclamos nuevos hoy", value: metrics.claimsToday },
    { label: "Solicitudes de verificación nuevas hoy", value: metrics.verifiedToday },
  ]

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-foreground md:text-3xl">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
