import { Ai } from "@cloudflare/ai";

const AVAILABLE_MODELS = [
  { id: "@cf/meta/llama-3-8b-instruct", label: "LLaMA 3 8B Instruct" },
  { id: "@cf/meta/llama-3.1-8b-instruct", label: "LLaMA 3.1 8B Instruct" },
  { id: "@cf/meta/llama-3.1-70b-instruct", label: "LLaMA 3.1 70B Instruct" },
  { id: "@cf/gemma-7b-it", label: "Gemma 7B Instruct" },
  { id: "@cf/qwen/qwen1.5-14b-chat-int8", label: "Qwen 1.5 14B Chat (int8)" },
	{ id: "@cf/meta/llama-4-scout-17b-16e-instruct", label: "LLaMA 4 Scout 17B 16e Instruct" },
	{ id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", label: "LLaMA 4 Scout 70B 16e Instruct" },
	{ id: "@cf/openai/gpt-oss-20b", label: "GPT-OSS 20B" },
	{ id: "@cf/google/gemma-3-12b-it", label: "Gemma 3 12B Instruct" },
];

const generateHtml = () => `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Workers AI Playground</title>
    <style>
      :root { font-family: system-ui, sans-serif; }
      body { margin: 0; padding: 24px; background: #f7f7f8; color: #1f1f1f; }
      h1 { margin-bottom: 0.5rem; }
      form { display: grid; gap: 12px; max-width: 720px; }
      label { font-weight: 600; }
      select, textarea, input, button { font: inherit; }
      select, textarea, input { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #d5d7db; }
      textarea { min-height: 160px; resize: vertical; }
      button { cursor: pointer; padding: 10px 16px; border: none; border-radius: 8px; background: #0d6efd; color: white; font-weight: 600; }
      button:disabled { opacity: 0.65; cursor: wait; }
      .result { margin-top: 24px; padding: 16px; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(15,23,42,0.08); }
      .result__title { margin-top: 0; }
      .result__body { white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, SFMono, Menlo, Consolas, Liberation Mono, monospace; font-size: 0.95rem; }
      .error { color: #b42318; }
      .footer { margin-top: 32px; color: #4b5563; font-size: 0.875rem; }
      a { color: inherit; }
    </style>
  </head>
  <body>
    <h1>Workers AI Playground</h1>
    <p>Cloudflare Workers AIで利用可能なテキストモデルを試せます。</p>
    <form id="playground">
      <label for="model">モデル</label>
      <select id="model" name="model">
        ${AVAILABLE_MODELS.map(({ id, label }) => `<option value="${id}">${label}</option>`).join("")}
      </select>
      <label for="prompt">プロンプト</label>
      <textarea id="prompt" name="prompt" placeholder="今日は何を手伝えばいい？"></textarea>
      <label for="maxTokens">最大トークン数 (出力)</label>
      <input id="maxTokens" name="maxTokens" type="number" min="16" max="4096" value="512" />
      <button type="submit">送信</button>
    </form>
    <section class="result" hidden>
      <h2 class="result__title">結果</h2>
      <pre class="result__body"></pre>
    </section>
    <p class="footer">
      他のモデルIDを試す場合はAPIを直接呼び出してください。モデル一覧は
      <a href="https://developers.cloudflare.com/workers-ai/models/" target="_blank" rel="noreferrer">公式ドキュメント</a>を参照してください。
    </p>
    <script type="module">
      const form = document.querySelector('#playground');
      const resultContainer = document.querySelector('.result');
      const resultBody = document.querySelector('.result__body');
      const submitButton = form.querySelector('button[type="submit"]');

      const updateResult = (text, isError = false) => {
        resultBody.textContent = text;
        resultBody.classList.toggle('error', isError);
        resultContainer.hidden = false;
      };

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const model = formData.get('model');
        const prompt = formData.get('prompt');
        const maxTokensRaw = formData.get('maxTokens');
        const parsedMaxTokens = maxTokensRaw ? Number(maxTokensRaw) : undefined;
        const maxTokens = Number.isFinite(parsedMaxTokens)
          ? Math.min(4096, Math.max(16, Math.floor(parsedMaxTokens)))
          : undefined;

        if (!prompt.trim()) {
          updateResult('プロンプトを入力してください。', true);
          return;
        }

        submitButton.disabled = true;
        updateResult('推論中...', false);

        try {
          const response = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, maxTokens })
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || (response.status + ' ' + response.statusText));
          }

          const data = await response.json();
          updateResult(JSON.stringify(data, null, 2));
        } catch (error) {
          updateResult(error.message, true);
        } finally {
          submitButton.disabled = false;
        }
      });
    </script>
  </body>
</html>`;

const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;

async function handleInference(request, env) {
  let payload;

  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const modelId = (payload.model || DEFAULT_MODEL).trim();
  const prompt = (payload.prompt || "").trim();
  const maxTokensInput = Number(payload.maxTokens);
  const maxTokens = Number.isFinite(maxTokensInput)
    ? Math.min(4096, Math.max(16, Math.floor(maxTokensInput)))
    : undefined;

  if (!prompt) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const ai = new Ai(env.AI);

  try {
    const options = {
      messages: [{ role: "user", content: prompt }],
      input: prompt
    };

    if (maxTokens) {
      options.max_tokens = maxTokens;
    }

    const result = await ai.run(modelId, options);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Inference failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response(generateHtml(), {
        headers: { "Content-Type": "text/html; charset=UTF-8" }
      });
    }

    if (request.method === "POST") {
      return handleInference(request, env);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    return new Response("Method Not Allowed", { status: 405 });
  }
};
