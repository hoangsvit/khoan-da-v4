import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getRegistryStats } from './server/registry';
import { extractSignalsFromInput, generateFinalConsumerResponse } from './server/geminiExtractor';
import { detectConsumerModeWithGemini } from './server/geminiModeDetector';
import { checkSafeBrowsing } from './server/safeBrowsing';
import { computeRiskAnalysis } from './server/riskEngine';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = Number(process.env.AI_RATE_LIMIT) || 20;
const RATE_LIMIT_WINDOW = Number(process.env.AI_RATE_WINDOW_MS) || 300000;

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
      error: 'Bạn đã kiểm tra khá nhiều lần trong thời gian ngắn. Vui lòng chờ một chút rồi thử lại.',
      code: 'APP_RATE_LIMITED'
    });
    return;
  }

  record.count += 1;
  next();
}

app.get('/api/health', (_req: Request, res: Response) => {
  const stats = getRegistryStats();

  res.json({
    status: 'ok',
    analysisMode: 'gemini-only',
    inputRouting: 'gemini-auto-detect',
    promptStrategy: 'evidence-first-v2',
    geminiConfigured: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
    model: process.env.GEMINI_MODEL || 'auto',
    officialDomainEntities: stats.officialDomainEntities,
    officialBankEntities: stats.officialBankEntities,
    licensedForeignBranches: stats.licensedForeignBranches,
    licensedForeignBranchesAsOf: stats.licensedForeignBranchesAsOf,
    registryEntries: stats.registryEntries
  });
});

app.post('/api/analyze', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { text = '', imageBase64, mimeType } = req.body;

    if (!text && !imageBase64) {
      res.status(400).json({
        error: 'Vui lòng cung cấp nội dung văn bản, đường dẫn URL hoặc ảnh đính kèm để kiểm tra.'
      });
      return;
    }

    // Stage 0: Gemini automatically detects the input context. The user does
    // not need to choose a category before analysis.
    const consumerMode = await detectConsumerModeWithGemini(text, imageBase64, mimeType);

    // Stage 1: Gemini understands the supplied text/image using the detected
    // context. There is intentionally no local response fallback path.
    const extractedSignals = await extractSignalsFromInput(
      text,
      imageBase64,
      mimeType,
      consumerMode
    );

    // Stage 2: local services only produce machine-readable verification signals.
    // They never write the consumer-facing answer.
    const safeBrowsingStatus = await checkSafeBrowsing(extractedSignals.extractedUrls);
    const technicalResult = computeRiskAnalysis(
      extractedSignals,
      extractedSignals.extractedUrls,
      safeBrowsingStatus,
      text
    );

    let responseResult = technicalResult;

    try {
      // Stage 3: Gemini writes the final consumer answer after seeing both its
      // contextual understanding and the technical verification signals.
      const finalAi = await generateFinalConsumerResponse({
        originalText: text,
        mode: consumerMode,
        extracted: extractedSignals,
        technicalAssessment: {
          minimumRiskLevel: technicalResult.riskLevel,
          detectedBrandMismatch: technicalResult.detectedBrandMismatch,
          mismatchDetails: technicalResult.mismatchDetails,
          matchedInstitution: technicalResult.matchedInstitution ? {
            name: technicalResult.matchedInstitution.name,
            verification: technicalResult.matchedInstitution.verification,
            officialDomains: technicalResult.matchedInstitution.officialDomains
          } : undefined,
          safeBrowsing: {
            checked: technicalResult.safeBrowsingStatus.checked,
            hasMatch: technicalResult.safeBrowsingStatus.hasMatch,
            matches: technicalResult.safeBrowsingStatus.matches
          },
          urlSignals: technicalResult.urlCheckSignals.map(signal => ({
            url: signal.url,
            domain: signal.domain,
            riskFlags: signal.riskFlags,
            suspiciousKeywords: signal.suspiciousKeywords
          }))
        }
      });

      responseResult = {
        ...technicalResult,
        riskLevel: finalAi.riskLevel,
        headlineTitle: finalAi.headlineTitle,
        headlineSubtitle: finalAi.headlineSubtitle,
        riskScoreDescription: finalAi.riskScoreDescription,
        scamCategory: finalAi.scamCategory,
        aiDetailedReasoning: finalAi.aiDetailedReasoning,
        reasons: finalAi.reasons,
        actionSteps: finalAi.actionSteps,
        disclaimer: finalAi.disclaimer,
        analysisEngine: 'GEMINI_AI_100'
      };
    } catch (finalError: any) {
      // The first Gemini pass already succeeded. If the refinement pass is
      // temporarily unavailable, use only the first Gemini-generated copy.
      console.warn('[Gemini AI] Final response refinement unavailable; using Gemini first-pass copy only:', finalError?.message || finalError);

      responseResult = {
        ...technicalResult,
        headlineTitle: extractedSignals.aiHeadlineTitle || '',
        headlineSubtitle: extractedSignals.aiHeadlineSubtitle || '',
        riskScoreDescription: extractedSignals.aiRiskScoreDescription || '',
        scamCategory: extractedSignals.scamCategory,
        aiDetailedReasoning: extractedSignals.aiDetailedReasoning,
        reasons: [...(extractedSignals.aiReasons || [])],
        actionSteps: [...(extractedSignals.aiActionSteps || [])],
        analysisEngine: 'GEMINI_AI_100'
      };
    }

    res.json(responseResult);
  } catch (err: any) {
    console.error('Error during Gemini analysis endpoint:', err);

    const message = String(err?.message || err || '');
    const isRateLimit =
      err?.status === 429 ||
      message.includes('429') ||
      message.includes('RESOURCE_EXHAUSTED') ||
      message.includes('Quota exceeded');

    const status = Number(err?.status || (isRateLimit ? 429 : 503));
    const publicMessage = err?.publicMessage || (
      isRateLimit
        ? 'Gemini đang bận do giới hạn lượt phân tích. Vui lòng chờ một chút rồi thử lại.'
        : 'Gemini chưa thể hoàn tất phân tích lúc này. Vui lòng thử lại sau.'
    );

    res.status(status).json({
      error: publicMessage,
      code: err?.code || (isRateLimit ? 'GEMINI_RATE_LIMITED' : 'GEMINI_UNAVAILABLE')
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
    console.log(`Analysis mode: Gemini only (${process.env.GEMINI_MODEL || 'automatic model selection'})`);
    console.log('Input routing: Gemini auto-detect');
    console.log('Prompt strategy: evidence-first-v2 with few-shot controls');
  });
}

startServer();
