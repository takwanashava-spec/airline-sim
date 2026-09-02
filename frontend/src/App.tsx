import { useState, useEffect } from 'react'

const API_URL = window.location.hostname.includes('github.dev')
  ? `https://${window.location.hostname.replace(/-\d+\.app\.github\.dev$/, '-8000.app.github.dev')}`
  : 'http://localhost:8000'

const MY_AIRLINE_ID = 1

interface Airline {
  name: string
  cash_balance: number
}

interface Route {
  id: number
  origin: string
  destination: string
  aircraft: string
  price_economy: number
  last_load_factor: number
}

interface FleetAircraft {
  id: number
  name: string
  seat_capacity: number
  ownership_type: string
  monthly_payment: number
  remaining_balance: number
  status: string
}

interface AircraftType {
  id: number
  name: string
  manufacturer: string
  seat_capacity: number
  max_range_km: number
  purchase_price: number
  lease_price_monthly: number
}

function App() {
  const [airline, setAirline] = useState<Airline | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [fleet, setFleet] = useState<FleetAircraft[]>([])
  const [aircraftTypes, setAircraftTypes] = useState<AircraftType[]>([])
  const [loading, setLoading] = useState(true)
  const [ticking, setTicking] = useState(false)
  const [tab, setTab] = useState<'overview' | 'fleet' | 'buy'>('overview')
  const [buying, setBuying] = useState<number | null>(null)

  const fetchData = async () => {
    const [airlineRes, routesRes, fleetRes, typesRes] = await Promise.all([
      fetch(`${API_URL}/airlines/${MY_AIRLINE_ID}`),
      fetch(`${API_URL}/airlines/${MY_AIRLINE_ID}/routes`),
      fetch(`${API_URL}/airlines/${MY_AIRLINE_ID}/fleet`),
      fetch(`${API_URL}/aircraft-types`)
    ])
    setAirline((await airlineRes.json()).airline)
    setRoutes((await routesRes.json()).routes)
    setFleet((await fleetRes.json()).fleet)
    setAircraftTypes((await typesRes.json()).aircraft_types)
    setLoading(false)
  }

  const handleTick = async () => {
    setTicking(true)
    await fetch(`${API_URL}/tick`, { method: 'POST' })
    await fetchData()
    setTicking(false)
  }

  const handleBuy = async (aircraftTypeId: number, purchaseType: string) => {
    setBuying(aircraftTypeId)
    const res = await fetch(`${API_URL}/fleet/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        airline_id: MY_AIRLINE_ID,
        aircraft_type_id: aircraftTypeId,
        purchase_type: purchaseType
      })
    })
    const data = await res.json()
    if (data.error) {
      alert(data.error)
    } else {
      await fetchData()
      setTab('fleet')
    }
    setBuying(null)
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold">{airline?.name}</h1>
            <p className="text-slate-400">Airline Dashboard</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono text-green-400">
              ${airline?.cash_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-slate-400 text-sm">Cash Balance</p>
          </div>
        </header>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('overview')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'overview' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}>Overview</button>
          <button onClick={() => setTab('fleet')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'fleet' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}>Fleet</button>
          <button onClick={() => setTab('buy')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'buy' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}>Buy Aircraft</button>
          <button
            onClick={handleTick}
            disabled={ticking}
            className="ml-auto bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white font-semibold px-6 py-2 rounded-lg transition"
          >
            {ticking ? 'Advancing...' : 'Advance Day →'}
          </button>
        </div>

        {tab === 'overview' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Routes</h2>
            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-700 text-slate-300 text-sm">
                  <tr>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Aircraft</th>
                    <th className="px-4 py-3">Economy Price</th>
                    <th className="px-4 py-3">Load Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route.id} className="border-t border-slate-700">
                      <td className="px-4 py-3 font-mono">{route.origin} → {route.destination}</td>
                      <td className="px-4 py-3 text-slate-300">{route.aircraft}</td>
                      <td className="px-4 py-3">${route.price_economy}</td>
                      <td className="px-4 py-3">
                        <span className={route.last_load_factor > 0.8 ? 'text-green-400' : route.last_load_factor > 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                          {Math.round(route.last_load_factor * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'fleet' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Fleet</h2>
            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-700 text-slate-300 text-sm">
                  <tr>
                    <th className="px-4 py-3">Aircraft</th>
                    <th className="px-4 py-3">Seats</th>
                    <th className="px-4 py-3">Ownership</th>
                    <th className="px-4 py-3">Monthly Payment</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.map((plane) => (
                    <tr key={plane.id} className="border-t border-slate-700">
                      <td className="px-4 py-3">{plane.name}</td>
                      <td className="px-4 py-3 text-slate-300">{plane.seat_capacity}</td>
                      <td className="px-4 py-3 capitalize">{plane.ownership_type}</td>
                      <td className="px-4 py-3">${plane.monthly_payment.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={plane.status === 'idle' ? 'text-yellow-400' : 'text-green-400'}>
                          {plane.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'buy' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Buy or Lease Aircraft</h2>
            <div className="grid gap-4">
              {aircraftTypes.map((ac) => (
                <div key={ac.id} className="bg-slate-800 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{ac.name}</p>
                    <p className="text-slate-400 text-sm">{ac.manufacturer} · {ac.seat_capacity} seats · {ac.max_range_km}km range</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={buying === ac.id}
                      onClick={() => handleBuy(ac.id, 'cash')}
                      className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-3 py-2 rounded text-sm"
                    >
                      Cash (${ac.purchase_price.toLocaleString()})
                    </button>
                    <button
                      disabled={buying === ac.id}
                      onClick={() => handleBuy(ac.id, 'loan')}
                      className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-3 py-2 rounded text-sm"
                    >
                      Loan (20% down)
                    </button>
                    <button
                      disabled={buying === ac.id}
                      onClick={() => handleBuy(ac.id, 'lease')}
                      className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-3 py-2 rounded text-sm"
                    >
                      Lease (${ac.lease_price_monthly.toLocaleString()}/mo)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
