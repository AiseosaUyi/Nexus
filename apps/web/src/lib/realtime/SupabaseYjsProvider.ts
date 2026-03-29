import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import * as Y from 'yjs';
import { Observable } from 'lib0/observable';

export interface SupabaseYjsOptions {
  channelName: string;
  supabase: SupabaseClient;
  doc: Y.Doc;
}

/**
 * SupabaseYjsProvider bridges a Yjs document with a Supabase Realtime channel.
 * It handles both document synchronization and user presence.
 */
export class SupabaseYjsProvider extends Observable<string> {
  private channel: RealtimeChannel;
  private supabase: SupabaseClient;
  public doc: Y.Doc;
  private channelName: string;

  constructor({ channelName, supabase, doc }: SupabaseYjsOptions) {
    super();
    this.channelName = channelName;
    this.supabase = supabase;
    this.doc = doc;

    // 1. Initialize the Supabase Channel
    this.channel = this.supabase.channel(this.channelName, {
      config: {
        broadcast: { ack: true },
        presence: { key: 'editor' },
      },
    });

    // 2. Listen for 'sync' events from other clients
    this.channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
      if (payload && payload.update) {
        // Apply the binary update to the local Yjs document
        const update = new Uint8Array(payload.update);
        Y.applyUpdate(this.doc, update, this);
      }
    });

    // 3. Listen for local Yjs updates and broadcast them
    this.doc.on('update', (update, origin) => {
      // Avoid infinite loops by checking if the update originated locally
      if (origin !== this) {
        this.channel.send({
          type: 'broadcast',
          event: 'sync',
          payload: { update: Array.from(update) }, // Convert Uint8Array to array for JSON transport
        });
      }
    });

    // 4. Connect to the channel
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[REALTIME] Connected to channel: ${this.channelName}`);
        this.emit('status', [{ status: 'connected' }]);
      }
    });
  }

  /**
   * Updates the user's presence state (e.g., cursor position).
   */
  public async setPresence(state: any) {
    await this.channel.track(state);
  }

  /**
   * Cleans up the provider and disconnects the channel.
   */
  public destroy() {
    this.supabase.removeChannel(this.channel);
    this.doc.destroy();
  }
}
