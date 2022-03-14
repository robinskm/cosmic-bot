// token and prefix
// const prefix = '-';
// const token = process.env['COSMIC_BOT_TOKEN'];

// const youtube = new YouTube(GOOGLE_API_KEY);

// local 
const {
  prefix,
  token
} = require('./config.json');

// core & third-party modules
const { Client } = require('discord.js');
const client = new Client({
  disableEveryone: true
});
const ytdl = require('ytdl-core');

let timeoutID;


client.on('warn', console.warn);
client.on('error', console.error);
client.on('ready', () => { console.log('✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥 ✨ is ready!');});
client.on('reconnecting', () => { console.log('✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥 ✨ is reconnecting!'); });
client.on('disconnect', () => { console.log('✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥 ✨ disconnected!'); });

client.on('message', async msg => {
  try {
    if (msg.author.bot) {
      return undefined
    };
    if (!msg.content.startsWith(prefix)) {
      return undefined;
    }
    const args = msg.content.split(' ');

    if (msg.content.startsWith(`${prefix}p `)) {
      const voiceChannel = msg.member.voiceChannel;
      if (!voiceChannel) {
        return message.channel.send('You need to be in a voice channel to play music!');
      }

      const permissions = voiceChannel.permissionsFor(msg.client.user);
      if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
        return message.channel.send('I need the permissions to join and speak in your voice channel!');
      }

      try {
        var connection = await voiceChannel.join();
      } catch (error) {
        return message.channel.send(`${error}`);
      }

      const dispatcher = connection.playStream(ytdl(args[1]))
        .on('end', () => {
          console.log('song ended.');
          timeoutID = setTimeout(() => {
            voiceChannel.leave();
            // serverQueue.guild.me.voice.channel.leave();
            console.log('✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥 ✨ is ready!');
          }, 5 * 60 * 1000) // 7 minutes in ms
        })
        .on('error', error => {
          console.log(error(error));
        });
      dispatcher.setVolumeLogarithmic(5 / 5);
    }
  } catch (error) {
    return message.channel.send(`${error}`);
  }
});

client.login(token);
