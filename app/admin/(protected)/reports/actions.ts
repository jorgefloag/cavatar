"use server"

import { sql, isNotNull, eq, and, gt } from "drizzle-orm"
import { db } from "@/lib/db"
import { claimRequests, messages } from "@/lib/db/schema"
import { requireAdminEmail } from "@/lib/auth/require-admin"

export interface TimeSeriesPoint {
  periodStart: string // ISO date
  count: number
}

export interface GrowthReportDTO {
  claimsWeekly: TimeSeriesPoint[]
  claimsMonthly: TimeSeriesPoint[]
  verifiedWeekly: TimeSeriesPoint[]
  verifiedMonthly: TimeSeriesPoint[]
}

type Granularity = "week" | "month"

const LOOKBACK_PERIODS = 11 // + the current one = 12 total data points

async function fetchApprovedSeries(
  table: "claim_requests" | "verified_requests",
  granularity: Granularity,
): Promise<TimeSeriesPoint[]> {
  // Everything spliced in raw below (unit, lookback count, table name) comes
  // from the fixed Granularity type or the hardcoded constant above, never
  // from user input. Interval literals go in as raw text on purpose —
  // binding an integer parameter against `||` for text concatenation
  // (e.g. `11 || ' week'`) has no matching Postgres operator and throws.
  const truncUnit = sql.raw(`'${granularity}'`)
  const lookbackInterval = sql.raw(`'${LOOKBACK_PERIODS} ${granularity}'`)
  const stepInterval = sql.raw(`'1 ${granularity}'`)
  const tableIdentifier = sql.raw(table)

  const result = await db.execute(sql`
    with periods as (
      select generate_series(
        date_trunc(${truncUnit}, now()) - interval ${lookbackInterval},
        date_trunc(${truncUnit}, now()),
        interval ${stepInterval}
      )::date as period_start
    )
    select
      periods.period_start,
      count(t.id)::int as count
    from periods
    left join ${tableIdentifier} t
      on date_trunc(${truncUnit}, t.reviewed_at) = periods.period_start
      and t.status = 'approved'
    group by periods.period_start
    order by periods.period_start
  `)

  return (result.rows as { period_start: string; count: number }[]).map((row) => ({
    periodStart: new Date(row.period_start).toISOString(),
    count: Number(row.count),
  }))
}

type MessageGranularity = "day" | "week"

const MESSAGE_LOOKBACK_PERIODS: Record<MessageGranularity, number> = { day: 29, week: 11 } // 30 days / 12 weeks total

async function fetchMessageSeries(granularity: MessageGranularity): Promise<TimeSeriesPoint[]> {
  // Same raw-text rationale as fetchApprovedSeries above — granularity and
  // lookback both come from fixed internal values, never user input.
  const truncUnit = sql.raw(`'${granularity}'`)
  const lookbackInterval = sql.raw(`'${MESSAGE_LOOKBACK_PERIODS[granularity]} ${granularity}'`)
  const stepInterval = sql.raw(`'1 ${granularity}'`)

  const result = await db.execute(sql`
    with periods as (
      select generate_series(
        date_trunc(${truncUnit}, now()) - interval ${lookbackInterval},
        date_trunc(${truncUnit}, now()),
        interval ${stepInterval}
      )::date as period_start
    )
    select
      periods.period_start,
      count(m.id)::int as count
    from periods
    left join messages m
      on date_trunc(${truncUnit}, m.created_at) = periods.period_start
    group by periods.period_start
    order by periods.period_start
  `)

  return (result.rows as { period_start: string; count: number }[]).map((row) => ({
    periodStart: new Date(row.period_start).toISOString(),
    count: Number(row.count),
  }))
}

const DORMANT_THRESHOLD_DAYS = 90

export interface ActivityReportDTO {
  messagesDaily: TimeSeriesPoint[]
  messagesWeekly: TimeSeriesPoint[]
  distinctPlatesMessaged: number
  totalApprovedPlates: number
  activePlatesCount: number
  dormantPlatesCount: number
  dormantThresholdDays: number
}

export async function fetchActivityReport(): Promise<ActivityReportDTO | null> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return null

  const cutoff = new Date(Date.now() - DORMANT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)

  const [messagesDaily, messagesWeekly, distinctPlatesRows, totalApprovedRows, activePlateRows] = await Promise.all([
    fetchMessageSeries("day"),
    fetchMessageSeries("week"),
    db.select({ count: sql<number>`count(distinct ${messages.plateNumber})` }).from(messages),
    db.select({ count: sql<number>`count(*)` }).from(claimRequests).where(eq(claimRequests.status, "approved")),
    db
      .selectDistinct({ plateNumber: claimRequests.plateNumber })
      .from(claimRequests)
      .innerJoin(messages, eq(messages.plateNumber, claimRequests.plateNumber))
      .where(and(eq(claimRequests.status, "approved"), gt(messages.createdAt, cutoff))),
  ])

  const totalApprovedPlates = Number(totalApprovedRows[0]?.count ?? 0)
  const activePlatesCount = activePlateRows.length

  return {
    messagesDaily,
    messagesWeekly,
    distinctPlatesMessaged: Number(distinctPlatesRows[0]?.count ?? 0),
    totalApprovedPlates,
    activePlatesCount,
    dormantPlatesCount: Math.max(0, totalApprovedPlates - activePlatesCount),
    dormantThresholdDays: DORMANT_THRESHOLD_DAYS,
  }
}

export async function fetchGrowthReport(): Promise<GrowthReportDTO | null> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return null

  const [claimsWeekly, claimsMonthly, verifiedWeekly, verifiedMonthly] = await Promise.all([
    fetchApprovedSeries("claim_requests", "week"),
    fetchApprovedSeries("claim_requests", "month"),
    fetchApprovedSeries("verified_requests", "week"),
    fetchApprovedSeries("verified_requests", "month"),
  ])

  return { claimsWeekly, claimsMonthly, verifiedWeekly, verifiedMonthly }
}

export interface OperationsReportDTO {
  overallAvgHours: number | null
  overallCount: number
  byStatus: { status: string; avgHours: number | null; count: number }[]
}

export async function fetchOperationsReport(): Promise<OperationsReportDTO | null> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return null

  const avgHoursExpr = sql<number | null>`avg(extract(epoch from (${claimRequests.reviewedAt} - ${claimRequests.createdAt})) / 3600)`
  const countExpr = sql<number>`count(*)`

  const [[overall], byStatusRows] = await Promise.all([
    db
      .select({ avgHours: avgHoursExpr, count: countExpr })
      .from(claimRequests)
      .where(isNotNull(claimRequests.reviewedAt)),
    db
      .select({ status: claimRequests.status, avgHours: avgHoursExpr, count: countExpr })
      .from(claimRequests)
      .where(isNotNull(claimRequests.reviewedAt))
      .groupBy(claimRequests.status),
  ])

  return {
    overallAvgHours: overall?.avgHours != null ? Number(overall.avgHours) : null,
    overallCount: Number(overall?.count ?? 0),
    byStatus: byStatusRows.map((row) => ({
      status: row.status,
      avgHours: row.avgHours != null ? Number(row.avgHours) : null,
      count: Number(row.count),
    })),
  }
}

const CLAIM_FEE_COLONES = 5000

export interface RevenueReportDTO {
  activePlatesCount: number
  estimatedAnnualRevenue: number
  claimFeeColones: number
  funnel: { status: string; count: number }[]
  totalRequests: number
}

export async function fetchRevenueReport(): Promise<RevenueReportDTO | null> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return null

  const rows = await db
    .select({ status: claimRequests.status, count: sql<number>`count(*)` })
    .from(claimRequests)
    .groupBy(claimRequests.status)

  const funnel = rows.map((row) => ({ status: row.status, count: Number(row.count) }))
  const activePlatesCount = funnel.find((row) => row.status === "approved")?.count ?? 0
  const totalRequests = funnel.reduce((sum, row) => sum + row.count, 0)

  return {
    activePlatesCount,
    estimatedAnnualRevenue: activePlatesCount * CLAIM_FEE_COLONES,
    claimFeeColones: CLAIM_FEE_COLONES,
    funnel,
    totalRequests,
  }
}

export interface BrandReportDTO {
  brands: { brand: string; count: number }[]
}

export async function fetchBrandReport(): Promise<BrandReportDTO | null> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return null

  // vehicle_brand is freeform text (no dropdown at submission), so "Toyota" /
  // "toyota" / "TOYOTA " would otherwise count as three different brands.
  // Normalizing case + trimming whitespace here doesn't fix real typos, just
  // the most common source of accidental duplicates.
  const normalizedBrand = sql<string>`lower(trim(${claimRequests.vehicleBrand}))`

  const rows = await db
    .select({ brand: normalizedBrand, count: sql<number>`count(*)` })
    .from(claimRequests)
    .where(eq(claimRequests.status, "approved"))
    .groupBy(normalizedBrand)
    .orderBy(sql`count(*) desc`)

  return {
    brands: rows.map((row) => ({
      brand: row.brand ? row.brand.charAt(0).toUpperCase() + row.brand.slice(1) : "(sin marca)",
      count: Number(row.count),
    })),
  }
}
