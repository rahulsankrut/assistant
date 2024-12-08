from fastapi import APIRouter, HTTPException

# Create the router with a prefix
router = APIRouter(
    prefix="/api/patients",
    tags=["patients"]
)

@router.get("/")  # This will become /api/patients/
async def get_patients():
    return {"message": "Patient routes working"}

# Make sure the router is available at module level
__all__ = ["router"] 