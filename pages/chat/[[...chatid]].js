import Head from "next/head";
import {ChatSidebar} from '../../components/chatSidebar';
import { useEffect, useState } from "react";
import { streamReader } from "openai-edge-stream";
import {v4 as uuid} from 'uuid';
import {Message} from '../../components/message/Message';
import { useRouter } from "next/router";
import { getSession } from "@auth0/nextjs-auth0";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";

export default function ChatPage({chatId, title, messages=[]}) {
  console.log('props ', title, messages);
  const [newChatId, setNewChatId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [incommingMessage, setIncommingMessage] = useState('');
  const [newChatMessages, setNewChatMessages] = useState([]);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [fullMessage, setFullMessage] = useState('');
  const router = useRouter();

  //when our route created
  useEffect(() => {
    setNewChatMessages([]);
    setNewChatId(null);
  }, [chatId]);

  //save the newly streamed message to new chat messages
  useEffect(() => {
    if(!generatingResponse && fullMessage){
      setNewChatMessages((prev) => [...prev, {
        _id: uuid(),
        role: 'assistent',
        content: fullMessage,
      }])
      setFullMessage('');
    }
  }, [generatingResponse, fullMessage]);

  //if we've created a new chat
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
      body: JSON.stringify({chatId, message:messageText}),
    });
    const data = response.body;
    if(!data){
      return;
    }

    const reader = data.getReader();
    let content = '';

    await streamReader(reader, (message) => {
      console.log('MESSAGE: ',message);

      if(message.event === 'newChatId'){
        console.log(newChatId);
        setNewChatId(message.content);
      }else{
        setIncommingMessage(s => `${s}${message.content}`); 
        content = content + message.content;
      }
      
    });

    setFullMessage(content);
    setIncommingMessage('');
    setGeneratingResponse(false);
  };

  const allChatMessages = [...messages, ...newChatMessages];

  return (
    <>
      <Head>
        <title>New chat</title>
      </Head>
      <div className="grid h-screen grid-cols-[260px_1fr]">
        <ChatSidebar chatId={chatId} />
        <div className="bg-gray-700 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-scroll text-white">
            {allChatMessages.map(messages => {
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
  if(chatId){
    const {user} = await getSession(ctx.req, ctx.res);
    const client = await clientPromise;
    const db = client.db('Chatbotbgps');
    const chat = await db.collection('chats').findOne({
      userId: user.sub,
      _id: new ObjectId(chatId),
    });
    return {
      props: {
        chatId,
        title: chat.title,
        messages: chat.messages.map(message => ({
          ...message,
          _id: uuid(),

        })), 
      }
    }
  }
  return {
    props: {}
  }
}