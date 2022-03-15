// core & third-party modules
const { Client, MessageEmbed, Util } = require('discord.js');
const ytdl = require('ytdl-core');
// const ytpl = require('ytpl');
const search = require('yt-search');
const YouTube = require('simple-youtube-api');

// token and prefix
const prefix = '-';
const token = process.env['COSMIC_BOT_TOKEN'];
const GOOGLE_API_KEY = process.env['GOOGLE_API_KEY']
// const {
//   token, GOOGLE_API_KEY
// } = require('./config.json');

const youtube = new YouTube(GOOGLE_API_KEY);


const client = new Client();
const queue = new Map();

let timeoutID;

client.once('ready', () => {
  try {
    console.log('✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥 ✨ is ready!');
  } catch (e) {
    console.log('Catch an error: ', e)
  }
});

client.once('reconnecting', () => {
  try {
    console.log('✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥 ✨ is reconnecting!');
  } catch (e) {
    console.log('Catch an error: ', e)
  }
});

client.once('disconnect', () => {
  try {
    console.log('✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥 ✨ disconnected!');
  } catch (e) {
    console.log('Catch an error: ', e)
  }
});

client.on('voiceStateUpdate', (oldState, newState) => {
  try {
    // check if someone connects or disconnects
    if (oldState.channelID === null || typeof oldState.channelID == 'undefined') return;
    // check if the bot is disconnecting
    if (newState.id !== client.user.id) return;
    // clear the queue
    // reset disconnect timer
    // 02/17 this was fucking with the guild when the bot was moved channels... removed for now - do we even need?
    clearTimeout(timeoutID)
    timeoutID = undefined
    return queue.delete(oldState.guild.id);
  } catch (e) {
    console.log('Catch an error: ', e)
  }
});

client.on('message', async message => {
  try {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}brownies`)) {
      const brownies = new MessageEmbed()
        .setDescription('*d e c o s m i c \' d*')
        .setColor('#D09CFF');
      message.channel.send(brownies);
    } else if (message.content.startsWith(`${prefix}guildmaster`)) {
      const guildmasterEmbedFile = new MessageAttachment('./img/guildmaster.jpg');
      const guildmaster = new MessageEmbed()
        .attachFiles(guildmasterEmbedFile)
        .setDescription(`*Guildmasther pleath, lawd have merthy  😩💦*`)
        .setImage('attachment://guildmaster.jpg')
        .setColor('#FF908B');
      message.channel.send(guildmaster);
    } else if (message.content.startsWith(`${prefix}die`) || message.content.startsWith(`${prefix}kill`)) {
      const die = new MessageEmbed()
        .setDescription('*No u* 👉🏼😎👉🏼')
        .setColor('#D09CFF');
      message.channel.send(die);
    } else if (message.content.startsWith(`${prefix}p `) || message.content.startsWith(`${prefix}P `)) {
      execute(message, serverQueue);
      return;
    } else if (message.content.startsWith(`${prefix}queue`) || message.content.startsWith(`${prefix}q`)) {
      if (!serverQueue) {
        const queue = new MessageEmbed()
          .setDescription(`*The queue is empty!*`)
          .setColor('#D09CFF');
        return message.channel.send(queue);
      }
      const queueList = new MessageEmbed()
        .setTitle(`📌 Queue List`)
        .setDescription(`${serverQueue.songs.map(song =>`◦ ${song.title}`).join('\n')}
        
        **Now Playing:** ${serverQueue.songs[0].title}`)
        .setColor('#D09CFF');
      return message.channel.send(queueList);
    } else if (message.content.startsWith(`${prefix}skip`) || message.content.startsWith(`${prefix}next`)) {
      const voiceChannelMessage = new MessageEmbed()
        .setDescription(`You have to be in a voice channel to skip!`)
        .setColor('#D09CFF');
      const skip = new MessageEmbed()
        .setDescription(`There wasn't a song I could skip!`)
        .setColor('#D09CFF');
      if (!message.member.voice.channel) return message.channel.send(voiceChannelMessage);
      if (!serverQueue) return message.channel.send(skip);
      serverQueue.connection.dispatcher.end();
      // message.channel.send('skip command used');
      return undefined;
    } else if (message.content.startsWith(`${prefix}stop`)) {
      const voiceChannelMessage = new MessageEmbed()
        .setDescription(`You have to be in a voice channel to stop!`)
        .setColor('#D09CFF');
      const stopping = new MessageEmbed()
        .setDescription(`*Song stopped, queue cleared*`)
        .setColor('#D09CFF');
      const noStop = new MessageEmbed()
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
      const decosmic = new MessageEmbed()
        .setDescription(`👋🏼 *baiii*`)
        .setColor('#D09CFF');
      // serverQueue.songs = [];
      // serverQueue.connection.dispatcher.end();
      message.guild.me.voice.channel.leave();

      console.log('decosmic\'d, ✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥 ✨ is ready!');
      return message.channel.send(decosmic);
    } else if (message.content.startsWith(`${prefix}help`)) {
      const commandsEmbed = new MessageEmbed()
        .setTitle('*c o m m a n d s*')
        .setColor('#D09CFF')
        .setThumbnail('https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/be21784c-ba2a-4df4-bdd8-b5568ea11ec8/dbjo53q-4683aad4-5549-4d28-ab4c-64f4bfc6a309.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcL2JlMjE3ODRjLWJhMmEtNGRmNC1iZGQ4LWI1NTY4ZWExMWVjOFwvZGJqbzUzcS00NjgzYWFkNC01NTQ5LTRkMjgtYWI0Yy02NGY0YmZjNmEzMDkuZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.8s-9vXfdIbwONFVQQ3wMsIeJfFRdkiPwbr2d-jk2tt8')
        .setDescription('\n**music commands** \n**-p**: plays a song from YouTube\n**-q**: displays the queue\n**-skip**: skips a song in queue\n**-next**: skips a song in queue\n**-stop**: stops the bot and clears the queue\n\n**-decosmic**: disconnects the bot\n**-help**: read this shit again\n\n**other commands**\n**-brownies**: you\'re asking for it\n** -dripless **: displays a dripless beetch\n**-guildmaster**: pleathhh\n**-pineapple **: displays a pineapple being eaten\n**-waves** : displays a white boy\'s waves\n**-yeyur** : displays a man drunk on a toilet\n');
      message.channel.send(commandsEmbed);
    } else if (message.content.startsWith(`${prefix}pineapple`)) {
      const pineappleEmbedFile = new MessageAttachment('./img/pineapple.jpg');
      const pineapple = new MessageEmbed()
        .attachFiles(pineappleEmbedFile)
        .setImage('attachment://pineapple.jpg')
        .setColor('#7C47DE');
      message.channel.send(pineapple);
    } else if (message.content.startsWith(`${prefix}dripless`)) {
      const driplessEmbedFile = new MessageAttachment('./img/dripless.jpg');
      const dripless = new MessageEmbed()
        .attachFiles(driplessEmbedFile)
        .setImage('attachment://dripless.jpg')
        .setColor('#DE0D0D');
      message.channel.send(dripless);
    } else if (message.content.startsWith(`${prefix}waves`)) {
      const wavesEmbedFile = new MessageAttachment('./img/waves.jpg');
      const waves = new MessageEmbed()
        .attachFiles(wavesEmbedFile)
        .setImage('attachment://waves.jpg')
        .setColor('#8F3AEF');
      message.channel.send(waves);
    } else if (message.content.startsWith(`${prefix}yeyur`)) {
      const yeyurEmbedFile = new MessageAttachment('./img/yeyur/yeyur.jpg');
      const yeyur = new MessageEmbed()
        .attachFiles(yeyurEmbedFile)
        .setImage('attachment://yeyur.jpg')
        .setColor('#1BCCE8');
      message.channel.send(yeyur);
    } else {
      message.channel.send('I dunno what that means.\nNeed help? Type **-help**');
    }
  } catch (e) {
    console.log(e);
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(' ');
  // checks if args is present before we can replace
  const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
  const voiceChannel = message.member.voice.channel;
  const permissions = voiceChannel.permissionsFor(message.client.user);

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

  let song = {};

  try {
    var video = await youtube.getVideo(url);
  } catch (err) {
    try {
      var videos = await youtube.searchVideos(url, 1);
      var video = await youtube.getVideoByID(videos[0].id);
    } catch (err) {
      const noSearch = new MessageEmbed()
        .setDescription(`*I couldn't find any results via search*`)
        .setColor('#D09CFF');
      return message.channel.send(noSearch);
    }
  }

  if (ytdl.validateURL(url)) {
    song = {
      id: video.id,
      title: video.title,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      thumbnail: video.thumbnails.standard.url,
    };
  } else { // otherwise search YT and play the first result
    const video_finder = async (query) => {
      try {
        const search_query = query.toLowerCase().replace('-p ', '');
        const videoResult = await search(search_query);
        return (videoResult.videos.length > 1) ? videoResult.videos[0] : null;
      } catch (e) {
        console.log(e);
      }
    }
    let videoSearched = await video_finder(args.join(' '));
    if (videoSearched) {
      song = {
        // removed 03/15 - KR
        title: Util.escapeMarkdown(videoSearched.title),
        // added 03/15 - KR
        // title: Util.escapeMarkdown(video.title),
        url: videoSearched.url,
        thumbnail: videoSearched.thumbnail,
      };
    } else { // can't play a song
      const noVid = new MessageEmbed()
        .setDescription(`Sorry, I couldn't find anything to play!`)
        .setColor('#D09CFF');
      return message.channel.send(noVid);
    }
  }

  if (!serverQueue) {
    const queueConstruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueConstruct);
    queueConstruct.songs.push(song);
    try {
      let connection = await voiceChannel.join();
      queueConstruct.connection = connection;
      play(message, message.guild, queueConstruct.songs[0]); // play first song in the queue
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    const queueing = new MessageEmbed()
      .setTitle(`📌 Queuein' up`)
      .setColor('#4FDFED')
      .setThumbnail(song.thumbnail || "https://cdn.iconscout.com/icon/free/png-256/youtube-85-226402.png") // grabs the YT logo if thumbnail is unavailable
      .setDescription(`\
      \
      **${song.title}**`)
      .setFooter(`queue'd by ${message.member.displayName}`, `${message.member.user.displayAvatarURL()}`);
      
    serverQueue.songs.push(song);
    return message.channel.send(queueing);
  }
  return undefined;
}

function play(message, guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) { // After the queue has ended
    queue.delete(guild.id);
    timeoutID = setTimeout(() => {
      serverQueue.voiceChannel.leave();
      // serverQueue.guild.me.voice.channel.leave();
      console.log('✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥 ✨ is ready!');
    }, 5 * 60 * 1000) // 7 minutes in ms
    return;
  }
  clearTimeout(timeoutID); // resets auto disconnect timer when a song is played
    
  const dispatcher = serverQueue.connection
    .play(ytdl(song.url, {
      filter: 'audioonly'
    }))
    .on('finish', () => {
      serverQueue.songs.shift(); // get the next song in queue
      play(message, guild, serverQueue.songs[0]); // play it
    })
    .on('error', error => console.error(error));

  const playing = new MessageEmbed()
    .setTitle(`🎶 Now Playing 🎶 `)
    .setColor('#79E676')
    .setDescription(`\
        \
        **${song.title}**`)
    .setImage(song.thumbnail || "https://cdn.iconscout.com/icon/free/png-256/youtube-85-226402.png") // grabs the YT logo if thumbnail is unavailable
    .setFooter(`brought to you by ${message.member.displayName}`, `${message.member.user.displayAvatarURL()}`);

  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(playing);
  console.log(message.member.displayName + ' played ' + `${song.title}`);
  return;
}

client.login(token);
