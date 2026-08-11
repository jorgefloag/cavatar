import { fetchMessages } from "./actions"
import { MessagesTable } from "./messages-table"

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; plate?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) > 0 ? Number(params.page) : 1
  const plate = params.plate ?? ""

  const result = await fetchMessages({ page, plate: plate || undefined })

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-foreground md:text-3xl">Mensajes</h1>
      <MessagesTable initialResult={result} initialPlateFilter={plate} />
    </div>
  )
}
