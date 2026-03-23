require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
} = require('discord.js');
const {
  VoiceConnectionStatus,
  entersState,
  generateDependencyReport,
  joinVoiceChannel,
} = require('@discordjs/voice');

const token = process.env.COSMIC_BOT_TOKEN;
const guildId = process.env.VOICE_TEST_GUILD_ID;
const channelId = process.env.VOICE_TEST_CHANNEL_ID;

if (!token) {
  throw new Error('COSMIC_BOT_TOKEN is required.');
}

if (!guildId || !channelId) {
  throw new Error('VOICE_TEST_GUILD_ID and VOICE_TEST_CHANNEL_ID are required.');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag} (${client.user.id})`);
  console.log(generateDependencyReport());

  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(channelId);

  if (!channel?.isVoiceBased()) {
    throw new Error(`Channel ${channelId} is not a voice-based channel.`);
  }

  console.log(`Joining guild=${guild.id} channel=${channel.id} type=${channel.type}`);

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  connection.on('stateChange', (_, newState) => {
    console.log(`Voice connection state: ${newState.status}`);
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    console.log('Voice connection reached Ready.');
  } catch (error) {
    console.error('Voice connection failed to reach Ready.', error);
  } finally {
    setTimeout(() => {
      connection.destroy();
      client.destroy();
    }, 5_000);
  }
});

client.on('raw', (packet) => {
  if (packet.t === 'VOICE_STATE_UPDATE') {
    console.log(
      `RAW VOICE_STATE_UPDATE guild=${packet.d.guild_id} user=${packet.d.user_id} channel=${packet.d.channel_id} session=${packet.d.session_id}`
    );
  }

  if (packet.t === 'VOICE_SERVER_UPDATE') {
    console.log(
      `RAW VOICE_SERVER_UPDATE guild=${packet.d.guild_id} endpoint=${packet.d.endpoint} token=${packet.d.token ? 'present' : 'missing'}`
    );
  }
});

client.login(token);
