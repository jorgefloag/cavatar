"use client"

import { useMemo, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { approveClaim, rejectClaim, revokeClaim, type ClaimDTO } from "./actions"

type StatusFilter = "all" | "pending" | "approved" | "rejected"

const statusLabels: Record<ClaimDTO["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

const statusVariants: Record<ClaimDTO["status"], "default" | "secondary" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "secondary",
}

export function ClaimsTable({ initialClaims }: { initialClaims: ClaimDTO[] }) {
  const [claims, setClaims] = useState(initialClaims)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return claims.filter((claim) => {
      if (statusFilter !== "all" && claim.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (!claim.plateNumber.toLowerCase().includes(q) && !claim.email.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [claims, statusFilter, search])

  const patchClaim = (id: string, patch: Partial<ClaimDTO>) => {
    setClaims((prev) => prev.map((claim) => (claim.id === id ? { ...claim, ...patch } : claim)))
  }

  const runAction = async (id: string, action: (id: string) => Promise<{ success: boolean }>) => {
    setLoadingId(id)
    const result = await action(id)
    if (result.success) {
      patchClaim(id, { reviewedAt: new Date().toISOString() })
    }
    setLoadingId(null)
    return result.success
  }

  const handleApprove = async (id: string) => {
    if (await runAction(id, approveClaim)) patchClaim(id, { status: "approved" })
  }
  const handleReject = async (id: string) => {
    if (await runAction(id, rejectClaim)) patchClaim(id, { status: "rejected" })
  }
  const handleRevoke = async (id: string) => {
    if (await runAction(id, revokeClaim)) patchClaim(id, { status: "rejected" })
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="approved">Aprobados</TabsTrigger>
            <TabsTrigger value="rejected">Rechazados</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Buscar por placa o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((claim) => (
              <TableRow key={claim.id}>
                <TableCell className="font-mono">{claim.plateNumber}</TableCell>
                <TableCell>{claim.email}</TableCell>
                <TableCell>{claim.vehicleBrand}</TableCell>
                <TableCell>
                  <Badge variant={statusVariants[claim.status]}>{statusLabels[claim.status]}</Badge>
                </TableCell>
                <TableCell>{new Date(claim.createdAt).toLocaleDateString("es-MX")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {claim.status === "pending" && (
                      <>
                        <Button size="sm" disabled={loadingId === claim.id} onClick={() => handleApprove(claim.id)}>
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loadingId === claim.id}
                          onClick={() => handleReject(claim.id)}
                        >
                          Rechazar
                        </Button>
                      </>
                    )}
                    {claim.status === "approved" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" disabled={loadingId === claim.id}>
                            Revocar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Revocar este reclamo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esto quita el acceso al buzón de la placa {claim.plateNumber} de inmediato (se borra su
                              contraseña). El dueño podría volver a reclamarla.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevoke(claim.id)}>Revocar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No hay reclamos que coincidan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
