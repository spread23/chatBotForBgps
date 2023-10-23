import { OpenAIEdgeStream } from "openai-edge-stream";

export const config = {
    runtime: 'edge'
};

export default async function handler(req) {
    
    try {
        const {message} = await req.json();
        const initialChatMessage = {
            role: 'system',
            content: 'Your name is chatForBgps. An incredibly intelligent and quick-thinking AI orientado a recursos humanos, that always reply with an enthusiastic positive energy. You were created by CubaYColombiaOTT. Your response must be formatted as markdown',
        }

        const response = await fetch(`${req.headers.get('origin')}/api/chat/createNewChat`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
               cookie: req.headers.get('cookie'),
            },
      
            body: JSON.stringify({
              message,
            }),
          });
      
          const json = await response.json();
          const chatId = json._id;
          console.log('NEW CHAT ', json);

        const stream = await OpenAIEdgeStream('https://api.openai.com/v1/chat/completions', {
            headers: {
                'content-type': 'application/json',
                Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,
            },
            method: 'POST',
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [initialChatMessage, {content: message, role: 'user'}],
                stream: true,
            }),
            
        },
        {   onBeforeStream: ({emit}) => {
            emit(chatId, 'newChatId');
        },
            onAfterStream: async ({emit, fullContent, }) => {
                await fetch(`${req.headers.get('origin')}/api/chat/addMessageToChat`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        cookie: req.headers.get('cookie'),
                    },
                    body: JSON.stringify({
                        chatId,
                        role: 'assistent',
                        content: fullContent,
                    }),
                });
            },
        }
        );

        return new Response(stream);
    } catch (e){
        console.log('AN ERROR OCURRED IN SENDMESSAGE', e);
    }
}