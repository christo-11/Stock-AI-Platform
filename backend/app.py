from flask import Flask, jsonify, request

try:
    from flask_cors import CORS
except ImportError:
    def CORS(app):
        @app.after_request
        def add_cors_headers(response):
            origin = request.headers.get("Origin")
            if origin in {"http://localhost:3000", "http://127.0.0.1:3000"}:
                response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            return response

from backend.db import init_db
from backend.routes.portfolio import portfolio_api
from backend.routes.predict import predict_api


def create_app():
    app = Flask(__name__)
    CORS(app)
    init_db()
    app.register_blueprint(predict_api, url_prefix="/api")
    app.register_blueprint(portfolio_api, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "stock-ai-platform"})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
