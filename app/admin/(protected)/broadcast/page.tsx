import { fetchBrandOptions, fetchBroadcastHistory } from "./actions"
import { BroadcastManager } from "./broadcast-manager"

export default async function AdminBroadcastPage() {
  const [brandOptions, history] = await Promise.all([fetchBrandOptions(), fetchBroadcastHistory()])

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-foreground md:text-3xl">Mensajes masivos</h1>
      <BroadcastManager brandOptions={brandOptions} initialHistory={history} />
    </div>
  )
}
