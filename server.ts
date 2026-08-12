import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getRegistryStats } from './server/registry';
import { extractSignalsFromInput } from './server/geminiExtractor';
import { checkSafeBrowsing } from './server/safeBrowsing';
import { computeRiskAnalysis } from './server/riskEngine';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security and json parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Simple memory rate limiter
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = Number(process.env.AI_RATE_LIMIT) || 20; // 20 requests per window
const RATE_LIMIT_WINDOW = Number(process.env.AI_RATE_WINDOW_MS) || 300000; // 5 minutes

function rateLimitMiddleware(req: Request, res: Response, next: () => void) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const record = ipRequestCounts.get(ip);
  if (!record || now > record.resetTime) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (record.count >= RATE_LIMIT_MAX) {
    res.status(429).json({
      error: 'Quá nhiều yêu cầu phân tích trong thời gian ngắn. Vui lòng thử lại sau vài phút.'
    });
    return;
  }

  record.count += 1;
  next();
}

// 1. GET /api/health
app.get('/api/health', (_req: Request, res: Response) => {
  const stats = getRegistryStats();
  res.json({
    status: 'ok',
    officialDomainEntities: stats.officialDomainEntities,
    officialBankEntities: stats.officialBankEntities,
    licensedForeignBranches: stats.licensedForeignBranches,
    licensedForeignBranchesAsOf: stats.licensedForeignBranchesAsOf,
    registryEntries: stats.registryEntries
  });
});

// 2. POST /api/analyze
app.post('/api/analyze', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { text = '', imageBase64, mimeType } = req.body;

    if (!text && !imageBase64) {
      res.status(400).json({ error: 'Vui lòng cung cấp nội dung văn bản, đường dẫn URL hoặc ảnh đính kèm để kiểm tra.' });
      return;
    }

    // Step A: Multimodal Extraction via Gemini (or fallback)
    const extractedSignals = await extractSignalsFromInput(text, imageBase64, mimeType);

    // Step B: Optional Safe Browsing check on all extracted URLs
    const safeBrowsingStatus = await checkSafeBrowsing(extractedSignals.extractedUrls);

    // Step C: Compute Risk Analysis with Deterministic Risk Engine
    const analysisResult = computeRiskAnalysis(
      extractedSignals,
      extractedSignals.extractedUrls,
      safeBrowsingStatus,
      text
    );

    res.json(analysisResult);
  } catch (err: any) {
    console.error('Error during analysis endpoint:', err);
    const msg = err?.message || 'Có lỗi xảy ra trong quá trình phân tích dữ liệu. Vui lòng thử lại.';
    const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded');
    
    res.status(isRateLimit ? 429 : 500).json({
      error: isRateLimit
        ? 'Hệ thống AI đang tạm thời bận do vượt quá giới hạn lượt gọi (Rate Limit 429). Vui lòng chờ 10-15 giây rồi thử lại.'
        : msg
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Khoan Đã! Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
