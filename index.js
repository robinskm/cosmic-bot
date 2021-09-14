const Discord = require("discord.js");
const {
  prefix, token
} = require("./config.json");
const ytdl = require("ytdl-core");
const search = require('yt-search');


// const token = process.env['COSMIC_BOT_TOKEN'];
const client = new Discord.Client();

const queue = new Map();

client.once("ready", () => {
  console.log("Ready ✨");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}brownies`)) {
    message.channel.send('d e c o s m i c \' d');
  } else if (message.content.startsWith(`${prefix}play`) || message.content.startsWith(`${prefix}p `)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`) || message.content.startsWith(`${prefix}decosmic`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}help`)) {
    const embed = new Discord.MessageEmbed()
      .setTitle('Commands List')
      .setColor('#D09CFF')
      .setThumbnail('https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/be21784c-ba2a-4df4-bdd8-b5568ea11ec8/dbjo53q-4683aad4-5549-4d28-ab4c-64f4bfc6a309.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcL2JlMjE3ODRjLWJhMmEtNGRmNC1iZGQ4LWI1NTY4ZWExMWVjOFwvZGJqbzUzcS00NjgzYWFkNC01NTQ5LTRkMjgtYWI0Yy02NGY0YmZjNmEzMDkuZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.8s-9vXfdIbwONFVQQ3wMsIeJfFRdkiPwbr2d-jk2tt8')
      .setDescription('\n**-play** : plays a YouTube URL\n**-p** : plays a YouTube URL\n**-skip** : skips a song in queue\n**-decosmic** : stops a song and disconnects the bot\n**-stop** : stops a song and disconnects the bot\n**-brownies** : you\'re asking for it\n**-help** : read this shit again');
    message.channel.send(embed);
  } else {
    message.channel.send("I dunno what that means.\nNeed help? Type **-help**");
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");
  const voiceChannel = message.member.voice.channel;
  const permissions = voiceChannel.permissionsFor(message.client.user);

  if (!voiceChannel) {
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  }

  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`Queuein' up: **${song.title}**`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );

  if (!serverQueue)
    return message.channel.send("There is no song that I could stop!");

  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url, {
      filter: 'audioonly'
    }))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Startin' up: **${song.title}**`);
}

client.login(token);
