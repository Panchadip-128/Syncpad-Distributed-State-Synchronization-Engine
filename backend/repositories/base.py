from typing import Generic, TypeVar, Type
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

T = TypeVar("T")

class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T], session: AsyncSession):
        self.model = model
        self.session = session

    async def get_by_id(self, id: int | str) -> T | None:
        stmt = select(self.model).where(self.model.id == id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def add(self, entity: T) -> T:
        self.session.add(entity)
        return entity

    async def delete(self, entity: T) -> None:
        await self.session.delete(entity)
