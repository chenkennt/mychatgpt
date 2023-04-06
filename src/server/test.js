import readline from 'readline';
import { AzureOpenAiChatGptEndpoint, OpenAiChatGptEndpoint, ChatGptSession } from './chatgpt.js';
import * as dotenv from 'dotenv';

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

let session = new ChatGptSession(new OpenAiChatGptEndpoint(process.env.OPENAI_API_KEY));
// let session = new ChatGptSession(new AzureOpenAiChatGptEndpoint(process.env.AZURE_OPENAI_RESOURCE_NAME, process.env.AZURE_OPENAI_DEPLOYMENT_NAME, process.env.AZURE_OPENAI_API_KEY));

for (;;) {
  let i = await getInput();
  for await (let t of session.getReply(i)) process.stdout.write(t);
  process.stdout.write('\n');
  // console.log(await session.getReplySync(i));
}