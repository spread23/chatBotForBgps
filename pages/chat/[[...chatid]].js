import Head from "next/head";
import {ChatSidebar} from '../../components/chatSidebar';
import { useEffect, useState } from "react";
import { streamReader } from "openai-edge-stream";
import {v4 as uuid} from 'uuid';
import {Message} from '../../components/message/Message';
import { useRouter } from "next/router";

export default function ChatPage({chatId}) {
  const [newChatId, setNewChatId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [incommingMessage, setIncommingMessage] = useState('');
  const [newChatMessages, setNewChatMessages] = useState([]);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if(!generatingResponse && newChatId){
      setNewChatId('');
      router.push(`/chat/${newChatId}`);
    }
  }, [newChatId, generatingResponse, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneratingResponse(true);

    setNewChatMessages((prev) => {
      const newChatMessages = [...prev, {
        _id: uuid(),
        role: 'user',
        content: messageText, 
      }];
      return newChatMessages;
    });

    setMessageText('');

    const response = await fetch(`/api/chat/sendMessage`, {
      method: 'POST',
      headers: {
        'content-type':'application/json',
      },
      body: JSON.stringify({message:messageText}),
    });
    const data = response.body;
    if(!data){
      return;
    }

    const reader = data.getReader();
    await streamReader(reader, (message) => {
      console.log('MESSAGE: ',message);

      if(message.event === 'newChatId'){
        console.log(newChatId);
        setNewChatId(message.content);
      }else{
        setIncommingMessage(s => `${s}${message.content}`); 
      }
      
    });

    setGeneratingResponse(false);
  };

  return (
    <>
      <Head>
        <title>New chat</title>
      </Head>
      <div className="grid h-screen grid-cols-[260px_1fr]">
        <ChatSidebar chatId={chatId} />
        <div className="bg-gray-700 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-scroll text-white">
            {newChatMessages.map(messages => {
              return <Message key={messages._id} 
                       role={messages.role} 
                       content={messages.content}
              />
            })}
            {!!incommingMessage && 
              <Message role='assistent' content={incommingMessage}/>
            }
            
          </div>
          <div className="bg-gray-800 p-10">
            <form onSubmit={handleSubmit}>
              <fieldset className="flex gap-2" disabled={generatingResponse}>
                <textarea
                  value={messageText}
                  onChange={(e) => {setMessageText(e.target.value)}}
                  placeholder={generatingResponse ? '' : "Envia un mensaje..."} 
                  className="w-full resize-none 
                            rounded-md bg-gray-700 p-2 text-white 
                            focus:border-emerald-500 focus:bg-gray-600
                            focus:outline focus:outline-emerald-500" />
                          
                <button type="submit" className="btn">Enviar</button>
              </fieldset>
            </form>
          </div> 
        </div>
      </div>
    </>
  );
}

export const getServerSideProps = async(ctx) =>{
  const chatId = ctx.params?.chatid?.[0] || null;
  return {
    props: {
      chatId,
    }
  }
}