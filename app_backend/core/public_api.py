import yfinance as yf
import requests
from datetime import datetime


def format_ts(ts):
    return datetime.fromtimestamp(ts / 1000).isoformat()


def fetch_stock(symbol, period="1mo", interval="1d"):
    stock = yf.Ticker(symbol)
    data = stock.history(period=period, interval=interval)
    return [{"time": str(idx), "price": float(row["Close"])} for idx, row in data.iterrows()]


def fetch_crypto_series(symbol="bitcoin", days=1):
    url = f"https://api.coingecko.com/api/v3/coins/{symbol}/market_chart?vs_currency=usd&days={days}"
    data = requests.get(url).json()

    return [{"time": format_ts(p[0]), "price": p[1]} for p in data["prices"]]
