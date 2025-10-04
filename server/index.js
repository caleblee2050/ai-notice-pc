// javascript
/**
 * Simple Gemini proxy server
 * - Port: 8000
 * - Purpose: Safely call Google Generative AI from server-side and avoid browser CORS/security issues.
 *
 * Endpoints:
 * @api {post} /api/generate Generate structured document from text
 * @apiName GenerateDocument
 * @apiGroup Documents
 * @apiDescription
 *  Uses Gemini models to convert raw speech text into a structured Korean document.
 *  Validates inputs and falls back across models when necessary.
 *
 * @apiBody {String} text        Source text (required, min 3 chars)
 * @apiBody {String} documentType Document type label (optional, defaults to "보고서")
 *
 * @apiSuccess {String} content  Generated document content
 * @apiError {String} error      Error message
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  // Fail fast to avoid silent errors
  console.error('[Server] Missing GEMINI_API_KEY in environment');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

app.post('/api/generate', async (req, res) => {
  try {
    const { text, documentType = '보고서' } = req.body || {};

    // Basic validation
    if (!text || typeof text !== 'string' || text.trim().length < 3) {
      return res.status(400).json({ error: '유효한 텍스트가 필요합니다(3자 이상).' });
    }

    const prompt = `사용자가 말한 내용을 바탕으로 ${documentType} 형식의 한국어 문서를 작성하세요. 내용은 다음과 같습니다:\n\n${text}\n\n요구사항:\n- 제목, 요약, 본문(항목) 형태로 명확하게 구조화\n- 중복 제거 및 문장 다듬기\n- 핵심만 압축, 불필요한 표현 제거\n- 맞춤법 및 띄어쓰기 보정`;

    // Try models in order of preference (v1beta-supported names)
    const candidates = [process.env.GEMINI_MODEL || 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError = null;
    for (const modelName of candidates) {
      try {
        console.log('[Server] Trying model:', modelName);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();
        return res.json({ content: generatedText });
      } catch (err) {
        console.error('[Server] Model failed:', modelName, err?.message || err);
        lastError = err;
      }
    }

    throw lastError || new Error('문서 생성 실패');
  } catch (error) {
    console.error('[Server] /api/generate error:', error);
    const msg = error?.message || '알 수 없는 오류';
    return res.status(500).json({ error: msg });
  }
});

// Serve static web build if present
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
const webBuildDir = path.join(__dirname, '..', 'web-build');
let staticDir = null;
if (fs.existsSync(distDir)) staticDir = distDir;
else if (fs.existsSync(webBuildDir)) staticDir = webBuildDir;

if (staticDir) {
  console.log('[Server] Serving static web from:', staticDir);
  app.use(express.static(staticDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
} else {
  console.log('[Server] No static web build found. API-only mode.');
}

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => { // <--- 여기에 , '0.0.0.0'을 추가합니다.
   console.log(`[Server] Gemini proxy server started on http://0.0.0.0:${PORT}/`); // 로그도 수정 (선택사항)
 });
