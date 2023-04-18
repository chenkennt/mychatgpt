import readline from 'readline';
import dotenv from 'dotenv';
import { AzureOpenAiChatGptEndpoint, OpenAiChatGptEndpoint, ChatGpt } from './chatgpt.js';
import { Storage } from './storage.js';

dotenv.config();
const r = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function getInput() {
  return new Promise(resolve => {
    r.question('> ', a => resolve(a));
  });
}

let endpoint = new OpenAiChatGptEndpoint(process.env.OPENAI_API_KEY);
// let endpoint = new AzureOpenAiChatGptEndpoint(process.env.AZURE_OPENAI_RESOURCE_NAME, process.env.AZURE_OPENAI_DEPLOYMENT_NAME, process.env.AZURE_OPENAI_API_KEY);
let session = await new ChatGpt(endpoint, new Storage('sessions')).createSession({ name: `Chat on ${new Date().toLocaleString()}` });

for (;;) {
  let i = await getInput();
  for await (let t of session.getReply(i)) process.stdout.write(t);
  process.stdout.write('\n');
  // console.log(await session.getReplySync(i));
}