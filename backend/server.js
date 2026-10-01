import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        error: { message: "Query is empty" }
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Hospital App",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // keep free model
        messages: [{ role: "user", content: query }],
        max_tokens: 200,
      }),
    });

    console.log("Query received:", query);
    const data = await response.json();
    console.log("AI Response:", data);

    res.json(data);

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ error: { message: "Server error" } });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});