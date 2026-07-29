import { Request, Response, NextFunction } from 'express'
import { isLodgifyConfigured } from '../../config/lodgify'
import { getProperties } from '../../services/lodgifyService'

/** GET /api/test/lodgify-connection — verify API key works */
export async function testLodgifyConnection(_req: Request, res: Response, _next: NextFunction) {
  if (!isLodgifyConfigured()) {
    res.status(503).json({
      success: false,
      message: 'LODGIFY_API_KEY is not set in environment',
    })
    return
  }

  try {
    const properties = await getProperties({ page: 1, size: 5, includeCount: true })
    const count = Array.isArray(properties)
      ? properties.length
      : Array.isArray((properties as { items?: unknown[] })?.items)
        ? (properties as { items: unknown[] }).items.length
        : Array.isArray((properties as { data?: unknown[] })?.data)
          ? (properties as { data: unknown[] }).data.length
          : null

    res.json({
      success: true,
      message: 'Lodgify API connection successful',
      propertySampleCount: count,
      // Return a trimmed sample so you can map lodgifyPropertyId / lodgifyRoomTypeId
      properties,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Lodgify test] connection failed:', message)
    res.status(502).json({
      success: false,
      message: 'Lodgify API connection failed',
      error: message,
    })
  }
}
