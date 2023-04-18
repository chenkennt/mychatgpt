import express from 'express';
import dotenv from 'dotenv';
import { ChatGpt, OpenAiChatGptEndpoint, AzureOpenAiChatGptEndpoint } from './chatgpt.js';
import { Storage } from './storage.js';

function handleAsync(handler) {
  return (req, res, next) => {
    handler(req, res, next).catch(e => next(e));
  }
}

dotenv.config();
const app = express();
let endpoint = new OpenAiChatGptEndpoint(process.env.OPENAI_API_KEY);
// let endpoint = new AzureOpenAiChatGptEndpoint(process.env.AZURE_OPENAI_RESOURCE_NAME, process.env.AZURE_OPENAI_DEPLOYMENT_NAME, process.env.AZURE_OPENAI_API_KEY);
let chatGpt = new ChatGpt(endpoint, new Storage('sessions'));
app.use(express.static('public'));
app.use(express.json({ limit: '1mb' }));
app.use(express.text({ limit: '1mb' }));
app
  .get('/chat', handleAsync(async (req, res) => {
    let l = [];
    for await (let s of chatGpt.sessions()) l.push({
      id: s.id,
      ...await s.metadata()
    });
    res.json(l);
  }))
  .post('/chat', handleAsync(async (req, res) => {
    let s = await chatGpt.createSession(req.body);
    res.json({
      id: s.id,
      ...await s.metadata()
    });
  }))
  .post('/chat/:id/generatename', handleAsync(async (req, res) => {
    await chatGpt.session(req.params.id).generateName();
    res.json({
      id: req.params.id,
      ...await chatGpt.session(req.params.id).metadata()
    });
  }))
  .put('/chat/:id', handleAsync(async (req, res) => {
    let name = req.body.name;
    if (!name) throw new Error('missing session name', { cause: 'bad_request' });
    await chatGpt.session(req.params.id).updateName(name);
    res.status(204).end();
  }))
  .delete('/chat/:id', handleAsync(async (req, res) => {
    await chatGpt.session(req.params.id).delete();
    res.status(204).end();
  }))
  .get('/chat/:id/messages', handleAsync(async (req, res) => {
    res.json(await chatGpt.session(req.params.id).messages());
  }))
  .post('/chat/:id/messages', handleAsync(async (req, res) => {
    let c = req.body;
    if (!c) throw new Error('missing message body', { cause: 'bad_request ' });
    res.header('Content-Type', 'text/plain');
    for await (let cc of chatGpt.session(req.params.id).getReply(c)) res.write(cc);
    res.end();
  }));

app.use((err, req, res, next) => {
  switch (err.cause) {
    case 'bad_request': res.status(400); break;
    case 'not_found': res.status(404); break;
    case 'too_many_requests': res.status(429); break;
    default: res.status(500); break;
  }

  if (err.message) res.send(err.message);
  res.end();
});

app.listen(8080, () => console.log('server started'));