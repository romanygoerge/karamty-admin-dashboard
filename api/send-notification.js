// Vercel Serverless Function: /api/send-notification
// Securely proxies notification dispatch to OneSignal using environment variables
// ONESIGNAL_APP_ID & ONESIGNAL_REST_API_KEY (stored safely in Vercel settings)

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is accepted.' });
  }

  try {
    const { title, message, target = 'all', data = {}, targetUserId, targetUserIds } = req.body || {};

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    // Read securely from Vercel Environment Variables
    const appId = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID || 'dfe3a3e8-db66-47e0-bdac-bf09a49b0bb4';
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!restApiKey) {
      console.warn('ONESIGNAL_REST_API_KEY is not set in Vercel environment variables.');
      return res.status(200).json({
        success: false,
        warning: 'ONESIGNAL_REST_API_KEY_MISSING',
        message: 'تم استلام الإشعار ولكن يجب ضبط ONESIGNAL_REST_API_KEY في إعدادات Vercel لتسليمه للأجهزة.',
        appId
      });
    }

    const payload = {
      app_id: appId,
      headings: { en: title, ar: title },
      contents: { en: message, ar: message },
      data: {
        ...data,
        sent_at: new Date().toISOString()
      },
      android_channel_id: 'karamty_general',
      small_icon: 'ic_launcher'
    };

    // Determine target recipients
    const userIds = targetUserIds || (targetUserId ? [targetUserId] : null);
    if (userIds && userIds.length > 0) {
      payload.include_aliases = {
        external_id: userIds
      };
      payload.target_channel = 'push';
    } else if (target === 'servants') {
      payload.filters = [
        { field: 'tag', key: 'role', relation: '=', value: 'خادم' },
        { operator: 'OR' },
        { field: 'tag', key: 'role', relation: '=', value: 'أمين خدمة' }
      ];
    } else {
      payload.included_segments = ['Total Subscriptions'];
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Key ${restApiKey}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: result.errors || 'Failed to dispatch notification via OneSignal',
        details: result
      });
    }

    return res.status(200).json({
      success: true,
      id: result.id,
      recipients: result.recipients,
      external_id: result.external_id
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
