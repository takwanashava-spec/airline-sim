from fastapi import FastAPI
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

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