import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/fbAuth';
import { listenNotifications } from '../lib/fbRooms';
import { ArrowLeft, Bell, UserPlus, Heart, MessageCircle } from 'lucide-react';

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Real-time listener start karna
    const unsubscribe = listenNotifications(user.uid, (data) => {
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow': return <UserPlus className="text-blue-400" size={20} />;
      case 'like': return <Heart className="text-pink-400" size={20} />;
      default: return <Bell className="text-purple-400" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0c29] text-white pb-20">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-[#1a1635] sticky top-0 z-10">
        <button onClick={() => navigate(-1)}><ArrowLeft /></button>
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>

      <div className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Bell size={48} className="mx-auto mb-4 opacity-20" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className="bg-[#1a1635] p-4 rounded-xl flex items-center gap-4 border border-white/5">
              <div className="p-2 bg-white/5 rounded-full">
                {getIcon(notif.type)}
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-bold">{notif.fromName || 'Someone'}</span> 
                  {notif.type === 'follow' ? ' started following you' : ' sent you a notification'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(notif.ts).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
