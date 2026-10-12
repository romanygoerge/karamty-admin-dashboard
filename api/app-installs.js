// Vercel Serverless Function: /api/app-installs
// Fetches real-time app installs, active device counts, and OneSignal subscriber metrics
// directly from OneSignal REST API without requiring any app code modifications.

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const appId = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID || 'dfe3a3e8-db66-47e0-bdac-bf09a49b0bb4';
  const customApiKey = req.body?.apiKey || req.headers?.['x-onesignal-key'];
  const restApiKey = customApiKey || process.env.ONESIGNAL_REST_API_KEY;

  if (!restApiKey) {
    return res.status(200).json({
      success: false,
      warning: 'ONESIGNAL_REST_API_KEY_MISSING',
      message: 'يحتاج جلب الإحصائيات المباشرة إلى OneSignal REST API Key لربط السحابة لحظياً.',
      appId,
      mockData: {
        totalDevices: null,
        messageableDevices: null,
        status: 'awaiting_key'
      }
    });
  }

  try {
    const response = await fetch(`https://onesignal.com/api/v1/apps/${appId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${restApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: 'ONESIGNAL_API_ERROR',
        details: errText,
        appId
      });
    }

    const data = await response.json();

    return res.status(200).json({
      success: true,
      appId: data.id,
      appName: data.name,
      totalDevices: data.players || 0,
      messageableDevices: data.messageable_players || 0,
      updatedAt: data.updated_at || new Date().toISOString()
    });
  } catch (error) {
    console.error('Error querying OneSignal app installs:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'فشل الاتصال بخدمة الإحصائيات السحابية'
    });
  }
}
