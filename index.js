// core & third-party modules
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const search = require('yt-search');

// const YouTube = require('simple-youtube-api');

// token and prefix
const prefix = '-';
const token = process.env['COSMIC_BOT_TOKEN'];
// const youtube = new YouTube(GOOGLE_API_KEY);

// const { prefix, token } = require('./config.json');

const client = new Discord.Client();
const queue = new Map();

let timeoutID;

client.once('ready', () => {
  console.log('Ready ✨');
});

client.once('reconnecting', () => {
  console.log('Reconnecting!');
});

client.once('disconnect', () => {
  console.log('Disconnect!');
});

client.on('voiceStateUpdate', (oldState, newState) => {
  // check if someone connects or disconnects
  if (oldState.channelID === null || typeof oldState.channelID == 'undefined') return;
  // check if the bot is disconnecting
  if (newState.id !== client.user.id) return;
  // clear the queue
  // reset disconnect timer
  clearTimeout(timeoutID)
  timeoutID = undefined
  return queue.delete(oldState.guild.id);
});

client.on('message', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}brownies`)) {
      const brownies = new Discord.MessageEmbed()
        .setDescription('*d e c o s m i c \' d*')
        .setColor('#D09CFF');
      message.channel.send(brownies);
    } else if (message.content.startsWith(`${prefix}guildmaster`)) {
      const guildmasterEmbedFile = new Discord.MessageAttachment('./img/guildmaster.jpg');
      const guildmaster = new Discord.MessageEmbed()
        .attachFiles(guildmasterEmbedFile)
        .setDescription(`*Guildmasther pleath, lawd have merthy  😩💦*`)
        .setImage('attachment://guildmaster.jpg')
        .setColor('#FF908B');
      message.channel.send(guildmaster);
    } else if (message.content.startsWith(`${prefix}die`) || message.content.startsWith(`${prefix}kill`)) {
      const die = new Discord.MessageEmbed()
        .setDescription('*No u* 👉🏼😎👉🏼')
        .setColor('#D09CFF');
      message.channel.send(die);
    } else if (message.content.startsWith(`${prefix}play`) || message.content.startsWith(`${prefix}p `) || message.content.startsWith(`${prefix}P `)) {
      execute(message, serverQueue);
      return;
    } else if (message.content.startsWith(`${prefix}skip`) || message.content.startsWith(`${prefix}next`)) {
      const voiceChannelMessage = new Discord.MessageEmbed()
        .setDescription(`You have to be in a voice channel to skip!`)
        .setColor('#D09CFF');
      const skip = new Discord.MessageEmbed()
        .setDescription(`There wasn't a song I could skip!`)
        .setColor('#D09CFF');
      if (!message.member.voice.channel)
        return message.channel.send(voiceChannelMessage);
      if (!serverQueue)
        return message.channel.send(skip);
      serverQueue.connection.dispatcher.end();
    } else if (message.content.startsWith(`${prefix}stop`)) {
      const voiceChannelMessage = new Discord.MessageEmbed()
        .setDescription(`You have to be in a voice channel to stop!`)
        .setColor('#D09CFF');
      const stopping = new Discord.MessageEmbed()
        .setDescription(`*Song stopped, queue cleared*`)
        .setColor('#D09CFF');
      const noStop = new Discord.MessageEmbed()
        .setDescription(`There wasn't a song I could stop!`)
        .setColor('#D09CFF');
      if (!message.member.voice.channel)
        return message.channel.send(voiceChannelMessage);

      if (!serverQueue)
        return message.channel.send(noStop);

      serverQueue.songs = [];
      serverQueue.connection.dispatcher.end();
      return message.channel.send(stopping);
    } else if (message.content.startsWith(`${prefix}decosmic`)) {
      const decosmic = new Discord.MessageEmbed()
        .setDescription(`👋🏼 *baiii*`)
        .setColor('#D09CFF');
      message.guild.me.voice.channel.leave();
      return message.channel.send(decosmic);
    } else if (message.content.startsWith(`${prefix}help`)) {
      const commandsEmbed = new Discord.MessageEmbed()
        .setTitle('*c o m m a n d s*')
        .setColor('#D09CFF')
        .setThumbnail('https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/be21784c-ba2a-4df4-bdd8-b5568ea11ec8/dbjo53q-4683aad4-5549-4d28-ab4c-64f4bfc6a309.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcL2JlMjE3ODRjLWJhMmEtNGRmNC1iZGQ4LWI1NTY4ZWExMWVjOFwvZGJqbzUzcS00NjgzYWFkNC01NTQ5LTRkMjgtYWI0Yy02NGY0YmZjNmEzMDkuZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.8s-9vXfdIbwONFVQQ3wMsIeJfFRdkiPwbr2d-jk2tt8')
        .setDescription('\n**music commands** \n**-p**: plays a song from YouTube\n**-play**: plays a song from YouTube\n**-skip**: skips a song in queue\n**-next**: skips a song in queue\n**-stop**: stops the bot and clears the queue\n\n**-decosmic**: disconnects the bot\n**-help**: read this shit again\n\n**other commands**\n**-brownies**: you\'re asking for it\n** -dripless **: displays a dripless beetch\n**-guildmaster**: pleathhh\n**-pineapple **: displays a pineapple being eaten\n**-waves** : displays a white boy\'s waves\n**-yeyur** : displays a man drunk on a toilet\n');
      message.channel.send(commandsEmbed);
    } else if (message.content.startsWith(`${prefix}pineapple`)) {
      const pineappleEmbedFile = new Discord.MessageAttachment('./img/pineapple.jpg');
      const pineapple = new Discord.MessageEmbed()
        .attachFiles(pineappleEmbedFile)
        .setImage('attachment://pineapple.jpg')
        .setColor('#7C47DE');
      message.channel.send(pineapple);
    } else if (message.content.startsWith(`${prefix}dripless`)) {
      const driplessEmbedFile = new Discord.MessageAttachment('./img/dripless.jpg');
      const dripless = new Discord.MessageEmbed()
        .attachFiles(driplessEmbedFile)
        .setImage('attachment://dripless.jpg')
        .setColor('#DE0D0D');
      message.channel.send(dripless);
    } else if (message.content.startsWith(`${prefix}waves`)) {
      const wavesEmbedFile = new Discord.MessageAttachment('./img/waves.jpg');
      const waves = new Discord.MessageEmbed()
        .attachFiles(wavesEmbedFile)
        .setImage('attachment://waves.jpg')
        .setColor('#8F3AEF');
      message.channel.send(waves);
    } else if (message.content.startsWith(`${prefix}yeyur`)) {
      const yeyurEmbedFile = new Discord.MessageAttachment('./img/yeyur/yeyur.jpg');
      const yeyur = new Discord.MessageEmbed()
        .attachFiles(yeyurEmbedFile)
        .setImage('attachment://yeyur.jpg')
        .setColor('#1BCCE8');
      message.channel.send(yeyur);
    } else {
      message.channel.send('I dunno what that means.\nNeed help? Type **-help**');
    }
});

async function execute(message, serverQueue) {
  const args = message.content.split(' ');
  // checks if args is present before we can replace
  const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
  const voiceChannel = message.member.voice.channel;
  const permissions = voiceChannel.permissionsFor(message.client.user);
  let author = message.member.displayName;
  let avatar = message.author.avatarURL();

  // message.channel.send(voiceChannel);

  if (!voiceChannel) {
    return message.channel.send(
      'You need to be in a voice channel to play music!'
    );
  }

  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    return message.channel.send(
      'I need the permissions to join and speak in your voice channel!'
    );
  }
  let song = {}

  // check to see if we're a playlist
  if (url.match(/playlist(.*)$/)) {
    // const ytList = await ytpl.getPlaylistID(url);
    const noVid = new Discord.MessageEmbed()
      .setDescription(`that's a playlist! I can't do anything with that yet. we're working on it 💛`)
      .setColor('#D09CFF');
    return message.channel.send(noVid);

    // const playlist = await ytdl.getPlaylist(url);
    // const videos = await playlist.getVideos();
    // for(const video of Object.values(videos)) {
    //   const video2 = await ytdl.getVideoByID(video.id);
    //   return message.channel.send(video2);
    // }

  } else { // we aren't - play a song instead
    if (ytdl.validateURL(url)) {
      const songInfo = await ytdl.getInfo(url);
      song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
        thumbnail: songInfo.videoDetails.thumbnail,
      };
    } else { // otherwise search YT and play the first result
      const video_finder = async (query) => {
        const search_query = query.toLowerCase().replace('-p ', '');
        const videoResult = await search(search_query);
        if (videoResult.title) {

        } else {
          return (videoResult.videos.length > 1) ? videoResult.videos[0] : null;
        }
      }
      const video = await video_finder(args.join(' '));
      if (video) {
        song = {
          title: video.title,
          url: video.url,
          thumbnail: video.thumbnail,
        };
      } else { // can't play a song
        const noVid = new Discord.MessageEmbed()
          .setDescription(`Sorry, I couldn't find anything to play!`)
          .setColor('#D09CFF');
        return message.channel.send(noVid);
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
      play(author, avatar, message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    const queueing = new Discord.MessageEmbed()
      .setTitle(`📌 Queuein' up`)
      .setColor('#4FDFED')
      .setDescription(`${song.title}`)
      .setImage(song.thumbnail || "https://cdn.iconscout.com/icon/free/png-256/youtube-85-226402.png")
      .setFooter(`brought to you by ${author}`, `${avatar}`);
    serverQueue.songs.push(song);
    return message.channel.send(queueing);
  }
}

function play(author, avatar, guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) { // After the queue has ended
    queue.delete(guild.id);
    timeoutID = setTimeout(() => {
      serverQueue.voiceChannel.leave();
    }, 7 * 60 * 1000) // 7 minutes in ms
    return;
  }
  clearTimeout(timeoutID);
  const playing = new Discord.MessageEmbed()
    .setTitle(`🎶 Now Playing 🎶 `)
    .setColor('#79E676')
    .setDescription(`${song.title}`)
    .setImage(song.thumbnail || "https://cdn.iconscout.com/icon/free/png-256/youtube-85-226402.png")
    .setFooter(`brought to you by ${author}`, `${avatar}`);
  const dispatcher = serverQueue.connection
    .play(ytdl(song.url, { filter: 'audioonly' }))
    .on('finish', () => {
      serverQueue.songs.shift();
      play(author, avatar, guild, serverQueue.songs[0]);
    })
    .on('error', error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(playing);
  
  return;
}

client.login(token);
