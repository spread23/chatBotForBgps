import Link from 'next/link';
import { useEffect, useState } from 'react';

export const ChatSidebar = () => {
    const [chatList, setChatList] = useState([]);

    useEffect(() => {
        const loadChatList = async () => {
            const response = await fetch(`/api/chat/getChatList`, {
                method: 'POST',
            });
            const json = await response.json();
            console.log('CHAT LIST ', json);
            setChatList(json?.chats || []);
        }
        loadChatList();
    }, []);
    return (
    <div className='bg-gray-900 flex flex-col overflow-hidden text-white'>
        <Link className='btn' href='/chat'>Nuevo chat +</Link>
        <div className='flex-1 overflow-auto bg-gray-950'>
            {chatList.map((chat) => {
                return (
                <Link key={chat._id} href={`/chat/${chat._id}`}>
                    {chat.title}
                </Link>
            )})}
        </div>
        <Link className='btn' href='/api/auth/logout'>Cerrar sesion</Link>
    </div>
    )
};