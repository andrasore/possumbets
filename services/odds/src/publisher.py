import aio_pika

from models import OddsEvent
from generated.events_pb2 import OddsUpdatedEvent

EXCHANGE_NAME = "odds.updated"


class OddsPublisher:
    def __init__(self, rabbitmq_url: str):
        self._url = rabbitmq_url
        self._connection: aio_pika.abc.AbstractRobustConnection | None = None
        self._exchange: aio_pika.abc.AbstractExchange | None = None

    async def _ensure_connected(self) -> aio_pika.abc.AbstractExchange:
        if self._exchange is None:
            self._connection = await aio_pika.connect_robust(self._url)
            channel = await self._connection.channel()
            self._exchange = await channel.declare_exchange(
                EXCHANGE_NAME, aio_pika.ExchangeType.FANOUT, durable=False
            )
        return self._exchange

    async def publish(self, event: OddsEvent) -> None:
        exchange = await self._ensure_connected()
        payload = OddsUpdatedEvent(
            event_id=event.event_id,
            sport=event.sport,
            home_team=event.home_team,
            away_team=event.away_team,
            home_odds=event.home_odds,
            away_odds=event.away_odds,
            draw_odds=event.draw_odds,
            updated_at=event.updated_at,
        ).SerializeToString()
        await exchange.publish(aio_pika.Message(body=payload), routing_key="")

    async def close(self) -> None:
        if self._connection is not None:
            await self._connection.close()
            self._connection = None
            self._exchange = None
