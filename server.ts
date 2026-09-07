import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/gemini", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY が設定されていません。AI StudioのSecretsで設定を確認してください。" 
        });
      }

      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction: `あなたは知恵の使い魔『カスタムGEM』です。
ユーザーから入力された内容を判定して次のように対応してください：

1. 【数式・計算式・方程式・数学/物理などの公式・化学式・科学記号など（式全般）】の場合：
   - その式や公式の意味、名前、解き方や計算結果、用途を分かりやすく簡潔（1〜3段落程度）に解説してください。
   - 例: 「2x + 6 = 12」→ 一次方程式の解き方と x=3 の解説
   - 例: 「E=mc^2」→ 特殊相対性理論の質量とエネルギーの等価性公式の解説
   - 例: 「NaCl」や「H2O」→ 塩化ナトリウム/水の特徴や化学的性質の解説
   - 例: 「三平方の定理」や「a^2 + b^2 = c^2」→ 直角三角形の斜辺を求めるピタゴラスの定理の解説

2. 【式・公式・計算ではない一般的な言葉や日常会話】の場合：
   - 入力された言葉をそのまま完全にオウム返し（echo）してください。余計な挨拶や前置きは追加しないでください。`,
          temperature: 0.3,
        },
      });

      res.json({ text: response.text || "（返答が得られませんでした）" });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message || "Gemini AIの呼び出し中にエラーが発生しました。" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
