from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import DataResponse
from app.services.dashboard_service import overview

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview")
async def dashboard_overview(
    user: CurrentUser,
    session: DbSession,
    _range: str | None = Query(default="30d", alias="range"),
) -> DataResponse[dict]:
    data = await overview(session, user.organization_id)
    return DataResponse(data=data, meta={"illustrative": True})
