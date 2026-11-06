async function userFromToken(token) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key || !token) return null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
const bearer = (req) => (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
module.exports = { userFromToken, bearer };
