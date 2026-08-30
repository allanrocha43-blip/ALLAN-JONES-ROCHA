import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/extrair-operadora', async (req, res) => {
    try {
      const { texto } = req.body;
      if (!texto || typeof texto !== 'string' || !texto.trim()) {
        return res.status(400).json({ error: 'Texto de entrada é obrigatório.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'Chave de API GEMINI_API_KEY não configurada no servidor. Por favor, adicione-a no painel Secrets.'
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const instrucaoSistema = `Você é um validador especialista em dados da Agência Nacional de Saúde Suplementar (ANS) no Brasil. 
Seu objetivo é analisar textos brutos fornecidos pelo usuário e extrair informações das operadoras.

REGRAS DE SAÍDA:
Responda APENAS em JSON válido. Sem formatação Markdown.
CNPJ: apenas números (14 dígitos).
Registro ANS: 6 dígitos (preencha com zeros à esquerda se precisar).
Se não achar o dado, retorne null.

FORMATO OBRIGATÓRIO:
{
  "razao_social": "...",
  "cnpj": "...",
  "registro_ans": "..."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: texto,
        config: {
          systemInstruction: instrucaoSistema,
          temperature: 0.0,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      let parsedJson;
      try {
        parsedJson = JSON.parse(responseText);
      } catch {
        parsedJson = {
          razao_social: null,
          cnpj: null,
          registro_ans: null,
          raw: responseText,
        };
      }

      return res.json({ success: true, data: parsedJson });
    } catch (err: any) {
      console.error('Erro na rota /api/extrair-operadora:', err);
      return res.status(500).json({
        error: err?.message || 'Erro interno ao processar a requisição com Gemini.'
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
