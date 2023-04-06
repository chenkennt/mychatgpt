import fetch from 'node-fetch';

class OpenAiChatGptEndpoint {
  constructor(key) {
    this.key = key;
  }

  request() {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: { authorization: `Bearer ${this.key}` }
    };
  }
}

class AzureOpenAiChatGptEndpoint {
  constructor(name, deployment, key) {
    this.name = name;
    this.deployment = deployment;
    this.key = key;
  }

  request() {
    return {
      url: `https://${this.name}.openai.azure.com/openai/deployments/${this.deployment}/chat/completions?api-version=2023-03-15-preview`,
      headers: { 'api-key': this.key }
    };
  }
}

class ChatGpt {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  createSession() {
    return new ChatGptSession(this.endpoint);
  }
}

class ChatGptSession {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.history = [];
  }

  async getCompletionResponse(input, stream) {
    let message = {
      role: 'user',
      content: input
    };
    this.history.push(message);
    let req = this.endpoint.request();
    let res = await fetch(req.url, {
      method: 'POST',
      headers: { ...req.headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: this.history,
        stream: stream
      })
    });
    if (!res.ok) throw new Error(`request failed with ${res.status}, message: ${await res.text()}`);
    return res;
  }

  async getReplySync(input) {
    let res = await this.getCompletionResponse(input, false);
    let data = await res.json();
    let message = data.choices[0].message;
    this.history.push({
      role: message.role,
      content: message.content
    });
    return message.content;
  }

  async *getReply(input) {
    let res = await this.getCompletionResponse(input, true);
    let buf = Buffer.from('');
    let first = true;
    let message = { content: '' };
    for await (let chunk of res.body) {
      buf = Buffer.concat([buf, chunk]);
      while (true) {
        if (first) {
          if (buf.indexOf('data:') !== 0) throw new Error('stream data should start with data:');
          buf = buf.subarray(5);
          first = false;
        }
        let i = buf.indexOf('data:');
        if (i < 0) break;
        let d = buf.subarray(0, i);
        try {
          let dd = JSON.parse(d.toString());
          let delta = dd.choices[0].delta;
          message.role = delta.role || message.role;
          if (delta.content) {
            message.content += delta.content;
            yield delta.content;
          }
          buf = buf.subarray(i + 5);
        } catch (e) {
          // in case data is not a valid json (e.g. there is a 'data:' inside JSON string), simply ignore it and search for next separator
          if (!(e instanceof SyntaxError)) throw e;
        }
      }
    }
    if (buf.toString().trim() !== '[DONE]') throw new Error('stream data should end with [DONE]');
    this.history.push(message);
  }
}

export { ChatGpt, ChatGptSession, OpenAiChatGptEndpoint, AzureOpenAiChatGptEndpoint };