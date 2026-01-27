from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.api import files, connectors, workflows, property, ai
from app.api.v1 import da_tracking, property_sales, tiles


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings = get_settings()
    print(f"Starting {settings.app_name}")
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title="Siteora API",
    description="AI-Powered GIS Platform - Property analysis, spatial insights, and site assessment tools",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(files.router, prefix="/api/v1")
app.include_router(connectors.router, prefix="/api/v1")
app.include_router(workflows.router, prefix="/api/v1")
app.include_router(property.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(da_tracking.router, prefix="/api/v1")
app.include_router(property_sales.router, prefix="/api/v1")
app.include_router(tiles.router, prefix="/api/v1")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "name": "Siteora API",
        "status": "healthy",
        "version": "0.1.0",
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "services": {
            "api": "up",
            "database": "configured",
            "storage": "configured",
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
