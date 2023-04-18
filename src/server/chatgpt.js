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
  constructor(endpoint, storage) {
    this.endpoint = endpoint;
    this.storage = storage;
  }

  async createSession(session) {
    let name = session?.name;
    if (!name) name = `Chat on ${new Date().toLocaleString()}`;
    let i = await this.storage.createSession({ name, systemMessage: session?.systemMessage, createdAt: new Date().valueOf() });
    return this.session(i);
  }

  session(id) {
    return new ChatGptSession(id, this.endpoint, this.storage);
  }

  async *sessions() {
    for await (let i of this.storage.listSessions()) yield this.session(i);
  }
}

class ChatGptSession {
  constructor(id, endpoint, storage) {
    this.id = id;
    this.endpoint = endpoint;
    this.storage = storage;
  }

  static async invoke(endpoint, messages, stream) {
    let req = endpoint.request();
    let res = await fetch(req.url, {
      method: 'POST',
      headers: { ...req.headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages.map(m => {
          return {
            role: m.role,
            content: m.content
          };
        }),
        stream: stream
      })
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error(`too many requests, please try again later`, { cause: 'too_many_requests' });
      throw new Error(`request failed with ${res.status}, message: ${await res.text()}`);
    }
    return res;
  }

  async getCompletionResponse(input, stream) {
    await this.storage.appendMessage(this.id, {
      role: 'user',
      content: input,
      date: new Date().valueOf()
    });
    let { systemMessage } = await this.metadata();
    let messages = await this.storage.getMessages(this.id);
    if (systemMessage) messages = [{ role: 'system', content: systemMessage }].concat(messages);
    return ChatGptSession.invoke(this.endpoint, messages, stream);
  }

  async getReplySync(input) {
    let res = await this.getCompletionResponse(input, false);
    let data = await res.json();
    let message = data.choices[0].message;
    await this.storage.appendMessage(this.id, {
      role: message.role,
      date: new Date().valueOf(),
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
    message.date = new Date().valueOf();
    this.storage.appendMessage(this.id, message);
  }

  async messages() {
    return this.storage.getMessages(this.id);
  }

  async metadata() {
    return (await this.storage.getSession(this.id));
  }

  async updateName(name) {
    await this.storage.updateSession({ id: this.id, name });
  }

  async generateName() {
    let messages = await this.messages();
    let res = await ChatGptSession.invoke(this.endpoint, [
      {
        role: 'system',
        content: `Use a few words (better to be less than 10) to summarize user's question. If there is no question in user's input, output something like "User asks for help".`
      },
      messages[0]
    ], false);
    let name = (await res.json()).choices[0].message.content;
    if (name.endsWith('.')) name = name.substring(0, name.length - 1);
    await this.updateName(name);
  }

  async delete() {
    await this.storage.deleteSession(this.id);
  }
}

export { ChatGpt, ChatGptSession, OpenAiChatGptEndpoint, AzureOpenAiChatGptEndpoint };