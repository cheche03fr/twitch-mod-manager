const { CLIENT_ID } = require('./config');

const WS_URL = 'wss://eventsub.wss.twitch.tv/ws';
const RECONNECT_DELAY_MS = 5000;
const KEEPALIVE_MARGIN_MS = 5000;

// Scopes exigés par Twitch pour s'abonner à channel.moderate v2 en tant que modérateur
const MOD_ACTIONS_SCOPES = [
  ['moderator:read:blocked_terms', 'moderator:manage:blocked_terms'],
  ['moderator:read:chat_settings', 'moderator:manage:chat_settings'],
  ['moderator:read:unban_requests', 'moderator:manage:unban_requests'],
  ['moderator:read:banned_users', 'moderator:manage:banned_users'],
  ['moderator:read:chat_messages', 'moderator:manage:chat_messages'],
  ['moderator:read:warnings', 'moderator:manage:warnings'],
  ['moderator:read:moderators'],
  ['moderator:read:vips']
];

function hasModActionsScopes(scopes) {
  return MOD_ACTIONS_SCOPES.every(choices => choices.some(s => scopes.includes(s)));
}

/**
 * Reçoit en direct les actions de modération (raids, VIP, bans...) via EventSub WebSocket.
 * shortcut: rien n'est rejoué après une coupure (limite de Twitch), l'historique se remplit tant que l'app tourne.
 */
class EventSubClient {
  constructor({ onAction, onError }) {
    this.onAction = onAction;
    this.onError = onError;
    this.ws = null;
    this.sessionId = null;
    this.stopped = true;
    this.wanted = new Set();
    this.subscribed = new Set();
    this.keepaliveTimer = null;
    this.keepaliveMs = 10000;
  }

  start(token, moderatorId, broadcasterIds) {
    this.token = token;
    this.moderatorId = moderatorId;
    this.stopped = false;
    broadcasterIds.forEach(id => this.wanted.add(id));
    if (!this.ws) {
      this.connect(WS_URL, null);
    } else if (this.sessionId) {
      this.subscribeMissing();
    }
  }

  stop() {
    this.stopped = true;
    this.wanted.clear();
    this.subscribed.clear();
    this.sessionId = null;
    clearTimeout(this.keepaliveTimer);
    const ws = this.ws;
    this.ws = null;
    if (ws) ws.close();
  }

  connect(url, previousWs) {
    const ws = new WebSocket(url);
    if (!previousWs) this.ws = ws;
    ws.onmessage = (msg) => {
      try {
        this.handleMessage(ws, previousWs, JSON.parse(msg.data));
      } catch (err) {
        console.error('EventSub : message illisible', err.message);
      }
    };
    ws.onclose = (ev) => {
      if (this.ws !== ws) return; // ancienne connexion remplacée, ou arrêt volontaire
      console.warn(`EventSub : connexion fermée (code ${ev.code}${ev.reason ? `, ${ev.reason}` : ''}), nouvelle tentative`);
      this.ws = null;
      this.sessionId = null;
      this.subscribed.clear();
      clearTimeout(this.keepaliveTimer);
      if (!this.stopped) {
        setTimeout(() => {
          if (!this.ws && !this.stopped) this.connect(WS_URL, null);
        }, RECONNECT_DELAY_MS);
      }
    };
  }

  handleMessage(ws, previousWs, msg) {
    const type = msg.metadata?.message_type;
    if (type === 'session_welcome') {
      this.keepaliveMs = (msg.payload.session.keepalive_timeout_seconds || 10) * 1000;
      this.sessionId = msg.payload.session.id;
      if (previousWs) {
        // Reconnexion demandée par Twitch : les abonnements suivent la nouvelle session
        this.ws = ws;
        previousWs.close();
      } else {
        this.subscribeMissing();
      }
    } else if (type === 'session_reconnect') {
      this.connect(msg.payload.session.reconnect_url, ws);
    } else if (type === 'notification' && msg.payload?.subscription?.type === 'channel.moderate') {
      this.onAction({ receivedAt: msg.metadata.message_timestamp, event: msg.payload.event });
    }
    if (this.ws === ws) this.armKeepalive(ws);
  }

  // Sans message dans le délai annoncé par Twitch, la connexion est considérée perdue
  armKeepalive(ws) {
    clearTimeout(this.keepaliveTimer);
    this.keepaliveTimer = setTimeout(() => ws.close(), this.keepaliveMs + KEEPALIVE_MARGIN_MS);
  }

  subscribeMissing() {
    [...this.wanted].filter(id => !this.subscribed.has(id)).forEach(id => this.subscribe(id));
  }

  async subscribe(broadcasterId) {
    this.subscribed.add(broadcasterId);
    try {
      const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: {
          'Client-Id': CLIENT_ID,
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'channel.moderate',
          version: '2',
          condition: { broadcaster_user_id: broadcasterId, moderator_user_id: this.moderatorId },
          transport: { method: 'websocket', session_id: this.sessionId }
        })
      });
      if (!response.ok && response.status !== 409) {
        throw new Error(`abonnement refusé (${response.status}) : ${await response.text()}`);
      }
    } catch (err) {
      this.subscribed.delete(broadcasterId);
      this.onError(broadcasterId, err.message);
    }
  }
}

module.exports = { EventSubClient, hasModActionsScopes };
