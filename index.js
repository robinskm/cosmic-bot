const Discord = require("discord.js");
// const {
//   prefix, token
// } = require("./config.json");
const prefix = "-";
const token = process.env['COSMIC_BOT_TOKEN'];
const ytdl = require("ytdl-core");
const search = require('yt-search');

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
  } else if (message.content.startsWith(`${prefix}guildmaster`)) {
    message.channel.send('Guildmasther pleath, lawd have merthy 😩💦');
  } else if (message.content.startsWith(`${prefix}die`)) {
    message.channel.send('No u 👉🏼😎👉🏼');
  } else if (message.content.startsWith(`${prefix}play`) || message.content.startsWith(`${prefix}p `)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`) || message.content.startsWith(`${prefix}next`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}decosmic`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}help`)) {
    const commandsEmbed = new Discord.MessageEmbed()
      .setTitle('Commands List')
      .setColor('#D09CFF')
      .setThumbnail('https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/be21784c-ba2a-4df4-bdd8-b5568ea11ec8/dbjo53q-4683aad4-5549-4d28-ab4c-64f4bfc6a309.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcL2JlMjE3ODRjLWJhMmEtNGRmNC1iZGQ4LWI1NTY4ZWExMWVjOFwvZGJqbzUzcS00NjgzYWFkNC01NTQ5LTRkMjgtYWI0Yy02NGY0YmZjNmEzMDkuZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.8s-9vXfdIbwONFVQQ3wMsIeJfFRdkiPwbr2d-jk2tt8')
      .setDescription('\n**-brownies** : you\'re asking for it\n**-decosmic** : disconnects the bot\n**-dripless** : displays a dripless beetch\n**-guildmaster** : pleathhh\n**-p** : plays a song from YouTube\n**-help** : read this shit again\n**-pineapple** : displays a pineapple being eaten\n**-play** : plays a song from YouTube\n**-skip** : skips a song in queue\n**-next** : skips a song in queue\n**-stop** : stops the bot and clears the queue\n**-yeyur** : displays a man drunk on a toilet\n');
    message.channel.send(commandsEmbed);
  } else if (message.content.startsWith(`${prefix}pineapple`)) {
    const pineappleEmbedFile = new Discord.MessageAttachment('./img/pineapple.jpg');
    const pineappleEmbed = new Discord.MessageEmbed()
      .setTitle('Some title')
      .setImage('./img/pineapple.jpg');
    message.channel.send({
      embeds: [pineappleEmbed],
      files: [pineappleEmbedFile]
    });
  }  else if (message.content.startsWith(`${prefix}dripless`)) {
    const driplessEmbedFile = new Discord.MessageAttachment('./img/dripless.jpg');
    const driplessEmbed = new Discord.MessageEmbed()
      .setTitle('Some title')
      .setImage('./img/dripless.jpg');
    message.channel.send({
      embeds: [driplessEmbed],
      files: [driplessEmbedFile]
    });
  } else if (message.content.startsWith(`${prefix}yeyur`)) {
    const yeyurEmbedFile = new Discord.MessageAttachment('./img/yeyur.jpg');
    const yeyurEmbed = new Discord.MessageEmbed()
      .setTitle('Some title')
      .setImage('./img/yeyur.jpg');
    message.channel.send({
      embeds: [yeyurEmbed],
      files: [yeyurEmbedFile]
    });
  } else {
    message.channel.send("I dunno what that means.\nNeed help? Type **-help**");
  }
});

client.on('voiceStateUpdate', (oldState, newState) => {
  // check if someone connects or disconnects
  if (oldState.channelID === null || typeof oldState.channelID == 'undefined') return;
  // check if the bot is disconnecting
  if (newState.id !== client.user.id) return;
  // clear the queue
  return queue.delete(oldState.guild.id);
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

  //if a YouTube URL
  let song = {}
  if (ytdl.validateURL(args[0])) {
    const songInfo = await ytdl.getInfo(args[1]);
    song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
    };
  } else { // otherwise find a vid and play the first result
    const video_finder = async(query)=> {
      const videoResult = await search(query);
      return (videoResult.videos.length > 1) ? videoResult.videos[0] : null;
    }
    const video = await video_finder(args.join(' '));
    if (video) {
      song = {
        title: video.title,
        url: video.url,
      };
    } else {
      if (message.content === '-decosmic') {
        return message.channel.send(`👋🏽 baiii`);
      } else {
        return message.channel.send(
          "Sorry, I couldn't find a video."
        );
      }
    }
  }
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
    return message.channel.send(`📌 Queuein' up: **${song.title}**`);
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
  return message.channel.send(`🛑 song stopped, queue cleared`);
}

function decosmic(message, serverQueue, guild) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );

  // if (!serverQueue)
  serverQueue = queue.get(guild.id);
  serverQueue.voiceChannel.leave();
  queue.delete(guild.id);
  return message.channel.send(`baiii`);
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  const playing = new Discord.MessageEmbed()
    .setTitle(`🎶 Startin' up: **${song.title}**`)
    .setColor('#D09CFF');
  if (!song) {
    // serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return; 
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url, { filter: 'audioonly' }))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(playing);
}

client.login(token);
