require("dotenv").config();
const { callLLM } = require("./background/api");

const apiKey = process.env.CHUTES_API_TOKEN;
if (!apiKey || apiKey === "your_key_here") {
  console.error("Set CHUTES_API_TOKEN in .env first");
  process.exit(1);
}

callLLM(apiKey, [{ role: "user", content: "Say hello world and nothing else." }])
  .then((reply) => console.log("Response:", reply))
  .catch((err) => console.error("Error:", err.message));
