const KEY = "documento";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS")
      return new Response(null, { headers: CORS });

    if (request.method === "GET") {
      const raw = await env.DOC.get(KEY);
      return json(raw || JSON.stringify({ version: 0, data: null }));
    }

    if (request.method === "POST") {
      const incoming = await request.json();
      const cur = JSON.parse((await env.DOC.get(KEY)) || '{"version":0}');
      if (incoming.version !== cur.version)
        return json(JSON.stringify({ error: "conflict", current: cur }), 409);
      const next = { version: cur.version + 1, data: incoming.data };
      await env.DOC.put(KEY, JSON.stringify(next));
      return json(JSON.stringify(next));
    }

    return new Response("Method not allowed", { status: 405, headers: CORS });
  },
};

function json(body, status = 200) {
  return new Response(body, {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}