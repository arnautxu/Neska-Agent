"""Neska's local reranker for LibreChat web search.

LibreChat cuts every page it reads into short chunks and asks a reranker which ones answer
the question. Without one it keeps the first chunks of each page, which are usually menus.
This service answers the Jina rerank API (POST /v1/rerank) on the private compose network,
so no outside service or key is needed. Scoring is BM25 over the chunks of one request
(accents and case folded), with a penalty for chunks that are mostly links or markup.
Standard library only.
"""
import json
import math
import re
import unicodedata
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_BODY = 8 * 1024 * 1024
K1, B = 1.4, 0.75
WORD = re.compile(r"[a-z0-9]+")
LINK = re.compile(r"\[[^\]]*\]\([^)]*\)|https?://\S+")
# Very common words in Catalan, Spanish and English: they say nothing about relevance.
STOP = set(
    """a al als amb de del dels el els en es i la les o per que un una uns unes
    the of and to in on for is are be with as at by an or from this that
    y los las por con para se lo""".split()
)


def fold(text):
    text = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in text if not unicodedata.combining(c))


def terms(text):
    return [w for w in WORD.findall(fold(text)) if w not in STOP and len(w) > 1]


def doc_text(doc):
    if isinstance(doc, dict):
        return str(doc.get("text", ""))
    return str(doc)


def noise(text):
    """Share of the chunk taken by links, images and table or list markup (0 to 1)."""
    if not text:
        return 1.0
    linky = sum(len(m) for m in LINK.findall(text))
    marks = sum(text.count(c) for c in "|*#![]()")
    return min(1.0, (linky + marks) / len(text))


def rerank(query, docs, top_n):
    q = set(terms(query))
    toks = [terms(d) for d in docs]
    n = len(docs)
    avg = (sum(len(t) for t in toks) / n) if n else 0
    df = {w: sum(1 for t in toks if w in t) for w in q}
    raw = []
    for t, d in zip(toks, docs):
        s = 0.0
        if t and q:
            for w in q:
                f = t.count(w)
                if f:
                    idf = math.log(1 + (n - df[w] + 0.5) / (df[w] + 0.5))
                    s += idf * f * (K1 + 1) / (f + K1 * (1 - B + B * len(t) / (avg or 1)))
        raw.append(s * (1 - 0.8 * noise(d)))
    top = max(raw) if raw else 0
    order = sorted(range(n), key=lambda i: raw[i], reverse=True)[:top_n]
    return [{"index": i, "relevance_score": round(raw[i] / top, 4) if top else 0.0} for i in order]


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, {"ok": True})
        self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path.rstrip("/") not in ("/v1/rerank", "/rerank"):
            return self._send(404, {"error": "not found"})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self._send(413, {"error": "bad size"})
        try:
            req = json.loads(self.rfile.read(length))
            docs = [doc_text(d) for d in req.get("documents", [])]
            query = str(req.get("query", ""))
            top_n = int(req.get("top_n") or len(docs))
        except (ValueError, TypeError, AttributeError):
            return self._send(400, {"error": "bad request"})
        results = rerank(query, docs, max(0, top_n))
        if req.get("return_documents"):
            for r in results:
                r["document"] = {"text": docs[r["index"]]}
        self._send(200, {"model": "neska-bm25", "results": results, "usage": {"total_tokens": 0}})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", "8890"))
    ThreadingHTTPServer((os.environ.get("HOST", "0.0.0.0"), port), Handler).serve_forever()
