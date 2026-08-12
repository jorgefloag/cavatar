import { fetchActivityReport, fetchBrandReport, fetchGrowthReport, fetchOperationsReport, fetchRevenueReport } from "./actions"
import { ReportsView } from "./reports-view"

export default async function AdminReportsPage() {
  const [growth, activity, revenue, brands, operations] = await Promise.all([
    fetchGrowthReport(),
    fetchActivityReport(),
    fetchRevenueReport(),
    fetchBrandReport(),
    fetchOperationsReport(),
  ])

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-foreground md:text-3xl">Reportes</h1>
      <ReportsView growth={growth} activity={activity} revenue={revenue} brands={brands} operations={operations} />
    </div>
  )
}
