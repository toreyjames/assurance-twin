// Placeholder API route - to be implemented
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }
  return res.status(501).json({ error: 'This API route is not yet implemented. Please use Automotive for now.' })
}

