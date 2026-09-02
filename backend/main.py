from fastapi import FastAPI
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os
import random
import math
from pydantic import BaseModel

load_dotenv()

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Airline Sim backend is alive"}

@app.get("/db-check")
def db_check():
    engine = create_engine(os.getenv("DATABASE_URL"))
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return {"database_connected": result.scalar() == 1}
from sqlalchemy import text as sql_text

# A short curated list of major hub airports for starting an airline
STARTER_HUBS = [
    "JFK", "LAX", "ORD", "DFW", "ATL", "MIA", "SFO", "SEA", "DEN", "IAH",
    "LHR", "CDG", "FRA", "AMS", "MAD", "FCO", "MUC", "IST", "ZRH", "CPH",
    "DXB", "DOH", "AUH", "RUH", "JED",
    "HND", "NRT", "ICN", "PEK", "PVG", "HKG", "SIN", "BKK", "KUL", "TPE",
    "DEL", "BOM", "SYD", "MEL", "AKL", "PER",
    "GRU", "GIG", "EZE", "SCL", "BOG", "LIM", "MEX",
    "JNB", "CAI", "NBO", "ADD", "CMN", "LOS",
    "YYZ", "YVR", "YUL",
    "OSL", "ARN", "HEL", "VIE", "BRU", "DUB"
]

class CreateAirlineRequest(BaseModel):
    name: str
    hub_iata_code: str

@app.get("/starter-hubs")
def get_starter_hubs():
    engine = create_engine(os.getenv("DATABASE_URL"))
    with engine.connect() as connection:
        result = connection.execute(
            sql_text("SELECT id, iata_code, name, city, country FROM airports WHERE iata_code = ANY(:codes)"),
            {"codes": STARTER_HUBS}
        )
        hubs = [dict(row._mapping) for row in result]
        return {"hubs": hubs}

@app.post("/airlines")
def create_airline(req: CreateAirlineRequest):
    engine = create_engine(os.getenv("DATABASE_URL"))
    with engine.connect() as connection:
        hub = connection.execute(
            sql_text("SELECT id FROM airports WHERE iata_code = :code"),
            {"code": req.hub_iata_code}
        ).fetchone()

        if not hub:
            return {"error": "Invalid hub airport code"}

        result = connection.execute(
            sql_text("""
                INSERT INTO airlines (name, hub_airport_id, is_ai)
                VALUES (:name, :hub_id, false)
                RETURNING id, name, cash_balance
            """),
            {"name": req.name, "hub_id": hub[0]}
        )
        connection.commit()
        new_airline = dict(result.fetchone()._mapping)
        return {"airline": new_airline}

        from datetime import date

DOWN_PAYMENT_PERCENT = 0.20
LOAN_TERM_MONTHS = 60
ANNUAL_INTEREST_RATE = 0.06

class PurchaseAircraftRequest(BaseModel):
    airline_id: int
    aircraft_type_id: int
    purchase_type: str  # "cash", "loan", or "lease"

def calculate_loan_payment(principal, annual_rate, term_months):
    monthly_rate = annual_rate / 12
    if monthly_rate == 0:
        return principal / term_months
    return principal * (monthly_rate * (1 + monthly_rate) ** term_months) / ((1 + monthly_rate) ** term_months - 1)

@app.post("/fleet/purchase")
def purchase_aircraft(req: PurchaseAircraftRequest):
    engine = create_engine(os.getenv("DATABASE_URL"))
    with engine.connect() as connection:
        airline = connection.execute(
            sql_text("SELECT id, cash_balance FROM airlines WHERE id = :id"),
            {"id": req.airline_id}
        ).fetchone()
        if not airline:
            return {"error": "Airline not found"}

        aircraft = connection.execute(
            sql_text("SELECT id, name, purchase_price, lease_price_monthly FROM aircraft_types WHERE id = :id"),
            {"id": req.aircraft_type_id}
        ).fetchone()
        if not aircraft:
            return {"error": "Aircraft type not found"}

        cash_balance = float(airline.cash_balance)
        purchase_price = float(aircraft.purchase_price)
        lease_price = float(aircraft.lease_price_monthly)

        if req.purchase_type == "cash":
            if cash_balance < purchase_price:
                return {"error": "Insufficient funds for cash purchase"}
            new_balance = cash_balance - purchase_price
            ownership_type = "owned"
            monthly_payment = 0
            remaining_balance = 0
            tx_amount = -purchase_price
            tx_desc = f"Cash purchase: {aircraft.name}"

        elif req.purchase_type == "loan":
            down_payment = purchase_price * DOWN_PAYMENT_PERCENT
            if cash_balance < down_payment:
                return {"error": "Insufficient funds for down payment"}
            loan_principal = purchase_price - down_payment
            monthly_payment = calculate_loan_payment(loan_principal, ANNUAL_INTEREST_RATE, LOAN_TERM_MONTHS)
            new_balance = cash_balance - down_payment
            ownership_type = "financed"
            remaining_balance = loan_principal
            tx_amount = -down_payment
            tx_desc = f"Down payment ({int(DOWN_PAYMENT_PERCENT*100)}%): {aircraft.name}"

        elif req.purchase_type == "lease":
            new_balance = cash_balance
            ownership_type = "leased"
            monthly_payment = lease_price
            remaining_balance = 0
            tx_amount = 0
            tx_desc = f"Leased: {aircraft.name}"

        else:
            return {"error": "purchase_type must be 'cash', 'loan', or 'lease'"}

        connection.execute(
            sql_text("UPDATE airlines SET cash_balance = :balance WHERE id = :id"),
            {"balance": new_balance, "id": req.airline_id}
        )

        fleet_result = connection.execute(
            sql_text("""
                INSERT INTO fleet (airline_id, aircraft_type_id, ownership_type, monthly_payment, remaining_balance)
                VALUES (:airline_id, :aircraft_type_id, :ownership_type, :monthly_payment, :remaining_balance)
                RETURNING id
            """),
            {
                "airline_id": req.airline_id,
                "aircraft_type_id": req.aircraft_type_id,
                "ownership_type": ownership_type,
                "monthly_payment": monthly_payment,
                "remaining_balance": remaining_balance
            }
        )
        fleet_id = fleet_result.fetchone()[0]

        connection.execute(
            sql_text("""
                INSERT INTO transactions (airline_id, type, amount, description)
                VALUES (:airline_id, :type, :amount, :description)
            """),
            {
                "airline_id": req.airline_id,
                "type": "aircraft_purchase",
                "amount": tx_amount,
                "description": tx_desc
            }
        )

        connection.commit()

        return {
            "fleet_id": fleet_id,
            "ownership_type": ownership_type,
            "monthly_payment": round(monthly_payment, 2),
            "remaining_balance": round(remaining_balance, 2),
            "new_cash_balance": round(new_balance, 2)
        }
    import math

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))

class OpenRouteRequest(BaseModel):
    airline_id: int
    fleet_id: int
    origin_iata: str
    destination_iata: str
    price_economy: float
    price_business: float
    price_first: float
    frequency_per_week: int

@app.post("/routes")
def open_route(req: OpenRouteRequest):
    engine = create_engine(os.getenv("DATABASE_URL"))
    with engine.connect() as connection:
        fleet_row = connection.execute(
            sql_text("""
                SELECT f.id, f.status, at.max_range_km, at.name
                FROM fleet f
                JOIN aircraft_types at ON f.aircraft_type_id = at.id
                WHERE f.id = :fleet_id AND f.airline_id = :airline_id
            """),
            {"fleet_id": req.fleet_id, "airline_id": req.airline_id}
        ).fetchone()

        if not fleet_row:
            return {"error": "Fleet aircraft not found or doesn't belong to this airline"}
        if fleet_row.status != "idle":
            return {"error": f"Aircraft is not idle (current status: {fleet_row.status})"}

        origin = connection.execute(
            sql_text("SELECT id, latitude, longitude FROM airports WHERE iata_code = :code"),
            {"code": req.origin_iata}
        ).fetchone()
        destination = connection.execute(
            sql_text("SELECT id, latitude, longitude FROM airports WHERE iata_code = :code"),
            {"code": req.destination_iata}
        ).fetchone()

        if not origin or not destination:
            return {"error": "Invalid origin or destination airport code"}

        distance = haversine_km(origin.latitude, origin.longitude, destination.latitude, destination.longitude)

        if distance > fleet_row.max_range_km:
            return {"error": f"Route distance ({round(distance)}km) exceeds aircraft range ({fleet_row.max_range_km}km) for {fleet_row.name}"}

        result = connection.execute(
            sql_text("""
                INSERT INTO routes (airline_id, origin_airport_id, destination_airport_id, fleet_id, price_economy, price_business, price_first, frequency_per_week)
                VALUES (:airline_id, :origin_id, :dest_id, :fleet_id, :pe, :pb, :pf, :freq)
                RETURNING id
            """),
            {
                "airline_id": req.airline_id,
                "origin_id": origin.id,
                "dest_id": destination.id,
                "fleet_id": req.fleet_id,
                "pe": req.price_economy,
                "pb": req.price_business,
                "pf": req.price_first,
                "freq": req.frequency_per_week
            }
        )
        route_id = result.fetchone()[0]

        connection.execute(
            sql_text("UPDATE fleet SET status = 'assigned' WHERE id = :id"),
            {"id": req.fleet_id}
        )

        connection.commit()

        return {
            "route_id": route_id,
            "distance_km": round(distance),
            "aircraft": fleet_row.name,
            "status": "Route opened"
        }
    import random
from datetime import timedelta

FUEL_PRICE_PER_LITER = 1.00  # tunable placeholder
GAME_DAYS_PER_MONTH = 30
BASE_DAILY_MARKET_DEMAND = 400
DEMAND_ELASTICITY = 1.2
ANNUAL_INTEREST_RATE_TICK = 0.06  # must match purchase logic

def calculate_distance_factor(distance_km):
    return max(0.3, 1 - (distance_km / 15000))

def calculate_reference_price(distance_km):
    return max(50, distance_km * 0.15)

@app.post("/tick")
def run_tick():
    engine = create_engine(os.getenv("DATABASE_URL"))
    with engine.connect() as connection:
        state = connection.execute(sql_text("SELECT * FROM game_state LIMIT 1")).fetchone()
        current_date = state.current_game_date
        day_count = state.game_day_count

        routes = connection.execute(sql_text("""
            SELECT r.id, r.airline_id, r.price_economy, r.price_business, r.price_first,
                   r.frequency_per_week, at.seat_capacity, at.fuel_burn_lph, at.cruise_speed_kmh,
                   o.latitude AS o_lat, o.longitude AS o_lon, d.latitude AS d_lat, d.longitude AS d_lon
            FROM routes r
            JOIN fleet f ON r.fleet_id = f.id
            JOIN aircraft_types at ON f.aircraft_type_id = at.id
            JOIN airports o ON r.origin_airport_id = o.id
            JOIN airports d ON r.destination_airport_id = d.id
        """)).fetchall()

        route_results = []

        for r in routes:
            distance = haversine_km(r.o_lat, r.o_lon, r.d_lat, r.d_lon)
            flights_today = r.frequency_per_week / 7

            distance_factor = calculate_distance_factor(distance)
            reference_price = calculate_reference_price(distance)
            price_factor = (reference_price / max(float(r.price_economy), 1)) ** DEMAND_ELASTICITY
            random_factor = random.uniform(0.85, 1.15)

            market_demand = BASE_DAILY_MARKET_DEMAND * distance_factor * price_factor * random_factor
            seats_available_today = r.seat_capacity * flights_today
            seats_filled = min(market_demand, seats_available_today)

            economy_seats = round(seats_filled * 0.80)
            business_seats = round(seats_filled * 0.15)
            first_seats = round(seats_filled * 0.05)

            revenue = (economy_seats * float(r.price_economy)) + (business_seats * float(r.price_business)) + (first_seats * float(r.price_first))

            flight_hours = distance / r.cruise_speed_kmh
            fuel_cost = flight_hours * float(r.fuel_burn_lph) * FUEL_PRICE_PER_LITER * flights_today

            net = revenue - fuel_cost

            connection.execute(sql_text("""
                UPDATE airlines SET cash_balance = cash_balance + :net WHERE id = :airline_id
            """), {"net": net, "airline_id": r.airline_id})

            connection.execute(sql_text("""
                INSERT INTO transactions (airline_id, date, type, amount, description)
                VALUES (:airline_id, :date, 'route_revenue', :amount, :desc)
            """), {
                "airline_id": r.airline_id, "date": current_date,
                "amount": revenue, "desc": f"Route {r.id} ticket revenue"
            })
            connection.execute(sql_text("""
                INSERT INTO transactions (airline_id, date, type, amount, description)
                VALUES (:airline_id, :date, 'fuel_cost', :amount, :desc)
            """), {
                "airline_id": r.airline_id, "date": current_date,
                "amount": -fuel_cost, "desc": f"Route {r.id} fuel cost"
            })

            route_results.append({
                "route_id": r.id, "load_factor": round(seats_filled / max(seats_available_today, 1), 2),
                "revenue": round(revenue, 2), "fuel_cost": round(fuel_cost, 2), "net": round(net, 2)
            })

        new_day_count = day_count + 1
        new_date = current_date + timedelta(days=1)
        month_boundary = new_day_count % GAME_DAYS_PER_MONTH == 0

        if month_boundary:
            fleet_with_payments = connection.execute(sql_text("""
                SELECT id, airline_id, monthly_payment, remaining_balance, ownership_type
                FROM fleet WHERE monthly_payment > 0
            """)).fetchall()

            for f in fleet_with_payments:
                connection.execute(sql_text("""
                    UPDATE airlines SET cash_balance = cash_balance - :amt WHERE id = :airline_id
                """), {"amt": f.monthly_payment, "airline_id": f.airline_id})

                connection.execute(sql_text("""
                    INSERT INTO transactions (airline_id, date, type, amount, description)
                    VALUES (:airline_id, :date, :type, :amount, :desc)
                """), {
                    "airline_id": f.airline_id, "date": new_date,
                    "type": "lease_payment" if f.ownership_type == "leased" else "loan_payment",
                    "amount": -f.monthly_payment,
                    "desc": f"Monthly {f.ownership_type} payment, fleet {f.id}"
                })

                if f.ownership_type == "financed" and f.remaining_balance > 0:
                    interest_portion = float(f.remaining_balance) * (ANNUAL_INTEREST_RATE_TICK / 12)
                    principal_portion = float(f.monthly_payment) - interest_portion
                    new_balance = max(0, float(f.remaining_balance) - principal_portion)
                    connection.execute(sql_text("""
                        UPDATE fleet SET remaining_balance = :bal WHERE id = :id
                    """), {"bal": new_balance, "id": f.id})

        connection.execute(sql_text("""
            UPDATE game_state SET current_game_date = :date, game_day_count = :count
        """), {"date": new_date, "count": new_day_count})

        connection.commit()

        return {
            "game_date": str(new_date),
            "game_day": new_day_count,
            "month_boundary_hit": month_boundary,
            "routes": route_results
        }
class UpdateRoutePriceRequest(BaseModel):
    price_economy: float
    price_business: float
    price_first: float

@app.patch("/routes/{route_id}/price")
def update_route_price(route_id: int, req: UpdateRoutePriceRequest):
    engine = create_engine(os.getenv("DATABASE_URL"))
    with engine.connect() as connection:
        route = connection.execute(
            sql_text("SELECT id FROM routes WHERE id = :id"),
            {"id": route_id}
        ).fetchone()

        if not route:
            return {"error": "Route not found"}

        connection.execute(
            sql_text("""
                UPDATE routes
                SET price_economy = :pe, price_business = :pb, price_first = :pf
                WHERE id = :id
            """),
            {"pe": req.price_economy, "pb": req.price_business, "pf": req.price_first, "id": route_id}
        )
        connection.commit()

        return {"route_id": route_id, "price_economy": req.price_economy, "price_business": req.price_business, "price_first": req.price_first, "status": "updated"}