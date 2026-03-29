"""Entry point to run the FastAPI server with environment variables loaded."""
import os
import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    _on_render = os.environ.get("RENDER", "").lower() in ("true", "1", "yes")
    use_reload = not _on_render and os.environ.get("ENV") != "production"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=use_reload)
