export default async function handler(req, res) {
    const { KV_REST_API_URL, KV_REST_API_TOKEN, WRITE_TOKEN } = process.env;
    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
        res.status(500).json({ error: 'KV is not configured' });
        return;
    }

    try {
        if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const teamId = url.searchParams.get('teamId');
            if (!teamId) {
                res.status(400).json({ error: 'teamId is required' });
                return;
            }
            const kvRes = await fetch(`${KV_REST_API_URL}/get/state:${encodeURIComponent(teamId)}`, {
                headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
            });
            const kvJson = await kvRes.json();
            let state = null;
            if (kvJson && typeof kvJson.result !== 'undefined' && kvJson.result !== null) {
                try { state = JSON.parse(kvJson.result); } catch (_) { state = kvJson.result; }
            }
            res.setHeader('Cache-Control', 'no-store');
            res.status(200).json({ state });
            return;
        }

        if (req.method === 'POST') {
            const body = req.body || await getJsonBody(req);
            const { teamId, state, token } = body || {};
            if (!teamId || !state) {
                res.status(400).json({ error: 'teamId and state are required' });
                return;
            }
            if (WRITE_TOKEN && token !== WRITE_TOKEN) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const value = JSON.stringify(state);
            const kvRes = await fetch(`${KV_REST_API_URL}/set/state:${encodeURIComponent(teamId)}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${KV_REST_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ value })
            });
            if (!kvRes.ok) {
                const text = await kvRes.text();
                res.status(502).json({ error: 'KV set failed', detail: text });
                return;
            }
            res.setHeader('Cache-Control', 'no-store');
            res.status(200).json({ ok: true });
            return;
        }

        res.setHeader('Allow', 'GET, POST');
        res.status(405).json({ error: 'Method Not Allowed' });
    } catch (e) {
        res.status(500).json({ error: e.message || 'Server error' });
    }
}

async function getJsonBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
            try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); }
        });
        req.on('error', reject);
    });
}


