"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { toCSV } from "@/lib/csv/to-csv"
import { downloadCSV } from "@/lib/csv/download-csv"
import type {
  ActivityReportDTO,
  BrandReportDTO,
  GrowthReportDTO,
  OperationsReportDTO,
  RevenueReportDTO,
  TimeSeriesPoint,
} from "./actions"

const growthChartConfig: ChartConfig = {
  claims: { label: "Placas aprobadas", color: "var(--primary)" },
  verified: { label: "Perfiles verificados", color: "var(--destructive)" },
}

const messagesChartConfig: ChartConfig = {
  count: { label: "Mensajes", color: "var(--primary)" },
}

const funnelChartConfig: ChartConfig = {
  count: { label: "Solicitudes", color: "var(--primary)" },
}

const brandChartConfig: ChartConfig = {
  count: { label: "Placas", color: "var(--primary)" },
}

function formatColones(value: number): string {
  return `₡${new Intl.NumberFormat("es-MX").format(value)}`
}

function formatPeriodLabel(isoDate: string, granularity: "day" | "week" | "month"): string {
  const date = new Date(isoDate)
  return granularity === "month"
    ? date.toLocaleDateString("es-MX", { month: "short", year: "numeric" })
    : date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
}

function formatHours(hours: number | null): string {
  if (hours == null) return "—"
  if (hours < 24) return `${hours.toFixed(1)} h`
  return `${(hours / 24).toFixed(1)} días`
}

function zipSeries(claims: TimeSeriesPoint[], verified: TimeSeriesPoint[], granularity: "week" | "month") {
  return claims.map((point, i) => ({
    period: formatPeriodLabel(point.periodStart, granularity),
    periodStart: point.periodStart,
    claims: point.count,
    verified: verified[i]?.count ?? 0,
  }))
}

function GrowthSection({ report }: { report: GrowthReportDTO }) {
  const [granularity, setGranularity] = useState<"week" | "month">("week")

  const data =
    granularity === "week"
      ? zipSeries(report.claimsWeekly, report.verifiedWeekly, "week")
      : zipSeries(report.claimsMonthly, report.verifiedMonthly, "month")

  const handleDownload = () => {
    const csv = toCSV(
      ["Periodo", "Placas aprobadas", "Perfiles verificados"],
      data.map((row) => [row.period, row.claims, row.verified]),
    )
    downloadCSV(`crecimiento-${granularity}.csv`, csv)
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-label text-sm uppercase tracking-wide text-foreground">Crecimiento y adopción</h2>
          <p className="mt-1 text-xs text-muted-foreground">Últimos 12 {granularity === "week" ? "semanas" : "meses"}, por fecha de aprobación</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={granularity} onValueChange={(v) => setGranularity(v as "week" | "month")}>
            <TabsList>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mes</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            Descargar CSV
          </Button>
        </div>
      </div>

      <ChartContainer config={growthChartConfig} className="aspect-auto h-64 w-full">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="period" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={30} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="claims" fill="var(--color-claims)" radius={4} />
          <Bar dataKey="verified" fill="var(--color-verified)" radius={4} />
        </BarChart>
      </ChartContainer>
    </section>
  )
}

function ActivitySection({ report }: { report: ActivityReportDTO }) {
  const [granularity, setGranularity] = useState<"day" | "week">("day")
  const series = granularity === "day" ? report.messagesDaily : report.messagesWeekly
  const data = series.map((point) => ({
    period: formatPeriodLabel(point.periodStart, granularity),
    count: point.count,
  }))

  const dormantPct =
    report.totalApprovedPlates > 0 ? (report.dormantPlatesCount / report.totalApprovedPlates) * 100 : 0

  const handleDownload = () => {
    const csv = toCSV(
      ["Periodo", "Mensajes"],
      data.map((row) => [row.period, row.count]),
    )
    downloadCSV(`actividad-mensajes-${granularity}.csv`, csv)
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-label text-sm uppercase tracking-wide text-foreground">Actividad y uso real</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Últimos {granularity === "day" ? "30 días" : "12 semanas"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={granularity} onValueChange={(v) => setGranularity(v as "day" | "week")}>
            <TabsList>
              <TabsTrigger value="day">Día</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            Descargar CSV
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border p-4">
          <p className="text-xs text-muted-foreground">Placas distintas con mensajes</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{report.distinctPlatesMessaged}</p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-xs text-muted-foreground">Placas activas ({report.dormantThresholdDays} días)</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{report.activePlatesCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">de {report.totalApprovedPlates} placas aprobadas</p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-xs text-muted-foreground">Placas dormidas</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {report.dormantPlatesCount} <span className="text-sm font-normal text-muted-foreground">({dormantPct.toFixed(0)}%)</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">sin mensajes en los últimos {report.dormantThresholdDays} días</p>
        </div>
      </div>

      <ChartContainer config={messagesChartConfig} className="aspect-auto h-64 w-full">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="period" tickLine={false} axisLine={false} interval={granularity === "day" ? 4 : 0} />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={30} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
    </section>
  )
}

function OperationsSection({ report }: { report: OperationsReportDTO }) {
  const statusLabels: Record<string, string> = { approved: "Aprobados", rejected: "Rechazados", pending: "Pendientes" }

  const handleDownload = () => {
    const csv = toCSV(
      ["Estado", "Tiempo promedio (horas)", "Cantidad"],
      [
        ["Total", report.overallAvgHours?.toFixed(2) ?? "", report.overallCount],
        ...report.byStatus.map((row) => [statusLabels[row.status] ?? row.status, row.avgHours?.toFixed(2) ?? "", row.count]),
      ],
    )
    downloadCSV("operacion-panel-admin.csv", csv)
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-label text-sm uppercase tracking-wide text-foreground">Operación del panel de admin</h2>
          <p className="mt-1 text-xs text-muted-foreground">Tiempo entre que se envía un reclamo y se revisa</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleDownload}>
          Descargar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border p-4">
          <p className="text-xs text-muted-foreground">Promedio general</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatHours(report.overallAvgHours)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{report.overallCount} reclamos revisados</p>
        </div>
        {report.byStatus.map((row) => (
          <div key={row.status} className="rounded-md border border-border p-4">
            <p className="text-xs text-muted-foreground">{statusLabels[row.status] ?? row.status}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatHours(row.avgHours)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.count} reclamos</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const FUNNEL_ORDER = ["pending", "approved", "rejected"] as const
const FUNNEL_LABELS: Record<string, string> = { pending: "Pendientes", approved: "Aprobados", rejected: "Rechazados" }

function RevenueSection({ report }: { report: RevenueReportDTO }) {
  const funnelByStatus = new Map(report.funnel.map((row) => [row.status, row.count]))
  const funnelData = FUNNEL_ORDER.map((status) => ({
    status: FUNNEL_LABELS[status],
    count: funnelByStatus.get(status) ?? 0,
  }))
  const conversionRate = report.totalRequests > 0 ? (report.activePlatesCount / report.totalRequests) * 100 : 0

  const handleDownload = () => {
    const csv = toCSV(
      ["Métrica", "Valor"],
      [
        ["Placas activas", report.activePlatesCount],
        ["Ingreso anual estimado (colones)", report.estimatedAnnualRevenue],
        ["Tasa de conversión (%)", conversionRate.toFixed(1)],
        ...FUNNEL_ORDER.map((status) => [FUNNEL_LABELS[status], funnelByStatus.get(status) ?? 0]),
      ],
    )
    downloadCSV("ingresos.csv", csv)
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-label text-sm uppercase tracking-wide text-foreground">Ingresos</h2>
          <p className="mt-1 text-xs text-muted-foreground">Basado en el precio de reclamo de {formatColones(report.claimFeeColones)}/año</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleDownload}>
          Descargar CSV
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border p-4">
          <p className="text-xs text-muted-foreground">Placas activas</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{report.activePlatesCount}</p>
        </div>
        <div className="rounded-md border border-border p-4">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Ingreso anual</p>
            <Badge variant="outline" className="text-[10px]">Estimado</Badge>
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatColones(report.estimatedAnnualRevenue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No hay control de vencimientos/renovación en el sistema — es placas activas × tarifa, no un ARR real.
          </p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-xs text-muted-foreground">Conversión de solicitudes</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{conversionRate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-muted-foreground">{report.activePlatesCount} de {report.totalRequests} solicitudes</p>
        </div>
      </div>

      <ChartContainer config={funnelChartConfig} className="aspect-auto h-56 w-full">
        <BarChart data={funnelData}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="status" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={30} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
    </section>
  )
}

const TOP_BRANDS_SHOWN = 8

function BrandSection({ report }: { report: BrandReportDTO }) {
  const sorted = [...report.brands].sort((a, b) => b.count - a.count)
  const top = sorted.slice(0, TOP_BRANDS_SHOWN)
  const rest = sorted.slice(TOP_BRANDS_SHOWN)
  const restTotal = rest.reduce((sum, row) => sum + row.count, 0)
  const chartData = restTotal > 0 ? [...top, { brand: "Otros", count: restTotal }] : top

  const handleDownload = () => {
    const csv = toCSV(
      ["Marca", "Placas"],
      sorted.map((row) => [row.brand, row.count]),
    )
    downloadCSV("marcas-de-vehiculo.csv", csv)
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-label text-sm uppercase tracking-wide text-foreground">Marca de vehículo</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Placas reclamadas por marca (top {TOP_BRANDS_SHOWN} en el gráfico, todas en el CSV)
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleDownload}>
          Descargar CSV
        </Button>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay placas aprobadas.</p>
      ) : (
        <ChartContainer config={brandChartConfig} className="aspect-auto h-72 w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis dataKey="brand" type="category" tickLine={false} axisLine={false} width={100} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      )}
    </section>
  )
}

export function ReportsView({
  growth,
  activity,
  revenue,
  brands,
  operations,
}: {
  growth: GrowthReportDTO | null
  activity: ActivityReportDTO | null
  revenue: RevenueReportDTO | null
  brands: BrandReportDTO | null
  operations: OperationsReportDTO | null
}) {
  return (
    <div className="flex flex-col gap-6">
      {growth ? (
        <GrowthSection report={growth} />
      ) : (
        <p className="text-sm text-muted-foreground">No se pudo cargar el reporte de crecimiento.</p>
      )}
      {activity ? (
        <ActivitySection report={activity} />
      ) : (
        <p className="text-sm text-muted-foreground">No se pudo cargar el reporte de actividad.</p>
      )}
      {revenue ? (
        <RevenueSection report={revenue} />
      ) : (
        <p className="text-sm text-muted-foreground">No se pudo cargar el reporte de ingresos.</p>
      )}
      {brands ? (
        <BrandSection report={brands} />
      ) : (
        <p className="text-sm text-muted-foreground">No se pudo cargar el reporte de marcas.</p>
      )}
      {operations ? (
        <OperationsSection report={operations} />
      ) : (
        <p className="text-sm text-muted-foreground">No se pudo cargar el reporte de operación.</p>
      )}
    </div>
  )
}
