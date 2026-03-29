'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceUser {
  userId: string;
  name: string;
  color: string;
  presence_ref: string;
}

interface AvatarStackProps {
  nodeId: string;
}

export default function AvatarStack({ nodeId }: AvatarStackProps) {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const channelName = `node:${nodeId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: 'editor' },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeUsers: PresenceUser[] = [];
        
        // Flatten the presence state
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            activeUsers.push(presence);
          });
        });

        // Filter and deduplicate by userId
        const uniqueUsers = Array.from(new Map(activeUsers.map(u => [u.userId, u])).values());
        setUsers(uniqueUsers);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [nodeId, supabase]);

  if (users.length === 0) return null;

  return (
    <div className="flex -space-x-2">
      {users.map((user) => (
        <div
          key={user.presence_ref}
          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-10 cursor-default"
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          {user.name.substring(0, 2).toUpperCase()}
        </div>
      ))}
      <div className="ml-2 text-[11px] font-medium text-[#37352f]/40 uppercase tracking-wider self-center pl-2">
        {users.length} editing
      </div>
    </div>
  );
}
