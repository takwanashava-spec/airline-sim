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

function App() {
  const [airline, setAirline] = useState<Airline | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [ticking, setTicking] = useState(false)

  const fetchData = async () => {
    const [airlineRes, routesRes] = await Promise.all([
      fetch(`${API_URL}/airlines/${MY_AIRLINE_ID}`),
      fetch(`${API_URL}/airlines/${MY_AIRLINE_ID}/routes`)
    ])
    const airlineData = await airlineRes.json()
    const routesData = await routesRes.json()
    setAirline(airlineData.airline)
    setRoutes(routesData.routes)
    setLoading(false)
  }

  const handleTick = async () => {
    setTicking(true)
    await fetch(`${API_URL}/tick`, { method: 'POST' })
    await fetchData()
    setTicking(false)
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
        <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
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

        <button
          onClick={handleTick}
          disabled={ticking}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg transition mb-8"
        >
          {ticking ? 'Advancing...' : 'Advance Day →'}
        </button>

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
    </div>
  )
}

export default App
