import type { VercelRequest, VercelResponse } from '@vercel/node';
import { startBot, client } from '../bot';

// Global variable to track if bot has been started
let botStarted = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set proper headers
  res.setHeader('Content-Type', 'application/json');
  
  try {
    // Start the bot if not already started
    if (!botStarted && process.env.DISCORD_TOKEN) {
      console.log('🚀 Starting Discord bot from Vercel function...');
      botStarted = true;
      
      // Start bot in background (don't await to avoid timeout)
      startBot().catch(err => {
        console.error('❌ Bot startup error:', err);
        botStarted = false;
      });
    }

    // Handle different HTTP methods
    if (req.method === 'GET') {
      // Health check endpoint
      return res.status(200).json({
        status: 'ok',
        bot: {
          started: botStarted,
          ready: client.isReady(),
          user: client.user?.tag || null,
          guilds: client.guilds.cache.size,
          uptime: client.uptime ? Math.floor(client.uptime / 1000) : 0
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    }

    if (req.method === 'POST') {
      // Handle Discord interactions (for future HTTP interactions support)
      const body = req.body;
      
      // Ping pong for Discord verification
      if (body?.type === 1) {
        return res.status(200).json({ type: 1 });
      }

      // Handle other interaction types here
      return res.status(200).json({
        type: 4,
        data: {
          content: 'Bot is running on Vercel!'
        }
      });
    }

    // Method not allowed
    return res.status(405).json({
      error: 'Method not allowed',
      allowedMethods: ['GET', 'POST']
    });

  } catch (error) {
    console.error('❌ Handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
