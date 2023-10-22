import Link from 'next/link';

export const ChatSidebar = () => {
    return (
    <div className='bg-gray-900 text-white'>
        <Link className='btn' href='/api/auth/logout'>Cerrar sesion</Link>
    </div>
    )
};