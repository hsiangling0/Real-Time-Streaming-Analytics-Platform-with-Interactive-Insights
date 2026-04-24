from pydantic import BaseModel, Field
from typing import Union, Literal, Annotated


class MarketData(BaseModel):
    symbol: Annotated[str, Field(description="Ticker symbol")]
    source: Annotated[Literal["yfinance", "coingecko"], Field(description="Data provider")]
    currency: str = "USD"


class CustomData(BaseModel):
    x_label: Annotated[str, Field(description="X-axis label")]
    y_label: Annotated[str, Field(description="Y-axis label")]
    file_path: str = ""
    nickname: str = ""


class EventSchema(BaseModel):
    event_type: Literal["market_data", "custom_data"]
    data: Union[MarketData, CustomData]


class AnalyzeRequest(BaseModel):
    dataset_ids: list[int]
    question: str
