import { useState, useEffect } from 'react'

const API_URL = window.location.hostname.includes('github.dev')
  ? `https://${window.location.hostname.replace(/-\d+\.app\.github\.dev$/, '-8000.app.github.dev')}`
  : 'http://localhost:8000'

const MY_AIRLINE_ID = 1

interface Airline {
  name: string
  cash_balance: number
  hub_iata: string
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

interface AirportResult {
  id: number
  iata_code: string
  name: string
  city: string
  country: string
}

function App() {
  const [airline, setAirline] = useState<Airline | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [fleet, setFleet] = useState<FleetAircraft[]>([])
  const [aircraftTypes, setAircraftTypes] = useState<AircraftType[]>([])
  const [loading, setLoading] = useState(true)
  const [ticking, setTicking] = useState(false)
  const [tab, setTab] = useState<'overview' | 'fleet' | 'buy' | 'openroute'>('overview')
  const [buying, setBuying] = useState<number | null>(null)

  const [airportQuery, setAirportQuery] = useState('')
  const [airportResults, setAirportResults] = useState<AirportResult[]>([])
  const [selectedDestination, setSelectedDestination] = useState<AirportResult | null>(null)
  const [selectedFleetId, setSelectedFleetId] = useState<number | ''>('')
  const [priceEconomy, setPriceEconomy] = useState('150')
  const [priceBusiness, setPriceBusiness] = useState('400')
  const [priceFirst, setPriceFirst] = useState('800')
  const [frequency, setFrequency] = useState('7')
  const [opening, setOpening] = useState(false)
  const [routeMessage, setRouteMessage] = useState('')

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

  const searchAirports = async (query: string) => {
    setAirportQuery(query)
    setSelectedDestination(null)
    if (query.length < 2) {
      setAirportResults([])
      return
    }
    const res = await fetch(`${API_URL}/airports/search?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    setAirportResults(data.airports)
  }

  const handleOpenRoute = async () => {
    if (!selectedDestination || !selectedFleetId) {
      setRouteMessage('Pick a destination and an aircraft first')
      return
    }
    setOpening(true)
    setRouteMessage('')
    const res = await fetch(`${API_URL}/routes/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        airline_id: MY_AIRLINE_ID,
        fleet_id: selectedFleetId,
        destination_airport_id: selectedDestination.id,
        price_economy: parseFloat(priceEconomy),
        price_business: parseFloat(priceBusiness),
        price_first: parseFloat(priceFirst),
        frequency_per_week: parseInt(frequency)
      })
    })
    const data = await res.json()
    if (data.error) {
      setRouteMessage(data.error)
    } else {
      setRouteMessage(`Route opened! ${data.distance_km}km`)
      setSelectedDestination(null)
      setAirportQuery('')
      setSelectedFleetId('')
      await fetchData()
      setTimeout(() => setTab('overview'), 1200)
    }
    setOpening(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const idleFleet = fleet.filter(f => f.status === 'idle')

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
            <p className="text-slate-400">Hub: {airline?.hub_iata}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono text-green-400">
              ${airline?.cash_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-slate-400 text-sm">Cash Balance</p>
          </div>
        </header>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setTab('overview')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'overview' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}>Overview</button>
          <button onClick={() => setTab('fleet')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'fleet' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}>Fleet</button>
          <button onClick={() => setTab('buy')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'buy' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}>Buy Aircraft</button>
          <button onClick={() => setTab('openroute')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'openroute' ? 'bg-blue-600' : 'bg-slate-800 text-slate-400'}`}>Open Route</button>
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

        {tab === 'openroute' && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Open a New Route from {airline?.hub_iata}</h2>

            <label className="block text-sm text-slate-400 mb-1">Destination airport</label>
            <input
              type="text"
              value={airportQuery}
              onChange={(e) => searchAirports(e.target.value)}
              placeholder="Search by city, name, or code..."
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 mb-2 text-white"
            />
            {airportResults.length > 0 && !selectedDestination && (
              <div className="bg-slate-900 rounded border border-slate-700 mb-4 max-h-48 overflow-y-auto">
                {airportResults.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => { setSelectedDestination(a); setAirportQuery(`${a.iata_code} — ${a.city}`); setAirportResults([]) }}
                    className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-sm"
                  >
                    <span className="font-mono text-blue-400">{a.iata_code}</span> — {a.name}, {a.city}, {a.country}
                  </div>
                ))}
              </div>
            )}

            <label className="block text-sm text-slate-400 mb-1 mt-4">Aircraft (idle only)</label>
            <select
              value={selectedFleetId}
              onChange={(e) => setSelectedFleetId(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 mb-4 text-white"
            >
              <option value="">Select an aircraft...</option>
              {idleFleet.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.seat_capacity} seats)</option>
              ))}
            </select>
            {idleFleet.length === 0 && (
              <p className="text-yellow-400 text-sm mb-4">No idle aircraft available — buy one first.</p>
            )}

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Economy $</label>
                <input type="number" value={priceEconomy} onChange={(e) => setPriceEconomy(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Business $</label>
                <input type="number" value={priceBusiness} onChange={(e) => setPriceBusiness(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">First $</label>
                <input type="number" value={priceFirst} onChange={(e) => setPriceFirst(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
              </div>
            </div>

            <label className="block text-sm text-slate-400 mb-1">Flights per week</label>
            <input type="number" value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 mb-4 text-white" />

            <button
              onClick={handleOpenRoute}
              disabled={opening}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              {opening ? 'Opening...' : 'Open Route'}
            </button>

            {routeMessage && <p className="mt-3 text-sm text-slate-300">{routeMessage}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
