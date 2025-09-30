from fastapi import FastAPI
from .routes import router as api_router

app = FastAPI(title="Gemini Backend")

# Include the API router
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def read_root():
    """
    Root endpoint for the backend server.
    """
    return {"message": "Welcome to the Gemini Multi-Agent AI System Backend"}