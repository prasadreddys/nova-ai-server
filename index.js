import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

admin.initializeApp();

const db = admin.firestore();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

function getToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.substring(7);
}

async function authenticate(req, res, next) {
  try {
    const token = getToken(req);

    if (!token) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid authentication token"
    });
  }
}

  app.get("/", (req, res) => {
    res.json({
      status: "ok",
      service: "nova-ai-server",
      endpoints: ["/health", "/api/chat"]
    });
  });

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "nova-ai-server"
  });
});

app.post("/api/chat", authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message
    });

    res.json({
      response: response.text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "AI request failed"
    });
  }
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`NOVA AI server running on port ${port}`);
});
