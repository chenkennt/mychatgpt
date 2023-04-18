# My ChatGPT

A simple sample in React.js and node.js to show how to build an OpenAI [ChatGPT](https://chat.openai.com/)-like chat bot using OpenAI chat completion [API](https://platform.openai.com/docs/guides/chat).

Main features:
1. Dialogue based chat with ChatGPT
2. Generate chat response in a streaming way (like how OpenAI ChatGPT does it)
3. Render chat messages using rich format (in Markdown format)
4. Automatically name the chat session from content
5. Support using system message to customize the chat
6. Multiple chat sessions support
7. Persist chat history at server side
8. Support both native OpenAI API and [Azure OpenAI Service](https://azure.microsoft.com/products/cognitive-services/openai-service) API

## How to run

You need to have an OpenAI account first.

1. Go to your OpenAI account, open [API keys](https://platform.openai.com/account/api-keys) page, create a new secret key.
2. Set the key as environment variable:
   ```
   export OPENAI_API_KEY=<your_openai_api_key>
   ```
   Or you can save the key into `.env` file:
   ```
   OPENAI_API_KEY=<your_openai_api_key>
   ```
3. Run the following command:
   ```
   npm install
   npm run build
   npm start
   ```

Then open http://localhost:8080 in your browser to use the app.

There is also a CLI version where you can play with the chat bot in command line window:
```
node src/server/test.js
```

## Persist chat history

This app has a very simple [implementation](src/server/storage.js) to persist the chat history into file system (the files can be found under `sessions` directory), which is only for demo purpose and cannot be used in any production environment. You can have your own storage logic by implementing the functions in `Storage` class.

## Use Azure OpenAI Service

Azure OpenAI provides compatible APIs with native OpenAI ones. The main difference is the API endpoint and authentication method, which has already been abstracted into `OpenAiChatGptEndpoint` and `AzureOpenAiChatGptEndpoint` classes. To switch to Azure OpenAI Service, simply change to use `AzureOpenAiChatGptEndpoint` in [index.js](src/server/index.js).

You also need to set different environment variables:
```
export AZURE_OPENAI_RESOURCE_NAME=<azure_openai_resource_name>
export AZURE_OPENAI_DEPLOYMENT_NAME=<azure_openai_model_deployment_name>
export AZURE_OPENAI_API_KEY=<azure_openai_api_key>
```