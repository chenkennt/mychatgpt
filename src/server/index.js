import * as crypto from 'crypto';
import express from 'express';
import { ChatGpt, OpenAiChatGptEndpoint, AzureOpenAiChatGptEndpoint } from './chatgpt.js';
import * as dotenv from 'dotenv';

dotenv.config();
const app = express();
let sessions = {};
// let chatGpt = new ChatGpt(new OpenAiChatGptEndpoint(process.env.OPENAI_API_KEY));
let chatGpt = new ChatGpt(new AzureOpenAiChatGptEndpoint(process.env.AZURE_OPENAI_RESOURCE_NAME, process.env.AZURE_OPENAI_DEPLOYMENT_NAME, process.env.AZURE_OPENAI_API_KEY));
app.use(express.static('public'));
app.use(express.json({ limit: '1mb' }));
app.use(express.text({ limit: '1mb' }));
app
  .get('/chat', (req, res) => {
    let l = [];
    for (let i in sessions) l.push({
      id: i,
      name: sessions[i].name
    });
    res.json(l);
  })
  .post('/chat', async (req, res) => {
    if (!req.body.name) {
      res.status(400).end();
      return;
    }

    let id = crypto.randomBytes(4).toString('hex');
    sessions[id] = {
      name: req.body.name,
      chat: chatGpt.createSession()
    };
    res.json({
      id: id,
      name: sessions[id].name
    });
  })
  .put('/chat/:id', async (req, res) => {
    let s = sessions[req.params.id];
    if (!req.body.name) {
      res.status(400).end();
      return;
    }
    if (!s) {
      res.status(404).end();
      return;
    }
    s.name = req.body.name;
    res.status(204).end();
  })
  .delete('/chat/:id', async (req, res) => {
    if (!sessions[req.params.id]) {
      res.status(404).end();
      return;
    }
    delete sessions[req.params.id];
    res.status(204).end();
  })
  .get('/chat/:id/messages', (req, res) => {
    if (!req.params.id) {
      res.status(400).end();
      return;
    }
    let s = sessions[req.params.id];
    if (!s) {
      res.status(404).end();
      return;
    }
    res.json(s.chat.getHistory());
  })
  .post('/chat/:id/messages', async (req, res) => {
    let s = sessions[req.params.id];
    if (!req.body) {
      res.status(400).end();
      return;
    }
    if (!s) {
      res.status(404).end();
      return;
    }
    res.send(await s.chat.getReplySync(req.body));
  });

app.listen(8080, () => console.log('server started'));