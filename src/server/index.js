import express from 'express';
import { ChatGpt, OpenAiChatGptEndpoint } from './chatgpt.js';
import * as dotenv from 'dotenv';

dotenv.config();
const app = express();
let sessions = {};
let chatGpt = new ChatGpt(new OpenAiChatGptEndpoint(process.env.OPENAI_API_KEY));
// let chatGpt = new ChatGpt(new AzureOpenAiChatGptEndpoint(process.env.AZURE_OPENAI_RESOURCE_NAME, process.env.AZURE_OPENAI_DEPLOYMENT_NAME, process.env.AZURE_OPENAI_API_KEY));
app.use(express.static('public'));
app.use(express.text({ limit: '1mb' }));
app.post('/chat', async (req, res) => {
  let s = req.query.session;
  if (typeof req.query.session !== 'string') {
    res.status(400).end();
    return;
  }

  let session = sessions[s] = sessions[s] || chatGpt.createSession();
  res.send(await session.getReplySync(req.body));
});

app.listen(8080, () => console.log('server started'));