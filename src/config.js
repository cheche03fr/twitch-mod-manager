// Configuration Twitch
module.exports = {
  CLIENT_ID: 's7i3vots5991ak84k93d1gpu752k48',
  REDIRECT_URI: 'http://localhost:3000/callback',
  PORT: 3000,
  SCOPES: [
    'user:read:moderated_channels',
    'moderator:read:chatters',
    'moderator:manage:banned_users',
    'moderator:manage:chat_messages',
    'moderator:read:chat_settings',
    'moderator:manage:chat_settings',
    'moderator:read:shield_mode',
    'moderator:manage:shield_mode',
    'channel:moderate',
    'channel:manage:broadcast',
    'channel:read:editors',
    'channel:edit:commercial',
    'channel:manage:predictions'
  ].join(' ')
};
