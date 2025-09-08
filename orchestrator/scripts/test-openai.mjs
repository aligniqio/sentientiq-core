import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const stream = await client.chat.completions.create({
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  stream: true,
  temperature: 0.2,
  max_tokens: 32,
  messages: [{ role: "user", content: "say hi in five words" }]
});

for await (const part of stream) {
  process.stdout.write(part?.choices?.[0]?.delta?.content || "");
}
process.stdout.write("\n");